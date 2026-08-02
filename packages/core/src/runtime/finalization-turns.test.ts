import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CheckpointState } from '../journal/checkpoint.js';
import { ConfigError } from '../l0/errors.js';
import type { Msg } from '../l0/messages.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { scriptedAdapter } from '../engine/test-harness.js';
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

describe('the finalization turns reserve (RV1405, the seventeenth comparison experiment)', () => {
  it('reserves the trailing turns: a non-allowlisted call is refused and an allowlisted one executes', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return reads(1);
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
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      // No tool budget at all: the seventeenth experiment's worker burned
      // maxTurns 28 at 66 of 96 tool calls with no finalize phase; the
      // turns axis needs its own reserved tail.
      limits: mergeUsageLimits({
        maxTurns: 4,
        finalizationTurns: { reserveTurns: 2, allow: ['record'] },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    // Turn 1 (3 turns remain) explored freely; turn 2 (2 of 4 turns
    // remain) is inside the reserve: the read is refused typed, the
    // allowlisted record executes.
    expect(readExecutions.count).toBe(1);
    expect(recordExecutions.count).toBe(1);
    expect(result.toolBudget).toEqual({
      used: 2,
      finalizationWindowEntered: true,
    });
    const notices = windowNotices(adapter.calls[2]);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain('2 of the reserved final 2 turns remain');
    const refusals = refusalsOf(adapter.calls[2], 'read');
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.guard).toBe('finalization-window');
    expect(refusals[0]?.error).toContain('the last 2 turns are reserved');
  });

  it('the notice, the refusal, and the durable entry all carry the TURNS reserve, not the calls reserve', async () => {
    const readExecutions = { count: 0 };
    const recordExecutions = { count: 0 };
    const entries: unknown[] = [];
    const adapter = scriptedAdapter((_req, call) => {
      if (call === 0) {
        return reads(1);
      }
      if (call === 1) {
        return { toolCall: { name: 'record', args: {} } };
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      // Both dimensions configured with DIFFERENT reserves: the turns
      // axis binds first (2 of 3 turns remain at the first batch, while
      // 10 calls sit far above the one-call reserve), and every surface
      // must name the turns reserve.
      limits: mergeUsageLimits({
        maxTurns: 3,
        maxToolCalls: 10,
        finalizationWindow: { reserveCalls: 1, allow: ['record'] },
        finalizationTurns: { reserveTurns: 2 },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      toolBudgetDurability: {
        onWindowEntry: (entry) => {
          entries.push(entry);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('ok');
    expect(readExecutions.count).toBe(0);
    expect(recordExecutions.count).toBe(1);
    expect(entries).toEqual([{ remaining: 2, reserveCalls: 2, budget: 'turns' }]);
    const notices = adapter.calls.flatMap((req) => windowNotices(req as { messages: Msg[] }));
    expect(new Set(notices).size).toBe(1);
    expect(notices[0]).toContain('2 of the reserved final 2 turns remain');
    const refusals = refusalsOf(adapter.calls[1], 'read');
    expect(refusals).toHaveLength(1);
    expect(refusals[0]?.error).toContain('the last 2 turns are reserved');
    expect(result.toolBudget).toEqual({
      used: 1,
      cap: 10,
      finalizationWindowEntered: true,
    });
  });

  it('the terminal tool is always admitted inside the turns reserve, an empty allowlist included', async () => {
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
        maxTurns: 2,
        finalizationTurns: { reserveTurns: 2, allow: [] },
      }),
      tools: runtimeOf([readTool(readExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('done');
    expect(readExecutions.count).toBe(0);
  });

  it('a resumed segment already inside the turns reserve keeps refusing without re-firing the notice', async () => {
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
      turns: 3,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      toolCallsUsed: 0,
      schemaAttempts: 0,
      compaction: [],
    };
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 5,
        finalizationTurns: { reserveTurns: 2, allow: ['record'] },
      }),
      tools: runtimeOf([readTool(readExecutions), recordTool(recordExecutions), finishTool()]),
      terminalTool: { name: 'finish' },
      checkpoint: {
        load: () => Promise.resolve(restored),
        save: () => Promise.resolve(),
      },
    });
    expect(result.status).toBe('ok');
    // 3 restored turns of 5 put the segment inside the reserve at boot:
    // the read is refused, the record executes, and no fresh notice is
    // appended (the pre-kill segment already carried it).
    expect(readExecutions.count).toBe(0);
    expect(recordExecutions.count).toBe(1);
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
    }
    expect(result.toolBudget).toEqual({
      used: 1,
      finalizationWindowEntered: true,
    });
  });

  it('without an explicit allowlist the zero-cost bookkeeping tools are the reserve tools', async () => {
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
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: {} },
              { name: 'note', args: {} },
            ],
          }
        : { toolCall: { name: 'finish', args: { result: 'done' } } },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({
        maxTurns: 3,
        toolUnits: { max: 10, costs: { read: 1, note: 0 } },
        finalizationTurns: { reserveTurns: 2 },
      }),
      tools: runtimeOf([readTool(readExecutions), note, finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(readExecutions.count).toBe(0);
    expect(noteExecutions.count).toBe(1);
    expect(result.toolBudget).toEqual({
      used: 1,
      unitsUsed: 0,
      unitsMax: 10,
      finalizationWindowEntered: true,
    });
  });

  it('a turns reserve that never activates leaves the conversation untouched and still reports the snapshot', async () => {
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
        maxTurns: 10,
        finalizationTurns: { reserveTurns: 2 },
      }),
      tools: runtimeOf([readTool(executions), finishTool()]),
      terminalTool: { name: 'finish' },
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(1);
    // The snapshot exists (the turns reserve is pressure configuration
    // like a cap), but nothing about the window is claimed.
    expect(result.toolBudget).toEqual({ used: 1 });
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
      expect(JSON.stringify(call)).not.toContain('finalization window');
    }
  });

  it('without the knob a maxTurns expiry stays byte-identical to before', async () => {
    const executions = { count: 0 };
    const adapter = scriptedAdapter(() => reads(1));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ maxTurns: 2 }),
      tools: runtimeOf([readTool(executions)]),
    });
    expect(result.status).toBe('limit');
    expect(executions.count).toBe(2);
    expect(result.toolBudget).toBeUndefined();
    for (const call of adapter.calls) {
      expect(windowNotices(call as { messages: Msg[] })).toHaveLength(0);
      expect(JSON.stringify(call)).not.toContain('finalization window');
    }
  });
});

