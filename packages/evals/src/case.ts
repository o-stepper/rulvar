/**
 * @rulvar/evals (M9-T02): EvalCase, the grader contract, and the case and
 * suite runners. A separate quality-measurement package built strictly on
 * the public APIs (L6).
 *
 * Determinism rules (https://docs.rulvar.com/guide/evals and
 * https://docs.rulvar.com/guide/testing): judge graders run THROUGH the
 * engine, so judge calls
 * are journaled, budgeted, and VCR-recordable, and an eval suite replays
 * deterministically from cassettes with zero live calls.
 */
import {
  defineWorkflow,
  type CompiledWorkflow,
  type Engine,
  type Json,
  type ModelSpec,
  type RunOutcome,
  type SchemaSpec,
  type Usage,
  type WireError,
  type Workflow,
} from '@rulvar/core';

import { SweepBudgetError, type SpendEnvelope } from './envelope.js';

/**
 * One quality-measurement case. The shape is the
 * documented interface verbatim; display names derive from the workflow
 * name (the suite runner disambiguates duplicates by ordinal).
 */
export interface EvalCase {
  workflow: Workflow | CompiledWorkflow;
  args: Json;
  graders: Grader[];
}

/** One grader's outcome for one case. */
export interface GraderVerdict {
  /** The grader's display name. */
  grader: string;
  passed: boolean;
  /** 0..1 where the family defines a fraction (rubric criteria met). */
  score?: number;
  /** Family-specific evidence: diffs, per-criterion verdicts, judge output. */
  details?: Json;
}

/**
 * A judge invocation specification. The judge runs through the engine as
 * an ordinary journaled, budgeted invocation; model selection is subject
 * to the router quality floors,
 * and @rulvar/evals ships NO default judge model: weak defaults for
 * judging are forbidden, so the model is always explicit.
 */
export interface JudgeSpec {
  model: ModelSpec;
  prompt: string;
  schema: SchemaSpec;
}

/** What a grader sees; judge() is the only channel back into the engine. */
export interface GraderContext {
  /** The target run's structured output (RunOutcome.value). */
  value: Json | undefined;
  /** The full target outcome, for status- and cost-aware graders. */
  outcome: RunOutcome<Json>;
  /**
   * Runs one judge invocation through the engine (journaled, budgeted,
   * VCR-recordable) and returns the judge's structured output. Throws
   * when the judge run itself does not settle ok.
   */
  judge(spec: JudgeSpec): Promise<Json>;
}

export interface Grader {
  name: string;
  grade(context: GraderContext): Promise<GraderVerdict> | GraderVerdict;
}

/** The measured result of one EvalCase. */
export interface EvalCaseResult {
  /** Workflow name, disambiguated by the suite runner on duplicates. */
  name: string;
  /** The target run's settle status. */
  status: RunOutcome<Json>['status'];
  /** status 'ok' AND every grader passed. */
  passed: boolean;
  verdicts: GraderVerdict[];
  /** Target run cost plus all judge run costs (CostReport.totalUsd sums). */
  costUsd: number;
  /** The judge-run share of costUsd. */
  judgeCostUsd: number;
  /**
   * run:start to run:end of the target run, from event timestamps; no
   * separate measurement channel exists.
   */
  latencyMs: number;
  /** The target run's normalized usage. */
  usage: Usage;
  error?: WireError;
  /**
   * Present when grading stopped for a BUDGET reason (v1.17.0 review
   * P1-5): the judge run hit its own per-run ceiling
   * ('judge-exhausted') or the aggregate envelope refused a judge run
   * before it started ('judge-refused'). The paid target evidence and
   * its cost stay on this row, but the case can never count as passed
   * and its cell emits no claim. Unexpected grader errors still throw:
   * a grader that cannot grade for non-budget reasons is a defect of
   * the suite, not a budget event.
   */
  incomplete?: {
    reason: 'judge-exhausted' | 'judge-refused';
    detail: string;
  };
}

export interface RunEvalCaseOptions {
  /** Display-name override; defaults to the workflow name. */
  name?: string;
  /** Run ceiling for the target run. */
  budgetUsd?: number;
  /** Run ceiling for each judge run. */
  judgeBudgetUsd?: number;
  /**
   * Aggregate debit-only envelope (v1.16.2 review P1-2): every target
   * and judge run authorizes its ceiling here BEFORE starting, and an
   * envelope requires the matching per-run ceiling to be set. A
   * refusal throws SweepBudgetError before any provider work.
   */
  envelope?: SpendEnvelope;
}

