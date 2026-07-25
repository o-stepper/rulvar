[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / dispatchProjectionReserveUsd

# Function: dispatchProjectionReserveUsd()

```ts
function dispatchProjectionReserveUsd(spec, flatReserveUsd): number;
```

Defined in: [packages/core/src/orchestrator/admission.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L234)

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
