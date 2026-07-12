/**
 * Config-matrix comparison (M9-T02): profile versus
 * profile, cheap workers versus premium, reviewer on or off. Each cell
 * supplies its own engine (the configuration under measurement); the
 * report carries pass-rate, cost, and latency per cell, sourced from the
 * existing usage and cost fields. No separate measurement channel exists,
 * no failure clustering, no vector dependency (EXC registry).
 */
import type { Engine } from '@rulvar/core';
import {
  runEvalSuite,
  type EvalCase,
  type EvalCaseResult,
  type RunEvalSuiteOptions,
} from './case.js';

/** One configuration under comparison. */
export interface MatrixCell {
  name: string;
  /** A fresh engine per cell run keeps cells isolated. */
  engine: () => Engine | Promise<Engine>;
}

export interface MatrixCellReport {
  cell: string;
  passRate: number;
  totalCostUsd: number;
  meanLatencyMs: number;
  results: EvalCaseResult[];
}

export interface EvalMatrixReport {
  cells: MatrixCellReport[];
}

/**
 * Runs the same case list against every cell's engine, sequentially and
 * in declaration order (deterministic cassette consumption), and reports
 * per-cell aggregates for side-by-side comparison.
 */
export async function runEvalMatrix(
  cells: MatrixCell[],
  cases: EvalCase[],
  options: RunEvalSuiteOptions = {},
): Promise<EvalMatrixReport> {
  const reports: MatrixCellReport[] = [];
  for (const cell of cells) {
    const engine = await cell.engine();
    const suite = await runEvalSuite(engine, cases, options);
    reports.push({
      cell: cell.name,
      passRate: suite.passRate,
      totalCostUsd: suite.totalCostUsd,
      meanLatencyMs: suite.meanLatencyMs,
      results: suite.results,
    });
  }
  return { cells: reports };
}
