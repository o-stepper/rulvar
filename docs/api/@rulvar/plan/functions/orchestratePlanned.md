[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / orchestratePlanned

# Function: orchestratePlanned()

```ts
function orchestratePlanned(
   engine, 
   goal, 
opts?): RunHandle<unknown>;
```

Defined in: [packages/plan/src/plan-runner.ts:2522](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L2522)

The PlanRunner entry surface: mode (c) plus the extension in one call.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) & \{ `plan?`: [`PlanRunnerOptions`](/api/@rulvar/plan/interfaces/PlanRunnerOptions.md); \} |

## Returns

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
