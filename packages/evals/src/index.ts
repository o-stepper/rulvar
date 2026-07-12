/**
 * @rulvar/evals: quality measurement strictly on the public APIs (L6).
 * EvalCase with golden, rubric, and LLM-judge graders; judge calls run
 * through the engine (journaled, budgeted, VCR-recordable), so eval CI is
 * deterministic; config-matrix comparison reports pass-rate, cost, and
 * latency per cell. Matrix sweeps feeding ModelKnowledge, the eval-committer
 * identity, and canary fingerprints are the M11 round-3 extensions.
 */
export {
  runEvalCase,
  runEvalSuite,
  EvalJudgeError,
  type EvalCase,
  type EvalCaseResult,
  type EvalSuiteResult,
  type Grader,
  type GraderContext,
  type GraderVerdict,
  type JudgeSpec,
  type RunEvalCaseOptions,
  type RunEvalSuiteOptions,
} from './case.js';
export {
  runEvalMatrix,
  type EvalMatrixReport,
  type MatrixCell,
  type MatrixCellReport,
} from './matrix.js';
export { goldenGrader, type GoldenGraderOptions } from './graders/golden.js';
export { rubricGrader, type RubricCriterion, type RubricGraderOptions } from './graders/rubric.js';
export { judgeGrader, JUDGE_VERDICT_SCHEMA, type JudgeGraderOptions } from './graders/judge.js';
export {
  commitEvalMeasured,
  evalMeasuredClaim,
  type EvalCommitterOptions,
  type MeasuredClaimInput,
} from './committer.js';
export {
  canaryFingerprint,
  flipStaleOnCanaryDrift,
  normalizeCanaryOutput,
  type CanaryDriftReport,
  type CanaryProbeSet,
} from './canary.js';
export {
  renderCheckpointReport,
  rungRuleHolds,
  runValueCheckpoint,
  type CheckpointArm,
  type CheckpointCell,
  type CheckpointLadder,
  type CheckpointPool,
  type CheckpointReport,
  type CriterionOneReport,
  type CriterionTwoReport,
  type OrchestratedCase,
  type RunCheckpointOptions,
} from './checkpoint.js';
export {
  runSweepMatrix,
  SWEEP_THRESHOLD_DEFAULTS,
  type RunSweepOptions,
  type SweepCase,
  type SweepCellReport,
  type SweepModel,
  type SweepPool,
  type SweepReport,
  type SweepThresholds,
} from './sweeps.js';
