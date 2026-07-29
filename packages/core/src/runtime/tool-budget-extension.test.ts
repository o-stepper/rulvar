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
      toolBudgetDurability: { onExtensionGrant: (grant) => grants.push(grant) },
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
        onExtensionGrant: (grant) => grants.push(grant),
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
