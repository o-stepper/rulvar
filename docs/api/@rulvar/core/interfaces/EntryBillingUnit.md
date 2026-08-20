[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EntryBillingUnit

# Interface: EntryBillingUnit

Defined in: [packages/core/src/l0/entries.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L295)

One priced unit of [priceEntryBilling](/api/@rulvar/core/functions/priceEntryBilling.md) (RV504).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-record"></a> `record?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md) | The dispatch record behind a 'call' unit. | [packages/core/src/l0/entries.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L306) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/l0/entries.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L304) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/l0/entries.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L302) |
| <a id="property-source"></a> `source` | `"call"` \| `"slice"` | 'call' prices one provider dispatch (the per-request basis); 'slice' is the historical per-model aggregate of an entry whose records do not fully cover its usage. | [packages/core/src/l0/entries.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L301) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/entries.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L303) |
| <a id="property-usd"></a> `usd` | `number` | - | [packages/core/src/l0/entries.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L307) |
