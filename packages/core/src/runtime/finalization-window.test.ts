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

  it('reserveForEvidenceDeficit widens the reserve to the outstanding floor plus the summary (RV1208)', async () => {
    // The sixteenth experiment's judged P1-1: the budget worker spent
    // 108 calls and still settled with 10 of 14 declared evidence
    // entries, because the window reserved a FIXED tail that the
    // deficit had long outgrown. With the opt-in, the reserve is at
    // least the outstanding deficit plus one summary call, so searching
    // stops while the floor is still closable.
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const evidenceRecorder = tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => {
        recordExecutions.count += 1;
        return Promise.resolve({ recorded: true });
      },
    });
    // The model searches until the window tells it to stop, then closes
    // the floor and finishes: the reserve decides how much it got.
    const adapter = scriptedAdapter((req) => {
      const noticed = windowNotices(req).length > 0;
      if (!noticed) {
        return reads(1);
      }
      return recordExecutions.count < 3
        ? { toolCall: { name: 'record_evidence', args: {} } }
        : { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 10,
        maxToolCalls: 10,
        // A one-call reserve would let the loop search until a single
        // call remains, three short of the floor.
        finalizationWindow: {
          reserveCalls: 1,
          allow: ['record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 3 },
      tools: runtimeOf([readTool(readExecutions), evidenceRecorder, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    // Deficit 3 plus the summary call widens the reserve to 4, so the
    // window binds after six executed reads, not after nine.
    expect(readExecutions.count).toBe(6);
    expect(recordExecutions.count).toBe(3);
    // The notice names the live deficit, so the model knows what the
    // reserved tail is FOR. It fires exactly once, as always.
    const notices = windowNotices(adapter.calls.at(-1) as { messages: Msg[] });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('3 more evidence');
  });

  describe('the window entry explains a reserve it did not configure (RV2601)', () => {
    // The fourth parity run entered finalization with reserveCalls 25
    // under a configured 20, and nothing durable said why: the model was
    // told the deficit in its notice, the journal got {remaining,
    // reserveCalls, budget}, and a reader after the fact could neither
    // explain the 25 nor see that the child owed its WHOLE floor at the
    // moment it stopped searching. Both numbers are the loop's own.
    const windowEntries = (): {
      seen: { remaining: number; reserveCalls: number; budget: string }[];
      durability: { onWindowEntry: (entry: unknown) => Promise<void> };
    } => {
      const seen: { remaining: number; reserveCalls: number; budget: string }[] = [];
      return {
        seen,
        durability: {
          onWindowEntry: (entry) => {
            seen.push(entry as { remaining: number; reserveCalls: number; budget: string });
            return Promise.resolve();
          },
        },
      };
    };

    it('names the deficit and the floor that widened it', async () => {
      const recordExecutions = { count: 0 };
      const evidenceRecorder = tool({
        name: 'record_evidence',
        description: 'records one evidence entry',
        parameters: z.strictObject({}),
        execute: () => {
          recordExecutions.count += 1;
          return Promise.resolve({ recorded: true });
        },
      });
      const adapter = scriptedAdapter((req) =>
        windowNotices(req).length === 0
          ? reads(1)
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
      );
      const { seen, durability } = windowEntries();
      const result = await runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 10,
          maxToolCalls: 10,
          finalizationWindow: {
            reserveCalls: 1,
            allow: ['record_evidence'],
            reserveForEvidenceDeficit: true,
          },
        }),
        evidenceContract: { minEntries: 3 },
        tools: runtimeOf([readTool({ count: 0 }), evidenceRecorder, finishTool()]),
        terminalTool: { name: 'finish' },
        toolBudgetDurability: durability,
      });
      expect(result.status).toBe('ok');
      // Nothing was recorded, so the whole floor is outstanding, and
      // the applied reserve is exactly the arithmetic the two fields
      // now carry: 3 outstanding plus the one summary call.
      expect(seen).toEqual([
        { remaining: 4, reserveCalls: 4, budget: 'tool calls', evidenceDeficit: 3, minEntries: 3 },
      ]);
    });

    it('says nothing extra when the configured reserve is what bound', async () => {
      // The vacuum contrast: the same run without the opt-in journals
      // the historical three fields, byte for byte.
      const adapter = scriptedAdapter((req) =>
        windowNotices(req).length === 0
          ? reads(1)
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
      );
      const { seen, durability } = windowEntries();
      const result = await runAgent({
        prompt: 'go',
        adapter,
        resolved,
        limits: mergeUsageLimits({
          maxTurns: 10,
          maxToolCalls: 10,
          finalizationWindow: { reserveCalls: 4, allow: ['record_evidence'] },
        }),
        evidenceContract: { minEntries: 3 },
        tools: runtimeOf([readTool({ count: 0 }), finishTool()]),
        terminalTool: { name: 'finish' },
        toolBudgetDurability: durability,
      });
      expect(result.status).toBe('ok');
      expect(seen).toEqual([{ remaining: 4, reserveCalls: 4, budget: 'tool calls' }]);
    });
  });

  it('the widened reserve shrinks as the floor closes and never narrows below the configured reserve (RV1208)', async () => {
    const readExecutions = { count: 0 };
    const evidenceRecorder = tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => Promise.resolve({ recorded: true }),
    });
    // The floor is already met, so the widened reserve collapses to the
    // configured one and the loop keeps its ordinary search budget.
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return { toolCall: { name: 'record_evidence', args: {} } };
      }
      if (call < 8) {
        return reads(1);
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 12,
        maxToolCalls: 10,
        finalizationWindow: {
          reserveCalls: 2,
          allow: ['record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 1 },
      tools: runtimeOf([readTool(readExecutions), evidenceRecorder, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    // One record plus reads until the configured two-call reserve.
    expect(readExecutions.count).toBe(7);
  });

  it('without the opt-in the window is byte-identical under the same contract (RV1208)', async () => {
    const readExecutions = { count: 0 };
    const evidenceRecorder = tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => Promise.resolve({ recorded: true }),
    });
    const adapter = scriptedAdapter((_req, call) => {
      if (call < 9) {
        return reads(1);
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 12,
        maxToolCalls: 10,
        finalizationWindow: { reserveCalls: 1, allow: ['record_evidence'] },
      }),
      evidenceContract: { minEntries: 3 },
      tools: runtimeOf([readTool(readExecutions), evidenceRecorder, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    // The historical contract: a fixed one-call reserve, so the loop
    // searches until nine calls are gone with the floor still open.
    expect(readExecutions.count).toBe(9);
  });

  it('rejects a malformed reserveForEvidenceDeficit typed (RV1208)', () => {
    expect(() =>
      validateUsageLimits(
        {
          finalizationWindow: {
            reserveCalls: 2,
            reserveForEvidenceDeficit: 'yes' as unknown as boolean,
          },
        },
        'RunOptions.limits',
      ),
    ).toThrow(ConfigError);
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

describe('the window notice is rendered at delivery, not at entry (RV4901, the tenth comparison experiment)', () => {
  // The tenth comparison experiment's security specialist entered the
  // window on the third call of a six call record_evidence batch. The
  // notice was composed right there, from the counts of that instant
  // and a deficit counted over the history alone, and delivered after
  // the batch: "7 of the reserved final 7 tool calls remain, record 4
  // more evidence entries first" when 3 calls remained and all six
  // entries were already recorded. The model obeyed to the letter,
  // the fourth extra call died at the cap, and a child with 9 entries
  // over a floor of 4 and a finished report settled 'limit'.
  const evidenceRecorder = (executions: { count: number }) =>
    tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => {
        executions.count += 1;
        return Promise.resolve({ recorded: true });
      },
    });
  const records = (n: number) => ({
    toolCalls: Array.from({ length: n }, () => ({ name: 'record_evidence', args: {} })),
  });

  it('a batch that enters the window mid way is told the counts that bind after it', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    // The specialist's own behavior: search, then one batch of six
    // entries, then exactly what the notice says (record N more when it
    // asks, finish otherwise).
    const adapter = scriptedAdapter((req, call) => {
      if (call === 0) {
        return reads(4);
      }
      if (call === 1) {
        return records(6);
      }
      const asked = /record (\d+) more evidence/u.exec(windowNotices(req).at(-1) ?? '');
      return asked === null
        ? { toolCall: { name: 'finish', args: { result: 'done' } } }
        : records(Number(asked[1]));
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 8,
        maxToolCalls: 12,
        toolBudgetNotices: true,
        // Deficit 4 plus the summary call widens the reserve to 5, so
        // the window opens before the FOURTH call of the batch, with
        // five calls remaining and a deficit of four by the history.
        finalizationWindow: {
          reserveCalls: 4,
          allow: ['record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 4 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    // Six entries, no surplus, an ok settle: the notice named the two
    // calls that actually remained and no deficit, so the model
    // finished instead of recording four entries it already had.
    expect(result.status).toBe('ok');
    expect(readExecutions.count).toBe(4);
    expect(recordExecutions.count).toBe(6);
    expect(result.toolBudget?.finalizationWindowEntered).toBe(true);
    const last = adapter.calls.at(-1) as { messages: Msg[] };
    expect(windowNotices(last)).toEqual([
      'Finalization window: 2 of the reserved final 4 tool calls remain. Only finalization ' +
        'tools (and the terminal tool) may execute now; record your evidence and finish with ' +
        'what you have.',
    ]);
    // The budget notice flushed right after it agrees on the count.
    expect(textsOf(last, 'Tool budget notice:')).toEqual([
      'Tool budget notice: 10 of 12 tool calls used; 2 remaining. Prioritize the highest ' +
        'value calls and finish with what you have.',
    ]);
  });

  it('an entry at the batch boundary reads exactly as before when the batch recorded nothing', async () => {
    // The pre RV4901 bytes for the common case: the window opens on the
    // last call of a search batch, so the counts at the entry ARE the
    // counts at the flush, and the deficit is the whole declared floor.
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((req) =>
      windowNotices(req).length === 0
        ? reads(1)
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 12,
        maxToolCalls: 10,
        finalizationWindow: {
          reserveCalls: 1,
          allow: ['record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 3 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(readExecutions.count).toBe(6);
    expect(windowNotices(adapter.calls.at(-1) as { messages: Msg[] })).toEqual([
      'Finalization window: 4 of the reserved final 4 tool calls remain. Only finalization ' +
        'tools (and the terminal tool) may execute now; record your evidence and finish with ' +
        'what you have. This tail is reserved for your declared evidence floor: record 3 ' +
        'more evidence entries first.',
    ]);
  });

  it('a window a boundary grant re opened before the flush keeps its entry snapshot', async () => {
    // The one case the live regime cannot describe: the RV809 deficit
    // grant fires at the same boundary, BEFORE the flush, and moves the
    // remaining budget back out of the window. The live arithmetic is
    // then no window at all, so the entry is delivered as it always
    // was, after the grant notice that explains the new count.
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(5) : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 6,
        maxToolCalls: 8,
        toolBudgetExtension: { increment: 5, maxExtensions: 1, coverEvidenceDeficit: true },
        // Reads stay allowlisted so the batch keeps executing inside
        // the window; the entry fires before the fourth read (five
        // remaining against a reserve of five), and the fifth read
        // leaves three remaining, short of the deficit of four.
        finalizationWindow: {
          reserveCalls: 1,
          allow: ['read', 'record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 4 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(readExecutions.count).toBe(5);
    expect(result.toolBudget?.extensionsGranted).toBe(1);
    const last = adapter.calls.at(-1) as { messages: Msg[] };
    const userTexts = last.messages
      .filter((msg) => msg.role === 'user')
      .flatMap((msg) => msg.parts)
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text);
    const grantAt = userTexts.findIndex((text) => text.startsWith('Tool budget extended:'));
    const windowAt = userTexts.findIndex((text) => text.startsWith('Finalization window:'));
    expect(grantAt).toBeGreaterThan(-1);
    expect(windowAt).toBe(grantAt + 1);
    expect(userTexts[windowAt]).toBe(
      'Finalization window: 5 of the reserved final 5 tool calls remain. Only finalization ' +
        'tools (and the terminal tool) may execute now; record your evidence and finish with ' +
        'what you have. This tail is reserved for your declared evidence floor: record 4 ' +
        'more evidence entries first.',
    );
  });
});

describe('the surplus answer turn (RV4902, the tenth comparison experiment)', () => {
  // The security specialist died at 36 of 36 on ONE surplus
  // record_evidence call, with nine entries over a floor of four and a
  // finished report in hand: an overrun on the bookkeeping the window
  // itself invited was a terminal limit. Under onSurplus 'answer' the
  // tail is answered typed and the model gets exactly one answer turn.
  const evidenceRecorder = (executions: { count: number }) =>
    tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({}),
      execute: () => {
        executions.count += 1;
        return Promise.resolve({ recorded: true });
      },
    });
  const records = (n: number) => ({
    toolCalls: Array.from({ length: n }, () => ({ name: 'record_evidence', args: {} })),
  });
  const surplusNotices = (req: { messages: Msg[] }): string[] =>
    textsOf(req, 'Finalization surplus:');
  const limitsOf = (onSurplus?: 'limit' | 'answer') =>
    mergeUsageLimits({
      maxTurns: 8,
      maxToolCalls: 6,
      finalizationWindow: {
        reserveCalls: 2,
        allow: ['record_evidence'],
        ...(onSurplus === undefined ? {} : { onSurplus }),
      },
    });
  const SURPLUS_NOTICE =
    'Finalization surplus: the tool budget expired inside the finalization window and 1 ' +
    'allowlisted call was skipped; your declared evidence floor is met. Answer now: call the ' +
    "'finish' tool with your final result; any further tool call ends the run at the limit.";

  it('an allowlisted overrun with the floor met grants one answer turn and settles ok', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    // Four reads open the window on their last call; three records
    // then overrun the cap by one; the model finishes on the granted turn.
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? reads(4)
        : call === 1
          ? records(3)
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    expect(recordExecutions.count).toBe(2);
    expect(result.toolBudget).toEqual({
      used: 6,
      cap: 6,
      finalizationWindowEntered: true,
      surplusAnswerTurn: true,
    });
    const last = adapter.calls.at(-1) as { messages: Msg[] };
    expect(surplusNotices(last)).toEqual([SURPLUS_NOTICE]);
    // The skipped call is answered typed, with the surplus named.
    const skipped = refusalsOf(last, 'record_evidence');
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toEqual({
      error:
        'skipped: the tool budget is exhausted inside the finalization window; the call was ' +
        'not executed',
      limiter: 'maxToolCalls',
      skipped: true,
      surplus: true,
    });
  });

  it('an overrun with the floor still open stays a limit', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? reads(4)
        : call === 1
          ? records(3)
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 4 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('limit');
    expect(result.toolBudget?.limiter).toBe('maxToolCalls');
    expect(result.toolBudget?.surplusAnswerTurn).toBeUndefined();
    for (const call of adapter.calls) {
      expect(surplusNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });

  it('an overrun on a call outside the allowlist stays a limit', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? reads(4)
        : call === 1
          ? {
              toolCalls: [
                { name: 'record_evidence', args: {} },
                { name: 'record_evidence', args: {} },
                { name: 'read', args: {} },
              ],
            }
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('limit');
    expect(recordExecutions.count).toBe(2);
    for (const call of adapter.calls) {
      expect(surplusNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
  });

  it('the answer turn is granted once: a further tool call ends the run at the limit', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(4) : call === 1 ? records(3) : records(1),
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('limit');
    expect(result.toolBudget?.limiter).toBe('maxToolCalls');
    expect(result.toolBudget?.surplusAnswerTurn).toBe(true);
    expect(adapter.calls).toHaveLength(3);
    expect(surplusNotices(adapter.calls.at(-1) as { messages: Msg[] })).toHaveLength(1);
  });

  it('the default posture keeps the historical limit byte for byte', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? reads(4)
        : call === 1
          ? records(3)
          : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: limitsOf(),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([
        readTool(readExecutions),
        evidenceRecorder(recordExecutions),
        finishTool(),
      ]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('limit');
    expect(adapter.calls).toHaveLength(2);
    expect(result.toolBudget).toEqual({
      used: 6,
      cap: 6,
      finalizationWindowEntered: true,
      limiter: 'maxToolCalls',
    });
  });

  it('a segment restored inside the granted turn finishes on it and never gets a second', async () => {
    // The pre kill segment carried the surplus notice; the restored
    // window counts it, so the finish is admitted and a further tool
    // call would end the run, exactly as in the live segment.
    const restoredMessages = (): Msg[] => [
      { role: 'user', parts: [{ type: 'text', text: 'go' }] },
      { role: 'user', parts: [{ type: 'text', text: SURPLUS_NOTICE }] },
    ];
    const restoredState = (): CheckpointState => ({
      v: 1,
      messages: restoredMessages(),
      turns: 2,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 6,
      schemaAttempts: 0,
      compaction: [],
    });
    const recordExecutions = { count: 0 };
    const finishing = scriptedAdapter(() => ({
      toolCall: { name: 'finish', args: { result: 'done' } },
    }));
    const finished = await runAgent({
      prompt: 'go',
      adapter: finishing,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([evidenceRecorder(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: { load: () => Promise.resolve(restoredState()), save: () => Promise.resolve() },
    });
    expect(finished.status).toBe('ok');
    expect(surplusNotices(finishing.calls[0] as { messages: Msg[] })).toHaveLength(1);
    const overrunning = scriptedAdapter(() => records(1));
    const overrun = await runAgent({
      prompt: 'go',
      adapter: overrunning,
      resolved,
      limits: limitsOf('answer'),
      evidenceContract: { minEntries: 2 },
      tools: runtimeOf([evidenceRecorder(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: { load: () => Promise.resolve(restoredState()), save: () => Promise.resolve() },
    });
    expect(overrun.status).toBe('limit');
    expect(overrunning.calls).toHaveLength(1);
    expect(recordExecutions.count).toBe(0);
  });

  it('rejects a malformed onSurplus typed', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxToolCalls: 6,
          finalizationWindow: { reserveCalls: 2, onSurplus: 'maybe' as unknown as 'answer' },
        },
        'limits',
      ),
    ).toThrow(ConfigError);
  });
});

describe('the evidence distribution widens the reserve and names the category (RV4908)', () => {
  it('a met total with a short category still widens the reserve, and the notice names the gap', async () => {
    // The tenth comparison experiment's task wanted citations across
    // implementation, tests, docs, and examples; the specialists cited
    // documentation alone, and no contract could say otherwise.
    const readExecutions = { count: 0 };
    const recorded: string[] = [];
    const recorder = tool({
      name: 'record_evidence',
      description: 'records one evidence entry',
      parameters: z.strictObject({ file: z.string() }),
      execute: (input) => {
        recorded.push(input.file);
        return Promise.resolve({ recorded: true });
      },
    });
    const record = (file: string) => ({ toolCall: { name: 'record_evidence', args: { file } } });
    const adapter = scriptedAdapter((req, call) => {
      if (call === 0) {
        return {
          toolCalls: [
            { name: 'record_evidence', args: { file: 'docs/guide/agents.md' } },
            { name: 'record_evidence', args: { file: 'docs/guide/budgets.md' } },
          ],
        };
      }
      const notice = windowNotices(req).at(-1);
      if (notice === undefined) {
        return reads(1);
      }
      return recorded.length < 4
        ? record(recorded.length === 2 ? 'src/a.ts' : 'src/b.ts')
        : { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 14,
        maxToolCalls: 10,
        finalizationWindow: {
          reserveCalls: 1,
          allow: ['record_evidence'],
          reserveForEvidenceDeficit: true,
        },
      }),
      evidenceContract: { minEntries: 2, distribution: { implementation: 2 } },
      tools: runtimeOf([readTool(readExecutions), recorder, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    // Two docs entries met minEntries, but the implementation category
    // was two short: the reserve widened to three, so the window opened
    // after five reads (seven calls used), not after nine.
    expect(readExecutions.count).toBe(5);
    expect(recorded).toEqual([
      'docs/guide/agents.md',
      'docs/guide/budgets.md',
      'src/a.ts',
      'src/b.ts',
    ]);
    const notices = windowNotices(adapter.calls.at(-1) as { messages: Msg[] });
    expect(notices).toEqual([
      'Finalization window: 3 of the reserved final 3 tool calls remain. Only finalization ' +
        'tools (and the terminal tool) may execute now; record your evidence and finish with ' +
        'what you have. This tail is reserved for your declared evidence floor: record 2 ' +
        'more evidence entries first (implementation: 2 more).',
    ]);
    expect(result.evidence).toEqual({
      recordedEntries: 4,
      minEntries: 2,
      met: true,
      byCategory: { implementation: { recorded: 2, required: 2 } },
    });
  });
});
