[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AnchorGroundingFinding

# Interface: AnchorGroundingFinding

Defined in: `packages/core/dist/index.d.ts`

One wrong line finding of [anchorGroundingFindingsOf](/api/@rulvar/rulvar/functions/anchorGroundingFindingsOf.md).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-endline"></a> `endLine?` | `readonly` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-line"></a> `line` | `readonly` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-path"></a> `path` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `readonly` | `"clause"` \| `"sentence"` | 'clause' convicted the anchor against its own claim clause; 'sentence' convicted it as the sentence's only anchor whose FILE carries a token no cited window does. | `packages/core/dist/index.d.ts` |
| <a id="property-sentence"></a> `sentence` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-suggestions"></a> `suggestions` | `readonly` | readonly [`AnchorGroundingSuggestion`](/api/@rulvar/rulvar/interfaces/AnchorGroundingSuggestion.md)[] | Exact lines inside the cited file that DO carry a deciding token. | `packages/core/dist/index.d.ts` |
| <a id="property-tokens"></a> `tokens` | `readonly` | readonly `string`[] | The deciding tokens the resolved window never carries. | `packages/core/dist/index.d.ts` |
| <a id="property-unit"></a> `unit?` | `readonly` | [`CitationExcerptUnit`](/api/@rulvar/rulvar/interfaces/CitationExcerptUnit.md) | The unit the window came from; absent for the structural json block. | `packages/core/dist/index.d.ts` |
| <a id="property-windowfirstline"></a> `windowFirstLine` | `readonly` | `number` | The resolved window, 1 based and inclusive. | `packages/core/dist/index.d.ts` |
| <a id="property-windowlastline"></a> `windowLastLine` | `readonly` | `number` | - | `packages/core/dist/index.d.ts` |
