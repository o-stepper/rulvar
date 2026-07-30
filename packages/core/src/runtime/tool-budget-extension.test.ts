import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CheckpointState } from '../journal/checkpoint.js';
import { ConfigError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type BudgetHooks, type ToolRuntime } from './agent-loop.js';
import { toolBudgetExtensionNoticeText } from './exploration.js';
import { mergeUsageLimits, validateUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

function runtimeOf(defs: ToolDef[]): ToolRuntime {
  return {
    defs,
    contracts: defs.map((def) => toolContract(def)),
    contextFor: (toolName) => ({
      runId: 'run-1',
      spanId: `span-${toolName}`,
      agent: { agentType: '' },
      cwd: process.cwd(),
      isolation: 'none',
      signal: new AbortController().signal,
      log: () => undefined,
    }),
  };
}

/** Each execution returns a fresh page: every result is new evidence. */
const readTool = (executions: { count: number }) =>
  tool({
    name: 'read',
    description: 'reads evidence',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ page: executions.count });
    },
  });

/** Every execution returns the same bytes: never new evidence after the first. */
const staleTool = (executions: { count: number }) =>
  tool({
    name: 'read',
    description: 'reads the same page forever',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ page: 'the same page' });
    },
  });

const finishTool = () =>
  tool({
    name: 'finish',
    description: 'the terminal tool',
    parameters: z.strictObject({ result: z.string() }),
    execute: () => Promise.resolve('unused'),
  });

const reads = (n: number) => ({
  toolCalls: Array.from({ length: n }, () => ({ name: 'read', args: {} })),
});

const budgetOf = (remaining: number | undefined): BudgetHooks => ({
  beforeTurn: () => undefined,
  onUsage: () => undefined,
  remainingUsd: () => remaining,
});

const extensionNotices = (req: { messages: Msg[] }): string[] =>
  req.messages
    .filter((msg) => msg.role === 'user')
    .flatMap((msg) => msg.parts)
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .filter((text) => text.startsWith('Tool budget extended:'));

describe('the tool budget extension (RV301, the seventh comparison experiment)', () => {
  it('a grant at the expiry extends the cap and the batch continues to ok', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    expect(executions.count).toBe(4);
    expect(result.toolBudget).toEqual({
      used: 4,
      cap: 4,
      extensionsGranted: 1,
    });
    // The grant is announced to the model exactly once, after the batch's
    // results, so the next request carries it.
    expect(extensionNotices(adapter.calls[1] as { messages: Msg[] })).toHaveLength(1);
    const logs = events.ofType('log') as Array<{ msg: string }>;
    expect(logs.some((entry) => entry.msg.includes('tool budget extended'))).toBe(true);
  });

  it('no grant without remaining budget headroom: the expiry stays terminal', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => reads(4));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions)]),
      budget: budgetOf(0),
    });
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toEqual({
      used: 2,
      cap: 2,
      extensionsGranted: 0,
      limiter: 'maxToolCalls',
    });
    for (const call of adapter.calls) {
      expect(extensionNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });

  it('minHeadroomUsd gates the grant against the remaining chain budget', async () => {
    const run = async (remaining: number) => {
      const executions = { count: 0 };
      const adapter = scriptedAdapter((_req, call) =>
        call === 0 ? reads(3) : { toolCall: { name: 'finish', args: { result: 'done' } } },
      );
      const result = await runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 4,
          maxToolCalls: 2,
          toolBudgetExtension: { increment: 1, maxExtensions: 2, minHeadroomUsd: 1 },
        }),
        tools: runtimeOf([readTool(executions), finishTool()]),
        terminalTool: { name: 'finish' },
        budget: budgetOf(remaining),
      });
      return { result, executions };
    };
    const denied = await run(0.5);
    expect(denied.result.status).toBe('limit');
    expect(denied.executions.count).toBe(2);
    expect(denied.result.toolBudget?.extensionsGranted).toBe(0);
    const granted = await run(2);
    expect(granted.result.status).toBe('ok');
    expect(granted.executions.count).toBe(3);
    expect(granted.result.toolBudget?.extensionsGranted).toBe(1);
  });

  it('maxExtensions bounds the grants; the exhausted extension keeps the limit terminal', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => reads(6));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 1, maxExtensions: 2 },
      }),
      tools: runtimeOf([readTool(executions)]),
    });
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(4);
    expect(result.toolBudget).toEqual({
      used: 4,
      cap: 4,
      extensionsGranted: 2,
      limiter: 'maxToolCalls',
    });
  });

  it('requireNewEvidence denies the grant when nothing new arrived since the last one', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => reads(6));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 3 },
      }),
      tools: runtimeOf([staleTool(executions)]),
    });
    // The first grant rides the one novel page; the second finds the
    // evidence count unchanged and the expiry stands.
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(4);
    expect(result.toolBudget?.extensionsGranted).toBe(1);
  });

  it('requireNewEvidence: false keeps granting to the extension bound', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(6) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 3, requireNewEvidence: false },
      }),
      tools: runtimeOf([staleTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(6);
    expect(result.toolBudget?.extensionsGranted).toBe(2);
  });

  it('a resumed segment re-derives the grants from the restored count', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(2) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const restored: CheckpointState = {
      v: 1,
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
      turns: 1,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 5,
      schemaAttempts: 0,
      compaction: [],
    };
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 3 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restored),
        save: () => Promise.resolve(),
      },
    });
    // 5 restored calls over the base cap of 2 mean two grants already
    // happened (ceil(3/2) at increment 2): the effective cap resumes at 6,
    // one more read fits, and the third grant admits the second one.
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toEqual({
      used: 7,
      cap: 8,
      extensionsGranted: 3,
    });
  });

  it('without the extension the expiry is byte-identical to before', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => reads(4));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 4, maxToolCalls: 2 }),
      tools: runtimeOf([readTool(executions)]),
    });
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toEqual({
      used: 2,
      cap: 2,
      limiter: 'maxToolCalls',
    });
    for (const call of adapter.calls) {
      expect(extensionNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });
});

