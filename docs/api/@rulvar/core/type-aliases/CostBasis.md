[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostBasis

# Type Alias: CostBasis

```ts
type CostBasis = "per-call" | "aggregate-estimate";
```

Defined in: [packages/core/src/l0/events.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L304)

How an event's `costUsd` was folded (RV702). `'per-call'`: the sum of
each provider request priced individually, the same basis the settled
CostReport and invoice use (RV504), so a nonlinear long-context tier
fires per REQUEST. `'aggregate-estimate'`: the aggregate usage priced
in one call, which a tier can inflate past what any single request
cost; emitted only when per-request records cannot cover the number
(a checkpoint written before the reconciliation ledger shipped, or a
terminal entry whose records do not cover its usage). An absent field
on an event stream recorded before RV702 means the aggregate basis.
