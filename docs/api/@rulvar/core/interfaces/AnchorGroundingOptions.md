[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AnchorGroundingOptions

# Interface: AnchorGroundingOptions

Defined in: [packages/core/src/orchestrator/anchor-grounding.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L182)

The options of [anchorGroundingFindingsOf](/api/@rulvar/core/functions/anchorGroundingFindingsOf.md) and the validator.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lexicon"></a> `lexicon?` | `Readonly`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Extra word to literal expansions beside caret and tilde. | [packages/core/src/orchestrator/anchor-grounding.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L190) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line`. | [packages/core/src/orchestrator/anchor-grounding.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L186) |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The pure snapshot resolver every citation check reads. | [packages/core/src/orchestrator/anchor-grounding.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L184) |
| <a id="property-runid"></a> `runId?` | `string` | The run id, excluded as identity when present. | [packages/core/src/orchestrator/anchor-grounding.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L192) |
| <a id="property-stopwords"></a> `stopWords?` | readonly `string`[] | Extra stop words this host's prose writes as filler. | [packages/core/src/orchestrator/anchor-grounding.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L188) |
