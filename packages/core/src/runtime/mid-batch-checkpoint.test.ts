/**
 * The mid-batch checkpoint boundary (RV408, the eighth-experiment
 * review): checkpoints write once per COMPLETED tool turn, so a kill
 * inside one large parallel batch used to re-pay every executed call of
 * that batch on resume (the tool-cap-before-checkpoint window, where
 * the whole executed-call budget can fit into the first batch). The
 * opt-in `limits.checkpointEveryToolCalls` bounds the window: every K
 * executed calls the loop writes the SAME pending state the ask
 * suspension already checkpoints, so a resume reuses the executed
 * prefix verbatim and re-runs only the calls since the last boundary.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CheckpointState } from '../journal/checkpoint.js';
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { ResolvedInvocation } from '../model/router.js';
import { tool, toolContract } from '../tools/tool.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { runAgent, type PermissionGate, type ToolRuntime } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

const resolved: ResolvedInvocation = {
  ref: 'fake:model',
  adapterId: 'fake',
  model: 'model',
  canonical: { kind: 'model', model: 'fake:model' },
  scrubs: [],
};

function runtimeOf(defs: ToolDef[], deny?: string): ToolRuntime {
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
    ...(deny === undefined
      ? {}
      : {
          permission: (call): Promise<PermissionGate> =>
            Promise.resolve(
              call.name === deny
                ? { kind: 'deny', reason: 'blocked by the test policy' }
                : { kind: 'allow', input: call.args },
            ),
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

const blockedTool = () =>
  tool({
    name: 'blocked',
    description: 'never allowed to run',
    parameters: z.strictObject({}),
    execute: () => Promise.reject(new Error('must never execute')),
  });

const reads = (n: number) => ({
  toolCalls: Array.from({ length: n }, () => ({ name: 'read', args: {} })),
});

function capturingCheckpoint(
  saved: CheckpointState[],
  load?: CheckpointState,
): { load(): Promise<CheckpointState | undefined>; save(state: CheckpointState): Promise<void> } {
  return {
    load: () => Promise.resolve(load),
    save: (state) => {
      saved.push(structuredClone(state));
      return Promise.resolve();
    },
  };
}

describe('the mid-batch checkpoint boundary (RV408)', () => {
  it('writes the pending boundary every K executed calls inside one batch', async () => {
    const executions = { count: 0 };
    const saved: CheckpointState[] = [];
    const adapter = scriptedAdapter((_req, call) => (call === 0 ? reads(5) : { text: 'done' }));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ checkpointEveryToolCalls: 2 }),
      tools: runtimeOf([readTool(executions)]),
      checkpoint: capturingCheckpoint(saved),
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(5);
    const boundaries = saved.filter((state) => state.pending !== undefined);
    expect(boundaries).toHaveLength(2);
    // After 2 executed: the prefix is durable, the 3rd call is next.
    expect(boundaries[0]?.pending?.executed).toHaveLength(2);
    expect(boundaries[0]?.pending?.remaining).toHaveLength(2);
    expect(boundaries[0]?.toolCallsUsed).toBe(2);
    // After 4 executed: only the 5th call remains.
    expect(boundaries[1]?.pending?.executed).toHaveLength(4);
    expect(boundaries[1]?.pending?.remaining).toHaveLength(0);
    expect(boundaries[1]?.toolCallsUsed).toBe(4);
    // The completed turn still writes its ordinary boundary, no pending.
    expect(saved.some((state) => state.pending === undefined && state.turns >= 1)).toBe(true);
  });

  it('never writes a boundary after the batch tail (the turn boundary covers it)', async () => {
    const executions = { count: 0 };
    const saved: CheckpointState[] = [];
    const adapter = scriptedAdapter((_req, call) => (call === 0 ? reads(4) : { text: 'done' }));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ checkpointEveryToolCalls: 2 }),
      tools: runtimeOf([readTool(executions)]),
      checkpoint: capturingCheckpoint(saved),
    });
    expect(result.status).toBe('ok');
    // Cadence hits at 2 (mid-batch) and at 4, but 4 is the LAST call:
    // the turn boundary lands right after, so no pending is written
    // there.
    const boundaries = saved.filter((state) => state.pending !== undefined);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]?.pending?.executed).toHaveLength(2);
  });

  it('stays byte-identical without the option: one boundary per completed turn', async () => {
    const executions = { count: 0 };
    const saved: CheckpointState[] = [];
    const adapter = scriptedAdapter((_req, call) => (call === 0 ? reads(5) : { text: 'done' }));
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({}),
      tools: runtimeOf([readTool(executions)]),
      checkpoint: capturingCheckpoint(saved),
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(5);
    expect(saved.filter((state) => state.pending !== undefined)).toHaveLength(0);
  });

  it('a kill at the boundary re-pays only the calls since it (the acceptance)', async () => {
    // Pass 1: the live batch with cadence 2; the intermediate boundary
    // at 2 executed calls is exactly what a kill right after it leaves
    // durable.
    const firstExecutions = { count: 0 };
    const saved: CheckpointState[] = [];
    const firstAdapter = scriptedAdapter((_req, call) =>
      call === 0 ? reads(5) : { text: 'done' },
    );
    await runAgent({
      prompt: 'go',
      adapter: firstAdapter,
      resolved,
      limits: mergeUsageLimits({ checkpointEveryToolCalls: 2 }),
      tools: runtimeOf([readTool(firstExecutions)]),
      checkpoint: capturingCheckpoint(saved),
    });
    const killPoint = saved.find((state) => state.pending?.executed.length === 2);
    expect(killPoint).toBeDefined();

    // Pass 2: resume from the boundary state. The restored prefix is
    // reused verbatim; only the awaiting call and the remaining tail
    // execute, so the double payment is bounded by the cadence, never
    // the whole batch.
    const resumedExecutions = { count: 0 };
    const resumedSaves: CheckpointState[] = [];
    const resumeAdapter = scriptedAdapter(() => ({ text: 'done' }));
    const resumed = await runAgent({
      prompt: 'go',
      adapter: resumeAdapter,
      resolved,
      limits: mergeUsageLimits({ checkpointEveryToolCalls: 2 }),
      tools: runtimeOf([readTool(resumedExecutions)]),
      checkpoint: capturingCheckpoint(resumedSaves, killPoint),
    });
    expect(resumed.status).toBe('ok');
    expect(resumedExecutions.count).toBe(3);
    // The finished turn carries all five results: two restored, three
    // executed on resume.
    const firstRequest = resumeAdapter.calls[0] as {
      messages: Array<{ role: string; parts: Array<{ type: string }> }>;
    };
    const toolMessage = [...firstRequest.messages]
      .reverse()
      .find((message) => message.role === 'tool');
    expect(toolMessage?.parts.filter((part) => part.type === 'tool-result')).toHaveLength(5);
  });

  it('denied calls do not advance the cadence: only executions count', async () => {
    const executions = { count: 0 };
    const saved: CheckpointState[] = [];
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCalls: [
              { name: 'read', args: {} },
              { name: 'blocked', args: {} },
              { name: 'read', args: {} },
              { name: 'read', args: {} },
            ],
          }
        : { text: 'done' },
    );
    const result = await runAgent({
      prompt: 'go',
      adapter,
      resolved,
      limits: mergeUsageLimits({ checkpointEveryToolCalls: 2 }),
      tools: runtimeOf([readTool(executions), blockedTool()], 'blocked'),
      checkpoint: capturingCheckpoint(saved),
    });
    expect(result.status).toBe('ok');
    expect(executions.count).toBe(3);
    // The second EXECUTION is the third call, so the one boundary lands
    // there, carrying the denied call's error result in the prefix.
    const boundaries = saved.filter((state) => state.pending !== undefined);
    expect(boundaries).toHaveLength(1);
    expect(boundaries[0]?.pending?.executed).toHaveLength(3);
    expect(boundaries[0]?.pending?.remaining).toHaveLength(0);
  });
});
