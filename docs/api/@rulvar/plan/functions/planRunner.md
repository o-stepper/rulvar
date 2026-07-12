[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / planRunner

# Function: planRunner()

```ts
function planRunner(options?): OrchestratorExtension;
```

Defined in: [packages/plan/src/plan-runner.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L165)

Builds the PlanRunner orchestrator extension (docs/07, section 3).
Attach via `orchestrate(engine, goal, { extension: planRunner(o) })` or
the `orchestratePlanned` convenience surface.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`PlanRunnerOptions`](/api/@rulvar/plan/interfaces/PlanRunnerOptions.md) |

## Returns

[`OrchestratorExtension`](/api/@rulvar/rulvar/interfaces/OrchestratorExtension.md)