describe('finalizationTurns validation', () => {
  it('rejects malformed fields with typed ConfigErrors naming the site', () => {
    expect(() => validateUsageLimits({ finalizationTurns: { reserveTurns: 0 } }, 'x')).toThrowError(
      ConfigError,
    );
    expect(() => validateUsageLimits({ finalizationTurns: { reserveTurns: 0 } }, 'x')).toThrowError(
      /x\.finalizationTurns\.reserveTurns/,
    );
    expect(() =>
      validateUsageLimits({ finalizationTurns: { reserveTurns: 1.5 } }, 'x'),
    ).toThrowError(/x\.finalizationTurns\.reserveTurns/);
    expect(() =>
      validateUsageLimits(
        { finalizationTurns: { reserveTurns: 2, allow: 'record' as unknown as string[] } },
        'x',
      ),
    ).toThrowError(/x\.finalizationTurns\.allow/);
    expect(() =>
      validateUsageLimits(
        { finalizationTurns: { reserveTurns: 2, allow: [3 as unknown as string] } },
        'x',
      ),
    ).toThrowError(/x\.finalizationTurns\.allow/);
    expect(() =>
      validateUsageLimits({ finalizationTurns: 3 as unknown as { reserveTurns: number } }, 'x'),
    ).toThrowError(ConfigError);
  });

  it('accepts a well-formed turns reserve', () => {
    expect(() =>
      validateUsageLimits(
        {
          maxTurns: 28,
          finalizationTurns: { reserveTurns: 3, allow: ['record_evidence'] },
        },
        'x',
      ),
    ).not.toThrow();
  });
});
