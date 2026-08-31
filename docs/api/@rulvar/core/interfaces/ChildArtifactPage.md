[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: [packages/core/src/orchestrator/handles.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L150)

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/core/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | [packages/core/src/orchestrator/handles.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L152) |
| <a id="property-content"></a> `content` | `string` | - | [packages/core/src/orchestrator/handles.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L157) |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | [packages/core/src/orchestrator/handles.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L160) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L151) |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L158) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/handles.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L153) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/orchestrator/handles.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L154) |
| <a id="property-offset"></a> `offset` | `number` | - | [packages/core/src/orchestrator/handles.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L156) |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | [packages/core/src/orchestrator/handles.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L155) |
