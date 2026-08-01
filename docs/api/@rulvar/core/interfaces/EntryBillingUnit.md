[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryBillingUnit

# Interface: EntryBillingUnit

Defined in: [packages/core/src/l0/entries.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L255)

One priced unit of [priceEntryBilling](/api/@rulvar/core/functions/priceEntryBilling.md) (RV504).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-record"></a> `record?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md) | The dispatch record behind a 'call' unit. | [packages/core/src/l0/entries.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L266) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/l0/entries.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L264) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/l0/entries.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L262) |
| <a id="property-source"></a> `source` | `"call"` \| `"slice"` | 'call' prices one provider dispatch (the per-request basis); 'slice' is the historical per-model aggregate of an entry whose records do not fully cover its usage. | [packages/core/src/l0/entries.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L261) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/entries.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L263) |
| <a id="property-usd"></a> `usd` | `number` | - | [packages/core/src/l0/entries.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L267) |
