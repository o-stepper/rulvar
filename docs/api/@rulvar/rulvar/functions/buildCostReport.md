[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildCostReport

# Function: buildCostReport()

```ts
function buildCostReport(
   attribution, 
   totalUsd, 
   abandoned?): CostReport;
```

Defined in: `packages/core/dist/index.d.ts`

Folds the per-run attribution buckets into the normative CostReport.
Live attribution buckets never see abandoned subtrees, so a host
that tracked abandoned spend itself passes it as `abandoned`;
omitted, the report shows a gross equal to the net. Non-finite
numbers anywhere in the inputs are a typed refusal (RV705): this
exported builder is the same public surface as
[costReportFromJournal](/api/@rulvar/rulvar/functions/costReportFromJournal.md) and holds the same RV610 doctrine,
instead of letting an Infinity or NaN serialize into null downstream.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `attribution` | [`CostAttribution`](/api/@rulvar/rulvar/interfaces/CostAttribution.md) |
| `totalUsd` | `number` |
| `abandoned?` | \{ `unpriced`: \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}[]; `usageApprox?`: `boolean`; `usd`: `number`; \} |
| `abandoned.unpriced?` | \{ `model`: `string`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}[] |
| `abandoned.usageApprox?` | `boolean` |
| `abandoned.usd?` | `number` |

## Returns

[`CostReport`](/api/@rulvar/rulvar/interfaces/CostReport.md)
