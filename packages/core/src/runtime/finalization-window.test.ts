import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CheckpointState } from '../journal/checkpoint.js';
import { ConfigError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type ToolRuntime } from './agent-loop.js';
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

const recordTool = (executions: { count: number }) =>
  tool({
    name: 'record',
    description: 'records evidence',
    parameters: z.strictObject({}),
    execute: () => {
      executions.count += 1;
      return Promise.resolve({ recorded: executions.count });
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

const textsOf = (req: { messages: Msg[] }, prefix: string): string[] =>
  req.messages
    .filter((msg) => msg.role === 'user')
    .flatMap((msg) => msg.parts)
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .filter((text) => text.startsWith(prefix));

const windowNotices = (req: { messages: Msg[] }): string[] => textsOf(req, 'Finalization window:');

const refusalsOf = (
  req: { messages: Msg[] },
  name: string,
): Array<{ error?: string; guard?: string }> =>
  req.messages
    .filter((msg) => msg.role === 'tool')
    .flatMap((msg) => msg.parts)
    .filter(
      (
        part,
      ): part is {
        type: 'tool-result';
        id: string;
        name: string;
        result: unknown;
        isError?: boolean;
      } => part.type === 'tool-result',
    )
    .filter((part) => part.name === name && part.isError === true)
    .map((part) => part.result as { error?: string; guard?: string });

describe('the finalization window (RV302, the seventh comparison experiment)', () => {
  it('inside the window a non-allowlisted call is refused typed and an allowlisted one executes', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return reads(2);
      }
      if (call === 1) {
        return {
          toolCalls: [
            { name: 'read', args: {} },
            { name: 'record', args: {} },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 5,
        maxToolCalls: 4,
        finalizationWindow: { reserveCalls: 2, allow: ['record'] },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      events,
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    // The two pre-window reads executed; the in-window read was refused
    // without consuming budget; the allowlisted record executed.
    expect(readExecutions.count).toBe(2);
    expect(recordExecutions.count).toBe(1);
    expect(result.toolBudget).toEqual({
      used: 3,
      cap: 4,
      finalizationWindowEntered: true,
    });
    // The one-time notice entered the conversation after the batch that
    // crossed into the window.
    expect(windowNotices(adapter.calls[1] as { messages: Msg[] })).toHaveLength(1);
    expect(windowNotices(adapter.calls[2] as { messages: Msg[] })).toHaveLength(1);
    // The refusal is a typed error result naming the window guard.
    const refusals = refusalsOf(adapter.calls[2], 'read');
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.guard).toBe('finalization-window');
    expect(refusals[0]?.error).toContain('finalization window');
    const denied = events
      .ofType('tool:end')
      .filter(
        (entry) => (entry as { outcome?: string; guard?: string }).guard === 'finalization-window',
      );
    expect(denied).toHaveLength(1);
    expect((denied[0] as { outcome?: string }).outcome).toBe('denied');
  });

  it('without an explicit allowlist the zero-cost bookkeeping tools are the window tools', async () => {
    const readExecutions = { count: 0 };
    const noteExecutions = { count: 0 };
    const note = tool({
      name: 'note',
      description: 'free bookkeeping',
      parameters: z.strictObject({}),
      execute: () => {
        noteExecutions.count += 1;
        return Promise.resolve({ noted: noteExecutions.count });
      },
    });
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return { toolCall: { name: 'read', args: {} } };
      }
      if (call === 1) {
        return {
          toolCalls: [
            { name: 'read', args: {} },
            { name: 'note', args: {} },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 5,
        toolUnits: { max: 4, costs: { read: 2, note: 0 } },
        finalizationWindow: { reserveCalls: 2 },
      }),
      tools: runtimeOf([readTool(readExecutions), note, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    // The first read spent 2 of 4 units, entering the window; the second
    // read (cost 2) was refused, the zero-cost note executed.
    expect(readExecutions.count).toBe(1);
    expect(noteExecutions.count).toBe(1);
    expect(result.toolBudget).toEqual({
      used: 2,
      unitsUsed: 2,
      unitsMax: 4,
      finalizationWindowEntered: true,
    });
    const refusals = refusalsOf(adapter.calls[2], 'read');
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.guard).toBe('finalization-window');
  });

  it('the terminal tool is always admitted inside the window, an empty allowlist included', async () => {
    const readExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: {} },
              { name: 'finish', args: { result: 'done' } },
            ],
          }
        : { text: 'unreachable' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 3,
        maxToolCalls: 2,
        finalizationWindow: { reserveCalls: 2, allow: [] },
      }),
      tools: runtimeOf([readTool(readExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    expect(readExecutions.count).toBe(0);
  });

  it('with the extension configured, headroom converts into a grant before any window refusal', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call <= 3
        ? { toolCall: { name: 'read', args: {} } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 2,
        finalizationWindow: { reserveCalls: 1 },
        toolBudgetExtension: { increment: 2, maxExtensions: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    // Read 1 executes (window arms at 1 of 2 remaining), read 2 would be
    // refused but the grant lifts the cap to 4 first, reads 2 and 3
    // execute, read 4 finds the grants exhausted and is refused, the
    // finish lands.
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(3);
    expect(result.toolBudget).toEqual({
      used: 3,
      cap: 4,
      extensionsGranted: 1,
      finalizationWindowEntered: true,
    });
    const grantNotices = adapter.calls.flatMap((req) =>
      textsOf(req as { messages: Msg[] }, 'Tool budget extended:'),
    );
    expect(new Set(grantNotices).size).toBe(1);
  });

  it('a resumed segment already inside the window keeps refusing without re-firing the notice', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: {} },
              { name: 'record', args: {} },
            ],
          }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const restored: CheckpointState = {
      v: 1,
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
      turns: 1,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 3,
      schemaAttempts: 0,
      compaction: [],
    };
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 5,
        maxToolCalls: 4,
        finalizationWindow: { reserveCalls: 2, allow: ['record'] },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restored),
        save: () => Promise.resolve(),
      },
    });
    expect(result.status).toBe('ok');
    // 3 restored calls of 4 put the segment inside the window at boot:
    // the read is refused, the record executes, and no fresh notice is
    // appended (the pre-kill segment already carried it).
    expect(readExecutions.count).toBe(0);
    expect(recordExecutions.count).toBe(1);
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
    expect(result.toolBudget).toEqual({
      used: 4,
      cap: 4,
      finalizationWindowEntered: true,
    });
  });

  it('a window that never activates leaves the conversation and the snapshot untouched', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'read', args: {} } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 3,
        maxToolCalls: 4,
        finalizationWindow: { reserveCalls: 1 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(1);
    expect(result.toolBudget).toEqual({ used: 1, cap: 4 });
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });

  it('without the window the capped loop is byte-identical to before', async () => {
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
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
      expect(JSON.stringify(call)).not.toContain('finalization window');
    }
  });
});

