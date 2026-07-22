[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationInput

# Interface: FinishValidationInput

Defined in: [packages/core/src/orchestrator/finish-validators.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L16)

What a [FinishValidator](/api/@rulvar/core/interfaces/FinishValidator.md) judges.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-result"></a> `result` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | The finish call's `result` argument exactly as the model passed it. | [packages/core/src/orchestrator/finish-validators.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L18) |
| <a id="property-text"></a> `text` | `readonly` | `string` | The result as text: a string result verbatim, anything else its JSON serialization (the same convention the child result evidence tools use), so textual validators never re-implement serialization. | [packages/core/src/orchestrator/finish-validators.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L24) |
