[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneWriterOptions

# Interface: EffectLaneWriterOptions

Defined in: [packages/core/src/effects/writer.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L55)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-now"></a> `now?` | () => `string` | Injectable clock (ISO instants); tests pin it. | [packages/core/src/effects/writer.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L67) |
| <a id="property-owner"></a> `owner?` | `string` | Lease owner identity for the lane session (production mode). | [packages/core/src/effects/writer.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L59) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/effects/writer.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L57) |
| <a id="property-singleprocess"></a> `singleProcess?` | `boolean` | Explicitly single-process semantics: admits a store without leases and without `fencedWrites` (the in-memory reference store). A production effect lane never sets this; the conformance kit does. | [packages/core/src/effects/writer.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L65) |
| <a id="property-store"></a> `store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) | - | [packages/core/src/effects/writer.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L56) |
