import { describe, expect, it } from 'vitest';
import { PlanInvariantError, ReplayPlanHashMismatch } from '@rulvar/core';
import type { AdmissionDecision, JournalEntry, NodeId } from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { type PlanNode, type PlanNodeStatus } from './plan-state.js';
import {
  applyPlanEntry,
  effectiveDroppedStreak,
  planDecisionKey,
  planRevisionKey,
  type PlanDecisionValue,
  type PlanFoldState,
  type PlanOp,
  type PlanRevisionValue,
  type PlanReviseRequest,
  type RebaseOutcome,
} from './plan-entries.js';
import { rebasePlanRevision, type RebaseContext, type RebaseEvaluation } from './rebase.js';
import type { TaskSpec } from './task-spec.js';

const nid = (letter: string): string => letter.repeat(26);

function node(letter: string, status: PlanNodeStatus, patch?: Partial<PlanNode>): PlanNode {
  return {
    nodeId: nid(letter),
    logicalTaskId: nid('X'),
    status,
    deps: [],
    waivedDeps: [],
    parkRequested: false,
    cancelRequested: false,
    priority: 0,
    promptSpecHash: 'p'.repeat(64),
    ...patch,
  };
}

function foldOf(nodes: PlanNode[], patch?: Partial<PlanFoldState>): PlanFoldState {
  const byId: Record<string, PlanNode> = {};
  const specs: Record<string, TaskSpec> = {};
  for (const item of nodes) {
    byId[item.nodeId] = item;
    specs[item.nodeId] = { agentType: 'worker', prompt: `work ${item.nodeId}` };
  }
  return {
    plan: { nodes: byId, revisionCount: 0, droppedRevisionStreak: 0 },
    specs,
    badBaseStreak: 0,
    doneRefs: {},
    ...patch,
  };
}

const DIGESTS: Record<number, string> = {};
function contextOf(state: PlanFoldState, patch?: Partial<RebaseContext>): RebaseContext {
  DIGESTS[7] = planHash(state.plan);
  let minted = 0;
  return {
    state,
    digestPlanHashFor: (digestSeq) => DIGESTS[digestSeq],
    mintNodeId: (): NodeId => {
      minted += 1;
      return `01TESTNODE${String(minted).padStart(16, '0')}`;
    },
    admitAdd: (op, nodeId) => admitDecision(nodeId, op.lineage?.continues),
    admitUnpark: (op) => admitDecision(op.nodeId),
    ...patch,
  };
}

function admitDecision(nodeId: string, continues?: string): AdmissionDecision {
  const logicalTaskId = continues ?? `LT-${nodeId}`;
  return {
    verdict: {
      kind: 'admit',
      reserve: { reserveUsd: 0 },
      spawnUnitsAfter: 99,
      lineage: { logicalTaskId, isNew: continues === undefined, depth: 1 },
    },
    statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 0, depth: 1 },
    nodeId,
  };
}

function baseOf(state: PlanFoldState): { digestSeq: number; planHash: string } {
  return { digestSeq: 7, planHash: planHash(state.plan) };
}

function requestOf(state: PlanFoldState, ops: PlanOp[]): PlanReviseRequest {
  return { base: baseOf(state), ops, rationale: 'test revision' };
}

const SPEC: TaskSpec = { agentType: 'worker', prompt: 'do the thing' };

/** Builds the journaled plan.revision entry from an evaluation. */
let entrySeq = 100;
function revisionEntryOf(request: PlanReviseRequest, evaluation: RebaseEvaluation): JournalEntry {
  entrySeq += 1;
  const value: PlanRevisionValue = {
    base: request.base,
    requestedOps: request.ops,
    outcomes: evaluation.outcomes,
    assignedNodeIds: evaluation.assignedNodeIds,
    admissions: evaluation.admissions,
    planHashBefore: evaluation.planHashBefore,
    planHashAfter: evaluation.planHashAfter,
    hashVersion: 2,
    rationale: request.rationale,
  };
  return {
    hashVersion: 2,
    seq: entrySeq,
    scope: 'plan',
    key: planRevisionKey(request.base, request.ops),
    ordinal: 0,
    kind: 'plan.revision',
    status: 'ok',
    value: value as unknown as JournalEntry['value'],
    spanId: 's',
    startedAt: '2026-07-09T00:00:00.000Z',
  };
}

