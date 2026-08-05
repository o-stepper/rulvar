[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: [packages/core/src/orchestrator/handles.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L130)

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/core/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | [packages/core/src/orchestrator/handles.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L132) |
| <a id="property-content"></a> `content` | `string` | - | [packages/core/src/orchestrator/handles.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L137) |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | [packages/core/src/orchestrator/handles.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L140) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L131) |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L138) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/handles.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L133) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/orchestrator/handles.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L134) |
| <a id="property-offset"></a> `offset` | `number` | - | [packages/core/src/orchestrator/handles.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L136) |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | [packages/core/src/orchestrator/handles.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L135) |
