[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectsConformanceOptions

# Interface: EffectsConformanceOptions

Defined in: [packages/effects/src/kit.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/kit.ts#L52)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-singleprocess"></a> `singleProcess?` | `boolean` | Explicitly single-process semantics for non-leasable stores. | [packages/effects/src/kit.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/kit.ts#L56) |
| <a id="property-store"></a> `store` | `StoreFactory`\&lt;[`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md)\&gt; | A fresh, isolated store per call. | [packages/effects/src/kit.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/kit.ts#L54) |
