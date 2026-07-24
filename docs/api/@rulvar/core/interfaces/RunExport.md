[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunExport

# Interface: RunExport

Defined in: [packages/core/src/engine/engine.ts:483](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L483)

The portable bundle exportRun produces and importRun consumes (RV-217).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blobs"></a> `blobs` | \{ `data`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md); `ref`: `string`; \}[] | - | [packages/core/src/engine/engine.ts:488](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L488) |
| <a id="property-entries"></a> `entries` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | - | [packages/core/src/engine/engine.ts:487](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L487) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | Absent when the source store had no meta row for the run. | [packages/core/src/engine/engine.ts:486](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L486) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/engine/engine.ts:484](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L484) |
