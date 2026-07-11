/**
 * The phases 1-2 measured-value checkpoint (M12-T01; docs/05, section
 * "Phases and placement"; the quantitative criteria of OQ-09,
 * 14-open-questions.md, closed at M11-T06). The M12 gate: kb_propose
 * and the proposal loop ship ONLY if the knowledge card demonstrably
 * improves tier and agentType selection on eval cases.
 *
 * Two experiments, both A/B under identical fixed pools:
 *
 * 1. RUNG SELECTION, per (ladder, taskClass) cell: the baseline arm
 *    runs every eval case at the ladder's DEFAULT start tier; the
 *    treatment arm runs at the tier recommended by
 *    compileVerifiedLayer over the store's claims (default when no
 *    recommendation). A cell passes when the treatment reaches a pass
 *    rate at least equal to the baseline at no more than 90 percent
 *    of its cost, OR at least 5 points above it at no more than its
 *    cost. Criterion 1 holds when a MAJORITY of cells pass AND the
 *    pooled aggregate passes the same rule.
 *
 * 2. AGENTTYPE SELECTION, pooled: the same orchestrate-role cases run
 *    with and without the knowledge store configured (the card docks
 *    into the spawn tool description when configured). Criterion 2
 *    holds when the card-informed arm matches or beats the baseline
 *    pass rate at no more than 105 percent of its cost, OR beats it
 *    by at least 15 points at no more than 115 percent of its cost
 *    (the quality branch; OQ-09 as amended 2026-07-12: the baseline
 *    fails CHEAPLY, so the flat cost bar tightened exactly when the
 *    card was winning on quality).
 *
 * The checkpoint PASSES only when both criteria hold. Methodology
 * guard: the claims the treatment consumes MUST come from a seeding
 * sweep over a DISJOINT case set (the seed/eval split is the caller's
 * pool contract), or the measurement is leakage.
 */
import {
  compileVerifiedLayer,
  type DeclaredLadder,
  type Engine,
  type KnowledgeSnapshot,
  type TaskClass,
} from '@rulvar/core';

import { runEvalSuite, type EvalCase, type RunEvalSuiteOptions } from './case.js';
import type { SweepCase, SweepModel } from './sweeps.js';

/** One declared checkpoint ladder: rungs are concrete pool members. */
export interface CheckpointLadder extends DeclaredLadder {
  name: string;
  startTier: number;
  rungs: SweepModel[];
}

export interface CheckpointPool {
  ladders: CheckpointLadder[];
  /** The measurement half; the seeding sweep MUST NOT have seen these. */
  evalCases: SweepCase[];
}

export interface OrchestratedCase {
  /** The workflow drives an orchestrate-role run; graders judge its outcome. */
  case: EvalCase;
}

export interface RunCheckpointOptions {
  /** The claims snapshot produced by the seeding sweep (disjoint cases). */
  snapshot: KnowledgeSnapshot;
  /** ISO date of the evaluation (recorded in the report; no wall clock inside). */
  observedAt: string;
  /** An engine per concrete pool member (the caller owns adapters and budgets). */
  engineFor: (member: SweepModel) => Engine | Promise<Engine>;
  /**
   * Criterion 2 engines: withKnowledge true configures the SAME store
   * snapshot behind stores.modelKnowledge; false omits it entirely.
   */
  orchestrateEngineFor?: (withKnowledge: boolean) => Engine | Promise<Engine>;
  orchestratedCases?: OrchestratedCase[];
  suite?: RunEvalSuiteOptions;
  /**
   * Orchestrated runs need room for the orchestrator cap math (the
   * run ceiling must host the finalize reserve; docs/07, 12.2): their
   * suite options default to `suite` but usually carry a larger
   * budgetUsd.
   */
  orchestratedSuite?: RunEvalSuiteOptions;
}

export interface CheckpointArm {
  passRate: number;
  totalCostUsd: number;
  n: number;
}

export interface CheckpointCell {
  ladder: string;
  taskClass: TaskClass;
  defaultTier: number;
  /** The tier the treatment arm ran at (default when no recommendation). */
  treatmentTier: number;
  recommended: boolean;
  baseline: CheckpointArm;
  treatment: CheckpointArm;
  passed: boolean;
}

export interface CriterionOneReport {
  cells: CheckpointCell[];
  cellsPassed: number;
  majorityHolds: boolean;
  pooledBaseline: CheckpointArm;
  pooledTreatment: CheckpointArm;
  pooledHolds: boolean;
  passed: boolean;
}