function decisionEntryOf(
  state: PlanFoldState,
  value: Omit<PlanDecisionValue, 'planHashBefore' | 'hashVersion'>,
): JournalEntry {
  entrySeq += 1;
  return {
    hashVersion: 2,
    seq: entrySeq,
    scope: 'plan',
    key: planDecisionKey(value.origin, value.ops, value.causeRef),
    ordinal: 0,
    kind: 'plan.decision',
    status: 'ok',
    value: {
      ...value,
      planHashBefore: planHash(state.plan),
      hashVersion: 2,
    } as unknown as JournalEntry['value'],
    spanId: 's',
    startedAt: '2026-07-09T00:00:00.000Z',
  };
}

function outcomeOf(evaluation: RebaseEvaluation, index = 0): RebaseOutcome {
  return evaluation.outcomes[index];
}

describe('the conflict resolution table (docs/07, 3.6): every row', () => {
  it('add_task: admission rejects => dropped admission_denied with the verdict embedded', () => {
    const state = foldOf([]);
    const evaluation = rebasePlanRevision(requestOf(state, [{ op: 'add_task', spec: SPEC }]), {
      ...contextOf(state),
      admitAdd: (op, nodeId) => ({
        verdict: { kind: 'reject', reason: { code: 'quota' } },
        statsBefore: { spawnsBefore: 0, childrenOfParentBefore: 16, depth: 1 },
        nodeId,
      }),
    });
    expect(outcomeOf(evaluation)).toMatchObject({ kind: 'dropped', reason: 'admission_denied' });
    expect(evaluation.admissions).toHaveLength(1);
    expect(evaluation.droppedAll).toBe(true);
  });

  it('add_task: dep on a terminally unsuccessful node still applies (no silent waive)', () => {
    const state = foldOf([node('F', 'failed')]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [{ op: 'add_task', spec: SPEC, deps: [nid('F')] }]),
      contextOf(state),
    );
    expect(outcomeOf(evaluation).kind).toBe('applied');
    const added = Object.values(evaluation.working.plan.nodes).find((n) =>
      n.deps.includes(nid('F')),
    );
    // The node stays blocked and surfaces via quiescence.
    expect(added?.status).toBe('pending');
  });

  it('add_task: lineage exhausted or busy at the head drops (DEF-3)', () => {
    const state = foldOf([]);
    for (const verdict of ['lineage_busy', 'lineage_exhausted'] as const) {
      const evaluation = rebasePlanRevision(
        requestOf(state, [
          { op: 'add_task', spec: SPEC, lineage: { continues: 'L1', causeRef: 3 } },
        ]),
        { ...contextOf(state), lineageCheck: () => verdict },
      );
      expect(outcomeOf(evaluation)).toMatchObject({ kind: 'dropped', reason: verdict });
    }
  });

  it('add_task: otherwise applied with the NodeId assigned by the engine', () => {
    const state = foldOf([]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [{ op: 'add_task', spec: SPEC, priority: 3 }]),
      contextOf(state),
    );
    const outcome = outcomeOf(evaluation);
    expect(outcome.kind).toBe('applied');
    expect(evaluation.assignedNodeIds[0]).toBeDefined();
    const nodeId = evaluation.assignedNodeIds[0];
    expect(evaluation.working.plan.nodes[nodeId]).toMatchObject({ status: 'ready', priority: 3 });
    // The admission's minted LTID rides into the node (DEF-3).
    expect(evaluation.working.plan.nodes[nodeId]?.logicalTaskId).toBe(`LT-${nodeId}`);
  });

  it('amend_task: pending or ready applies and re-hashes the resolved spec', () => {
    const state = foldOf([node('A', 'pending')]);
    const before = state.plan.nodes[nid('A')]?.promptSpecHash;
    const evaluation = rebasePlanRevision(
      requestOf(state, [{ op: 'amend_task', nodeId: nid('A'), spec: { prompt: 'new prompt' } }]),
      contextOf(state),
    );
    expect(outcomeOf(evaluation).kind).toBe('applied');
    expect(evaluation.working.plan.nodes[nid('A')]?.promptSpecHash).not.toBe(before);
    expect(evaluation.working.specs[nid('A')]?.prompt).toBe('new prompt');
  });

  it('amend_task: parked transforms with checkpoint_discarded (unpark becomes restart)', () => {
    const state = foldOf([node('P', 'parked', { checkpointRef: 55 })]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [{ op: 'amend_task', nodeId: nid('P'), spec: { prompt: 'again' } }]),
      contextOf(state),
    );
    expect(outcomeOf(evaluation)).toMatchObject({
      kind: 'transformed',
      reason: 'checkpoint_discarded',
    });
    expect(evaluation.working.plan.nodes[nid('P')]?.checkpointRef).toBeUndefined();
  });

  it('amend_task: running, escalated, and terminal statuses drop', () => {
    const state = foldOf([
      node('R', 'running'),
      node('E', 'escalated'),
      node('D', 'done'),
      node('C', 'cancelled'),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'amend_task', nodeId: nid('R'), spec: {} },
        { op: 'amend_task', nodeId: nid('E'), spec: {} },
        { op: 'amend_task', nodeId: nid('D'), spec: {} },
        { op: 'amend_task', nodeId: nid('C'), spec: {} },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes.map((o) => (o.kind === 'dropped' ? o.reason : o.kind))).toEqual([
      'node_running',
      'node_escalated',
      'terminal_status',
      'terminal_status',
    ]);
  });

  it('park_task: the five rows', () => {
    const state = foldOf([
      node('A', 'ready'),
      node('R', 'running'),
      node('E', 'escalated'),
      node('P', 'parked'),
      node('D', 'done'),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'park_task', nodeId: nid('A') },
        { op: 'park_task', nodeId: nid('R') },
        { op: 'park_task', nodeId: nid('E') },
        { op: 'park_task', nodeId: nid('P') },
        { op: 'park_task', nodeId: nid('D') },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]?.kind).toBe('applied');
    expect(evaluation.working.plan.nodes[nid('A')]?.status).toBe('parked');
    // Running: parkRequested = true; the park lands at the turn boundary.
    expect(evaluation.outcomes[1]?.kind).toBe('applied');
    expect(evaluation.working.plan.nodes[nid('R')]).toMatchObject({
      status: 'running',
      parkRequested: true,
    });
    expect(
      evaluation.outcomes.slice(2).map((o) => (o.kind === 'dropped' ? o.reason : o.kind)),
    ).toEqual(['node_escalated', 'already_parked', 'terminal_status']);
  });

  it('unpark_task: parked applies with an embedded admission reserve; the rest drop', () => {
    const state = foldOf([
      node('P', 'parked', { checkpointRef: 9 }),
      node('A', 'ready'),
      node('D', 'done'),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'unpark_task', nodeId: nid('P') },
        { op: 'unpark_task', nodeId: nid('A') },
        { op: 'unpark_task', nodeId: nid('D') },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]?.kind).toBe('applied');
    expect(evaluation.admissions.some((item) => item.nodeId === nid('P'))).toBe(true);
    expect(evaluation.working.plan.nodes[nid('P')]?.status).toBe('ready');
    expect(
      evaluation.outcomes.slice(1).map((o) => (o.kind === 'dropped' ? o.reason : o.kind)),
    ).toEqual(['not_parked', 'terminal_status']);
  });

  it('cancel_task: pending applies with the engine-computed cascade (done excluded)', () => {
    const state = foldOf([
      node('A', 'pending'),
      node('B', 'pending', { deps: [nid('A')] }),
      node('C', 'pending', { deps: [nid('B')] }),
      node('D', 'done', { deps: [nid('A')] }),
      node('W', 'running', { deps: [nid('A')], waivedDeps: [nid('A')] }),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [{ op: 'cancel_task', nodeId: nid('A'), reason: 'obsolete' }]),
      contextOf(state),
    );
    const outcome = outcomeOf(evaluation);
    expect(outcome.kind).toBe('applied');
    const applied = outcome.kind === 'applied' ? outcome.op : undefined;
    expect(applied).toMatchObject({ op: 'cancel_task', cascadeNodeIds: [nid('B'), nid('C')] });
    expect(evaluation.working.plan.nodes[nid('A')]?.status).toBe('cancelled');
    expect(evaluation.working.plan.nodes[nid('B')]?.status).toBe('skipped');
    expect(evaluation.working.plan.nodes[nid('C')]?.status).toBe('skipped');
    expect(evaluation.working.plan.nodes[nid('D')]?.status).toBe('done');
    expect(evaluation.working.plan.nodes[nid('W')]?.status).toBe('running');
  });

  it('cancel_task: running applies as cancelRequested; escalated transforms; done and terminal drop', () => {
    const state = foldOf([
      node('R', 'running'),
      node('E', 'escalated'),
      node('D', 'done'),
      node('F', 'failed'),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'cancel_task', nodeId: nid('R') },
        { op: 'cancel_task', nodeId: nid('E') },
        { op: 'cancel_task', nodeId: nid('D') },
        { op: 'cancel_task', nodeId: nid('F') },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]?.kind).toBe('applied');
    expect(evaluation.working.plan.nodes[nid('R')]).toMatchObject({
      status: 'running',
      cancelRequested: true,
    });
    expect(evaluation.outcomes[1]).toMatchObject({
      kind: 'transformed',
      reason: 'resolved_escalation',
    });
    expect(
      evaluation.outcomes.slice(2).map((o) => (o.kind === 'dropped' ? o.reason : o.kind)),
    ).toEqual(['node_already_done', 'terminal_status']);
  });

  it('reprioritize: any non-terminal applies; terminal drops', () => {
    const state = foldOf([node('A', 'running'), node('D', 'skipped')]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'reprioritize', nodeId: nid('A'), priority: 9 },
        { op: 'reprioritize', nodeId: nid('D'), priority: 9 },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]?.kind).toBe('applied');
    expect(evaluation.working.plan.nodes[nid('A')]?.priority).toBe(9);
    expect(evaluation.outcomes[1]).toMatchObject({ kind: 'dropped', reason: 'terminal_status' });
  });

  it('rewire_deps: cycles drop whole; running drops; done edges transform; dead edges stay', () => {
    const state = foldOf([
      node('A', 'pending', { deps: [nid('B')] }),
      node('B', 'pending'),
      node('R', 'running'),
      node('D', 'done'),
      node('F', 'failed'),
    ]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'rewire_deps', nodeId: nid('B'), deps: [nid('A')] },
        { op: 'rewire_deps', nodeId: nid('R'), deps: [] },
        { op: 'rewire_deps', nodeId: nid('A'), deps: [nid('D'), nid('F')] },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]).toMatchObject({ kind: 'dropped', reason: 'dep_cycle' });
    expect(evaluation.outcomes[1]).toMatchObject({ kind: 'dropped', reason: 'node_running' });
    // Edges onto done prune (immediately satisfied); edges onto failed
    // remain blocking.
    expect(evaluation.outcomes[2]).toMatchObject({
      kind: 'transformed',
      reason: 'immediate_satisfaction',
    });
    expect(evaluation.working.plan.nodes[nid('A')]?.deps).toEqual([nid('F')]);
    expect(evaluation.working.plan.nodes[nid('A')]?.status).toBe('pending');
  });

  it('waive_dep: the four rows, with blockingRef on the resolved drop', () => {
    const state = foldOf(
      [
        node('D', 'done'),
        node('F', 'failed'),
        node('B', 'pending'),
        node('A', 'pending', {
          deps: [nid('D'), nid('F'), nid('B')],
          waivedDeps: [],
        }),
      ],
      { doneRefs: { [nid('D')]: 77 } },
    );
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'waive_dep', nodeId: nid('A'), dep: nid('D') },
        { op: 'waive_dep', nodeId: nid('A'), dep: nid('F') },
        { op: 'waive_dep', nodeId: nid('A'), dep: nid('B') },
        { op: 'waive_dep', nodeId: nid('A'), dep: nid('Z') },
        { op: 'waive_dep', nodeId: nid('A'), dep: nid('F') },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]).toMatchObject({
      kind: 'dropped',
      reason: 'dep_already_resolved',
      blockingRef: 77,
    });
    // Terminally unsuccessful upstream: dead, not resolved; the waive
    // unblocks. A still-blocking dep waives too.
    expect(evaluation.outcomes[1]?.kind).toBe('applied');
    expect(evaluation.outcomes[2]?.kind).toBe('applied');
    expect(evaluation.outcomes[3]).toMatchObject({ kind: 'dropped', reason: 'no_such_dep' });
    // Intra-revision sequencing: the F waive already applied above.
    expect(evaluation.outcomes[4]).toMatchObject({ kind: 'dropped', reason: 'already_waived' });
  });

  it('any op under the at-cap freeze drops with plan_frozen (DEF-7)', () => {
    const state = foldOf([node('A', 'pending')]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'reprioritize', nodeId: nid('A'), priority: 1 },
        { op: 'add_task', spec: SPEC },
      ]),
      { ...contextOf(state), frozen: true },
    );
    expect(
      evaluation.outcomes.every((o) => o.kind === 'dropped' && o.reason === 'plan_frozen'),
    ).toBe(true);
  });

  it('whole revision: a stale or foreign base drops everything with bad_base', () => {
    const state = foldOf([node('A', 'pending')]);
    const evaluation = rebasePlanRevision(
      {
        base: { digestSeq: 7, planHash: 'f'.repeat(64) },
        ops: [{ op: 'reprioritize', nodeId: nid('A'), priority: 1 }],
        rationale: 'hallucinated base',
      },
      contextOf(state),
    );
    expect(evaluation.badBase).toBe(true);
    expect(evaluation.outcomes[0]).toMatchObject({ kind: 'dropped', reason: 'bad_base' });
    expect(evaluation.planHashAfter).toBe(evaluation.planHashBefore);
  });
});

