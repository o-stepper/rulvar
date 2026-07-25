[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationSpec

# Interface: FinishValidationSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L244)

The opt in deterministic validation of the orchestrator finish result
(the v1.40.0 improvement plan's RV-204 slice). Every SCHEMA valid
finish({ result }) call first passes the configured host validators;
a rejection returns the failure reasons to the model as the call's
error tool result and the turn continues (a repair turn: the model
fixes the result and calls finish again), bounded by maxRepairs. A
rejection past the bound fails the run with the typed FailRunError
(code 'fail_run', data.source 'orchestrator_finish_validation'),
BEFORE the acceptance settle, so acceptance never judges a finish the
validators rejected. Every verdict journals as ONE decision entry
keyed by the finish call id (decisionType
'orchestrator_finish_validation'), so a resume rolls the SAME
verdicts forward without re-running validator code, and the whole
exchange replays without new paid calls. The toolset never changes
(the contract rides the orchestrator prompt), zero configuration adds
zero journal entries, and the budget cap paths keep their posture:
the reserved finalize dispatch is never validated, exactly as
acceptance never judges it. Repair turns spend from the
orchestrator's ordinary limits and ceilings (maxTurns, budget caps,
the root budgetUsd); maxRepairs is the explicit bound, and a
dedicated repair budget reserve is deliberately out of scope here.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contract"></a> `contract?` | [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md) | The unified output contract this validator set enforces (the v1.71 experiment review, P0.1/P0.2). Construction then runs the golden self test with the contract's fixtures as defaults, the contract's promptLines join the validator statement in BOTH the coordination and synthesis prompts, every contract validator must appear in `validators` by name (a promised contract nobody enforces is drift by omission, a ConfigError), and the run journals ONE frozen bundle descriptor (decisionType 'orchestrator_finish_validation_bundle') recording the contract hash and the validator names. A resumed segment whose live contract hash differs appends a SUPERSEDING descriptor instead of failing, because fixing a stale validator and resuming is the intended remedy, never a fault. Absent = byte identical pre 1.72 behavior. | [packages/core/src/orchestrator/orchestrate.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L275) |
| <a id="property-maxrepairs"></a> `maxRepairs?` | `number` | How many rejected finishes are returned to the model for repair before the run fails; a nonnegative integer, default [DEFAULT\_FINISH\_MAX\_REPAIRS](/api/@rulvar/core/variables/DEFAULT_FINISH_MAX_REPAIRS.md). Zero means the first rejected finish fails the run. | [packages/core/src/orchestrator/orchestrate.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L258) |
| <a id="property-selftest"></a> `selfTest?` | [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md) | Golden fixtures of the construction self test (the v1.71 experiment review, P0.3), overriding the contract's generated fixtures: a host with custom validators supplies an accept fixture those validators actually accept. Fixtures without a contract run the self test on their own. Absent with no contract = no self test, the pre 1.72 behavior. | [packages/core/src/orchestrator/orchestrate.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L284) |
| <a id="property-validators"></a> `validators` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | Run in configuration order on every schema valid finish call; names must be unique (pass `name` to a factory to run several instances). A validator that THROWS is a host defect: the run fails as ConfigError, nothing journals, and no repair turn is granted. | [packages/core/src/orchestrator/orchestrate.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L251) |
