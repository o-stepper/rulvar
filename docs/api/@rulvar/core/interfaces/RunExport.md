[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunExport

# Interface: RunExport

Defined in: [packages/core/src/engine/engine.ts:540](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L540)

The portable bundle exportRun produces and importRun consumes (RV-217).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blobs"></a> `blobs` | \{ `data`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md); `ref`: `string`; \}[] | - | [packages/core/src/engine/engine.ts:545](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L545) |
| <a id="property-entries"></a> `entries` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | - | [packages/core/src/engine/engine.ts:544](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L544) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | Absent when the source store had no meta row for the run. | [packages/core/src/engine/engine.ts:543](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L543) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/engine/engine.ts:541](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L541) |
