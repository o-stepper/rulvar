[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AnchorGroundingOptions

# Interface: AnchorGroundingOptions

Defined in: `packages/core/dist/index.d.ts`

The options of [anchorGroundingFindingsOf](/api/@rulvar/rulvar/functions/anchorGroundingFindingsOf.md) and the validator.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lexicon"></a> `lexicon?` | `Readonly`\&lt;`Record`\&lt;`string`, `string`\&gt;\&gt; | Extra word to literal expansions beside caret and tilde. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line`. | `packages/core/dist/index.d.ts` |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The pure snapshot resolver every citation check reads. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId?` | `string` | The run id, excluded as identity when present. | `packages/core/dist/index.d.ts` |
| <a id="property-stopwords"></a> `stopWords?` | readonly `string`[] | Extra stop words this host's prose writes as filler. | `packages/core/dist/index.d.ts` |
