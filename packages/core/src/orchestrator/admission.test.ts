import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { RunBudget } from '../engine/budget.js';
import {
  AdmissionController,
  DEFAULT_CHILD_BUDGET_FRACTION,
  DEFAULT_MAX_CHILDREN_PER_NODE,
  spawnDepthOf,
} from './admission.js';

function makeController(options?: {
  budgetUsd?: number;
  lifetimeSpawnCap?: number;
  maxDepth?: number;
  maxChildrenPerNode?: number;
  childBudgetFraction?: number;
  flatReserveUsd?: number;
}): { admission: AdmissionController; budget: RunBudget } {
  const budget = new RunBudget({
    ...(options?.budgetUsd === undefined ? {} : { ceilingUsd: options.budgetUsd }),
    ...(options?.lifetimeSpawnCap === undefined
      ? {}
      : { lifetimeSpawnCap: options.lifetimeSpawnCap }),
  });
  let next = 0;
  const admission = new AdmissionController({
    budget,
    ...(options?.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
    ...(options?.maxChildrenPerNode === undefined
      ? {}
      : { maxChildrenPerNode: options.maxChildrenPerNode }),
    ...(options?.childBudgetFraction === undefined
      ? {}
      : { childBudgetFraction: options.childBudgetFraction }),
    ...(options?.flatReserveUsd === undefined ? {} : { flatReserveUsd: options.flatReserveUsd }),
    mintId: () => `01TEST${String(next++).padStart(20, '0')}`,
  });
  return { admission, budget };
}

describe('spawnDepthOf', () => {
  it('counts workflow, agent, and plan-node segments only', () => {
    expect(spawnDepthOf('wf:extract:0')).toBe(1);
    expect(spawnDepthOf('par:0:2/wf:extract:0')).toBe(1);
    expect(spawnDepthOf('wf:a:0/wf:b:1')).toBe(2);
    expect(spawnDepthOf('agent:17')).toBe(1);
    expect(spawnDepthOf('wf:a:0/agent:17')).toBe(2);
    expect(spawnDepthOf('par:0:1/pipe:2:3')).toBe(0);
  });
});

describe('AdmissionController', () => {
  it('admits a first-level child with a fraction-derived ceiling', () => {
    const { admission, budget } = makeController({ budgetUsd: 10, flatReserveUsd: 0.25 });
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'child',
      childScope: 'wf:child:0',
      parentAccountScope: 'run',
    });
    expect(decision.verdict.kind).toBe('admit');
    if (decision.verdict.kind !== 'admit') {
      return;
    }
    expect(decision.verdict.reserve.reserveUsd).toBe(0.25);
    // Fraction of the parent remainder AFTER the reserve commit order:
    // remainder was 10 at evaluation time.
    expect(decision.verdict.reserve.childCeilingUsd).toBeCloseTo(
      DEFAULT_CHILD_BUDGET_FRACTION * 10,
      10,
    );
    expect(decision.verdict.lineage.isNew).toBe(true);
    expect(decision.verdict.lineage.depth).toBe(1);
    expect(decision.verdict.lineage.logicalTaskId).toMatch(/^01TEST/);
    expect(decision.nodeId).toMatch(/^01TEST/);
    expect(decision.statsBefore).toEqual({
      spawnsBefore: 0,
      childrenOfParentBefore: 0,
      depth: 1,
    });
    // The reserve is committed on the parent chain atomically with admit.
    expect(budget.committedReserveUsd).toBe(0.25);
  });

  it('leaves the child uncapped when the parent has no ceiling and no explicit budget', () => {
    const { admission } = makeController({ flatReserveUsd: 0.1 });
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'child',
      childScope: 'wf:child:0',
      parentAccountScope: 'run',
    });
    expect(decision.verdict.kind).toBe('admit');
    if (decision.verdict.kind === 'admit') {
      expect(decision.verdict.reserve.childCeilingUsd).toBeUndefined();
    }
  });

  it('clamps an explicit budgetUsd by the childBudgetFraction cap', () => {
    const { admission } = makeController({ budgetUsd: 10, flatReserveUsd: 0 });
    const capped = admission.admit({
      origin: 'ctx.workflow',
      name: 'greedy',
      childScope: 'wf:greedy:0',
      parentAccountScope: 'run',
      budgetUsd: 9,
    });
    if (capped.verdict.kind !== 'admit') {
      throw new Error('expected admit');
    }
    expect(capped.verdict.reserve.childCeilingUsd).toBeCloseTo(3, 10);

    const modest = admission.admit({
      origin: 'ctx.workflow',
      name: 'modest',
      childScope: 'wf:modest:0',
      parentAccountScope: 'run',
      budgetUsd: 1,
    });
    if (modest.verdict.kind !== 'admit') {
      throw new Error('expected admit');
    }
    expect(modest.verdict.reserve.childCeilingUsd).toBe(1);
  });

  it('rejects past maxDepth with the embedded depth code', () => {
    const { admission, budget } = makeController({ budgetUsd: 10 });
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'grandchild',
      childScope: 'wf:child:0/wf:grandchild:0',
      parentAccountScope: 'wf:child:0',
    });
    expect(decision.verdict).toEqual({ kind: 'reject', reason: { code: 'depth' } });
    expect(decision.statsBefore.depth).toBe(2);
    // Rejections commit nothing.
    expect(budget.committedReserveUsd).toBe(0);
  });

  it('honors a configured maxDepth up to the hard ceiling', () => {
    const { admission, budget } = makeController({ budgetUsd: 10, maxDepth: 2 });
    budget.openAccount('wf:child:0', { parentScope: 'run' });
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'grandchild',
      childScope: 'wf:child:0/wf:grandchild:0',
      parentAccountScope: 'wf:child:0',
    });
    expect(decision.verdict.kind).toBe('admit');
    expect(() => new AdmissionController({ budget, maxDepth: 5 })).toThrow(ConfigError);
    expect(() => new AdmissionController({ budget, maxDepth: 0 })).toThrow(ConfigError);
  });

  it('rejects the seventeenth child of one node with quota', () => {
    const { admission } = makeController();
    for (let i = 0; i < DEFAULT_MAX_CHILDREN_PER_NODE; i += 1) {
      const admitted = admission.admit({
        origin: 'ctx.workflow',
        name: `c${String(i)}`,
        childScope: `wf:c${String(i)}:0`,
        parentAccountScope: 'run',
      });
      expect(admitted.verdict.kind).toBe('admit');
    }
    const rejected = admission.admit({
      origin: 'ctx.workflow',
      name: 'c16',
      childScope: 'wf:c16:0',
      parentAccountScope: 'run',
    });
    expect(rejected.verdict).toEqual({ kind: 'reject', reason: { code: 'quota' } });
    expect(rejected.statsBefore.childrenOfParentBefore).toBe(DEFAULT_MAX_CHILDREN_PER_NODE);
  });

  it('rejects with budget when the parent chain is at its ceiling', () => {
    // The first reserve alone reaches the ceiling; while it is still
    // committed (the child in flight), the second spawn is blocked.
    const { admission } = makeController({ budgetUsd: 1, flatReserveUsd: 1 });
    const first = admission.admit({
      origin: 'ctx.workflow',
      name: 'a',
      childScope: 'wf:a:0',
      parentAccountScope: 'run',
    });
    expect(first.verdict.kind).toBe('admit');
    const second = admission.admit({
      origin: 'ctx.workflow',
      name: 'b',
      childScope: 'wf:b:0',
      parentAccountScope: 'run',
    });
    expect(second.verdict).toEqual({ kind: 'reject', reason: { code: 'budget' } });
  });

  it('rejects with lifetime when the spawn cap is exhausted', () => {
    const { admission } = makeController({ lifetimeSpawnCap: 1, flatReserveUsd: 0 });
    const first = admission.admit({
      origin: 'ctx.workflow',
      name: 'a',
      childScope: 'wf:a:0',
      parentAccountScope: 'run',
    });
    expect(first.verdict.kind).toBe('admit');
    const second = admission.admit({
      origin: 'ctx.workflow',
      name: 'b',
      childScope: 'wf:b:0',
      parentAccountScope: 'run',
    });
    expect(second.verdict).toEqual({ kind: 'reject', reason: { code: 'lifetime' } });
  });

  it('embeds spawnUnitsAfter as the remaining lifetime headroom', () => {
    const { admission } = makeController({ lifetimeSpawnCap: 5, flatReserveUsd: 0 });
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'a',
      childScope: 'wf:a:0',
      parentAccountScope: 'run',
    });
    if (decision.verdict.kind !== 'admit') {
      throw new Error('expected admit');
    }
    expect(decision.verdict.spawnUnitsAfter).toBe(4);
  });

  it('continues a declared lineage instead of minting a fresh LTID', () => {
    const { admission } = makeController();
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'retry',
      childScope: 'wf:retry:0',
      parentAccountScope: 'run',
      lineage: { continues: '01PRIOR00000000000000000000', causeRef: 3 },
    });
    if (decision.verdict.kind !== 'admit') {
      throw new Error('expected admit');
    }
    expect(decision.verdict.lineage.logicalTaskId).toBe('01PRIOR00000000000000000000');
    expect(decision.verdict.lineage.isNew).toBe(false);
    // The computed value block rides the decision (DEF-3, docs/03 10.6).
    expect(decision.lineage).toMatchObject({
      logicalTaskId: '01PRIOR00000000000000000000',
      relation: 'respawn',
      causeRef: 3,
      sigVersion: 1,
      approachTag: 'default',
    });
  });

  it('recoverSettled re-registers counters without committing a reserve', () => {
    const { admission, budget } = makeController({ maxChildrenPerNode: 2 });
    admission.recoverSettled('run');
    admission.recoverSettled('run');
    expect(budget.committedReserveUsd).toBe(0);
    expect(budget.spent().agentsSpawned).toBe(2);
    const rejected = admission.admit({
      origin: 'ctx.workflow',
      name: 'c',
      childScope: 'wf:c:0',
      parentAccountScope: 'run',
    });
    expect(rejected.verdict).toEqual({ kind: 'reject', reason: { code: 'quota' } });
  });

  it('recoverInFlight re-commits the recorded reserve without re-evaluation', () => {
    const { admission, budget } = makeController({ budgetUsd: 1 });
    // A recorded reserve larger than the fraction rule would ever grant:
    // recovery must apply it verbatim (never re-estimated).
    admission.recoverInFlight('run', {
      kind: 'admit',
      reserve: { reserveUsd: 0.9 },
      spawnUnitsAfter: 499,
      lineage: { logicalTaskId: '01PRIOR00000000000000000000', isNew: true, depth: 1 },
    });
    expect(budget.committedReserveUsd).toBe(0.9);
    expect(budget.spent().agentsSpawned).toBe(1);
  });
});
