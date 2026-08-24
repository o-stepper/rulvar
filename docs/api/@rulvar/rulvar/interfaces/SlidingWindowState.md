[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SlidingWindowState

# Interface: SlidingWindowState

Defined in: `packages/core/dist/index.d.ts`

A sliding window as a ring of sub-window counters (section 4.2, 1).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-headslot"></a> `headSlot` | `number` | The epoch-slot index the LAST slot corresponds to. | `packages/core/dist/index.d.ts` |
| <a id="property-slots"></a> `slots` | `number`[] | Consumption per slot, oldest first after normalization. | `packages/core/dist/index.d.ts` |