describe('intra-revision self-conflicts resolve sequentially (docs/07, 3.9)', () => {
  it('cancel_task X then amend_task X: the amend lands on cancelled', () => {
    const state = foldOf([node('A', 'pending')]);
    const evaluation = rebasePlanRevision(
      requestOf(state, [
        { op: 'cancel_task', nodeId: nid('A') },
        { op: 'amend_task', nodeId: nid('A'), spec: { prompt: 'too late' } },
      ]),
      contextOf(state),
    );
    expect(evaluation.outcomes[0]?.kind).toBe('applied');
    expect(evaluation.outcomes[1]).toMatchObject({ kind: 'dropped', reason: 'terminal_status' });
  });
});

describe('the applied (not requested) diff replays (docs/07, 3.9)', () => {
  it('folds the journaled entry to the byte-identical planHashAfter', () => {
    const state = foldOf([node('D', 'done'), node('A', 'pending', { deps: [nid('D'), nid('A')] })]);
    // A request mixing applied, transformed, and dropped outcomes.
    const request = requestOf(state, [
      { op: 'add_task', spec: SPEC, deps: [nid('D')] },
      { op: 'rewire_deps', nodeId: nid('A'), deps: [nid('D')] },
      { op: 'reprioritize', nodeId: nid('Z'), priority: 1 },
    ]);
    const evaluation = rebasePlanRevision(request, contextOf(state));
    expect(evaluation.outcomes.map((o) => o.kind)).toEqual(['applied', 'transformed', 'dropped']);
    const entry = revisionEntryOf(request, evaluation);
    const folded = applyPlanEntry(state, entry);
    expect(planHash(folded.plan)).toBe(evaluation.planHashAfter);
    expect(folded.plan.revisionCount).toBe(1);
    expect(folded.plan.droppedRevisionStreak).toBe(0);
    // The transformed rewire pruned the satisfied edge in the fold too.
    expect(folded.plan.nodes[nid('A')]?.deps).toEqual([]);
  });

  it('raises ReplayPlanHashMismatch on a corrupted planHashAfter', () => {
    const state = foldOf([node('A', 'pending')]);
    const request = requestOf(state, [{ op: 'reprioritize', nodeId: nid('A'), priority: 2 }]);
    const evaluation = rebasePlanRevision(request, contextOf(state));
    const entry = revisionEntryOf(request, evaluation);
    (entry.value as { planHashAfter: string }).planHashAfter = 'f'.repeat(64);
    expect(() => applyPlanEntry(state, entry)).toThrow(ReplayPlanHashMismatch);
  });

  it('bad_base entries fold to identical hashed state and lengthen the guard streak', () => {
    const state = foldOf([node('A', 'pending')]);
    const request: PlanReviseRequest = {
      base: { digestSeq: 7, planHash: 'f'.repeat(64) },
      ops: [{ op: 'reprioritize', nodeId: nid('A'), priority: 1 }],
      rationale: 'stale',
    };
    const evaluation = rebasePlanRevision(request, contextOf(state));
    const entry = revisionEntryOf(request, evaluation);
    const folded = applyPlanEntry(state, entry);
    expect(planHash(folded.plan)).toBe(planHash(state.plan));
    expect(folded.badBaseStreak).toBe(1);
    expect(effectiveDroppedStreak(folded)).toBe(1);
    // bad-base-streak-terminates: consecutive bad_base entries keep
    // lengthening the effective streak for RevisionGuards (M7-T06).
    const again = applyPlanEntry(folded, revisionEntryOf(request, evaluation));
    expect(effectiveDroppedStreak(again)).toBe(2);
  });
});

