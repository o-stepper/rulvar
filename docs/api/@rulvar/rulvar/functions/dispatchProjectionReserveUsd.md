[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / dispatchProjectionReserveUsd

# Function: dispatchProjectionReserveUsd()

```ts
function dispatchProjectionReserveUsd(spec, flatReserveUsd): number;
```

Defined in: `packages/core/dist/index.d.ts`

The ONE dispatch-projection reserve formula (the 1.63.0 experiment
review, P0.3): the spawn's declared estimate (a spawn tool has no
per-call estCost channel, so the estimate is the agentType profile's)
or the flat default, clamped by the explicit child budget when one
exists. This is the reserve the embedded layer-2 gate evaluates a
spawn_agent call against BEFORE dispatch, and the number
preflightEstimate projects for the same gate, so the linter and the
runtime cannot drift: both call this function.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `budgetUsd?`: `number`; `estCostUsd?`: `number`; \} |
| `spec.budgetUsd?` | `number` |
| `spec.estCostUsd?` | `number` |
| `flatReserveUsd` | `number` |

## Returns

`number`
