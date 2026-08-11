[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / orchestratorAdmissionEstCostUsd

# Function: orchestratorAdmissionEstCostUsd()

```ts
function orchestratorAdmissionEstCostUsd(effectiveCapUsd, committedFinalizeReserveUsd): number;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:2462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L2462)

The capped orchestrator's own admission estimate (the 1.63.0
experiment review, P0.3): the effective cap MINUS the finalize
carve-out already committed on the cap account, so the dispatch
admits at EXACT FILL by construction (a capped orchestrator can never
spend past its effectiveCap, and pricing the model's full
maxOutputTokens instead pinned small run ceilings at zero remainder;
the M12 checkpoint measured a self-solving orchestrator because no
child was ever admitted). Exported so the live dispatch and
preflightEstimate share ONE formula: both call this function.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `effectiveCapUsd` | `number` |
| `committedFinalizeReserveUsd` | `number` |

## Returns

`number`
