/**
 * P1 of the v1.7.0 follow-up review: a journaled PlanRunner admit must
 * guarantee its child dispatch, and an op whose declared estimate cannot
 * fit the child budget bounces with the actionable correction BEFORE it
 * changes plan state or consumes a spawn unit. The residual class
 * (facts that changed between admit and dispatch) lands as a terminal
 * plan decision instead of stranding the node.
 */
import { describe, expect, it } from 'vitest';
import {
  createEngine,
  foldTermination,
  InMemoryStore,
  makeOrchestratorWorkflow,
} from '@rulvar/core';
import type { ChatRequest, JournalEntry } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner } from './plan-runner.js';
import { agentTypeOf, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());
const BUDGET = { capUsd: 5, finalizeReserveUsd: 1 };

function reviseTurn(
  base: { digestSeq: number; planHash: string },
  ops: unknown[],
  rationale: string,
): ScriptedTurn {
  return { toolCall: { name: 'plan_revise', args: { base, ops, rationale } } };
}

function baseOf(req: ChatRequest): { digestSeq: number; planHash: string } {
  const prompt = JSON.stringify(req.messages);
  const match = /"digestSeq":(\d+),"planHash":"([a-f0-9]+)"/.exec(prompt);
  return match === null
    ? { digestSeq: 0, planHash: EMPTY_PLAN_HASH }
    : { digestSeq: Number(match[1]), planHash: match[2] ?? '' };
}

function engineWith(
  adapter: ReturnType<typeof scriptedAdapter>,
  store: InMemoryStore,
  profiles: Record<string, unknown>,
  budgetDefaults?: Record<string, number>,
) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: profiles as never,
    },
    ...(budgetDefaults === undefined ? {} : { budgetDefaults }),
  });
}

function revisionsOf(entries: readonly JournalEntry[]) {
  return entries
    .filter((entry) => entry.kind === 'plan.revision')
    .map(
      (entry) =>
        entry.value as {
          outcomes: Array<{ kind: string; reason?: string }>;
        },
    );
}

function decisionsOf(entries: readonly JournalEntry[], origin: string) {
  return entries.filter(
    (entry) =>
      entry.kind === 'plan.decision' &&
      (entry.value as { origin?: string } | undefined)?.origin === origin,
  );
}

