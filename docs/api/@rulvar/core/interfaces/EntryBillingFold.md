[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryBillingFold

# Interface: EntryBillingFold

Defined in: [packages/core/src/l0/entries.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L239)

What [priceEntryBilling](/api/@rulvar/core/functions/priceEntryBilling.md) folds one terminal entry into.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-fullyattributed"></a> `fullyAttributed` | `boolean` | True when the entry's providerCalls exactly cover every usage slice, counter for counter: the fold priced per call, so a nonlinear tier fired per REQUEST, the pricing contract's own semantics. False folds the aggregate slices, the historical basis. | [packages/core/src/l0/entries.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L251) |
| <a id="property-units"></a> `units` | [`EntryBillingUnit`](/api/@rulvar/core/interfaces/EntryBillingUnit.md)[] | Priced units in fold order; `usd` is their sum in exactly this order. | [packages/core/src/l0/entries.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L241) |
| <a id="property-unpriced"></a> `unpriced` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Usage on models the price function refused; never a silent zero. | [packages/core/src/l0/entries.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L244) |
| <a id="property-usd"></a> `usd` | `number` | - | [packages/core/src/l0/entries.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L242) |
