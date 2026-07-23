[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: [packages/core/src/orchestrator/handles.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L69)

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/core/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | [packages/core/src/orchestrator/handles.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L71) |
| <a id="property-content"></a> `content` | `string` | - | [packages/core/src/orchestrator/handles.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L76) |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | [packages/core/src/orchestrator/handles.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L79) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L70) |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L77) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/handles.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L72) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/orchestrator/handles.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L73) |
| <a id="property-offset"></a> `offset` | `number` | - | [packages/core/src/orchestrator/handles.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L75) |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | [packages/core/src/orchestrator/handles.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L74) |
