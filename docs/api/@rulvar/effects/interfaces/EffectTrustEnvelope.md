[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectTrustEnvelope

# Interface: EffectTrustEnvelope

Defined in: [packages/effects/src/receipts.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L25)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-issuers"></a> `issuers` | readonly `string`[] | Principals or provider identities that may sign receipts. | [packages/effects/src/receipts.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L27) |
| <a id="property-keys"></a> `keys` | readonly [`EffectTrustKey`](/api/@rulvar/effects/interfaces/EffectTrustKey.md)[] | - | [packages/effects/src/receipts.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L28) |
| <a id="property-verifysignature"></a> `verifySignature?` | (`observation`, `key`) => `boolean` | Host-supplied signature check over the observation and the resolved key. Absent means structural verification only (presence of a signature field), which is the conformance posture; production hosts supply real cryptography here. | [packages/effects/src/receipts.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L35) |
