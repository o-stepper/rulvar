import { describe, expect, it } from 'vitest';
import { CURRENT_HASH_VERSION, PlanInvariantError } from '@rulvar/core';

import { PLAN_HASH_VERSION, assertPlanHead, canonicalPlanState, planHash } from './plan-hash.js';
import { emptyPlan, type PlanNode, type TaskPlan } from './plan-state.js';

const nid = (letter: string): string => letter.repeat(26);

function node(letter: string, patch?: Partial<PlanNode>): PlanNode {
  return {
    nodeId: nid(letter),
    logicalTaskId: nid('X'),
    status: 'pending',
    deps: [],
    waivedDeps: [],
    parkRequested: false,
    cancelRequested: false,
    priority: 0,
    promptSpecHash: 'p'.repeat(64),
    ...patch,
  };
}

function planOf(nodes: PlanNode[], counters?: Partial<TaskPlan>): TaskPlan {
  const byId: Record<string, PlanNode> = {};
  for (const item of nodes) {
    byId[item.nodeId] = item;
  }
  return { nodes: byId, revisionCount: 0, droppedRevisionStreak: 0, ...counters };
}

describe('planHash determinism (docs/07, 3.4)', () => {
  it('rides the current hashVersion profile', () => {
    expect(PLAN_HASH_VERSION).toBe(CURRENT_HASH_VERSION);
  });

  it('is insensitive to node insertion order and deps order', () => {
    const a = node('A');
    const b = node('B', { deps: [nid('A'), nid('C')] });
    const c = node('C', { status: 'done' });
    const one = planOf([a, b, c]);
    const two = planOf([c, { ...b, deps: [nid('C'), nid('A')] }, a]);
    expect(planHash(two)).toBe(planHash(one));
  });

  it('omits absent optional refs so absence and undefined coincide', () => {
    const bare = planOf([node('A')]);
    const explicit = planOf([{ ...node('A'), checkpointRef: undefined }]);
    expect(planHash(explicit)).toBe(planHash(bare));
    expect(canonicalPlanState(bare)).not.toHaveProperty('nodes.0.checkpointRef');
  });

  it('moves on every hashed field: counters, flags, refs, priority', () => {
    const base = planOf([node('A')]);
    const variants: TaskPlan[] = [
      planOf([node('A')], { revisionCount: 1 }),
      planOf([node('A')], { droppedRevisionStreak: 1 }),
      planOf([node('A', { parkRequested: true })]),
      planOf([node('A', { cancelRequested: true })]),
      planOf([node('A', { priority: 5 })]),
      planOf([node('A', { checkpointRef: 17 })]),
      planOf([node('A', { escalationRef: 23 })]),
      planOf([node('A', { status: 'ready' })]),
      planOf([node('A', { waivedDeps: [nid('B')] })]),
      planOf([node('A', { promptSpecHash: 'q'.repeat(64) })]),
      planOf([node('A', { logicalTaskId: nid('Y') })]),
    ];
    const seen = new Set<string>([planHash(base)]);
    for (const variant of variants) {
      const hash = planHash(variant);
      expect(seen.has(hash)).toBe(false);
      seen.add(hash);
    }
  });

  it('reproduces the frozen golden bytes (byte-identity across stores)', () => {
    // Golden values pin the canonical projection: a change here is a
    // hashVersion event (docs/03, section "hashVersion"), never a refactor.
    expect(planHash(emptyPlan())).toBe(
      'f8e67d65d7348e63cedaea3d2d98eb7f9f0f21b26f45c4b4a350f8fc8f4eeebb',
    );
    const worked = planOf(
      [
        node('A', { status: 'done' }),
        node('B', { deps: [nid('A')], status: 'ready', priority: 2, checkpointRef: 41 }),
      ],
      { revisionCount: 3, droppedRevisionStreak: 1 },
    );
    expect(planHash(worked)).toBe(
      'baf748f91dcb3db7bbf88b9167cdb8c57b99f1a2313007559c2ac1bdc655ebf9',
    );
  });
});

describe('assertPlanHead (docs/07, 3.4)', () => {
  it('accepts the matching head silently', () => {
    const plan = planOf([node('A')]);
    expect(() => assertPlanHead(plan, planHash(plan))).not.toThrow();
  });

  it('raises the typed PlanInvariantError on a head mismatch', () => {
    const plan = planOf([node('A')]);
    try {
      assertPlanHead(plan, 'f'.repeat(64), { operation: 'plan_revise' });
      expect.unreachable('head mismatch must throw');
    } catch (thrown) {
      const error = thrown as PlanInvariantError;
      expect(error).toBeInstanceOf(PlanInvariantError);
      expect(error.code).toBe('plan_invariant');
      expect(error.data).toMatchObject({ expected: 'f'.repeat(64), operation: 'plan_revise' });
    }
  });
});
