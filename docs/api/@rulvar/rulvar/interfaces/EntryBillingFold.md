[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EntryBillingFold

# Interface: EntryBillingFold

Defined in: `packages/core/dist/index.d.ts`

What [priceEntryBilling](/api/@rulvar/rulvar/functions/priceEntryBilling.md) folds one terminal entry into.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coveredmodels"></a> `coveredModels` | `ReadonlySet`\&lt;`` `${string}:${string}` ``\&gt; | The models this fold priced per call: record sums equal slice sums counter for counter under the symmetric per-model key (RV604). Published so a row builder can honor the same decision (RV703): a covered model's rows are exactly its records, so no per-slice remainder may be fabricated for it; recomputing coverage elsewhere is how the phantom-remainder skew was born. | `packages/core/dist/index.d.ts` |
| <a id="property-fullyattributed"></a> `fullyAttributed` | `boolean` | True when the entry's providerCalls exactly cover every usage slice, counter for counter: the fold priced per call, so a nonlinear tier fired per REQUEST, the pricing contract's own semantics. False folds the aggregate slices, the historical basis. | `packages/core/dist/index.d.ts` |
| <a id="property-units"></a> `units` | [`EntryBillingUnit`](/api/@rulvar/rulvar/interfaces/EntryBillingUnit.md)[] | Priced units in fold order; `usd` is their sum in exactly this order. | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[] | Usage on models the price function refused; never a silent zero. | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd` | `number` | - | `packages/core/dist/index.d.ts` |
