[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / envelopeVerifier

# Function: envelopeVerifier()

```ts
function envelopeVerifier(effectClass, envelope): (observation) => "verified" | "unverified";
```

Defined in: [packages/effects/src/receipts.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/receipts.ts#L130)

Adapts an envelope to the dispatcher's ReceiptVerifier seam.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `effectClass` | [`EffectClass`](/api/@rulvar/rulvar/type-aliases/EffectClass.md) |
| `envelope` | [`EffectTrustEnvelope`](/api/@rulvar/effects/interfaces/EffectTrustEnvelope.md) |

## Returns

(`observation`) => `"verified"` \| `"unverified"`
