[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunExport

# Interface: RunExport

Defined in: `packages/core/dist/index.d.ts`

The portable bundle exportRun produces and importRun consumes (RV-217).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blobs"></a> `blobs` | \{ `data`: [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md); `ref`: `string`; \}[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-entries"></a> `entries` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) | Absent when the source store had no meta row for the run. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
