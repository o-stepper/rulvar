[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / unionOfIntervalsMs

# Function: unionOfIntervalsMs()

```ts
function unionOfIntervalsMs(intervals): number;
```

Defined in: `packages/core/dist/index.d.ts`

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