describe('plan.decision fold (docs/07, 3.3): engine authorship at the head', () => {
  it('applies child-result transitions, extinguishes flags, and records doneRefs', () => {
    const state = foldOf([node('R', 'running', { parkRequested: true })]);
    const entry = decisionEntryOf(state, {
      origin: 'child-result',
      causeRef: 90,
      ops: [
        {
          kind: 'set_node_status',
          nodeId: nid('R'),
          from: 'running',
          to: 'done',
          cause: 'child-result',
          causeRef: 90,
        },
      ],
      planHashAfter: '',
    });
    // Compute the after-hash by applying to a scratch copy first.
    const expected = foldOf([node('R', 'done')]);
    (entry.value as { planHashAfter: string }).planHashAfter = planHash(expected.plan);
    const folded = applyPlanEntry(state, entry);
    // park-races-child-completion: the terminal transition extinguishes
    // the pending park flag; the node goes done; no orphaned flags.
    expect(folded.plan.nodes[nid('R')]).toMatchObject({
      status: 'done',
      parkRequested: false,
    });
    expect(folded.doneRefs[nid('R')]).toBe(90);
  });

  it('rejects a recorded from-status that disagrees with the fold head', () => {
    const state = foldOf([node('R', 'ready')]);
    const entry = decisionEntryOf(state, {
      origin: 'child-result',
      causeRef: 91,
      ops: [
        {
          kind: 'set_node_status',
          nodeId: nid('R'),
          from: 'running',
          to: 'done',
          cause: 'child-result',
          causeRef: 91,
        },
      ],
      planHashAfter: 'x',
    });
    expect(() => applyPlanEntry(state, entry)).toThrow(PlanInvariantError);
  });

  it('spawn_admitted adds decomposition children with fresh LTIDs', () => {
    const state = foldOf([node('E', 'escalated')]);
    const children = [
      { nodeId: nid('G'), logicalTaskId: 'LT-G', spec: SPEC },
      { nodeId: nid('H'), logicalTaskId: 'LT-H', spec: SPEC },
    ];
    const scratch = foldOf([
      node('E', 'escalated'),
      node('G', 'ready', { logicalTaskId: 'LT-G', promptSpecHash: '' }),
      node('H', 'ready', { logicalTaskId: 'LT-H', promptSpecHash: '' }),
    ]);
    const entry = decisionEntryOf(state, {
      origin: 'escalation-live',
      causeRef: 92,
      ops: [
        {
          kind: 'spawn_admitted',
          nodes: children,
          admission: admitDecision(nid('G')),
        },
      ],
      planHashAfter: '',
    });
    // Fix the expected hash via a first fold pass.
    void scratch;
    const provisional = applyPlanEntryLoose(state, entry);
    (entry.value as { planHashAfter: string }).planHashAfter = planHash(provisional.plan);
    const folded = applyPlanEntry(state, entry);
    expect(folded.plan.nodes[nid('G')]).toMatchObject({ status: 'ready', logicalTaskId: 'LT-G' });
    expect(folded.plan.nodes[nid('H')]).toMatchObject({ status: 'ready', logicalTaskId: 'LT-H' });
  });
});