describe('finalizationWindow validation', () => {
  it('rejects malformed window fields with typed ConfigErrors naming the site', () => {
    expect(() =>
      validateUsageLimits({ finalizationWindow: { reserveCalls: 0 } }, 'x'),
    ).toThrowError(ConfigError);
    expect(() =>
      validateUsageLimits({ finalizationWindow: { reserveCalls: 0 } }, 'x'),
    ).toThrowError(/x\.finalizationWindow\.reserveCalls/);
    expect(() =>
      validateUsageLimits({ finalizationWindow: { reserveCalls: 1.5 } }, 'x'),
    ).toThrowError(/x\.finalizationWindow\.reserveCalls/);
    expect(() =>
      validateUsageLimits(
        { finalizationWindow: { reserveCalls: 2, allow: 'record' as unknown as string[] } },
        'x',
      ),
    ).toThrowError(/x\.finalizationWindow\.allow/);
    expect(() =>
      validateUsageLimits(
        { finalizationWindow: { reserveCalls: 2, allow: [3 as unknown as string] } },
        'x',
      ),
    ).toThrowError(/x\.finalizationWindow\.allow/);
    expect(() =>
      validateUsageLimits({ finalizationWindow: 3 as unknown as { reserveCalls: number } }, 'x'),
    ).toThrowError(ConfigError);
  });

  it('accepts a well-formed window', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxToolCalls: 48,
          finalizationWindow: { reserveCalls: 6, allow: ['record_evidence'] },
        },
        'x',
      ),
    ).not.toThrow();
  });
});

