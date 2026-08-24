[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneWriterOptions

# Interface: EffectLaneWriterOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-now"></a> `now?` | () => `string` | Injectable clock (ISO instants); tests pin it. | `packages/core/dist/index.d.ts` |
| <a id="property-owner"></a> `owner?` | `string` | Lease owner identity for the lane session (production mode). | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-singleprocess"></a> `singleProcess?` | `boolean` | Explicitly single-process semantics: admits a store without leases and without `fencedWrites` (the in-memory reference store). A production effect lane never sets this; the conformance kit does. | `packages/core/dist/index.d.ts` |
| <a id="property-store"></a> `store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - | `packages/core/dist/index.d.ts` |