/** Thrown when a judge run does not settle ok. */
export class EvalJudgeError extends Error {
  readonly judgeRun: string;
  readonly status: RunOutcome<Json>['status'];
  /** What the failing judge run actually spent (honest cost accounting). */
  readonly costUsd: number;
  constructor(
    judgeRun: string,
    status: RunOutcome<Json>['status'],
    detail?: string,
    costUsd = 0,
  ) {
    super(
      `eval judge run '${judgeRun}' settled '${status}'${detail === undefined ? '' : `: ${detail}`}`,
    );
    this.name = 'EvalJudgeError';
    this.judgeRun = judgeRun;
    this.status = status;
    this.costUsd = costUsd;
  }
}

/**
 * Runs one EvalCase on the given engine: the target workflow as its own
 * run, pure graders host-side over the outcome, judge graders through the
 * engine via GraderContext.judge. Grader thrown errors are not absorbed:
 * a grader that cannot grade is a defect of the suite, not a failed case.
 */
export async function runEvalCase(
  engine: Engine,
  evalCase: EvalCase,
  options: RunEvalCaseOptions = {},
): Promise<EvalCaseResult> {
  const name = options.name ?? evalCase.workflow.name;
  const timing: { start?: string; end?: string } = {};
  options.envelope?.authorize(options.budgetUsd, `eval target '${name}'`);
  const handle = engine.run(evalCase.workflow, evalCase.args, {
    name: `eval:${name}`,
    ...(options.budgetUsd === undefined ? {} : { budgetUsd: options.budgetUsd }),
  });
  // Attached in the same tick as engine.run, so no event precedes them.
  const offStart = handle.on('run:start', (event) => {
    timing.start ??= event.ts;
  });
  const offEnd = handle.on('run:end', (event) => {
    timing.end ??= event.ts;
  });
  const outcome = (await handle.result) as RunOutcome<Json>;
  offStart();
  offEnd();

  let judgeCostUsd = 0;
  let judgeOrdinal = 0;
  const context: GraderContext = {
    value: outcome.value,
    outcome,
    async judge(spec: JudgeSpec): Promise<Json> {
      const ordinal = judgeOrdinal;
      judgeOrdinal += 1;
      // Judge run counts are grader behavior, unknowable upfront, so
      // the envelope authorizes each judge run at call time.
      options.envelope?.authorize(
        options.judgeBudgetUsd,
        `eval judge '${name}:${String(ordinal)}'`,
      );
      const judged = await runJudge(engine, `${name}:${ordinal}`, spec, options.judgeBudgetUsd);
      judgeCostUsd += judged.costUsd;
      return judged.output;
    },
  };

  const verdicts: GraderVerdict[] = [];
  let incomplete: EvalCaseResult['incomplete'];
  for (const grader of evalCase.graders) {
    try {
      verdicts.push(await grader.grade(context));
    } catch (error) {
      // Budget events normalize into the result row so paid target
      // evidence survives (v1.17.0 review P1-5); everything else is a
      // suite defect and still throws.
      if (error instanceof SweepBudgetError) {
        incomplete = { reason: 'judge-refused', detail: error.message };
        break;
      }
      if (error instanceof EvalJudgeError && error.status === 'exhausted') {
        judgeCostUsd += error.costUsd;
        incomplete = { reason: 'judge-exhausted', detail: error.message };
        break;
      }
      throw error;
    }
  }

  const latencyMs =
    timing.start !== undefined && timing.end !== undefined
      ? Math.max(0, Date.parse(timing.end) - Date.parse(timing.start))
      : 0;

  return {
    name,
    status: outcome.status,
    passed:
      outcome.status === 'ok' &&
      incomplete === undefined &&
      verdicts.every((verdict) => verdict.passed),
    verdicts,
    costUsd: outcome.cost.totalUsd + judgeCostUsd,
    judgeCostUsd,
    latencyMs,
    usage: outcome.usage,
    ...(outcome.error === undefined ? {} : { error: outcome.error }),
    ...(incomplete === undefined ? {} : { incomplete }),
  };
}

