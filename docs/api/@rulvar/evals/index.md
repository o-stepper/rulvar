[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/evals

# @rulvar/evals

## Classes

| Class | Description |
| ------ | ------ |
| [EvalJudgeError](/api/@rulvar/evals/classes/EvalJudgeError.md) | Thrown when a judge run does not settle ok. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CanaryDriftReport](/api/@rulvar/evals/interfaces/CanaryDriftReport.md) | - |
| [CanaryProbeSet](/api/@rulvar/evals/interfaces/CanaryProbeSet.md) | - |
| [CheckpointArm](/api/@rulvar/evals/interfaces/CheckpointArm.md) | - |
| [CheckpointCell](/api/@rulvar/evals/interfaces/CheckpointCell.md) | - |
| [CheckpointLadder](/api/@rulvar/evals/interfaces/CheckpointLadder.md) | One declared checkpoint ladder: rungs are concrete pool members. |
| [CheckpointPool](/api/@rulvar/evals/interfaces/CheckpointPool.md) | - |
| [CheckpointReport](/api/@rulvar/evals/interfaces/CheckpointReport.md) | - |
| [CriterionOneReport](/api/@rulvar/evals/interfaces/CriterionOneReport.md) | - |
| [CriterionTwoReport](/api/@rulvar/evals/interfaces/CriterionTwoReport.md) | - |
| [EvalCase](/api/@rulvar/evals/interfaces/EvalCase.md) | One quality-measurement case (docs/09, section 7.1). The shape is the documented interface verbatim; display names derive from the workflow name (the suite runner disambiguates duplicates by ordinal). |
| [EvalCaseResult](/api/@rulvar/evals/interfaces/EvalCaseResult.md) | The measured result of one EvalCase. |
| [EvalCommitterOptions](/api/@rulvar/evals/interfaces/EvalCommitterOptions.md) | - |
| [EvalMatrixReport](/api/@rulvar/evals/interfaces/EvalMatrixReport.md) | - |
| [EvalSuiteResult](/api/@rulvar/evals/interfaces/EvalSuiteResult.md) | Aggregate view of a suite run. |
| [GoldenGraderOptions](/api/@rulvar/evals/interfaces/GoldenGraderOptions.md) | - |
| [Grader](/api/@rulvar/evals/interfaces/Grader.md) | @rulvar/evals: quality measurement strictly on the public APIs (L6). EvalCase with golden, rubric, and LLM-judge graders; judge calls run through the engine (journaled, budgeted, VCR-recordable), so eval CI is deterministic; config-matrix comparison reports pass-rate, cost, and latency per cell (docs/09, section "@rulvar/evals"; docs/11, section "Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer identity, and canary fingerprints are the M11 round-3 extensions. |
| [GraderContext](/api/@rulvar/evals/interfaces/GraderContext.md) | What a grader sees; judge() is the only channel back into the engine. |
| [GraderVerdict](/api/@rulvar/evals/interfaces/GraderVerdict.md) | One grader's outcome for one case. |
| [JudgeGraderOptions](/api/@rulvar/evals/interfaces/JudgeGraderOptions.md) | - |
| [JudgeSpec](/api/@rulvar/evals/interfaces/JudgeSpec.md) | A judge invocation specification. The judge runs through the engine as an ordinary journaled, budgeted invocation; model selection is subject to the router quality floors (docs/04, section "Role quality floors"), and @rulvar/evals ships NO default judge model: weak defaults for judging are forbidden, so the model is always explicit. |
| [MatrixCell](/api/@rulvar/evals/interfaces/MatrixCell.md) | One configuration under comparison. |
| [MatrixCellReport](/api/@rulvar/evals/interfaces/MatrixCellReport.md) | - |
| [MeasuredClaimInput](/api/@rulvar/evals/interfaces/MeasuredClaimInput.md) | - |
| [OrchestratedCase](/api/@rulvar/evals/interfaces/OrchestratedCase.md) | - |
| [RubricCriterion](/api/@rulvar/evals/interfaces/RubricCriterion.md) | - |
| [RubricGraderOptions](/api/@rulvar/evals/interfaces/RubricGraderOptions.md) | - |
| [RunCheckpointOptions](/api/@rulvar/evals/interfaces/RunCheckpointOptions.md) | - |
| [RunEvalCaseOptions](/api/@rulvar/evals/interfaces/RunEvalCaseOptions.md) | @rulvar/evals: quality measurement strictly on the public APIs (L6). EvalCase with golden, rubric, and LLM-judge graders; judge calls run through the engine (journaled, budgeted, VCR-recordable), so eval CI is deterministic; config-matrix comparison reports pass-rate, cost, and latency per cell (docs/09, section "@rulvar/evals"; docs/11, section "Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer identity, and canary fingerprints are the M11 round-3 extensions. |
| [RunEvalSuiteOptions](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | @rulvar/evals: quality measurement strictly on the public APIs (L6). EvalCase with golden, rubric, and LLM-judge graders; judge calls run through the engine (journaled, budgeted, VCR-recordable), so eval CI is deterministic; config-matrix comparison reports pass-rate, cost, and latency per cell (docs/09, section "@rulvar/evals"; docs/11, section "Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer identity, and canary fingerprints are the M11 round-3 extensions. |
| [RunSweepOptions](/api/@rulvar/evals/interfaces/RunSweepOptions.md) | - |
| [SweepCase](/api/@rulvar/evals/interfaces/SweepCase.md) | An eval case bound to the taskClass axis of the matrix. |
| [SweepCellReport](/api/@rulvar/evals/interfaces/SweepCellReport.md) | - |
| [SweepModel](/api/@rulvar/evals/interfaces/SweepModel.md) | One fixed pool member; effort is part of the claim subject identity. |
| [SweepPool](/api/@rulvar/evals/interfaces/SweepPool.md) | - |
| [SweepReport](/api/@rulvar/evals/interfaces/SweepReport.md) | - |
| [SweepThresholds](/api/@rulvar/evals/interfaces/SweepThresholds.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [JUDGE\_VERDICT\_SCHEMA](/api/@rulvar/evals/variables/JUDGE_VERDICT_SCHEMA.md) | The default judge verdict shape. |
| [SWEEP\_THRESHOLD\_DEFAULTS](/api/@rulvar/evals/variables/SWEEP_THRESHOLD_DEFAULTS.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [canaryFingerprint](/api/@rulvar/evals/functions/canaryFingerprint.md) | Runs the fixed probe set through the ordinary engine and returns the fingerprint. Probes run sequentially in declaration order, one run per probe, so recordings replay deterministically. |
| [commitEvalMeasured](/api/@rulvar/evals/functions/commitEvalMeasured.md) | Commits measured claims through the eval-committer gate with the documented rebase recipe: on a CAS rejection, re-read current() and retry against the fresh version. Returns the committed version. |
| [evalMeasuredClaim](/api/@rulvar/evals/functions/evalMeasuredClaim.md) | One measured claim, TTL applied per the docs/05 decay table. |
| [flipStaleOnCanaryDrift](/api/@rulvar/evals/functions/flipStaleOnCanaryDrift.md) | Flips the model's ACTIVE eval-measured claims to stale when their recorded canary fingerprint differs from the fresh one (docs/05: "a fingerprint change immediately flips the model's eval claims to stale"). Claims without a recorded fingerprint have no baseline and stay untouched (the documented no-probe posture); a second run is an idempotent noop. CAS-rebased like every maintenance commit. |
| [goldenGrader](/api/@rulvar/evals/functions/goldenGrader.md) | - |
| [judgeGrader](/api/@rulvar/evals/functions/judgeGrader.md) | - |
| [normalizeCanaryOutput](/api/@rulvar/evals/functions/normalizeCanaryOutput.md) | The committed v1 normalization (OQ-06): NFC, trim, collapse whitespace. |
| [renderCheckpointReport](/api/@rulvar/evals/functions/renderCheckpointReport.md) | The deterministic render for the M12 gate docs amendment. |
| [rubricGrader](/api/@rulvar/evals/functions/rubricGrader.md) | - |
| [runEvalCase](/api/@rulvar/evals/functions/runEvalCase.md) | @rulvar/evals: quality measurement strictly on the public APIs (L6). EvalCase with golden, rubric, and LLM-judge graders; judge calls run through the engine (journaled, budgeted, VCR-recordable), so eval CI is deterministic; config-matrix comparison reports pass-rate, cost, and latency per cell (docs/09, section "@rulvar/evals"; docs/11, section "Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer identity, and canary fingerprints are the M11 round-3 extensions. |
| [runEvalMatrix](/api/@rulvar/evals/functions/runEvalMatrix.md) | Runs the same case list against every cell's engine, sequentially and in declaration order (deterministic cassette consumption), and reports per-cell aggregates for side-by-side comparison. |
| [runEvalSuite](/api/@rulvar/evals/functions/runEvalSuite.md) | @rulvar/evals: quality measurement strictly on the public APIs (L6). EvalCase with golden, rubric, and LLM-judge graders; judge calls run through the engine (journaled, budgeted, VCR-recordable), so eval CI is deterministic; config-matrix comparison reports pass-rate, cost, and latency per cell (docs/09, section "@rulvar/evals"; docs/11, section "Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer identity, and canary fingerprints are the M11 round-3 extensions. |
| [rungRuleHolds](/api/@rulvar/evals/functions/rungRuleHolds.md) | The OQ-09 cell rule (shared by the per-cell and pooled verdicts). |
| [runSweepMatrix](/api/@rulvar/evals/functions/runSweepMatrix.md) | Runs the fixed matrix sequentially in declaration order (deterministic cassette consumption), aggregates per (model, taskClass) cell, emits threshold-crossing claims, and commits them through the eval-committer identity when a store is given. |
| [runValueCheckpoint](/api/@rulvar/evals/functions/runValueCheckpoint.md) | Runs the checkpoint over the fixed pool. Sequential in declaration order (deterministic cassette consumption when recorded); every cell runs baseline then treatment. |
