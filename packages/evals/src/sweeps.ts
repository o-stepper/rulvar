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
import { SweepBudgetError, type SpendEnvelope } from './envelope.js';

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
   * grader judges); a cell refused by the envelope lands in the report
   * as envelopeExhausted with NO claim. Share the instance with the
   * canary loop so probes draw from the same remainder.
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
  n: number;
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
   * The aggregate envelope refused a run of this cell before it
   * started; stats cover nothing reliable and the cell emits no claim.
   */
  envelopeExhausted?: true;
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
      let suite;
      try {
        suite = await runEvalSuite(
          engine,
          bucket.map((entry) => entry.case),
          {
            ...(options.suite ?? {}),
            ...(options.envelope === undefined ? {} : { envelope: options.envelope }),
          },
        );
      } catch (error) {
        if (!(error instanceof SweepBudgetError)) {
          throw error;
        }
        // The envelope refused a run of this cell before it started:
        // record the refusal honestly and keep walking the matrix (the
        // remaining cells cost nothing to check and each gets its own
        // honest envelopeExhausted row).
        cells.push({
          model: member.model,
          ...(member.effort === undefined ? {} : { effort: member.effort }),
          taskClass,
          passRate: 0,
          n: 0,
          totalCostUsd: 0,
          caseNames: [],
          envelopeExhausted: true,
        });
        continue;
      }
      const exhaustedRuns = suite.results.filter((result) => result.status === 'exhausted').length;
      const cell: SweepCellReport = {
        model: member.model,
        ...(member.effort === undefined ? {} : { effort: member.effort }),
        taskClass,
        passRate: suite.passRate,
        n: suite.results.length,
        totalCostUsd: suite.totalCostUsd,
        caseNames: suite.results.map((result) => result.name),
        ...(exhaustedRuns === 0 ? {} : { exhaustedRuns }),
      };
      cells.push(cell);
      const polarity =
        cell.passRate >= thresholds.strength
          ? ('strength' as const)
          : cell.passRate <= thresholds.weakness
            ? ('weakness' as const)
            : undefined;
      if (polarity !== undefined && cell.n > 0 && exhaustedRuns === 0) {
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
