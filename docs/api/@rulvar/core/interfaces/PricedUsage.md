[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PricedUsage

# Interface: PricedUsage

Defined in: [packages/core/src/l0/entries.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L130)

A priced slice, plus the total and the gaps the price table did not cover.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-priced"></a> `priced` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md) & \{ `usd`: `number`; \}[] | Covered slices with their prices; the basis of per-model attribution. | [packages/core/src/l0/entries.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L134) |
| <a id="property-unpriced"></a> `unpriced` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Slices with no price row: surfaced as unpriced, never a silent zero. | [packages/core/src/l0/entries.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L136) |
| <a id="property-usd"></a> `usd` | `number` | Total of every slice the price table covered. | [packages/core/src/l0/entries.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L132) |
