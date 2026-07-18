/**
 * Matrix sweeps (M11-T02). The deconfounder of the whole
 * knowledge feature: a FIXED eval matrix (workflow x model x
 * taskClass), independent of current routing, measured through the
 * ordinary engine (journaled, budgeted, VCR-recordable), emitting
 * eval-measured claims through the eval-committer identity.
 *
 * Sweep volume is never authorized by proposal volume: the model pool
 * and the case list are EXPLICIT caller data (fixed pools only).
 */
import {
  ConfigError,
  type Effort,
  type Engine,
  type ModelClaim,
  type ModelKnowledgeStore,
  type ModelRef,
  type TaskClass,
} from '@rulvar/core';

import { runEvalSuite, type EvalCase, type RunEvalSuiteOptions } from './case.js';
import { commitEvalMeasured, type MeasuredClaimInput } from './committer.js';
import type { SpendEnvelope } from './envelope.js';

/** One fixed pool member; effort is part of the claim subject identity. */
export interface SweepModel {
  model: ModelRef;
  effort?: Effort;
}

/** An eval case bound to the taskClass axis of the matrix. */
export interface SweepCase {
  taskClass: TaskClass;
  case: EvalCase;
}

export interface SweepPool {
  models: SweepModel[];
  cases: SweepCase[];
}

export interface SweepThresholds {
  /** passRate at or above emits a strength claim; default 0.9. */
  strength: number;
  /** passRate at or below emits a weakness claim; default 0.5. */
  weakness: number;
}

export interface RunSweepOptions {
  /** Deterministic, caller-minted; every claim's evidence and gate reference it. */
  reportId: string;
  /** The dedicated committer identity. */
  committerId: string;
  /** ISO date of the sweep; the TTL table applies from it (no wall clock inside). */
  observedAt: string;
  /**
   * A fresh engine per model cell, routed at that member: the caller
   * owns adapters, budgets, and the VCR posture, so a sweep records
   * and replays like any engine run.
   */
  engineFor: (member: SweepModel) => Engine | Promise<Engine>;
  /** Mid-band pass rates emit NO claim (uninformative); see defaults. */
  thresholds?: Partial<SweepThresholds>;
  /** Passed through to every suite run (budget, VCR hooks ride the engine). */
  suite?: RunEvalSuiteOptions;
  /**
   * Aggregate debit-only envelope over the WHOLE matrix (v1.16.2
   * review P1-2): every target and judge run authorizes its immutable
   * ceiling before starting, so the pool times cases times judge-call
   * product cannot exceed it, falsification pool growth included. An
   * envelope requires suite.budgetUsd (and suite.judgeBudgetUsd once a
   * grader judges). Refusals are monotone (v1.17.0 review P1-5): a
   * refused target stops that cell's walk but everything already
   * measured stays on the cell (n, costs, caseNames), judge refusals
   * normalize into their row's incomplete marker, and an incomplete
   * cell emits NO claim. Share the instance with the canary loop so
   * probes draw from the same remainder.
   */
  envelope?: SpendEnvelope;
  /** When given, emitted claims commit through the committer identity. */
  store?: ModelKnowledgeStore;
  /**
   * Optional epoch stamp per pool member (capture via the core
   * modelEpochOf; the canary fingerprint rides it when probes ran).
   */
  modelEpochFor?: (member: SweepModel) => ModelClaim['modelEpoch'];
}

export interface SweepCellReport {
  model: ModelRef;
  effort?: Effort;
  taskClass: TaskClass;
  passRate: number;
  /** Result rows actually measured (completed count). */
  n: number;
  /**
   * Cases this cell was asked to measure (v1.17.0 review P1-5). A cell
   * with n < plannedN is incomplete: what ran stays reported, and the
   * cell emits no claim.
   */
  plannedN: number;
  totalCostUsd: number;
  caseNames: string[];
  /**
   * Count of case results whose TARGET run settled 'exhausted' (its
   * per-run ceiling, not the envelope). A budget-starved measurement
   * must not become a model belief, so any exhausted target suppresses
   * the cell's claim even when the degraded passRate crosses a
   * threshold: the alternative is committing a false weakness that
   * blames the model for the ceiling.
   */
  exhaustedRuns?: number;
  /**
   * Count of result rows whose grading stopped on a judge budget event
   * (per-run judge ceiling or envelope refusal of a judge run). The
   * paid target evidence stays on those rows; the cell emits no claim.
   */
  judgeIncompleteRuns?: number;
  /**
   * The aggregate envelope refused a TARGET run of this cell before it
   * started; everything measured up to that point stays reported and
   * the cell emits no claim.
   */
  envelopeExhausted?: true;
  /** Why the cell is incomplete, when it is. */
  incompleteReason?: 'envelope-exhausted' | 'judge-exhausted' | 'judge-refused';
  /** The refused run's label, when the envelope refused one. */
  refusedRunLabel?: string;
}

export interface SweepReport {
  reportId: string;
  observedAt: string;
  cells: SweepCellReport[];
  /** Emitted per the thresholds; committed when a store was given. */
  claims: MeasuredClaimInput[];
  committedVersion?: number;
}

export const SWEEP_THRESHOLD_DEFAULTS: SweepThresholds = { strength: 0.9, weakness: 0.5 };

