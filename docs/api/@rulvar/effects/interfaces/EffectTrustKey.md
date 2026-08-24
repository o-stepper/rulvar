[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectTrustKey

# Interface: EffectTrustKey

Defined in: [packages/effects/src/receipts.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L15)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keyid"></a> `keyId` | `string` | - | [packages/effects/src/receipts.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L16) |
| <a id="property-revokedat"></a> `revokedAt?` | `string` | ISO instant; the key fails verification from here FORWARD. | [packages/effects/src/receipts.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L22) |
| <a id="property-validfrom"></a> `validFrom?` | `string` | ISO instant; absent means valid from the beginning of time. | [packages/effects/src/receipts.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L18) |
| <a id="property-validto"></a> `validTo?` | `string` | ISO instant; absent means no scheduled end. | [packages/effects/src/receipts.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L20) |