describe('the tool budget pressure summary (RV304)', () => {
  it('reports units, the cap, and the fired notice thresholds', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(2) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 4,
        toolBudgetNotices: true,
        toolUnits: { max: 10, costs: { read: 2 } },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.toolBudget).toEqual({
      used: 2,
      cap: 4,
      unitsUsed: 4,
      unitsMax: 10,
      noticesFired: [0.5],
    });
  });

  it('an uncapped loop carries no summary at all', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'read', args: {} } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits(),
      tools: runtimeOf([readTool({ count: 0 }), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.toolBudget).toBeUndefined();
  });

  it('the finalization reserve summary is visible on the snapshot', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : { text: 'the reserve summary' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        finalizationReserve: {},
      }),
      tools: runtimeOf([readTool(executions)]),
    });
    expect(result.status).toBe('limit');
    expect(result.output).toBe('the reserve summary');
    expect(result.toolBudget).toEqual({
      used: 2,
      cap: 2,
      finalizationReserveUsed: true,
      limiter: 'maxToolCalls',
    });
  });
});

describe('toolBudgetExtension validation', () => {
  it('rejects malformed extension fields with typed ConfigErrors naming the site', () => {
    expect(() =>
      validateUsageLimits({ toolBudgetExtension: { increment: 0, maxExtensions: 1 } }, 'x'),
    ).toThrowError(ConfigError);
    expect(() =>
      validateUsageLimits({ toolBudgetExtension: { increment: 0, maxExtensions: 1 } }, 'x'),
    ).toThrowError(/x\.toolBudgetExtension\.increment/);
    expect(() =>
      validateUsageLimits({ toolBudgetExtension: { increment: 2, maxExtensions: 1.5 } }, 'x'),
    ).toThrowError(/x\.toolBudgetExtension\.maxExtensions/);
    expect(() =>
      validateUsageLimits(
        { toolBudgetExtension: { increment: 2, maxExtensions: 1, minHeadroomUsd: -1 } },
        'x',
      ),
    ).toThrowError(/x\.toolBudgetExtension\.minHeadroomUsd/);
    expect(() =>
      validateUsageLimits(
        {
          toolBudgetExtension: {
            increment: 2,
            maxExtensions: 1,
            requireNewEvidence: 'yes' as unknown as boolean,
          },
        },
        'x',
      ),
    ).toThrowError(/x\.toolBudgetExtension\.requireNewEvidence/);
    expect(() =>
      validateUsageLimits(
        { toolBudgetExtension: 3 as unknown as { increment: number; maxExtensions: number } },
        'x',
      ),
    ).toThrowError(ConfigError);
  });

  it('accepts a well-formed extension', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxToolCalls: 48,
          toolBudgetExtension: {
            increment: 12,
            maxExtensions: 4,
            requireNewEvidence: true,
            minHeadroomUsd: 0.5,
          },
        },
        'x',
      ),
    ).not.toThrow();
  });
});

