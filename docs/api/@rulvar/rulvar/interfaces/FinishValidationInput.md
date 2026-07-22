[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishValidationInput

# Interface: FinishValidationInput

Defined in: `packages/core/dist/index.d.ts`

What a [FinishValidator](/api/@rulvar/rulvar/interfaces/FinishValidator.md) judges.

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-children"></a> `children?` | `readonly` | readonly [`FinishValidationChild`](/api/@rulvar/rulvar/interfaces/FinishValidationChild.md)[] | Every spawned child at finish time, in spawn order (the RV-202 provenance contract). Optional in the TYPE only so hand built inputs stay source compatible; the orchestrator runtime always supplies it, so validators can hold the finish result against the evidence the children actually produced. | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | The finish call's `result` argument exactly as the model passed it. | `packages/core/dist/index.d.ts` |
| <a id="property-text"></a> `text` | `readonly` | `string` | The result as text: a string result verbatim, anything else its JSON serialization (the same convention the child result evidence tools use), so textual validators never re-implement serialization. | `packages/core/dist/index.d.ts` |
