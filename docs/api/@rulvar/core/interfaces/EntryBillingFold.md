[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryBillingFold

# Interface: EntryBillingFold

Defined in: [packages/core/src/l0/entries.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L277)

What [priceEntryBilling](/api/@rulvar/core/functions/priceEntryBilling.md) folds one terminal entry into.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredmodels"></a> `coveredModels` | `ReadonlySet`\&lt;`` `${string}:${string}` ``\&gt; | The models this fold priced per call: record sums equal slice sums counter for counter under the symmetric per-model key (RV604). Published so a row builder can honor the same decision (RV703): a covered model's rows are exactly its records, so no per-slice remainder may be fabricated for it; recomputing coverage elsewhere is how the phantom-remainder skew was born. | [packages/core/src/l0/entries.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L298) |
| <a id="property-fullyattributed"></a> `fullyAttributed` | `boolean` | True when the entry's providerCalls exactly cover every usage slice, counter for counter: the fold priced per call, so a nonlinear tier fired per REQUEST, the pricing contract's own semantics. False folds the aggregate slices, the historical basis. | [packages/core/src/l0/entries.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L289) |
| <a id="property-units"></a> `units` | [`EntryBillingUnit`](/api/@rulvar/core/interfaces/EntryBillingUnit.md)[] | Priced units in fold order; `usd` is their sum in exactly this order. | [packages/core/src/l0/entries.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L279) |
| <a id="property-unpriced"></a> `unpriced` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Usage on models the price function refused; never a silent zero. | [packages/core/src/l0/entries.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L282) |
| <a id="property-usd"></a> `usd` | `number` | - | [packages/core/src/l0/entries.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L280) |
