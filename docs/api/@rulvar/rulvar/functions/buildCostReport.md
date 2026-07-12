[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildCostReport

# Function: buildCostReport()

```ts
function buildCostReport(attribution, totalUsd): CostReport;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Folds the per-run attribution buckets into the normative CostReport.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `attribution` | [`CostAttribution`](/api/@rulvar/rulvar/interfaces/CostAttribution.md) |
| `totalUsd` | `number` |

## Returns

[`CostReport`](/api/@rulvar/rulvar/interfaces/CostReport.md)