describe('the durable window-entry decision (RV509)', () => {
  it('the window entry reports once through the decision hook with its exact state', async () => {
    const executions = { count: 0 };
    const entries: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(1) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 3,
        finalizationWindow: { reserveCalls: 2, allow: ['read'] },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      toolBudgetDurability: {
        onWindowEntry: (entry) => {
          entries.push(entry);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('ok');
    expect(entries).toEqual([{ remaining: 2, reserveCalls: 2, budget: 'tool calls' }]);
  });

  it('a restored entry keeps the summary honest after a grant raised the cap away from the window', async () => {
    const executions = { count: 0 };
    const entries: unknown[] = [];
    const adapter = scriptedAdapter(() => ({
      toolCall: { name: 'finish', args: { result: 'done' } },
    }));
    // The pre-crash segment entered the window at the base cap of 3,
    // then a grant raised the effective cap to 7: the restored counts
    // re-derive the grant (4 executed calls sit beyond the base cap)
    // but place the loop OUTSIDE the window, so only the journaled
    // entry decision can keep finalizationWindowEntered truthful.
    const restored: CheckpointState = {
      v: 1,
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'go' }] },
        {
          role: 'assistant',
          parts: Array.from({ length: 4 }, (_, index) => ({
            type: 'tool-call' as const,
            id: `call-${String(index)}`,
            name: 'read',
            args: {},
          })),
        },
        {
          role: 'tool',
          parts: Array.from({ length: 4 }, (_, index) => ({
            type: 'tool-result' as const,
            id: `call-${String(index)}`,
            name: 'read',
            result: { page: index + 1 },
          })),
        },
      ],
      turns: 1,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 4,
      schemaAttempts: 0,
      compaction: [],
    };
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 4,
        maxToolCalls: 3,
        toolBudgetExtension: { increment: 4, maxExtensions: 1 },
        finalizationWindow: { reserveCalls: 2, allow: ['read'] },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restored),
        save: () => Promise.resolve(),
      },
      toolBudgetDurability: {
        restored: { extensionsGranted: 1, finalizationWindowEntered: true },
        onWindowEntry: (entry) => {
          entries.push(entry);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('ok');
    expect(result.toolBudget).toEqual({
      used: 4,
      cap: 7,
      extensionsGranted: 1,
      finalizationWindowEntered: true,
    });
    // The entry restored from the journal: the hook stays silent and no
    // fresh notice enters the conversation.
    expect(entries).toEqual([]);
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });
});

describe('durable window entry before the gated call (RV601)', () => {
  const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1));

  it('no call inside the window executes until the entry decision is durable', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(1) : { toolCall: { name: 'finish', args: { result: 'done' } } },
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
        // The reserve spans the whole budget, so the batch's FIRST call
        // is already inside the window: the entry has to be durable
        // before that call, not after it.
        maxToolCalls: 3,
        finalizationWindow: { reserveCalls: 3, allow: ['read'] },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
      toolBudgetDurability: {
        onWindowEntry: () => {
          reached = true;
          return durable;
        },
      },
    });
    for (let attempt = 0; attempt < 200 && !reached; attempt += 1) {
      await tick();
    }
    expect(reached).toBe(true);
    // The window regime is not durable yet: the call it gates waits with
    // it, so no execution can outrun the record of the entry.
    await tick();
    expect(executions.count).toBe(0);
    release?.();
    const result = await pending;
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(1);
  });

  it('a rejected entry append records no window entry and fails the segment', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(1) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const rejection = Promise.reject(new Error('journal store unavailable'));
    rejection.catch(() => undefined);
    await expect(
      runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 4,
          maxToolCalls: 3,
          finalizationWindow: { reserveCalls: 3, allow: ['read'] },
        }),
        tools: runtimeOf([readTool(executions), finishTool()]),
        terminalTool: { name: 'finish' },
        toolBudgetDurability: { onWindowEntry: () => rejection },
      }),
    ).rejects.toThrow('journal store unavailable');
    expect(executions.count).toBe(0);
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });
});