/** Deterministic claim id: report-scoped, readable, collision-free. */
function claimIdOf(reportId: string, member: SweepModel, taskClass: TaskClass): string {
  const effort = member.effort === undefined ? '' : `@${member.effort}`;
  return `${reportId}/${member.model}${effort}/${taskClass}`;
}

/** The typed statement template: never a quote from tool output. */
function statementOf(cell: SweepCellReport, polarity: 'strength' | 'weakness'): string {
  const rate = cell.passRate.toFixed(2);
  const band = polarity === 'strength' ? 'at or above the strength band' : 'in the weakness band';
  return (
    `sweep passRate ${rate} over ${String(cell.n)} ${cell.taskClass} case` +
    `${cell.n === 1 ? '' : 's'}: ${band}`
  );
}

/**
 * Runs the fixed matrix sequentially in declaration order
 * (deterministic cassette consumption), aggregates per (model,
 * taskClass) cell, emits threshold-crossing claims, and commits them
 * through the eval-committer identity when a store is given.
 */
export async function runSweepMatrix(
  pool: SweepPool,
  options: RunSweepOptions,
): Promise<SweepReport> {
  const thresholds: SweepThresholds = {
    ...SWEEP_THRESHOLD_DEFAULTS,
    ...options.thresholds,
  };
  if (options.envelope !== undefined && options.suite?.budgetUsd === undefined) {
    throw new ConfigError(
      'runSweepMatrix: an aggregate envelope requires suite.budgetUsd (the per-target ' +
        'ceiling); unbounded targets under an envelope would be unaccountable',
    );
  }
  const byTaskClass = new Map<TaskClass, SweepCase[]>();
  for (const entry of pool.cases) {
    const bucket = byTaskClass.get(entry.taskClass) ?? [];
    bucket.push(entry);
    byTaskClass.set(entry.taskClass, bucket);
  }
  const cells: SweepCellReport[] = [];
  const claims: MeasuredClaimInput[] = [];
  for (const member of pool.models) {
    const engine = await options.engineFor(member);
    for (const [taskClass, bucket] of byTaskClass) {
      // runEvalSuite is monotone (v1.17.0 review P1-5): a refused
      // target stops its walk and returns everything already measured;
      // judge budget events normalize into their rows. Nothing here
      // discards paid evidence; only non-budget errors still throw.
      const suite = await runEvalSuite(
        engine,
        bucket.map((entry) => entry.case),
        {
          ...(options.suite ?? {}),
          ...(options.envelope === undefined ? {} : { envelope: options.envelope }),
        },
      );
      const exhaustedRuns = suite.results.filter((result) => result.status === 'exhausted').length;
      const judgeIncompleteRuns = suite.results.filter(
        (result) => result.incomplete !== undefined,
      ).length;
      const incompleteReason: SweepCellReport['incompleteReason'] =
        suite.refusal !== undefined
          ? 'envelope-exhausted'
          : suite.results.find((result) => result.incomplete !== undefined)?.incomplete?.reason;
      const cell: SweepCellReport = {
        model: member.model,
        ...(member.effort === undefined ? {} : { effort: member.effort }),
        taskClass,
        passRate: suite.passRate,
        n: suite.completedN,
        plannedN: suite.plannedN,
        totalCostUsd: suite.totalCostUsd,
        caseNames: suite.results.map((result) => result.name),
        ...(exhaustedRuns === 0 ? {} : { exhaustedRuns }),
        ...(judgeIncompleteRuns === 0 ? {} : { judgeIncompleteRuns }),
        ...(suite.refusal === undefined
          ? {}
          : { envelopeExhausted: true as const, refusedRunLabel: suite.refusal.runLabel }),
        ...(incompleteReason === undefined ? {} : { incompleteReason }),
      };
      cells.push(cell);
      const polarity =
        cell.passRate >= thresholds.strength
          ? ('strength' as const)
          : cell.passRate <= thresholds.weakness
            ? ('weakness' as const)
            : undefined;
      const complete =
        cell.n === cell.plannedN &&
        exhaustedRuns === 0 &&
        judgeIncompleteRuns === 0 &&
        suite.refusal === undefined;
      if (polarity !== undefined && cell.n > 0 && complete) {
        const epoch = options.modelEpochFor?.(member);
        claims.push({
          id: claimIdOf(options.reportId, member, taskClass),
          subject: {
            model: member.model,
            ...(member.effort === undefined ? {} : { effort: member.effort }),
          },
          taskClass,
          polarity,
          statement: statementOf(cell, polarity),
          metrics: { passRate: cell.passRate, n: cell.n, graderId: 'eval-suite' },
          confidence: cell.n >= 20 ? 'high' : cell.n >= 5 ? 'medium' : 'low',
          observedAt: options.observedAt,
          evidence: [{ kind: 'eval', reportId: options.reportId, caseIds: cell.caseNames }],
          ...(epoch === undefined ? {} : { modelEpoch: epoch }),
        });
      }
    }
  }
  const report: SweepReport = {
    reportId: options.reportId,
    observedAt: options.observedAt,
    cells,
    claims,
  };
  if (options.store !== undefined && claims.length > 0) {
    report.committedVersion = await commitEvalMeasured(options.store, claims, {
      committerId: options.committerId,
      reportId: options.reportId,
    });
  }
  return report;
}
