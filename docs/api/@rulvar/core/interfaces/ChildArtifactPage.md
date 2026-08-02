[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: [packages/core/src/orchestrator/handles.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L122)

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/core/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | [packages/core/src/orchestrator/handles.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L124) |
| <a id="property-content"></a> `content` | `string` | - | [packages/core/src/orchestrator/handles.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L129) |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | [packages/core/src/orchestrator/handles.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L132) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L123) |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L130) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/handles.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L125) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/orchestrator/handles.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L126) |
| <a id="property-offset"></a> `offset` | `number` | - | [packages/core/src/orchestrator/handles.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L128) |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | [packages/core/src/orchestrator/handles.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L127) |
