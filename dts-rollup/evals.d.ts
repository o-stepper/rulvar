import { CompiledWorkflow, DeclaredLadder, Effort, Engine, EvidenceRef, Json, JsonSchema, KnowledgeSnapshot, ModelClaim, ModelKnowledgeStore, ModelRef, ModelSpec, RunOutcome, SchemaSpec, TaskClass, Usage, WireError, Workflow } from "@rulvar/core";

//#region src/envelope.d.ts
/** Thrown when authorizing a run's ceiling would exceed the envelope. */
declare class SweepBudgetError extends Error {
  /** What was about to start, e.g. `eval target 'sweep-math'`. */
  readonly runLabel: string;
  /** The per-run ceiling that did not fit. */
  readonly ceilingUsd: number;
  /** Total already authorized before this refusal. */
  readonly authorizedUsd: number;
  readonly maxTotalUsd: number;
  constructor(runLabel: string, ceilingUsd: number, authorizedUsd: number, maxTotalUsd: number);
}
/**
* One envelope bounds one whole sweep invocation: share the instance
* across the canary loop and runSweepMatrix so canary, target, and
* judge runs all draw from the same remainder.
*/
declare class SpendEnvelope {
  readonly maxTotalUsd: number;
  private readonly maxMicroUsd;
  private authorizedMicroUsd;
  constructor(maxTotalUsd: number);
  /** Total authorized so far (debit-only; never decreases). */
  get authorizedUsd(): number;
  get remainingUsd(): number;
  /**
  * Authorizes one run's immutable ceiling or throws SweepBudgetError.
  * An unbounded run cannot be authorized: under an envelope every run
  * MUST carry an explicit positive ceiling, otherwise the aggregate
  * bound would be unaccountable.
  */
  authorize(ceilingUsd: number | undefined, runLabel: string): void;
}
//#endregion
//#region src/case.d.ts
/**
* One quality-measurement case. The shape is the
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
* to the router quality floors,
* and @rulvar/evals ships NO default judge model: weak defaults for
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
    reason: "judge-exhausted" | "judge-refused";
    detail: string;
  };
}
interface RunEvalCaseOptions {
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
declare class EvalJudgeError extends Error {
  readonly judgeRun: string;
  readonly status: RunOutcome<Json>["status"];
  /** What the failing judge run actually spent (honest cost accounting). */
  readonly costUsd: number;
  constructor(judgeRun: string, status: RunOutcome<Json>["status"], detail?: string, costUsd?: number);
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
  refusal?: {
    runLabel: string;
    atCase: string;
    detail: string;
  };
}
interface RunEvalSuiteOptions {
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
  * The fraction is also reported as the verdict score. Must be a
  * finite fraction in [0, 1]: anything else throws a ConfigError at
  * construction, because an out of range threshold silently passes
  * or fails every verdict (v1.28.0 review P2).
  */
  passThreshold?: number;
}
declare function rubricGrader(criteria: RubricCriterion[], options?: RubricGraderOptions): Grader;
//#endregion
//#region src/graders/judge.d.ts
/** The default judge verdict shape. */
declare const JUDGE_VERDICT_SCHEMA: JsonSchema;
interface JudgeGraderOptions {
  /** Judge model; required, never defaulted (role quality floors). */
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
  /**
  * CAS rebase attempts; default 3. A positive integer, refused as a
  * ConfigError before the first store read.
  */
  attempts?: number;
}
/** One measured claim; claimExpiry applies the TTL from the decay table. */
declare function evalMeasuredClaim(input: MeasuredClaimInput, committerId: string): ModelClaim;
/**
* Commits measured claims through the eval-committer gate with the
* documented rebase recipe: on a CAS rejection, re-read current() and
* retry against the fresh version. Returns the committed version.
*/
declare function commitEvalMeasured(store: ModelKnowledgeStore, claims: readonly MeasuredClaimInput[], options: EvalCommitterOptions): Promise<number>;
//#endregion
//#region src/canary.d.ts
interface CanaryProbeSet {
  /** Registered agent profile the probes run under. */
  agentType: string;
  /** The fixed prompts; order matters and enters the fingerprint. */
  prompts: string[];
}
interface CanaryRunOptions {
  /**
  * Immutable ceiling per probe run (v1.16.2 review P1-2): every probe
  * is an ordinary paid engine run and gets its own recorded
  * RunMeta.budgetUsd.
  */
  budgetUsd?: number;
  /**
  * Aggregate debit-only envelope shared with the surrounding sweep;
  * each probe authorizes budgetUsd BEFORE running, and an envelope
  * requires budgetUsd to be set.
  */
  envelope?: SpendEnvelope;
}
interface CanaryReport {
  fingerprint: string;
  /**
  * True only when every probe settled ok. A fingerprint containing a
  * non-ok probe status is a measurement artifact (budget exhaustion,
  * an envelope refusal, transient provider failure), NOT evidence of
  * model drift: never feed it to flipStaleOnCanaryDrift.
  */
  allOk: boolean;
  /**
  * One row per probe; 'refused' means the aggregate envelope refused
  * the probe before it started (v1.17.0 review P1-5): the loop keeps
  * walking so completed probe evidence survives, and allOk is false.
  */
  probes: Array<{
    prompt: string;
    status: RunOutcome<unknown>["status"] | "refused";
  }>;
}
/** The committed v1 normalization (OQ-06): NFC, trim, collapse whitespace. */
declare function normalizeCanaryOutput(output: unknown): string;
/**
* Runs the fixed probe set through the ordinary engine. Probes run
* sequentially in declaration order, one run per probe, so recordings
* replay deterministically. Each probe run carries the optional
* immutable ceiling (options.budgetUsd) and authorizes it against the
* optional envelope before starting; an envelope refusal records the
* probe as 'refused' and keeps walking instead of throwing away the
* completed probes. A non-ok or refused probe enters the fingerprint
* as `!status` and clears allOk: callers gate drift flipping on allOk,
* because a budget-starved or transiently failing probe fingerprints
* differently without the model having drifted.
*/
declare function runCanary(engine: Engine, probes: CanaryProbeSet, options?: CanaryRunOptions): Promise<CanaryReport>;
/**
* The fingerprint alone (the pre-v1.16.2-review surface, kept
* compatible). Prefer runCanary: its allOk is the drift-flip gate.
*/
declare function canaryFingerprint(engine: Engine, probes: CanaryProbeSet, options?: CanaryRunOptions): Promise<string>;
interface CanaryDriftReport {
  model: ModelRef;
  freshFingerprint: string;
  /** Claim ids flipped to stale by this call. */
  flipped: string[];
  /** The committed store version when anything flipped. */
  version?: number;
}
/**
* Flips the model's ACTIVE eval-measured claims to stale when their
* recorded canary fingerprint differs from the fresh one. Claims
* without a recorded fingerprint have no baseline and
* stay untouched (the documented no-probe posture); a second run is
* an idempotent noop. CAS-rebased like every maintenance commit; the
* retries run no engine work and pay nothing.
*
* Only pass fingerprints from an allOk probe set (runCanary): a
* fingerprint containing a `!status` probe differs from any healthy
* baseline by construction, and flipping on it would blame the model
* for a budget ceiling or a transient provider failure.
*/
declare function flipStaleOnCanaryDrift(store: ModelKnowledgeStore, model: ModelRef, freshFingerprint: string, options?: {
  attempts?: number;
}): Promise<CanaryDriftReport>;
//#endregion
//#region src/sweeps.d.ts
/** One fixed pool member; effort is part of the claim subject identity. */
interface SweepModel {
  model: ModelRef;
  effort?: Effort;
}
/** An eval case bound to the taskClass axis of the matrix. */
interface SweepCase {
  taskClass: TaskClass;
  case: EvalCase;
}
interface SweepPool {
  models: SweepModel[];
  cases: SweepCase[];
}
/**
* The claim bands. Both effective values must be finite fractions in
* [0, 1] with weakness strictly below strength (so the bands are
* ordered and an uninformative mid band exists); runSweepMatrix
* rejects anything else with a ConfigError before any engine, store,
* or envelope activity.
*/
interface SweepThresholds {
  /** passRate at or above emits a strength claim; default 0.9. */
  strength: number;
  /** passRate at or below emits a weakness claim; default 0.5. */
  weakness: number;
}
interface RunSweepOptions {
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
  modelEpochFor?: (member: SweepModel) => ModelClaim["modelEpoch"];
}
interface SweepCellReport {
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
  incompleteReason?: "envelope-exhausted" | "judge-exhausted" | "judge-refused";
  /** The refused run's label, when the envelope refused one. */
  refusedRunLabel?: string;
}
interface SweepReport {
  reportId: string;
  observedAt: string;
  cells: SweepCellReport[];
  /** Emitted per the thresholds; committed when a store was given. */
  claims: MeasuredClaimInput[];
  committedVersion?: number;
}
declare const SWEEP_THRESHOLD_DEFAULTS: SweepThresholds;
/**
* Runs the fixed matrix sequentially in declaration order
* (deterministic cassette consumption), aggregates per (model,
* taskClass) cell, emits threshold-crossing claims, and commits them
* through the eval-committer identity when a store is given.
*/
declare function runSweepMatrix(pool: SweepPool, options: RunSweepOptions): Promise<SweepReport>;
//#endregion
//#region src/checkpoint.d.ts
/** One declared checkpoint ladder: rungs are concrete pool members. */
interface CheckpointLadder extends DeclaredLadder {
  name: string;
  startTier: number;
  rungs: SweepModel[];
}
interface CheckpointPool {
  ladders: CheckpointLadder[];
  /** The measurement half; the seeding sweep MUST NOT have seen these. */
  evalCases: SweepCase[];
}
interface OrchestratedCase {
  /** The workflow drives an orchestrate-role run; graders judge its outcome. */
  case: EvalCase;
}
interface RunCheckpointOptions {
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
  * run ceiling must host the finalize reserve): their
  * suite options default to `suite` but usually carry a larger
  * budgetUsd.
  */
  orchestratedSuite?: RunEvalSuiteOptions;
}
interface CheckpointArm {
  passRate: number;
  totalCostUsd: number;
  n: number;
}
interface CheckpointCell {
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
interface CriterionOneReport {
  cells: CheckpointCell[];
  cellsPassed: number;
  majorityHolds: boolean;
  pooledBaseline: CheckpointArm;
  pooledTreatment: CheckpointArm;
  pooledHolds: boolean;
  passed: boolean;
}
interface CriterionTwoReport {
  baseline: CheckpointArm;
  informed: CheckpointArm;
  passed: boolean;
}
interface CheckpointReport {
  observedAt: string;
  criterion1: CriterionOneReport;
  criterion2?: CriterionTwoReport;
  /** Both criteria (criterion 2 counts as failed when unmeasured). */
  passed: boolean;
}
/**
* The OQ-09 criterion 2 rule (as amended 2026-07-12): match-or-beat at
* 105 percent of baseline cost, OR at least 15 points better at 115
* percent (the quality branch: the baseline fails cheaply, so the flat
* bar tightened exactly when the card won on quality). The vacuous-pass
* guard stays with the caller.
*/
declare function agentTypeRuleHolds(baseline: CheckpointArm, informed: CheckpointArm): boolean;
/** The OQ-09 cell rule (shared by the per-cell and pooled verdicts). */
declare function rungRuleHolds(baseline: CheckpointArm, treatment: CheckpointArm): boolean;
/**
* Runs the checkpoint over the fixed pool. Sequential in declaration
* order (deterministic cassette consumption when recorded); every cell
* runs baseline then treatment.
*/
declare function runValueCheckpoint(checkpointPool: CheckpointPool, options: RunCheckpointOptions): Promise<CheckpointReport>;
/** The deterministic render for the M12 gate docs amendment. */
declare function renderCheckpointReport(report: CheckpointReport): string;
//#endregion
export { type CanaryDriftReport, type CanaryProbeSet, type CanaryReport, type CanaryRunOptions, type CheckpointArm, type CheckpointCell, type CheckpointLadder, type CheckpointPool, type CheckpointReport, type CriterionOneReport, type CriterionTwoReport, type EvalCase, type EvalCaseResult, type EvalCommitterOptions, EvalJudgeError, type EvalMatrixReport, type EvalSuiteResult, type GoldenGraderOptions, type Grader, type GraderContext, type GraderVerdict, JUDGE_VERDICT_SCHEMA, type JudgeGraderOptions, type JudgeSpec, type MatrixCell, type MatrixCellReport, type MeasuredClaimInput, type OrchestratedCase, type RubricCriterion, type RubricGraderOptions, type RunCheckpointOptions, type RunEvalCaseOptions, type RunEvalSuiteOptions, type RunSweepOptions, SWEEP_THRESHOLD_DEFAULTS, SpendEnvelope, SweepBudgetError, type SweepCase, type SweepCellReport, type SweepModel, type SweepPool, type SweepReport, type SweepThresholds, agentTypeRuleHolds, canaryFingerprint, commitEvalMeasured, evalMeasuredClaim, flipStaleOnCanaryDrift, goldenGrader, judgeGrader, normalizeCanaryOutput, renderCheckpointReport, rubricGrader, runCanary, runEvalCase, runEvalMatrix, runEvalSuite, runSweepMatrix, runValueCheckpoint, rungRuleHolds };