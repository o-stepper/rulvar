import { CompiledWorkflow, Effort, Engine, EvidenceRef, Json, JsonSchema, ModelClaim, ModelKnowledgeStore, ModelRef, ModelSpec, RunOutcome, SchemaSpec, TaskClass, Usage, WireError, Workflow } from "@lurker/core";

//#region src/case.d.ts
/**
* One quality-measurement case (docs/09, section 7.1). The shape is the
* documented interface verbatim; display names derive from the workflow
* name (the suite runner disambiguates duplicates by ordinal).
*/
interface EvalCase {
  workflow: Workflow | CompiledWorkflow;
  args: Json;
  graders: Grader[];
}
/** One grader's outcome for one case. */
interface GraderVerdict {
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
* to the router quality floors (docs/04, section "Role quality floors"),
* and @lurker/evals ships NO default judge model: weak defaults for
* judging are forbidden, so the model is always explicit.
*/
interface JudgeSpec {
  model: ModelSpec;
  prompt: string;
  schema: SchemaSpec;
}
/** What a grader sees; judge() is the only channel back into the engine. */
interface GraderContext {
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
interface Grader {
  name: string;
  grade(context: GraderContext): Promise<GraderVerdict> | GraderVerdict;
}
/** The measured result of one EvalCase. */
interface EvalCaseResult {
  /** Workflow name, disambiguated by the suite runner on duplicates. */
  name: string;
  /** The target run's settle status. */
  status: RunOutcome<Json>["status"];
  /** status 'ok' AND every grader passed. */
  passed: boolean;
  verdicts: GraderVerdict[];
  /** Target run cost plus all judge run costs (CostReport.totalUsd sums). */
  costUsd: number;
  /** The judge-run share of costUsd. */
  judgeCostUsd: number;
  /**
  * run:start to run:end of the target run, from event timestamps; no
  * separate measurement channel exists (docs/09, section 7.2).
  */
  latencyMs: number;
  /** The target run's normalized usage. */
  usage: Usage;
  error?: WireError;
}
interface RunEvalCaseOptions {
  /** Display-name override; defaults to the workflow name. */
  name?: string;
  /** Run ceiling for the target run. */
  budgetUsd?: number;
  /** Run ceiling for each judge run. */
  judgeBudgetUsd?: number;
}
/** Thrown when a judge run does not settle ok. */
declare class EvalJudgeError extends Error {
  readonly judgeRun: string;
  readonly status: RunOutcome<Json>["status"];
  constructor(judgeRun: string, status: RunOutcome<Json>["status"], detail?: string);
}
/**
* Runs one EvalCase on the given engine: the target workflow as its own
* run, pure graders host-side over the outcome, judge graders through the
* engine via GraderContext.judge. Grader thrown errors are not absorbed:
* a grader that cannot grade is a defect of the suite, not a failed case.
*/
declare function runEvalCase(engine: Engine, evalCase: EvalCase, options?: RunEvalCaseOptions): Promise<EvalCaseResult>;
/** Aggregate view of a suite run. */
interface EvalSuiteResult {
  results: EvalCaseResult[];
  /** Fraction of cases with passed true; 0 for an empty suite. */
  passRate: number;
  totalCostUsd: number;
  /** Arithmetic mean over cases; 0 for an empty suite. */
  meanLatencyMs: number;
}
interface RunEvalSuiteOptions {
  budgetUsd?: number;
  judgeBudgetUsd?: number;
}
/**
* Runs cases sequentially (deterministic journal and cassette order) and
* aggregates. Duplicate workflow names get '#<ordinal>' suffixes so every
* result row and judge journal is unambiguous.
*/
declare function runEvalSuite(engine: Engine, cases: EvalCase[], options?: RunEvalSuiteOptions): Promise<EvalSuiteResult>;
//#endregion
//#region src/matrix.d.ts
/** One configuration under comparison. */
interface MatrixCell {
  name: string;
  /** A fresh engine per cell run keeps cells isolated. */
  engine: () => Engine | Promise<Engine>;
}
interface MatrixCellReport {
  cell: string;
  passRate: number;
  totalCostUsd: number;
  meanLatencyMs: number;
  results: EvalCaseResult[];
}
interface EvalMatrixReport {
  cells: MatrixCellReport[];
}
/**
* Runs the same case list against every cell's engine, sequentially and
* in declaration order (deterministic cassette consumption), and reports
* per-cell aggregates for side-by-side comparison.
*/
declare function runEvalMatrix(cells: MatrixCell[], cases: EvalCase[], options?: RunEvalSuiteOptions): Promise<EvalMatrixReport>;
//#endregion
//#region src/graders/golden.d.ts
interface GoldenGraderOptions {
  name?: string;
}
declare function goldenGrader(expected: Json, options?: GoldenGraderOptions): Grader;
//#endregion
//#region src/graders/rubric.d.ts
interface RubricCriterion {
  name: string;
  check: (value: Json | undefined) => boolean;
}
interface RubricGraderOptions {
  name?: string;
  /**
  * Minimum fraction of criteria that must pass; default 1 (all).
  * The fraction is also reported as the verdict score.
  */
  passThreshold?: number;
}
declare function rubricGrader(criteria: RubricCriterion[], options?: RubricGraderOptions): Grader;
//#endregion
//#region src/graders/judge.d.ts
/** The default judge verdict shape. */
declare const JUDGE_VERDICT_SCHEMA: JsonSchema;
interface JudgeGraderOptions {
  /** Judge model; required, never defaulted (docs/04 role quality floors). */
  model: ModelSpec;
  /** What to judge: the criteria prose embedded into the judge prompt. */
  instruction: string;
  name?: string;
  /**
  * Custom verdict schema; requires toVerdict. The default schema is
  * JUDGE_VERDICT_SCHEMA with its boolean `passed`.
  */
  schema?: JsonSchema;
  /** Maps the judge's structured output onto a pass/score pair. */
  toVerdict?: (output: Json) => {
    passed: boolean;
    score?: number;
  };
}
declare function judgeGrader(options: JudgeGraderOptions): Grader;
//#endregion
//#region src/committer.d.ts
interface MeasuredClaimInput {
  /** ULID (or any unique id); the caller mints it deterministically. */
  id: string;
  subject: {
    model: ModelRef;
    effort?: Effort;
  };
  taskClass: TaskClass;
  polarity: "strength" | "weakness";
  /** A typed template render, never a quote from tool output. */
  statement: string;
  metrics: {
    passRate: number;
    n: number;
    graderId: string;
    cost?: number;
    baseline?: {
      model: ModelRef;
      passRate: number;
    };
  };
  confidence: "high" | "medium" | "low";
  /** ISO date of the sweep run. */
  observedAt: string;
  evidence: EvidenceRef[];
  modelEpoch?: ModelClaim["modelEpoch"];
}
interface EvalCommitterOptions {
  /** The dedicated identity recorded on the gate AND the author. */
  committerId: string;
  /** The emitting sweep report; every claim's gate references it. */
  reportId: string;
  /** CAS-rebase attempts (docs/05, 5.4); default 3. */
  attempts?: number;
}
/** One measured claim, TTL applied per the docs/05 decay table. */
declare function evalMeasuredClaim(input: MeasuredClaimInput, committerId: string): ModelClaim;
/**
* Commits measured claims through the eval-committer gate with the
* documented rebase recipe: on a CAS rejection, re-read current() and
* retry against the fresh version. Returns the committed version.
*/
declare function commitEvalMeasured(store: ModelKnowledgeStore, claims: readonly MeasuredClaimInput[], options: EvalCommitterOptions): Promise<number>;
//#endregion
export { type EvalCase, type EvalCaseResult, type EvalCommitterOptions, EvalJudgeError, type EvalMatrixReport, type EvalSuiteResult, type GoldenGraderOptions, type Grader, type GraderContext, type GraderVerdict, JUDGE_VERDICT_SCHEMA, type JudgeGraderOptions, type JudgeSpec, type MatrixCell, type MatrixCellReport, type MeasuredClaimInput, type RubricCriterion, type RubricGraderOptions, type RunEvalCaseOptions, type RunEvalSuiteOptions, commitEvalMeasured, evalMeasuredClaim, goldenGrader, judgeGrader, rubricGrader, runEvalCase, runEvalMatrix, runEvalSuite };