[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildCostReport

# Function: buildCostReport()

```ts
function buildCostReport(attribution, totalUsd): CostReport;
```

Defined in: [packages/core/src/engine/cost-report.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/cost-report.ts#L35)

Folds the per-run attribution buckets into the normative CostReport.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `attribution` | [`CostAttribution`](/api/@rulvar/core/interfaces/CostAttribution.md) |
| `totalUsd` | `number` |

## Returns

[`CostReport`](/api/@rulvar/core/interfaces/CostReport.md)
