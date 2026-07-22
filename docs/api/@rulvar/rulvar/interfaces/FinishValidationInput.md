[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishValidationInput

# Interface: FinishValidationInput

Defined in: `packages/core/dist/index.d.ts`

What a [FinishValidator](/api/@rulvar/rulvar/interfaces/FinishValidator.md) judges.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-result"></a> `result` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The finish call's `result` argument exactly as the model passed it. | `packages/core/dist/index.d.ts` |
| <a id="property-text"></a> `text` | `readonly` | `string` | The result as text: a string result verbatim, anything else its JSON serialization (the same convention the child result evidence tools use), so textual validators never re-implement serialization. | `packages/core/dist/index.d.ts` |
