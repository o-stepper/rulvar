[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PricedUsage

# Interface: PricedUsage

Defined in: `packages/core/dist/index.d.ts`

A priced slice, plus the total and the gaps the price table did not cover.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-priced"></a> `priced` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md) & \{ `usd`: `number`; \}[] | Covered slices with their prices; the basis of per-model attribution. | `packages/core/dist/index.d.ts` |
| <a id="property-unpriced"></a> `unpriced` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[] | Slices with no price row: surfaced as unpriced, never a silent zero. | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd` | `number` | Total of every slice the price table covered. | `packages/core/dist/index.d.ts` |
