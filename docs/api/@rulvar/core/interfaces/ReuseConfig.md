[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ReuseConfig

# Interface: ReuseConfig

Defined in: [packages/core/src/journal/reuse.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L64)

The reuse block of AdmissionConfig (docs/03, 9.9).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowgraft"></a> `allowGraft?` | `boolean` | Default true. | [packages/core/src/journal/reuse.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L68) |
| <a id="property-enabled"></a> `enabled?` | `boolean` | Default true. | [packages/core/src/journal/reuse.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L66) |
| <a id="property-maxabandonednetusdfraction"></a> `maxAbandonedNetUsdFraction?` | `number` | Optional RevisionGuards trigger on netLostUsd (docs/07, 3.8). | [packages/core/src/journal/reuse.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L72) |
| <a id="property-maxoscillationsperkey"></a> `maxOscillationsPerKey?` | `number` | Default 2 (Appendix A). | [packages/core/src/journal/reuse.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L70) |
