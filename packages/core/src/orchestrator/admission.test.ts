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

  it('caps the reserve at the child ceiling so capped children fit small budgets', () => {
    // The flat reserve (1 USD) exceeds what this child could ever spend:
    // its fraction-capped ceiling is 0.3 of the remainder. Projected
    // admission holds only that much against the chain, so the spawn is
    // admitted instead of one child freezing the whole run.
    const { admission } = makeController({ budgetUsd: 1, flatReserveUsd: 1 });
    const first = admission.admit({
      origin: 'ctx.workflow',
      name: 'a',
      childScope: 'wf:a:0',
      parentAccountScope: 'run',
    });
    expect(first.verdict).toMatchObject({
      kind: 'admit',
      reserve: { reserveUsd: 0.3, childCeilingUsd: 0.3 },
    });
  });

  it('rejects with budget when the parent chain is at its ceiling', () => {
    // An agent-style spawn (no sub-account of its own) holds the whole
    // ceiling in one committed reserve; while it is in flight, any
    // further spawn is blocked.
    const { admission, budget } = makeController({ budgetUsd: 1, flatReserveUsd: 1 });
    budget.admitSpawn(1);
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
    // The computed value block rides the decision (DEF-3).
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

describe('admit implies dispatchable (the v1.7.0 follow-up review invariant)', () => {
  /**
   * The layer-1 arithmetic ctx.agent applies at dispatch: the reserve is
   * the estimate (or the flat default) clamped to the tightest
   * child-allowance headroom on the chain, then admitSpawn projects it
   * against every capped ancestor.
   */
  function simulateDispatch(
    budget: RunBudget,
    spec: { budgetUsd?: number; estCostUsd?: number },
    flatReserveUsd: number,
    childScope: string,
  ): void {
    if (spec.budgetUsd !== undefined) {
      budget.openAccount(childScope, {
        parentScope: 'run',
        ceilingUsd: spec.budgetUsd,
        kind: 'child-allowance',
      });
    }
    const account = spec.budgetUsd === undefined ? 'run' : childScope;
    const reserve = spec.estCostUsd ?? flatReserveUsd;
    const allowance = budget.allowanceHeadroomOf(account);
    budget.admitSpawn(allowance === undefined ? reserve : Math.min(reserve, allowance), account);
  }

  it('every read-only admit of a batch dispatches under the same snapshot', () => {
    const estCosts = [undefined, 0.005, 0.015, 0.3, 0.8];
    const budgets = [undefined, 0.01, 0.03, 0.5];
    const ceilings = [0.02, 0.05, 0.4, 1];
    const flats = [0.0002, 0.05, 0.5];
    const preSpentFractions = [0, 0.5, 0.9];
    let admitted = 0;
    let rejected = 0;
    for (const estCostUsd of estCosts) {
      for (const budgetUsd of budgets) {
        for (const ceilingUsd of ceilings) {
          for (const flatReserveUsd of flats) {
            for (const preSpent of preSpentFractions) {
              const { admission, budget } = makeController({
                budgetUsd: ceilingUsd,
                flatReserveUsd,
              });
              if (preSpent > 0) {
                // A pre-existing commitment shrinks the remainder the
                // same way spend does.
                budget.admitSpawn(preSpent * ceilingUsd, 'run');
              }
              // A batch of two identical specs: the SECOND admit must
              // project the first's dispatch commitment.
              let pendingReserveUsd = 0;
              const dispatchable: Array<{ budgetUsd?: number; estCostUsd?: number }> = [];
              for (const index of [0, 1]) {
                const decision = admission.admit(
                  {
                    origin: 'spawn_agent',
                    name: 'worker',
                    childScope: `plan/0${String(index)}TESTNODE0000000000000000`,
                    parentAccountScope: 'run',
                    nodeKey: 'plan',
                    ...(budgetUsd === undefined ? {} : { budgetUsd }),
                    ...(estCostUsd === undefined ? {} : { estCostUsd }),
                    ...(pendingReserveUsd === 0 ? {} : { pendingReserveUsd }),
                    signature: { agentType: 'worker', isolation: 'none' },
                  },
                  { commitReserve: false },
                );
                if (decision.verdict.kind === 'admit') {
                  admitted += 1;
                  pendingReserveUsd += admission.projectedDispatchReserveUsd({
                    ...(budgetUsd === undefined ? {} : { budgetUsd }),
                    ...(estCostUsd === undefined ? {} : { estCostUsd }),
                  });
                  dispatchable.push({
                    ...(budgetUsd === undefined ? {} : { budgetUsd }),
                    ...(estCostUsd === undefined ? {} : { estCostUsd }),
                  });
                } else {
                  rejected += 1;
                }
              }
              // Every admit of the batch dispatches, in order, with no
              // interleaved facts: the review's property.
              for (const [index, spec] of dispatchable.entries()) {
                expect(() =>
                  simulateDispatch(
                    budget,
                    spec,
                    flatReserveUsd,
                    `plan/0${String(index)}TESTNODE0000000000000000`,
                  ),
                ).not.toThrow();
              }
            }
          }
        }
      }
    }
    // The grid genuinely exercises both verdicts.
    expect(admitted).toBeGreaterThan(100);
    expect(rejected).toBeGreaterThan(100);
  });
});