export interface CriterionTwoReport {
  baseline: CheckpointArm;
  informed: CheckpointArm;
  passed: boolean;
}

export interface CheckpointReport {
  observedAt: string;
  criterion1: CriterionOneReport;
  criterion2?: CriterionTwoReport;
  /** Both criteria (criterion 2 counts as failed when unmeasured). */
  passed: boolean;
}

/** IEEE754 guard for the rule boundaries (0.8 + 0.05 exceeds 0.85). */
const EPSILON = 1e-9;

/**
 * The OQ-09 criterion 2 rule (as amended 2026-07-12): match-or-beat at
 * 105 percent of baseline cost, OR at least 15 points better at 115
 * percent (the quality branch: the baseline fails cheaply, so the flat
 * bar tightened exactly when the card won on quality). The vacuous-pass
 * guard stays with the caller.
 */
export function agentTypeRuleHolds(baseline: CheckpointArm, informed: CheckpointArm): boolean {
  const matchesCheaply =
    informed.passRate >= baseline.passRate - EPSILON &&
    informed.totalCostUsd <= 1.05 * baseline.totalCostUsd + EPSILON;
  const clearlyBetterNearCost =
    informed.passRate >= baseline.passRate + 0.15 - EPSILON &&
    informed.totalCostUsd <= 1.15 * baseline.totalCostUsd + EPSILON;
  return matchesCheaply || clearlyBetterNearCost;
}

/** The OQ-09 cell rule (shared by the per-cell and pooled verdicts). */
export function rungRuleHolds(baseline: CheckpointArm, treatment: CheckpointArm): boolean {
  const equalOrBetterCheaper =
    treatment.passRate >= baseline.passRate - EPSILON &&
    treatment.totalCostUsd <= 0.9 * baseline.totalCostUsd + EPSILON;
  const clearlyBetterAtCost =
    treatment.passRate >= baseline.passRate + 0.05 - EPSILON &&
    treatment.totalCostUsd <= baseline.totalCostUsd + EPSILON;
  return equalOrBetterCheaper || clearlyBetterAtCost;
}

function armOf(suite: {
  passRate: number;
  totalCostUsd: number;
  results: unknown[];
}): CheckpointArm {
  return { passRate: suite.passRate, totalCostUsd: suite.totalCostUsd, n: suite.results.length };
}

function pool(arms: CheckpointArm[]): CheckpointArm {
  const n = arms.reduce((sum, arm) => sum + arm.n, 0);
  const passed = arms.reduce((sum, arm) => sum + arm.passRate * arm.n, 0);
  const cost = arms.reduce((sum, arm) => sum + arm.totalCostUsd, 0);
  return { passRate: n === 0 ? 0 : passed / n, totalCostUsd: cost, n };
}

/**
 * Runs the checkpoint over the fixed pool. Sequential in declaration
 * order (deterministic cassette consumption when recorded); every cell
 * runs baseline then treatment.
 */