describe('the durable grant decisions (RV509)', () => {
  it('a live grant reports through the decision hook with its exact counts', async () => {
    const executions = { count: 0 };
    const grants: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      toolBudgetDurability: {
        onExtensionGrant: (grant) => {
          grants.push(grant);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('ok');
    expect(grants).toEqual([{ grant: 1, maxExtensions: 1, toolCallsUsed: 2, cap: 4 }]);
  });

  it('a restored grant is honored without a fresh live grant or a second notice', async () => {
    const executions = { count: 0 };
    const grants: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(2) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    // The pre-crash segment: two executed reads at the base cap of 2,
    // then the grant, announced to the model, whose calls never ran
    // before the kill. The restored count alone cannot prove that grant
    // (2 is not beyond the base cap); only the journaled decision can.
    const restored: CheckpointState = {
      v: 1,
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'go' }] },
        {
          role: 'assistant',
          parts: [
            { type: 'tool-call', id: 'a', name: 'read', args: {} },
            { type: 'tool-call', id: 'b', name: 'read', args: {} },
          ],
        },
        {
          role: 'tool',
          parts: [
            { type: 'tool-result', id: 'a', name: 'read', result: { page: 1 } },
            { type: 'tool-result', id: 'b', name: 'read', result: { page: 2 } },
          ],
        },
        {
          role: 'user',
          parts: [{ type: 'text', text: toolBudgetExtensionNoticeText(1, 1, 2, 4) }],
        },
      ],
      turns: 1,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 2,
      schemaAttempts: 0,
      compaction: [],
    };
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restored),
        save: () => Promise.resolve(),
      },
      toolBudgetDurability: {
        restored: { extensionsGranted: 1, finalizationWindowEntered: false },
        onExtensionGrant: (grant) => {
          grants.push(grant);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toEqual({ used: 4, cap: 4, extensionsGranted: 1 });
    // The journaled grant restores; nothing is re-granted, so the hook
    // stays silent and the model never sees a second announcement.
    expect(grants).toEqual([]);
    for (const call of adapter.calls) {
      expect(extensionNotices(call as { messages: Msg[] })).toHaveLength(1);
    }
  });
});

/** The pre-crash segment a RV602 resume restores: two reads at the base cap. */
const restoredAtBaseCap = (): CheckpointState => ({
  v: 1,
  messages: [
    { role: 'user', parts: [{ type: 'text', text: 'go' }] },
    {
      role: 'assistant',
      parts: [
        { type: 'tool-call', id: 'a', name: 'read', args: {} },
        { type: 'tool-call', id: 'b', name: 'read', args: {} },
      ],
    },
    {
      role: 'tool',
      parts: [
        { type: 'tool-result', id: 'a', name: 'read', result: { page: 1 } },
        { type: 'tool-result', id: 'b', name: 'read', result: { page: 2 } },
      ],
    },
    { role: 'user', parts: [{ type: 'text', text: toolBudgetExtensionNoticeText(1, 2, 2, 4) }] },
  ],
  turns: 1,
  usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  toolCallsUsed: 2,
  schemaAttempts: 0,
  compaction: [],
});