describe('plan admission is atomic with child dispatch admission', () => {
  it('bounces an op whose declared estCost cannot fit the child budget, before any state change', async () => {
    // The review's exact live shape: profile estCost 0.015, two
    // add_task ops each carrying budgetUsd 0.01.
    let phase = 0;
    const secondPrompts: string[] = [];
    const makeAdapter = () =>
      scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'worker done' };
        }
        const prompt = JSON.stringify(req.messages);
        phase += 1;
        if (phase === 1) {
          return reviseTurn(
            baseOf(req),
            [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'part one', budgetUsd: 0.01 },
              },
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'part two', budgetUsd: 0.01 },
              },
            ],
            'two impossible tasks',
          );
        }
        if (phase === 2) {
          // The corrective revision the typed reason asks for.
          secondPrompts.push(prompt);
          return reviseTurn(
            baseOf(req),
            [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'part one', budgetUsd: 0.03 },
              },
            ],
            'corrected budget',
          );
        }
        if (phase === 3) {
          return {
            toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
          };
        }
        return { toolCall: { name: 'finish', args: { result: 'recovered' } } };
      });

    const store = new InMemoryStore();
    const profiles = { worker: { description: 'w', estCost: 0.015 } };
    const adapter = makeAdapter();
    const events: Array<{ applied: number; dropped: number }> = [];
    const handle = orchestratePlanned(
      engineWith(adapter, store, profiles),
      'impossible then fixed',
      {
        budget: BUDGET,
      },
    );
    const off = handle.on('plan:revised', (event) => {
      events.push({
        applied: (event as { applied: number }).applied,
        dropped: (event as { dropped: number }).dropped,
      });
    });
    const outcome = await handle.result;
    off();
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('recovered');

    const entries = await store.load(handle.runId);
    const revisions = revisionsOf(entries);
    expect(revisions).toHaveLength(2);
    // Acceptance 2: no op is recorded applied/admitted if it cannot
    // dispatch. Both impossible ops dropped with the typed reason
    // embedded in the journaled admissions.
    expect(revisions[0]?.outcomes.map((o) => o.kind)).toEqual(['dropped', 'dropped']);
    expect(revisions[0]?.outcomes.map((o) => o.reason)).toEqual([
      'admission_denied',
      'admission_denied',
    ]);
    const firstRevision = entries.find((entry) => entry.kind === 'plan.revision')?.value as {
      admissions: Array<{ opIndex: number; decision: { verdict: { reason?: unknown } } }>;
    };
    const reason = firstRevision.admissions[0]?.decision.verdict.reason as {
      code: string;
      estCostUsd: number;
      childCeilingUsd: number;
      minimumBudgetUsd: number;
      childAccount: string;
      message: string;
    };
    // Acceptance 5: the tool result names the child account, requested
    // and resolved reserve, child ceiling, and the minimum correction.
    expect(reason.code).toBe('reserve_exceeds_budget');
    expect(reason.estCostUsd).toBe(0.015);
    expect(reason.childCeilingUsd).toBe(0.01);
    expect(reason.minimumBudgetUsd).toBe(0.015);
    expect(reason.childAccount).toMatch(/^plan\//);
    expect(reason.message).toContain('0.0150');
    expect(secondPrompts[0]).toContain('reserve_exceeds_budget');
    expect(secondPrompts[0]).toContain('0.0150');
    // Acceptance 3: spawn units are unchanged for rejected ops. Only
    // the corrected op consumed one (default S0 = 128).
    const folded = foldTermination(entries);
    expect(folded?.account.snapshot().spawnUnitsRemaining).toBe(127);
    // Acceptance 4: no ready/running node is stranded. The dropped ops
    // created no nodes; the corrected node ran to done.
    const okChildren = entries.filter(
      (entry) => entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'ok',
    );
    expect(okChildren).toHaveLength(1);
    expect(decisionsOf(entries, 'dispatch-rejected')).toHaveLength(0);
    // Acceptance 6: the revision lifecycle emitted telemetry for BOTH
    // revisions, including the fully-dropped one.
    expect(events).toEqual([
      { applied: 0, dropped: 2 },
      { applied: 1, dropped: 0 },
    ]);

    // Acceptance 8: resume replays the shape without duplicating any
    // debit, decision, or provider call.
    phase = 0;
    const adapter2 = makeAdapter();
    const resumed = await engineWith(adapter2, store, profiles).resume(
      handle.runId,
      makeOrchestratorWorkflow('impossible then fixed', {
        budget: BUDGET,
        extension: planRunner({}),
      }),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(adapter2.calls).toHaveLength(0);
    const after = await store.load(handle.runId);
    expect(revisionsOf(after)).toHaveLength(2);
    expect(foldTermination(after)?.account.snapshot().spawnUnitsRemaining).toBe(127);
  });

  it('positive control: fitting estimates dispatch, settle done, and finish through one wake', async () => {
    let phase = 0;
    const makeAdapter = () =>
      scriptedAdapter((req): ScriptedTurn => {
        if (agentTypeOf(req) === 'worker') {
          return { text: 'worker done' };
        }
        phase += 1;
        if (phase === 1) {
          return reviseTurn(
            baseOf(req),
            [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'part one', budgetUsd: 0.03 },
              },
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: 'part two', budgetUsd: 0.03 },
              },
            ],
            'two feasible tasks',
          );
        }
        if (phase === 2) {
          return {
            toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
          };
        }
        return { toolCall: { name: 'finish', args: { result: 'both done' } } };
      });
    const store = new InMemoryStore();
    const profiles = { worker: { description: 'w', estCost: 0.005 } };
    const adapter = makeAdapter();
    const handle = orchestratePlanned(engineWith(adapter, store, profiles), 'feasible pair', {
      budget: BUDGET,
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('both done');
    expect(outcome.cost.orchestrator.wakes).toBe(1);

    const entries = await store.load(handle.runId);
    expect(revisionsOf(entries)[0]?.outcomes.map((o) => o.kind)).toEqual(['applied', 'applied']);
    const okChildren = entries.filter(
      (entry) => entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'ok',
    );
    expect(okChildren).toHaveLength(2);
    expect(foldTermination(entries)?.account.snapshot().spawnUnitsRemaining).toBe(126);

    // Resume: nothing is repaid, nothing duplicated.
    phase = 0;
    const adapter2 = makeAdapter();
    const resumed = await engineWith(adapter2, store, profiles).resume(
      handle.runId,
      makeOrchestratorWorkflow('feasible pair', { budget: BUDGET, extension: planRunner({}) }),
    ).result;
    expect(resumed.status).toBe('ok');
    expect(adapter2.calls).toHaveLength(0);
    expect(revisionsOf(await store.load(handle.runId))).toHaveLength(1);
  });

  it('a dispatch refused by facts that changed after admit lands a terminal plan decision, never a strand', async () => {
    // The residual class the projection cannot see: the engine lifetime
    // spawn cap is checked read-only as headroom > 0 at admit, but each
    // dispatch consumes it. With cap 2 (orchestrator + one worker), the
    // second admitted worker's dispatch is refused; the node must land
    // terminally failed while the first worker and the run proceed.
    let phase = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'worker done' };
      }
      phase += 1;
      if (phase === 1) {
        return reviseTurn(
          baseOf(req),
          [
            { op: 'add_task', spec: { agentType: 'worker', prompt: 'part one' } },
            { op: 'add_task', spec: { agentType: 'worker', prompt: 'part two' } },
          ],
          'two tasks against a tiny spawn cap',
        );
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'partial but scheduled' } } };
    });
    const store = new InMemoryStore();
    const events: string[] = [];
    const handle = orchestratePlanned(
      engineWith(adapter, store, { worker: { description: 'w' } }, { lifetimeSpawnCap: 2 }),
      'tiny spawn cap',
      { budget: BUDGET },
    );
    const offRevised = handle.on('plan:revised', () => {
      events.push('plan:revised');
    });
    const outcome = await handle.result;
    offRevised();
    // The lifetime cap is an exhaustion condition by definition; the
    // run still completes with the finish value, and the revision
    // telemetry survived the scheduling fault.
    expect(outcome.value).toBe('partial but scheduled');
    expect(events).toContain('plan:revised');

    const entries = await store.load(handle.runId);
    expect(revisionsOf(entries)[0]?.outcomes.map((o) => o.kind)).toEqual(['applied', 'applied']);
    // One worker ran; the other node landed terminally failed through
    // the journaled dispatch-rejected decision. Nothing is stranded
    // ready/running without a dispatch root or terminal decision.
    const rejectedDecisions = decisionsOf(entries, 'dispatch-rejected');
    expect(rejectedDecisions).toHaveLength(1);
    const ops = (
      rejectedDecisions[0]?.value as {
        ops: Array<{ from: string; to: string; cause: string }>;
      }
    ).ops;
    expect(ops[0]).toMatchObject({ from: 'ready', to: 'failed', cause: 'dispatch-rejected' });
    const okChildren = entries.filter(
      (entry) => entry.kind === 'agent' && entry.scope.startsWith('plan/') && entry.status === 'ok',
    );
    expect(okChildren).toHaveLength(1);
  });
});