export async function runValueCheckpoint(
  checkpointPool: CheckpointPool,
  options: RunCheckpointOptions,
): Promise<CheckpointReport> {
  const activeClaims = options.snapshot.claims.filter((claim) => claim.status === 'active');
  const recommendations = compileVerifiedLayer(activeClaims, checkpointPool.ladders);
  const byTaskClass = new Map<TaskClass, EvalCase[]>();
  for (const entry of checkpointPool.evalCases) {
    const bucket = byTaskClass.get(entry.taskClass) ?? [];
    bucket.push(entry.case);
    byTaskClass.set(entry.taskClass, bucket);
  }

  const cells: CheckpointCell[] = [];
  for (const ladder of checkpointPool.ladders) {
    for (const [taskClass, cases] of byTaskClass) {
      const recommendation = recommendations.find(
        (row) => row.ladder === ladder.name && row.taskClass === taskClass,
      );
      const treatmentTier = recommendation?.recommendedTier ?? ladder.startTier;
      const baseMember = ladder.rungs[ladder.startTier];
      const treatMember = ladder.rungs[treatmentTier];
      if (baseMember === undefined || treatMember === undefined) {
        throw new Error(`checkpoint: ladder '${ladder.name}' lacks rung ${String(treatmentTier)}`);
      }
      const baseline = armOf(
        await runEvalSuite(await options.engineFor(baseMember), cases, options.suite ?? {}),
      );
      const treatment =
        treatmentTier === ladder.startTier
          ? baseline
          : armOf(
              await runEvalSuite(await options.engineFor(treatMember), cases, options.suite ?? {}),
            );
      cells.push({
        ladder: ladder.name,
        taskClass,
        defaultTier: ladder.startTier,
        treatmentTier,
        recommended: recommendation !== undefined,
        baseline,
        treatment,
        passed: rungRuleHolds(baseline, treatment),
      });
    }
  }

  // Cells where the card had nothing to say are NEUTRAL for the
  // majority (their identical arms would mechanically fail the 90
  // percent bar) but stay in the pooled totals, where they honestly
  // dilute the aggregate saving the recommended cells must earn. Zero
  // recommended cells means the card demonstrated nothing: fail.
  const recommendedCells = cells.filter((cell) => cell.recommended);
  const cellsPassed = recommendedCells.filter((cell) => cell.passed).length;
  const majorityHolds = recommendedCells.length > 0 && cellsPassed * 2 > recommendedCells.length;
  const pooledBaseline = pool(cells.map((cell) => cell.baseline));
  const pooledTreatment = pool(cells.map((cell) => cell.treatment));
  const pooledHolds = rungRuleHolds(pooledBaseline, pooledTreatment);
  const criterion1: CriterionOneReport = {
    cells,
    cellsPassed,
    majorityHolds,
    pooledBaseline,
    pooledTreatment,
    pooledHolds,
    passed: majorityHolds && pooledHolds,
  };

  let criterion2: CriterionTwoReport | undefined;
  if (options.orchestrateEngineFor !== undefined && options.orchestratedCases !== undefined) {
    const cases = options.orchestratedCases.map((entry) => entry.case);
    const orchestratedSuite = options.orchestratedSuite ?? options.suite ?? {};
    const baseline = armOf(
      await runEvalSuite(await options.orchestrateEngineFor(false), cases, orchestratedSuite),
    );
    const informed = armOf(
      await runEvalSuite(await options.orchestrateEngineFor(true), cases, orchestratedSuite),
    );
    // The vacuous-pass guard (found by the first live run): two arms
    // of total failures (both at zero pass rate) demonstrate nothing
    // and MUST fail; the card has to win something real.
    criterion2 = {
      baseline,
      informed,
      passed: informed.n > 0 && informed.passRate > 0 && agentTypeRuleHolds(baseline, informed),
    };
  }

  return {
    observedAt: options.observedAt,
    criterion1,
    ...(criterion2 === undefined ? {} : { criterion2 }),
    passed: criterion1.passed && criterion2 !== undefined && criterion2.passed,
  };
}

const percent = (rate: number): string => `${(rate * 100).toFixed(1)}%`;
const usd = (value: number): string => `$${value.toFixed(4)}`;

/** The deterministic render for the M12 gate docs amendment. */
export function renderCheckpointReport(report: CheckpointReport): string {
  const lines: string[] = [
    `Measured-value checkpoint (OQ-09) at ${report.observedAt}: ` +
      (report.passed ? 'PASSED' : 'FAILED'),
    '',
    `Criterion 1 (rung selection): ${report.criterion1.passed ? 'holds' : 'fails'} ` +
      `(${String(report.criterion1.cellsPassed)}/${String(report.criterion1.cells.length)} cells, ` +
      `pooled ${report.criterion1.pooledHolds ? 'holds' : 'fails'})`,
  ];
  for (const cell of report.criterion1.cells) {
    lines.push(
      `* ${cell.ladder} :: ${cell.taskClass}: baseline tier ${String(cell.defaultTier)} ` +
        `${percent(cell.baseline.passRate)} at ${usd(cell.baseline.totalCostUsd)}; treatment ` +
        `tier ${String(cell.treatmentTier)}${cell.recommended ? '' : ' (no recommendation)'} ` +
        `${percent(cell.treatment.passRate)} at ${usd(cell.treatment.totalCostUsd)}; ` +
        `${cell.passed ? 'pass' : 'fail'} (n=${String(cell.baseline.n)})`,
    );
  }
  if (report.criterion2 !== undefined) {
    const c2 = report.criterion2;
    lines.push(
      '',
      `Criterion 2 (agentType selection): ${c2.passed ? 'holds' : 'fails'} ` +
        `(baseline ${percent(c2.baseline.passRate)} at ${usd(c2.baseline.totalCostUsd)}; ` +
        `card-informed ${percent(c2.informed.passRate)} at ${usd(c2.informed.totalCostUsd)}; ` +
        `n=${String(c2.baseline.n)})`,
    );
  } else {
    lines.push('', 'Criterion 2 (agentType selection): NOT MEASURED (counts as failed)');
  }
  return lines.join('\n');
}
