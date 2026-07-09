import { describe, expect, it } from 'vitest';
import { PlanInvariantError } from '@lurker/core';

import {
  PLAN_SCOPE,
  assertPlanTransition,
  depsSatisfied,
  emptyPlan,
  isTerminalPlanStatus,
  recomputePlanReadiness,
  wouldCreateDepCycle,
  type PlanNode,
  type PlanNodeStatus,
  type TaskPlan,
} from './plan-state.js';

/** 26-char Crockford ULID stand-ins keyed by one letter. */
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

function planOf(...nodes: PlanNode[]): TaskPlan {
  const byId: Record<string, PlanNode> = {};
  for (const item of nodes) {
    byId[item.nodeId] = item;
  }
  return { nodes: byId, revisionCount: 0, droppedRevisionStreak: 0 };
}

describe('plan scope substrate (docs/07, 3.1-3.2)', () => {
  it('names the single sequential plan scope', () => {
    expect(PLAN_SCOPE).toBe('plan');
  });

  it('classifies exactly done, failed, cancelled, skipped as terminal', () => {
    const terminal: PlanNodeStatus[] = ['done', 'failed', 'cancelled', 'skipped'];
    const live: PlanNodeStatus[] = ['pending', 'ready', 'running', 'parked', 'escalated'];
    for (const status of terminal) {
      expect(isTerminalPlanStatus(status)).toBe(true);
    }
    for (const status of live) {
      expect(isTerminalPlanStatus(status)).toBe(false);
    }
  });
});

describe('assertPlanTransition (the closed status machine)', () => {
  it('rejects every exit from a terminal status (done is immutable)', () => {
    for (const from of ['done', 'failed', 'cancelled', 'skipped'] as const) {
      expect(() => assertPlanTransition(node('A', from), 'ready')).toThrow(PlanInvariantError);
    }
  });

  it('rejects a transition restating the current status', () => {
    expect(() => assertPlanTransition(node('A', 'ready'), 'ready')).toThrow(PlanInvariantError);
  });

  it("enters 'running' only from 'ready'", () => {
    expect(() => assertPlanTransition(node('A', 'ready'), 'running')).not.toThrow();
    for (const from of ['pending', 'parked', 'escalated'] as const) {
      expect(() => assertPlanTransition(node('A', from), 'running')).toThrow(PlanInvariantError);
    }
  });

  it('allows the park-landed and cancel-landed transitions of a running node', () => {
    expect(() => assertPlanTransition(node('A', 'running'), 'parked')).not.toThrow();
    expect(() => assertPlanTransition(node('A', 'running'), 'cancelled')).not.toThrow();
    expect(() => assertPlanTransition(node('A', 'running'), 'done')).not.toThrow();
    expect(() => assertPlanTransition(node('A', 'running'), 'escalated')).not.toThrow();
  });

  it('carries the machine violation as typed plan_invariant data', () => {
    try {
      assertPlanTransition(node('A', 'done'), 'ready');
      expect.unreachable('transition out of done must throw');
    } catch (thrown) {
      const error = thrown as PlanInvariantError;
      expect(error.code).toBe('plan_invariant');
      expect(error.data).toMatchObject({ nodeId: nid('A'), from: 'done', to: 'ready' });
    }
  });
});

describe('depsSatisfied and recomputePlanReadiness (derived, never a record)', () => {
  it('treats done upstreams and waived deps as satisfied', () => {
    const plan = planOf(
      node('A', 'done'),
      node('B', 'failed'),
      node('C', 'pending', { deps: [nid('A'), nid('B')], waivedDeps: [nid('B')] }),
    );
    expect(depsSatisfied(plan, plan.nodes[nid('C')])).toBe(true);
  });

  it('keeps terminally unsuccessful upstreams blocking without a waive', () => {
    const plan = planOf(node('B', 'cancelled'), node('C', 'pending', { deps: [nid('B')] }));
    expect(depsSatisfied(plan, plan.nodes[nid('C')])).toBe(false);
  });

  it('promotes pending to ready and regresses ready to pending', () => {
    const plan = planOf(
      node('A', 'done'),
      node('B', 'pending', { deps: [nid('A')] }),
      node('C', 'ready', { deps: [nid('D')] }),
      node('D', 'running'),
      node('E', 'parked', { deps: [nid('D')] }),
    );
    const next = recomputePlanReadiness(plan);
    expect(next.nodes[nid('B')]?.status).toBe('ready');
    expect(next.nodes[nid('C')]?.status).toBe('pending');
    // Non-schedulable statuses are untouched by the derivation.
    expect(next.nodes[nid('E')]?.status).toBe('parked');
  });

  it('returns the identical plan object when nothing changes', () => {
    const plan = planOf(node('A', 'done'), node('B', 'ready', { deps: [nid('A')] }));
    expect(recomputePlanReadiness(plan)).toBe(plan);
  });
});

describe('wouldCreateDepCycle (rewire_deps atomicity input)', () => {
  it('detects a rewire that closes a cycle', () => {
    const plan = planOf(
      node('A', 'pending', { deps: [nid('B')] }),
      node('B', 'pending', { deps: [nid('C')] }),
      node('C', 'pending'),
    );
    expect(wouldCreateDepCycle(plan, nid('C'), [nid('A')])).toBe(true);
  });

  it('accepts an acyclic rewire and rejects a self-dependency', () => {
    const plan = planOf(node('A', 'pending'), node('B', 'pending', { deps: [nid('A')] }));
    expect(wouldCreateDepCycle(plan, nid('A'), [])).toBe(false);
    expect(wouldCreateDepCycle(plan, nid('B'), [nid('A')])).toBe(false);
    expect(wouldCreateDepCycle(plan, nid('A'), [nid('A')])).toBe(true);
  });

  it('ignores deps onto unknown nodes (dangling edges cannot cycle)', () => {
    const plan = planOf(node('A', 'pending'));
    expect(wouldCreateDepCycle(plan, nid('A'), [nid('Z')])).toBe(false);
  });
});

describe('emptyPlan', () => {
  it('starts every fold from zero counters and no nodes', () => {
    expect(emptyPlan()).toEqual({ nodes: {}, revisionCount: 0, droppedRevisionStreak: 0 });
  });
});
