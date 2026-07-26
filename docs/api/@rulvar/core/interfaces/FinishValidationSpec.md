[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationSpec

# Interface: FinishValidationSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L262)

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
| <a id="property-contract"></a> `contract?` | [`FinishContract`](/api/@rulvar/core/interfaces/FinishContract.md) | The unified output contract this validator set enforces (the v1.71 experiment review, P0.1/P0.2). Construction then runs the golden self test with the contract's fixtures as defaults, the contract's promptLines join the validator statement in BOTH the coordination and synthesis prompts, every contract validator must appear in `validators` by name (a promised contract nobody enforces is drift by omission, a ConfigError), and the run journals ONE frozen bundle descriptor (decisionType 'orchestrator_finish_validation_bundle') recording the contract hash and the validator names. A resumed segment whose live contract hash differs appends a SUPERSEDING descriptor instead of failing, because fixing a stale validator and resuming is the intended remedy, never a fault. The remedy is generation-scoped (cycle 73): every decision entry written under a contract carries `contractHash`, and only the CURRENT generation is judged, so repairsUsed restarts under a fixed contract and a final rejection a superseded generation left in the crash window neither rolls forward at boot nor re-arms on replay (its exchange replays byte identical and the loop continues to a live repair turn). Decisions recorded before 1.77 carry no hash and bind to the current contract only while the journal holds a single bundle descriptor; once a supersession is recorded they are stale. The bundle is deeply frozen and the construction self test also runs the contract's per validator reject goldens against the CONFIGURED set (cycle 74), so a post construction mutation throws and a same-name replacement weaker than the contract's own validator is a ConfigError before any provider call. Absent = byte identical pre 1.72 behavior. | [packages/core/src/orchestrator/orchestrate.ts:350](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L350) |
| <a id="property-draftpolicy"></a> `draftPolicy?` | \{ `minWords?`: `number`; `requireSections?`: `string`[]; \} | The coordination draft gate (the v1.74 experiment review, P0.3), meaningful ONLY with `synthesis` configured: with validators bound to the synthesis finish, the coordination finish is an unvalidated draft, and the experiment's model escaped six failed finish exchanges with the schema-valid draft 'test', which then starved synthesis of every citation the validators demanded. The policy runs deterministic library checks on each coordination finish (whitespace-token `minWords`, literal `requireSections` markers, the wordCountValidator and requiredSectionsValidator semantics); a failing draft returns to the model as the finish call's error result and the turn continues, exactly like a host validation rejection, and `repairTurnReserve` grants coordination the same per-rejected-exchange headroom it grants the synthesis finish. Pure text checks over the durable exchange: nothing journals, a resumed segment recounts identically, and `maxRepairs` is not consumed (it belongs to the synthesis-bound validators). Absent = byte identical pre 1.76 behavior; configured without `synthesis` = ConfigError. | [packages/core/src/orchestrator/orchestrate.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L314) |
| `draftPolicy.minWords?` | `number` | Minimum whitespace-separated words the draft must carry. | [packages/core/src/orchestrator/orchestrate.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L316) |
| `draftPolicy.requireSections?` | `string`[] | Literal markers the draft text must contain. | [packages/core/src/orchestrator/orchestrate.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L318) |
| <a id="property-maxrepairs"></a> `maxRepairs?` | `number` | How many rejected finishes are returned to the model for repair before the run fails; a nonnegative integer, default [DEFAULT\_FINISH\_MAX\_REPAIRS](/api/@rulvar/core/variables/DEFAULT_FINISH_MAX_REPAIRS.md). Zero means the first rejected finish fails the run. | [packages/core/src/orchestrator/orchestrate.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L276) |
| <a id="property-repairturnreserve"></a> `repairTurnReserve?` | `number` | The repair turn reserve (the v1.71 experiment review, P0.4; the reserve RV-204 deliberately deferred). A nonnegative integer, default 0: max EXTRA turns the invocation the validators bind (the synthesis invocation when `synthesis` is configured, the coordination loop otherwise) may consume past its `maxTurns`, one granted per rejected finish exchange, schema-invalid finish arguments and host validation rejections alike. Without it, repair exchanges and generation compete for the same turn budget: the v1.71 experiment lost its whole run to one malformed finish plus one validator rejection inside maxTurns 3. The reserve is bounded, spends from the ordinary budget ceilings (a granted turn is a paid provider turn), and folds into the preflight turn projection (`projectedProviderTurns` and the run ceiling) when declared there. Zero keeps the pre 1.73 ceiling byte identical. | [packages/core/src/orchestrator/orchestrate.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L293) |
| <a id="property-selftest"></a> `selfTest?` | [`FinishSelfTestFixtures`](/api/@rulvar/core/interfaces/FinishSelfTestFixtures.md) | Golden fixtures of the construction self test (the v1.71 experiment review, P0.3), overriding the contract's generated fixtures: a host with custom validators supplies an accept fixture those validators actually accept. Fixtures without a contract run the self test on their own. Absent with no contract = no self test, the pre 1.72 behavior. | [packages/core/src/orchestrator/orchestrate.ts:359](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L359) |
| <a id="property-validators"></a> `validators` | [`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[] | Run in configuration order on every schema valid finish call; names must be unique (pass `name` to a factory to run several instances). A validator that THROWS is a host defect: the run fails as ConfigError, nothing journals, and no repair turn is granted. | [packages/core/src/orchestrator/orchestrate.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L269) |
