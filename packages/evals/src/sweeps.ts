/**
 * Matrix sweeps (M11-T02; docs/05, section "Grounding and decay";
 * docs/09, section "@lurker/evals"). The deconfounder of the whole
 * knowledge feature: a FIXED eval matrix (workflow x model x
 * taskClass), independent of current routing, measured through the
 * ordinary engine (journaled, budgeted, VCR-recordable), emitting
 * eval-measured claims through the eval-committer identity.
 *
 * Sweep volume is never authorized by proposal volume: the model pool
 * and the case list are EXPLICIT caller data (fixed pools only;
 * docs/05, section 2, attack 7).
 */
import type { Effort, Engine, ModelKnowledgeStore, ModelRef, TaskClass } from '@lurker/core';

import { runEvalSuite, type EvalCase, type RunEvalSuiteOptions } from './case.js';
import { commitEvalMeasured, type MeasuredClaimInput } from './committer.js';

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
  /** The dedicated identity (docs/05, 5.4). */
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
  /** When given, emitted claims commit through the committer identity. */
  store?: ModelKnowledgeStore;
}

export interface SweepCellReport {
  model: ModelRef;
  effort?: Effort;
  taskClass: TaskClass;
  passRate: number;
  n: number;
  totalCostUsd: number;
  caseNames: string[];
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
      const suite = await runEvalSuite(
        engine,
        bucket.map((entry) => entry.case),
        options.suite ?? {},
      );
      const cell: SweepCellReport = {
        model: member.model,
        ...(member.effort === undefined ? {} : { effort: member.effort }),
        taskClass,
        passRate: suite.passRate,
        n: suite.results.length,
        totalCostUsd: suite.totalCostUsd,
        caseNames: suite.results.map((result) => result.name),
      };
      cells.push(cell);
      const polarity =
        cell.passRate >= thresholds.strength
          ? ('strength' as const)
          : cell.passRate <= thresholds.weakness
            ? ('weakness' as const)
            : undefined;
      if (polarity !== undefined && cell.n > 0) {
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