describe('durable authorization before the granted call (RV601)', () => {
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1));

  it('no call the grant would fund executes until the grant decision is durable', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    let reached = false;
    let release: (() => void) | undefined;
    const durable = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      toolBudgetDurability: {
        onExtensionGrant: () => {
          reached = true;
          return durable;
        },
      },
    });
    for (let attempt = 0; attempt < 200 && !reached; attempt += 1) {
      await tick();
    }
    expect(reached).toBe(true);
    // The authorization is not durable yet: only the two calls the BASE
    // cap funded have run, and nothing the grant would fund may follow
    // an authorization the store has not accepted.
    await tick();
    expect(executions.count).toBe(2);
    release?.();
    const result = await pending;
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(4);
  });

  it('a rejected grant append issues no grant and runs none of the calls it would fund', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    // Pre-created so the red run cannot trip the unhandled-rejection
    // guard while the loop still discards the hook's promise.
    const rejection = Promise.reject(new Error('journal store unavailable'));
    rejection.catch(() => undefined);
    await expect(
      runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 4,
          maxToolCalls: 2,
          toolBudgetExtension: { increment: 2, maxExtensions: 1 },
        }),
        tools: runtimeOf([readTool(executions), finishTool()]),
        terminalTool: { name: 'finish' },
        toolBudgetDurability: { onExtensionGrant: () => rejection },
      }),
    ).rejects.toThrow('journal store unavailable');
    expect(executions.count).toBe(2);
  });
});

describe('the journaled cap wins over drifted limits (RV602)', () => {
  it('a resumed segment honors the journaled cap when the live increment shrank', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(2) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        // Drifted since the grant: the live arithmetic would derive a
        // cap of 3 and silently revoke the 4 the model was promised.
        toolBudgetExtension: { increment: 1, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restoredAtBaseCap()),
        save: () => Promise.resolve(),
      },
      toolBudgetDurability: {
        restored: { extensionsGranted: 1, finalizationWindowEntered: false, cap: 4 },
      },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toEqual({ used: 4, cap: 4, extensionsGranted: 1 });
  });

  it('a live grant after the restore point measures from the journaled cap with the current increment', async () => {
    // Seeded past the restored pages so every live read is new evidence:
    // a grant beyond the restore point still has to earn it.
    const executions = { count: 2 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(3) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 2,
        // A grown increment must not inflate the journaled cap either:
        // 4 is the anchor, and only the NEW grant spends the live 5.
        toolBudgetExtension: { increment: 5, maxExtensions: 2 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restoredAtBaseCap()),
        save: () => Promise.resolve(),
      },
      toolBudgetDurability: {
        restored: { extensionsGranted: 1, finalizationWindowEntered: false, cap: 4 },
      },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(5);
    expect(result.toolBudget).toEqual({ used: 5, cap: 9, extensionsGranted: 2 });
  });

  it('a malformed journaled cap is ignored with a warning; the count derivation stays the floor', async () => {
    const runWith = async (cap: number) => {
      const executions = { count: 0 };
      const events = recordingSink();
      const adapter = scriptedAdapter((_req, call) =>
        call === 0 ? reads(2) : { toolCall: { name: 'finish', args: { result: 'done' } } },
      );
      const result = await runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 4,
          maxToolCalls: 2,
          toolBudgetExtension: { increment: 2, maxExtensions: 1 },
        }),
        tools: runtimeOf([readTool(executions), finishTool()]),
        terminalTool: { name: 'finish' },
        events,
        checkpoint: {
          load: () => Promise.resolve(restoredAtBaseCap()),
          save: () => Promise.resolve(),
        },
        toolBudgetDurability: {
          restored: { extensionsGranted: 1, finalizationWindowEntered: false, cap },
        },
      });
      const warnings = (events.ofType('log') as Array<{ level?: string; msg: string }>).filter(
        (entry) => entry.level === 'warn' && entry.msg.includes('cap'),
      );
      return { result, warnings, executions };
    };
    // Not an integer, and below the base cap: both fall back to the
    // live derivation (2 + 1 * 2), which stays exactly as before.
    for (const cap of [3.5, 1]) {
      const { result, warnings, executions } = await runWith(cap);
      expect(result.status).toBe('ok');
      expect(executions.count).toBe(2);
      expect(result.toolBudget).toEqual({ used: 4, cap: 4, extensionsGranted: 1 });
      expect(warnings).toHaveLength(1);
    }
  });
});

