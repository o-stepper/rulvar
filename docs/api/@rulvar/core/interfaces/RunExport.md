[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunExport

# Interface: RunExport

Defined in: [packages/core/src/engine/engine.ts:689](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L689)

The portable bundle exportRun produces and importRun consumes (RV-217).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blobs"></a> `blobs` | \{ `data`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md); `ref`: `string`; \}[] | - | [packages/core/src/engine/engine.ts:694](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L694) |
| <a id="property-entries"></a> `entries` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | - | [packages/core/src/engine/engine.ts:693](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L693) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | Absent when the source store had no meta row for the run. | [packages/core/src/engine/engine.ts:692](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L692) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/engine/engine.ts:690](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L690) |
