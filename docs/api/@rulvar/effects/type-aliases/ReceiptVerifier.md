[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / ReceiptVerifier

# Type Alias: ReceiptVerifier

```ts
type ReceiptVerifier = (observation) => "verified" | "unverified";
```

Defined in: [packages/effects/src/dispatcher.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L43)

Trust-envelope verification of one receipt observation (the full
envelope machinery is the reconciler train's; the seam is here).
The default fails closed: an unverified receipt routes the machine
to `unknown`, never to `confirmed`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `observation` | [`EffectReceiptObservation`](/api/@rulvar/effects/interfaces/EffectReceiptObservation.md) |

## Returns

`"verified"` \| `"unverified"`
