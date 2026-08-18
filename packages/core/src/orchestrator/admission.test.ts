import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { RunBudget } from '../engine/budget.js';
import {
  acceptanceJudgePasses,
  acceptanceTailRequiredUsd,
  AdmissionController,
  DEFAULT_CHILD_BUDGET_FRACTION,
  DEFAULT_MAX_CHILDREN_PER_NODE,
  dispatchProjectionReserveUsd,
  formatAcceptanceTailTerms,
  retryWireMultiplier,
  spawnDepthOf,
  wireCapacityEstimate,
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

  it('refuses malformed numeric options at construction (v1.34.0 review P2-3)', () => {
    const { budget } = makeController();
    // NaN slid through the rejecting-polarity range check (every
    // comparison with NaN is false) and then disabled the depth ceiling
    // entirely; the gate now requires an integer in range.
    expect(() => new AdmissionController({ budget, maxDepth: Number.NaN })).toThrow(ConfigError);
    expect(() => new AdmissionController({ budget, maxDepth: 2.5 })).toThrow(ConfigError);
    expect(() => new AdmissionController({ budget, maxChildrenPerNode: Number.NaN })).toThrow(
      /maxChildrenPerNode must be a positive integer/,
    );
    expect(() => new AdmissionController({ budget, childBudgetFraction: Number.NaN })).toThrow(
      /childBudgetFraction must be a fraction in \(0, 1\]/,
    );
    expect(() => new AdmissionController({ budget, childBudgetFraction: 1.2 })).toThrow(
      ConfigError,
    );
    expect(() => new AdmissionController({ budget, flatReserveUsd: -1 })).toThrow(
      /flatReserveUsd must be a finite nonnegative number/,
    );
    expect(() => new AdmissionController({ budget, maxTotalSpawns: 0 })).toThrow(
      /maxTotalSpawns must be a positive integer/,
    );
    expect(
      () =>
        new AdmissionController({
          budget,
          maxDepth: 4,
          maxChildrenPerNode: 1,
          childBudgetFraction: 1,
          flatReserveUsd: 0,
          maxTotalSpawns: 1,
        }),
    ).not.toThrow();
  });

  it("maxTotalSpawns caps admitted spawns at the controller's own gate with 'lifetime' (cycle 80)", () => {
    // The engine does not wire this option (engine runs cap totals
    // through budgetDefaults.lifetimeSpawnCap); it is the public knob
    // for hosts driving an AdmissionController directly, pinned here.
    const budget = new RunBudget({});
    let next = 0;
    const admission = new AdmissionController({
      budget,
      maxTotalSpawns: 1,
      flatReserveUsd: 0,
      mintId: () => `01CAP${String(next++).padStart(21, '0')}`,
    });
    const first = admission.admit({
      origin: 'ctx.workflow',
      name: 'c0',
      childScope: 'wf:c0:0',
      parentAccountScope: 'run',
    });
    expect(first.verdict.kind).toBe('admit');
    const second = admission.admit({
      origin: 'ctx.workflow',
      name: 'c1',
      childScope: 'wf:c1:0',
      parentAccountScope: 'run',
    });
    expect(second.verdict).toEqual({ kind: 'reject', reason: { code: 'lifetime' } });
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
    // The node counters re-register; the LIFETIME counter does not
    // move (RV2201): every recovered agent already counted through the
    // resume seed's journal fold, and the incrementing roll-forward
    // double-counted the seventh subscription parity run's children to
    // 9 against a cap of 8, starving the post-acceptance tail.
    expect(budget.spent().agentsSpawned).toBe(0);
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
    // Recovered, so never re-counted against the lifetime cap (RV2201).
    expect(budget.spent().agentsSpawned).toBe(0);
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

/**
 * One reserve arithmetic for the wave projection, the live verdict and
 * the dispatch commit (RV2004). The third parity rerun's spawn_agent
 * verdicts journaled reserve/childCeiling 0.50 (the childBudgetFraction
 * cap over the orchestrator remainder) while the profile declared
 * estCost 0.70 and dispatch committed 0.70: the journal lied about the
 * held money, resume would have rolled the lie forward, and the 0.50
 * allowance would have severed the child mid-work. On the spawn-tool
 * path the fraction never materializes as an account, so the verdict
 * now IS the dispatch projection; origins whose allowance account is
 * real (ctx.workflow) keep the historical clamp.
 */
describe('the spawn-tool verdict is the dispatch projection (RV2004)', () => {
  function orchestratorState() {
    const { admission, budget } = makeController({ budgetUsd: 6, maxDepth: 3 });
    budget.openAccount('wf:orch:0', {
      parentScope: 'run',
      ceilingUsd: 3.15,
      kind: 'orchestrator-cap',
    });
    // Shrink the remainder so the fraction cap (0.3 x 2.15 = 0.645)
    // sits BELOW the declared 0.70 estimate: exactly the parity shape.
    budget.commitSynthesisReserve('wf:orch:0', 1.0);
    return { admission, budget };
  }

  it('the declared estimate survives the derived fraction on spawn_agent, with its derivation named', () => {
    const { admission } = orchestratorState();
    const decision = admission.admit(
      {
        origin: 'spawn_agent',
        name: 'worker',
        childScope: 'wf:orch:0/agent:2',
        parentAccountScope: 'wf:orch:0',
        estCostUsd: 0.7,
        signature: { agentType: 'worker', isolation: 'none' },
      },
      { commitReserve: false },
    );
    expect(decision.verdict.kind).toBe('admit');
    if (decision.verdict.kind !== 'admit') {
      return;
    }
    const reserve = decision.verdict.reserve;
    // 0.70, never the parity 0.50: the fraction ceiling neither clamps
    // the reserve nor rides the verdict on this path.
    expect(reserve.reserveUsd).toBeCloseTo(0.7, 10);
    expect(reserve.source).toBe('estCost');
    expect(reserve.clampedBy).toBeUndefined();
    expect(reserve.childCeilingUsd).toBeUndefined();
  });

  it('an explicit spawn budget still clamps, labeled explicit-budget', () => {
    const { admission } = orchestratorState();
    const decision = admission.admit(
      {
        origin: 'spawn_agent',
        name: 'worker',
        childScope: 'wf:orch:0/agent:3',
        parentAccountScope: 'wf:orch:0',
        estCostUsd: 0.7,
        budgetUsd: 0.3,
        signature: { agentType: 'worker', isolation: 'none' },
      },
      { commitReserve: false },
    );
    expect(decision.verdict.kind).toBe('admit');
    if (decision.verdict.kind !== 'admit') {
      return;
    }
    const reserve = decision.verdict.reserve;
    expect(reserve.reserveUsd).toBeCloseTo(0.3, 10);
    expect(reserve.source).toBe('estCost');
    expect(reserve.clampedBy).toBe('explicit-budget');
    expect(reserve.childCeilingUsd).toBeCloseTo(0.3, 10);
  });

  it('ctx.workflow keeps the materialized fraction allowance and its clamp', () => {
    const { admission } = orchestratorState();
    const decision = admission.admit({
      origin: 'ctx.workflow',
      name: 'child',
      childScope: 'wf:orch:0/wf:child:0',
      parentAccountScope: 'wf:orch:0',
      estCostUsd: 0.7,
      signature: { agentType: 'child', isolation: 'none' },
    });
    expect(decision.verdict.kind).toBe('admit');
    if (decision.verdict.kind !== 'admit') {
      return;
    }
    const reserve = decision.verdict.reserve;
    // The allowance account IS opened on this path, so the clamp is
    // real: 0.3 x (3.15 - 1.00 synthesis) = 0.645.
    expect(reserve.childCeilingUsd).toBeCloseTo(0.645, 10);
    expect(reserve.reserveUsd).toBeCloseTo(0.645, 10);
    expect(reserve.source).toBe('estCost');
    expect(reserve.clampedBy).toBe('fraction-ceiling');
  });

  it('for one state the live verdict equals the shared dispatch projection, across the matrix', () => {
    const flatReserveUsd = 0.5;
    const matrix: Array<{ estCostUsd?: number; budgetUsd?: number }> = [
      { estCostUsd: 0.7 },
      { estCostUsd: 0.7, budgetUsd: 0.3 },
      { budgetUsd: 0.4 },
      {},
    ];
    for (const [index, gate] of matrix.entries()) {
      const { admission } = orchestratorState();
      const decision = admission.admit(
        {
          origin: 'spawn_agent',
          name: 'worker',
          childScope: `wf:orch:0/agent:${String(10 + index)}`,
          parentAccountScope: 'wf:orch:0',
          ...gate,
          signature: { agentType: 'worker', isolation: 'none' },
        },
        { commitReserve: false },
      );
      expect(decision.verdict.kind).toBe('admit');
      if (decision.verdict.kind !== 'admit') {
        continue;
      }
      expect(decision.verdict.reserve.reserveUsd).toBeCloseTo(
        dispatchProjectionReserveUsd(gate, flatReserveUsd),
        10,
      );
    }
  });
});

describe('the ONE acceptance-tail formula (RV4001, the fifth comparison experiment)', () => {
  it('counts worst-case judge passes across the whole valid posture grid', () => {
    // (stage, onFound) -> passes; draft+repair and final+carry are
    // intake ConfigErrors and never reach the calculator live.
    const grid: Array<
      ['draft' | 'final' | 'both' | undefined, Parameters<typeof acceptanceJudgePasses>[1], number]
    > = [
      [undefined, undefined, 1],
      ['draft', 'report', 1],
      ['draft', 'carry', 1],
      ['draft', 'fail', 1],
      ['final', 'report', 1],
      ['final', 'fail', 1],
      ['final', 'repair', 2],
      ['both', 'report', 2],
      ['both', 'carry', 2],
      ['both', 'fail', 2],
      ['both', 'repair', 3],
    ];
    for (const [stage, onFound, passes] of grid) {
      expect(acceptanceJudgePasses(stage, onFound)).toBe(passes);
    }
  });

  it('prices the fifth experiment tail exactly: $4.82 required, term by term', () => {
    // The experiment's declared config: hold 2.20, judge 0.32 at stage
    // 'final' with an armed repair round (2 passes), mechanical repair
    // 0.20, round composition 0.78, flat working room 1.00. Preflight
    // passed the plan green at a $4.54 cap; the runtime refused at
    // exactly this figure.
    const { requiredUsd, terms } = acceptanceTailRequiredUsd({
      synthesisReserveUsd: 2.2,
      claimStage: 'final',
      claimOnFound: 'repair',
      claimJudgeEstCostUsd: 0.32,
      finishEstRepairCostUsd: 0.2,
      synthesisEstCostUsd: 0.78,
      workingRoomUsd: 1.0,
    });
    expect(requiredUsd).toBeCloseTo(4.82, 10);
    expect(terms.judgePasses).toBe(2);
    expect(terms.roundCompositionUsd).toBeCloseTo(0.78, 10);
    expect(formatAcceptanceTailTerms(terms)).toBe(
      'synthesisReserveUsd 2.2000 + judge 0.3200 x 2 pass(es) + estRepairCostUsd 0.2000 + ' +
        'round composition 0.7800 + working room 1.0000 = 4.8200 USD',
    );
  });

  it("undeclared estimates contribute zero and 'both' arms the second pass", () => {
    const bare = acceptanceTailRequiredUsd({ workingRoomUsd: 0.5 });
    expect(bare.requiredUsd).toBeCloseTo(0.5, 10);
    expect(bare.terms.judgePasses).toBe(1);
    // The undercount this train fixes: 'both' + report is TWO passes
    // (draft and final), and 'both' + repair is three; the RV3907 gate
    // read them as one and two.
    const bothReport = acceptanceTailRequiredUsd({
      claimStage: 'both',
      claimOnFound: 'report',
      claimJudgeEstCostUsd: 0.1,
      workingRoomUsd: 0,
    });
    expect(bothReport.requiredUsd).toBeCloseTo(0.2, 10);
    const bothRepair = acceptanceTailRequiredUsd({
      claimStage: 'both',
      claimOnFound: 'repair',
      claimJudgeEstCostUsd: 0.1,
      synthesisEstCostUsd: 0.3,
      workingRoomUsd: 0,
    });
    expect(bothRepair.terms.judgePasses).toBe(3);
    expect(bothRepair.requiredUsd).toBeCloseTo(0.6, 10);
    // No armed round, no composition term: report never pays for one.
    expect(bothReport.terms.roundCompositionUsd).toBe(0);
  });
});

describe('the wire capacity estimator (RV4005, the fifth comparison experiment)', () => {
  it('prices the healthy 34-wire plan: the round is TWO wires, 36 total, 5.88 percent', () => {
    // The experiment's answer wrote "34 wires without repair, 35 with"
    // and lost the decisive correctness point: the armed round is one
    // more composition PLUS one more judge pass.
    const estimate = wireCapacityEstimate({
      childWires: 24,
      coordinationWires: 7,
      synthesisWires: 1,
      judgeWires: 1,
      extractWires: 1,
    });
    expect(estimate.baseWires).toBe(34);
    expect(estimate.repairRoundDeltaWires).toBe(2);
    expect(estimate.wiresWithRound).toBe(36);
    expect(estimate.roundOverheadShare).toBeCloseTo(2 / 34, 12);
    expect((estimate.roundOverheadShare * 100).toFixed(2)).toBe('5.88');
    expect(estimate.mechanicalRepairDeltaWires).toBe(1);
  });

  it('multiplies retries as 1 + r/B, never 1 + r', () => {
    expect(retryWireMultiplier(34, 0)).toBe(1);
    expect(retryWireMultiplier(34, 1)).toBeCloseTo(35 / 34, 12);
    expect(retryWireMultiplier(34, 3)).toBeCloseTo(37 / 34, 12);
    expect(() => retryWireMultiplier(0, 1)).toThrow(ConfigError);
    expect(() => retryWireMultiplier(Number.NaN, 1)).toThrow(ConfigError);
    expect(() => retryWireMultiplier(34, -1)).toThrow(/retries/);
  });

  it('undeclared stages contribute zero and malformed counts refuse typed', () => {
    const bare = wireCapacityEstimate({ childWires: 10 });
    expect(bare.baseWires).toBe(10);
    expect(bare.wiresWithRound).toBe(12);
    expect(() => wireCapacityEstimate({ childWires: -1 })).toThrow(ConfigError);
    expect(() => wireCapacityEstimate({ childWires: 1, judgeWires: Number.NaN })).toThrow(
      ConfigError,
    );
  });
});
