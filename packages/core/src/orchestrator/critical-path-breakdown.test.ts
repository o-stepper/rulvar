/**
 * The post-fan-in decomposition on a REAL engine stream (RV710): the
 * eleventh comparison experiment measured 245.6 seconds (45.5 percent
 * of wall) sitting after fan-in with zero synthesis share, and nothing
 * in the telemetry could say where. The vocabulary already records
 * every piece (coordination phase pairs, tool executions with
 * durations, the synthesize span); what was missing was the fold. This
 * e2e pins that `reduceCriticalPath` decomposes the live post-fan-in
 * window of an orchestration run into named buckets whose residue is
 * scheduling overhead, not work: fixed-size gaps between activations,
 * so the share shrinks as real work grows (the synthetic tests in
 * synthesis.test.ts pin the arithmetic at the 5 percent scale).
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { WorkflowEvent } from '../l0/events.js';
import { reduceCriticalPath } from '../l0/telemetry-reduce.js';
import { createEngine } from '../engine/engine.js';
import { scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
      }
    }
  }
  return handles;
}

describe('post-fan-in decomposition on a live orchestration stream (RV710)', () => {
  it('names the coordination model, tool, and synthesis buckets with bounded residue', async () => {
    // Post-fan-in coordination turns carry real wall time (hangMs), so
    // the covered buckets dominate the window and the residue is the
    // scheduler's own overhead between activations.
    let orchTurn = 0;
    const coordination = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'evidence' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'study A' } },
        };
      }
      if (orchTurn === 2) {
        return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
      }
      if (orchTurn === 3) {
        return {
          hangMs: 120,
          toolCall: { name: 'get_child_result', args: { handle: handlesIn(req)[0] ?? -1 } },
        };
      }
      return { hangMs: 120, toolCall: { name: 'finish', args: { result: 'draft' } } };
    });
    const synthesis = scriptedAdapter(
      (): ScriptedTurn => ({
        hangMs: 120,
        toolCall: { name: 'finish', args: { result: 'synthesized' } },
      }),
      { id: 'strong' },
    );
    const engine = createEngine({
      adapters: [coordination, synthesis],
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
        profiles: { worker: { description: 'does one task' } },
      },
    });
    const handle = engine.run(
      makeOrchestratorWorkflow('compare', {
        exposeChildResultTools: true,
        synthesis: {},
      }),
      undefined,
    );
    const events: WorkflowEvent[] = [];
    for await (const event of handle.events) {
      events.push(event);
    }
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('synthesized');

    const path = reduceCriticalPath(events);
    expect(path.postFanInMs).toBeDefined();
    const breakdown = path.postFanIn;
    expect(breakdown).toBeDefined();
    if (breakdown === undefined || path.postFanInMs === undefined) {
      return;
    }
    // The two post-fan-in coordination activations carry 120ms each.
    expect(breakdown.coordinationModelMs).toBeGreaterThanOrEqual(200);
    // The synthesize span covers its own 120ms activation.
    expect(breakdown.synthesisMs).toBeGreaterThanOrEqual(100);
    // Pagination and the finish exchange register under their own
    // names even when the executions themselves are sub-millisecond.
    expect(Object.keys(breakdown.coordinationToolMsByName)).toContain('get_child_result');
    expect(Object.keys(breakdown.coordinationToolMsByName)).toContain('finish');
    // The decomposition is exact: covered plus residue is the window.
    expect(breakdown.coveredMs + breakdown.residueMs).toBe(path.postFanInMs);
    // The residue is scheduling overhead between activations, bounded
    // well under the covered work (loose for CI wall-clock jitter; the
    // synthetic pins hold the 5 percent property at exact arithmetic).
    expect(breakdown.residueShare).toBeDefined();
    expect(breakdown.residueShare ?? 1).toBeLessThanOrEqual(0.2);

    // The model bucket is itself profiled (RV1211): the sixteenth
    // experiment read 222.6 seconds of coordination model time as one
    // number, which says nothing about whether the tail is drafting,
    // repairing, or summarizing. The turns are counted and split by
    // the activation role that spent them.
    // The model bucket is itself profiled (RV1211): the sixteenth
    // experiment read 222.6 seconds of coordination model time as one
    // number, which is activation WALL and silently contains every
    // tool the coordinator called inside it.
    expect(breakdown.coordinationModelMsByPhase.orchestrate).toBeGreaterThanOrEqual(200);
    // The split accounts for the bucket exactly: no activation lands
    // in the total without landing under a name.
    const byPhase = Object.values(breakdown.coordinationModelMsByPhase).reduce(
      (sum, ms) => sum + ms,
      0,
    );
    expect(byPhase).toBe(breakdown.coordinationModelMs);
    // The coordinator's own thinking time is the activation wall with
    // the nested tool executions removed (the exact arithmetic, and
    // the overlap case a live fixture cannot stage, are pinned
    // synthetically in synthesis.test.ts).
    expect(breakdown.coordinationModelOnlyMs).toBeLessThanOrEqual(breakdown.coordinationModelMs);
    expect(breakdown.coordinationModelOnlyMs).toBeGreaterThanOrEqual(
      breakdown.coordinationModelMs - breakdown.coordinationToolMs,
    );
    // Tool CALLS are counted beside their milliseconds: two sub-ms
    // pagination calls and one slow one are the same number of
    // milliseconds and a completely different tail.
    expect(breakdown.coordinationToolCallsByName.get_child_result).toBe(1);
    expect(breakdown.coordinationToolCallsByName.finish).toBe(1);
  });
});