async function runJudge(
  engine: Engine,
  judgeName: string,
  spec: JudgeSpec,
  budgetUsd: number | undefined,
): Promise<{ output: Json; costUsd: number }> {
  // A stable workflow name keeps the judge journal deterministic across
  // record and replay runs of the same suite.
  const workflowName = `eval-judge:${judgeName}`;
  const judgeWorkflow = defineWorkflow({ name: workflowName }, async (ctx) => {
    return await ctx.agent(spec.prompt, {
      model: spec.model,
      schema: spec.schema,
      label: 'eval-judge',
      onError: 'throw',
    });
  });
  const handle = engine.run(judgeWorkflow, null, {
    name: workflowName,
    ...(budgetUsd === undefined ? {} : { budgetUsd }),
  });
  const outcome = (await handle.result) as RunOutcome<Json>;
  if (outcome.status !== 'ok') {
    throw new EvalJudgeError(
      workflowName,
      outcome.status,
      outcome.error?.message,
      outcome.cost.totalUsd,
    );
  }
  return { output: outcome.value ?? null, costUsd: outcome.cost.totalUsd };
}

/** Aggregate view of a suite run. */
export interface EvalSuiteResult {
  results: EvalCaseResult[];
  /** Fraction of result rows with passed true; 0 for an empty suite. */
  passRate: number;
  totalCostUsd: number;
  /** Arithmetic mean over result rows; 0 for an empty suite. */
  meanLatencyMs: number;
  /** Cases the caller asked for. */
  plannedN: number;
  /** Result rows actually produced (equals results.length). */
  completedN: number;
  /**
   * Present when the aggregate envelope refused a TARGET run before it
   * started (v1.17.0 review P1-5). The suite stops there and returns
   * everything already measured instead of throwing: completed rows,
   * their costs, and their names survive. Judge refusals never appear
   * here; they normalize into the owning row's `incomplete` marker.
   */
  refusal?: { runLabel: string; atCase: string; detail: string };
}

export interface RunEvalSuiteOptions {
  budgetUsd?: number;
  judgeBudgetUsd?: number;
  /** See RunEvalCaseOptions.envelope; shared across every case of the suite. */
  envelope?: SpendEnvelope;
}

/**
 * Runs cases sequentially (deterministic journal and cassette order) and
 * aggregates. Duplicate workflow names get '#<ordinal>' suffixes so every
 * result row and judge journal is unambiguous.
 */
export async function runEvalSuite(
  engine: Engine,
  cases: EvalCase[],
  options: RunEvalSuiteOptions = {},
): Promise<EvalSuiteResult> {
  const seen = new Map<string, number>();
  const results: EvalCaseResult[] = [];
  let refusal: EvalSuiteResult['refusal'];
  for (const evalCase of cases) {
    const base = evalCase.workflow.name;
    const ordinal = seen.get(base) ?? 0;
    seen.set(base, ordinal + 1);
    const name = ordinal === 0 ? base : `${base}#${ordinal}`;
    try {
      results.push(
        await runEvalCase(engine, evalCase, {
          name,
          ...(options.budgetUsd === undefined ? {} : { budgetUsd: options.budgetUsd }),
          ...(options.judgeBudgetUsd === undefined
            ? {}
            : { judgeBudgetUsd: options.judgeBudgetUsd }),
          ...(options.envelope === undefined ? {} : { envelope: options.envelope }),
        }),
      );
    } catch (error) {
      if (!(error instanceof SweepBudgetError)) {
        throw error;
      }
      // A refused TARGET stops the walk (every later target carries
      // the same ceiling) but MUST NOT erase what already ran: the
      // completed rows, their costs, and their names are paid
      // evidence (v1.17.0 review P1-5).
      refusal = { runLabel: error.runLabel, atCase: name, detail: error.message };
      break;
    }
  }
  return {
    results,
    passRate: results.length === 0 ? 0 : results.filter((r) => r.passed).length / results.length,
    totalCostUsd: results.reduce((sum, r) => sum + r.costUsd, 0),
    meanLatencyMs:
      results.length === 0 ? 0 : results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length,
    plannedN: cases.length,
    completedN: results.length,
    ...(refusal === undefined ? {} : { refusal }),
  };
}
