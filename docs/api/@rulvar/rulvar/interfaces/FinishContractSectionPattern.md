[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContractSectionPattern

# Interface: FinishContractSectionPattern

Defined in: `packages/core/dist/index.d.ts`

One counted per-section collection demand (RV2206).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | Short human name for prompts and reasons. | `packages/core/dist/index.d.ts` |
| <a id="property-min"></a> `min` | `number` | Matches (distinct captures when capturing) required inside the section. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern` | `string` | Regex source; a capture group makes counting DISTINCT by first capture. | `packages/core/dist/index.d.ts` |
| <a id="property-samples"></a> `samples` | `string`[] | Literal matches for the golden fixtures and the prompt. Single line each; with a capturing pattern they must together carry at least `min` distinct captures. | `packages/core/dist/index.d.ts` |
| <a id="property-section"></a> `section` | `string` | A declared section marker this demand binds to. | `packages/core/dist/index.d.ts` |
