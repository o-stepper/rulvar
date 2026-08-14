[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / unionOfIntervalsMs

# Function: unionOfIntervalsMs()

```ts
function unionOfIntervalsMs(intervals): number;
```

Defined in: [packages/core/src/l0/telemetry-reduce.ts:433](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L433)

Total length of the union of possibly overlapping intervals, exported
(RV3404) so the journal fold computes its window coverage through the
SAME arithmetic the live RV710 decomposition uses, never a sibling
implementation that can drift.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `intervals` | readonly \{ `from`: `number`; `to`: `number`; \}[] |

## Returns

`number`
