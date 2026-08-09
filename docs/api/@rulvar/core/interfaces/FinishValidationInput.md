[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationInput

# Interface: FinishValidationInput

Defined in: [packages/core/src/orchestrator/finish-validators.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L63)

What a [FinishValidator](/api/@rulvar/core/interfaces/FinishValidator.md) judges.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children?` | `readonly` | readonly [`FinishValidationChild`](/api/@rulvar/core/interfaces/FinishValidationChild.md)[] | Every spawned child at finish time, in spawn order (the RV-202 provenance contract). Optional in the TYPE only so hand built inputs stay source compatible; the orchestrator runtime always supplies it, so validators can hold the finish result against the evidence the children actually produced. | [packages/core/src/orchestrator/finish-validators.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L79) |
| <a id="property-result"></a> `result` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The finish call's `result` argument exactly as the model passed it. | [packages/core/src/orchestrator/finish-validators.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L65) |
| <a id="property-runid"></a> `runId?` | `readonly` | `string` | The id of the run being judged (RV2501). Optional in the TYPE only so hand built inputs stay source compatible; the orchestrator runtime always supplies it, at every gate that judges a finish (the validator-bound finish, the contract draft gate, and the skipWhenDraftValid pre-pass), so a validator can accept the run's own id as the artifact a claim about THIS run points at. | [packages/core/src/orchestrator/finish-validators.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L88) |
| <a id="property-text"></a> `text` | `readonly` | `string` | The result as text: a string result verbatim, anything else its JSON serialization (the same convention the child result evidence tools use), so textual validators never re-implement serialization. | [packages/core/src/orchestrator/finish-validators.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L71) |