describe('the evidence-deficit proactive grant (RV809)', () => {
  // The twelfth plan's live shape: a limited child at 7 of 11 declared
  // evidence entries should convert remaining money into calls BEFORE
  // the cap forces a partial dump through the finalization machinery.
  // The policy: at each tool-turn boundary, when the remaining call
  // budget cannot cover the declared floor's outstanding deficit, the
  // extension grants proactively; the expiry site stays the backstop.
  const recordTool = () =>
    tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => Promise.resolve({ recorded: true }),
    });
  const records = (n: number) => ({
    toolCalls: Array.from({ length: n }, () => ({ name: 'record_evidence', args: {} })),
  });

  it('grants at the boundary when remaining calls cannot cover the declared deficit', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) return records(3);
      if (call === 1) return reads(2);
      if (call === 2) return records(2);
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 6,
        toolBudgetExtension: { increment: 4, maxExtensions: 2, coverEvidenceDeficit: true },
      }),
      evidenceContract: { minEntries: 5, enforce: 'refuse' },
      tools: runtimeOf([recordTool(), readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      budget: budgetOf(5),
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.evidence).toEqual({ recordedEntries: 5, minEntries: 5, met: true });
    expect(result.toolBudget?.extensionsGranted).toBe(1);
    // The grant fired at the boundary AFTER turn 1 (5 calls used, 1
    // remaining, deficit 2), BEFORE any expiry: the notice carries the
    // pre-expiry count and the deficit sentence.
    const notice = adapter.calls
      .flatMap((req) => extensionNotices(req as { messages: Msg[] }))
      .join('\n');
    expect(notice).toContain('5 of 10 tool calls used');
    expect(notice).toContain('covers the declared evidence floor');
    expect(notice).toContain('3 of 5');
    const logs = events.ofType('log') as Array<{ msg: string; data?: { trigger?: string } }>;
    const grantLog = logs.find((entry) => entry.msg.includes('tool budget extended'));
    expect(grantLog?.data?.trigger).toBe('evidence-deficit');
  });

  it('the deficit grant stays money-gated: no headroom, no early grant', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) return records(3);
      return reads(4);
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 6,
        toolBudgetExtension: { increment: 4, maxExtensions: 2, coverEvidenceDeficit: true },
      }),
      evidenceContract: { minEntries: 5, enforce: 'refuse' },
      tools: runtimeOf([recordTool(), readTool(executions)]),
      budget: budgetOf(0),
    });
    expect(result.status).toBe('limit');
    expect(result.toolBudget?.extensionsGranted).toBe(0);
  });

  it('without the opt-in the same run grants only at the expiry', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) return records(3);
      if (call === 1) return reads(2);
      if (call === 2) return records(2);
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 6,
        toolBudgetExtension: { increment: 4, maxExtensions: 2 },
      }),
      evidenceContract: { minEntries: 5, enforce: 'refuse' },
      tools: runtimeOf([recordTool(), readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      budget: budgetOf(5),
    });
    // The run still completes through the at-expiry backstop, but the
    // grant waited for the cap: the notice carries the expiry count and
    // no deficit sentence.
    expect(result.status).toBe('ok');
    const notice = adapter.calls
      .flatMap((req) => extensionNotices(req as { messages: Msg[] }))
      .join('\n');
    expect(notice).toContain('6 of 10 tool calls used');
    expect(notice).not.toContain('covers the declared evidence floor');
  });

  it('intake refuses a non-boolean coverEvidenceDeficit typed', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxToolCalls: 4,
          toolBudgetExtension: {
            increment: 1,
            maxExtensions: 1,
            coverEvidenceDeficit: 'yes' as never,
          },
        },
        'limits',
      ),
    ).toThrow(ConfigError);
  });
});
