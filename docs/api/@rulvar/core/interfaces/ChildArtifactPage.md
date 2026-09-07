[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildArtifactPage

# Interface: ChildArtifactPage

Defined in: [packages/core/src/orchestrator/handles.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L159)

One page of a settled child's artifact CONTENT, returned by the opt-in
`read_child_artifact` tool. Inline artifact `data` serializes to a
string; an offloaded artifact (a TranscriptStore `ref`) is fetched and
decoded as UTF-8; a `patch` artifact with only a changed file list
carries that list in `files` and empty content. Paged and pure exactly
like [ChildResultPage](/api/@rulvar/core/interfaces/ChildResultPage.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifactid"></a> `artifactId` | `string` | - | [packages/core/src/orchestrator/handles.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L161) |
| <a id="property-content"></a> `content` | `string` | - | [packages/core/src/orchestrator/handles.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L166) |
| <a id="property-files"></a> `files?` | `string`[] | The changed file list for a `patch` artifact; absent otherwise. | [packages/core/src/orchestrator/handles.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L169) |
| <a id="property-handle"></a> `handle` | `number` | - | [packages/core/src/orchestrator/handles.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L160) |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | - | [packages/core/src/orchestrator/handles.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L167) |
| <a id="property-kind"></a> `kind` | `string` | - | [packages/core/src/orchestrator/handles.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L162) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/orchestrator/handles.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L163) |
| <a id="property-offset"></a> `offset` | `number` | - | [packages/core/src/orchestrator/handles.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L165) |
| <a id="property-totalchars"></a> `totalChars` | `number` | - | [packages/core/src/orchestrator/handles.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L164) |
