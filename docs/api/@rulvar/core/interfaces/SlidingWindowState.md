[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SlidingWindowState

# Interface: SlidingWindowState

Defined in: [packages/core/src/admission/algorithms.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L81)

A sliding window as a ring of sub-window counters (section 4.2, 1).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-headslot"></a> `headSlot` | `number` | The epoch-slot index the LAST slot corresponds to. | [packages/core/src/admission/algorithms.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L85) |
| <a id="property-slots"></a> `slots` | `number`[] | Consumption per slot, oldest first after normalization. | [packages/core/src/admission/algorithms.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L83) |