describe('revise-racing-defaultDecision (cassette shape)', () => {
  it('drops the stale trio with the exact reasons and blockingRef', () => {
    // The orchestrator slept; an engine defaultDecision resolved the
    // upstream (done at seq 120), a second node escalated, a third
    // completed. The wake reads a stale digest and submits one revision.
    const state = foldOf(
      [
        node('U', 'done'),
        node('A', 'ready', { deps: [nid('U')], waivedDeps: [] }),
        node('E', 'escalated'),
        node('D', 'done'),
      ],
      { doneRefs: { [nid('U')]: 120 } },
    );
    // The base pair references an OLDER but genuine digest: conflicts are
    // evaluated at the head, not against the base (docs/07, 3.5 step 3).
    DIGESTS[6] = 'stale-but-recorded';
    const evaluation = rebasePlanRevision(
      {
        base: { digestSeq: 6, planHash: 'stale-but-recorded' },
        ops: [
          { op: 'waive_dep', nodeId: nid('A'), dep: nid('U') },
          { op: 'park_task', nodeId: nid('E') },
          { op: 'cancel_task', nodeId: nid('D') },
        ],
        rationale: 'woke on a stale digest',
      },
      contextOf(state),
    );
    expect(evaluation.badBase).toBe(false);
    expect(evaluation.outcomes).toMatchObject([
      { kind: 'dropped', reason: 'dep_already_resolved', blockingRef: 120 },
      { kind: 'dropped', reason: 'node_escalated' },
      { kind: 'dropped', reason: 'node_already_done' },
    ]);
    expect(evaluation.droppedAll).toBe(true);
    expect(evaluation.planHashAfter).not.toBe(evaluation.planHashBefore);
  });
});

/** First-pass helper: folds without the after-hash assertion. */
function applyPlanEntryLoose(state: PlanFoldState, entry: JournalEntry): PlanFoldState {
  const clone: JournalEntry = {
    ...entry,
    value: JSON.parse(JSON.stringify(entry.value)) as JournalEntry['value'],
  };
  const value = clone.value as { planHashAfter?: string };
  try {
    return applyPlanEntry(state, clone);
  } catch (thrown) {
    if (thrown instanceof ReplayPlanHashMismatch) {
      const data = thrown.data as { actual?: string };
      if (typeof data.actual === 'string') {
        value.planHashAfter = data.actual;
        return applyPlanEntry(state, clone);
      }
    }
    throw thrown;
  }
}
