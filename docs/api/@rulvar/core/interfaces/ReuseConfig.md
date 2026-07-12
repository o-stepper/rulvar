[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ReuseConfig

# Interface: ReuseConfig

Defined in: [packages/core/src/journal/reuse.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L65)

The reuse block of AdmissionConfig.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowgraft"></a> `allowGraft?` | `boolean` | Default true. | [packages/core/src/journal/reuse.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L69) |
| <a id="property-enabled"></a> `enabled?` | `boolean` | Default true. | [packages/core/src/journal/reuse.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L67) |
| <a id="property-maxabandonednetusdfraction"></a> `maxAbandonedNetUsdFraction?` | `number` | Optional RevisionGuards trigger on netLostUsd. | [packages/core/src/journal/reuse.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L73) |
| <a id="property-maxoscillationsperkey"></a> `maxOscillationsPerKey?` | `number` | Default 2 (Appendix A). | [packages/core/src/journal/reuse.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L71) |
