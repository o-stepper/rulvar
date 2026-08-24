[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / verifyReceiptObservation

# Function: verifyReceiptObservation()

```ts
function verifyReceiptObservation(
   observation, 
   effectClass, 
   envelope): ReceiptVerification;
```

Defined in: [packages/effects/src/receipts.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L73)

Verifies one receipt observation against the envelope. The order of
checks is the RFC's: issuer identity, content bindings, key
resolution with validity windows, revocation, then the signature
itself. A receipt that binds fewer fields than its class requires
verifies `unverified` no matter how good its signature is.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `observation` | [`EffectReceiptObservation`](/api/@rulvar/effects/interfaces/EffectReceiptObservation.md) |
| `effectClass` | [`EffectClass`](/api/@rulvar/rulvar/type-aliases/EffectClass.md) |
| `envelope` | [`EffectTrustEnvelope`](/api/@rulvar/effects/interfaces/EffectTrustEnvelope.md) |

## Returns

[`ReceiptVerification`](/api/@rulvar/effects/type-aliases/ReceiptVerification.md)
