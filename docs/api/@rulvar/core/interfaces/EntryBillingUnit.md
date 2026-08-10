[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryBillingUnit

# Interface: EntryBillingUnit

Defined in: [packages/core/src/l0/entries.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L270)

One priced unit of [priceEntryBilling](/api/@rulvar/core/functions/priceEntryBilling.md) (RV504).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-record"></a> `record?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md) | The dispatch record behind a 'call' unit. | [packages/core/src/l0/entries.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L281) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/l0/entries.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L279) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/l0/entries.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L277) |
| <a id="property-source"></a> `source` | `"call"` \| `"slice"` | 'call' prices one provider dispatch (the per-request basis); 'slice' is the historical per-model aggregate of an entry whose records do not fully cover its usage. | [packages/core/src/l0/entries.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L276) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/entries.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L278) |
| <a id="property-usd"></a> `usd` | `number` | - | [packages/core/src/l0/entries.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L282) |
