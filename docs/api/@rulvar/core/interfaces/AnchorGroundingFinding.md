[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AnchorGroundingFinding

# Interface: AnchorGroundingFinding

Defined in: [packages/core/src/orchestrator/anchor-grounding.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L158)

One wrong line finding of [anchorGroundingFindingsOf](/api/@rulvar/core/functions/anchorGroundingFindingsOf.md).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `readonly` | `string` | - | [packages/core/src/orchestrator/anchor-grounding.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L160) |
| <a id="property-endline"></a> `endLine?` | `readonly` | `number` | - | [packages/core/src/orchestrator/anchor-grounding.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L163) |
| <a id="property-line"></a> `line` | `readonly` | `number` | - | [packages/core/src/orchestrator/anchor-grounding.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L162) |
| <a id="property-path"></a> `path` | `readonly` | `string` | - | [packages/core/src/orchestrator/anchor-grounding.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L161) |
| <a id="property-scope"></a> `scope` | `readonly` | `"sentence"` \| `"clause"` | 'clause' convicted the anchor against its own claim clause; 'sentence' convicted it as the sentence's only anchor whose FILE carries a token no cited window does. | [packages/core/src/orchestrator/anchor-grounding.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L169) |
| <a id="property-sentence"></a> `sentence` | `readonly` | `string` | - | [packages/core/src/orchestrator/anchor-grounding.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L159) |
| <a id="property-suggestions"></a> `suggestions` | `readonly` | readonly [`AnchorGroundingSuggestion`](/api/@rulvar/core/interfaces/AnchorGroundingSuggestion.md)[] | Exact lines inside the cited file that DO carry a deciding token. | [packages/core/src/orchestrator/anchor-grounding.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L178) |
| <a id="property-tokens"></a> `tokens` | `readonly` | readonly `string`[] | The deciding tokens the resolved window never carries. | [packages/core/src/orchestrator/anchor-grounding.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L171) |
| <a id="property-unit"></a> `unit?` | `readonly` | [`CitationExcerptUnit`](/api/@rulvar/core/interfaces/CitationExcerptUnit.md) | The unit the window came from; absent for the structural json block. | [packages/core/src/orchestrator/anchor-grounding.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L176) |
| <a id="property-windowfirstline"></a> `windowFirstLine` | `readonly` | `number` | The resolved window, 1 based and inclusive. | [packages/core/src/orchestrator/anchor-grounding.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L173) |
| <a id="property-windowlastline"></a> `windowLastLine` | `readonly` | `number` | - | [packages/core/src/orchestrator/anchor-grounding.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L174) |
