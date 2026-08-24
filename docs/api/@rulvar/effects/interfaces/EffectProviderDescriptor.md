[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectProviderDescriptor

# Interface: EffectProviderDescriptor

Defined in: [packages/effects/src/adapter.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L15)

One provider row of the capability matrix (RFC section 6).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/rulvar/type-aliases/EffectCapabilityRow.md) | - | [packages/effects/src/adapter.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L17) |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/rulvar/type-aliases/EffectLookupQualification.md) | Required for the 'lookup' row and recorded on every intent: WHICH qualification the provider earned the row with. A provider that offers only eventually consistent search, or a strongly consistent read WITHOUT acceptance closure, is 'neither', whatever its marketing says about lookup. | [packages/effects/src/adapter.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L25) |
| <a id="property-provider"></a> `provider` | `string` | - | [packages/effects/src/adapter.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L16) |
