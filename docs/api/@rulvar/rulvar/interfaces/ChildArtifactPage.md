[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: `packages/core/dist/index.d.ts`

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/rulvar/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-content"></a> `content` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-offset"></a> `offset` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | `packages/core/dist/index.d.ts` |
