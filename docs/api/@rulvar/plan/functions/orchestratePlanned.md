[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / orchestratePlanned

# Function: orchestratePlanned()

```ts
function orchestratePlanned(
   engine, 
   goal, 
   opts?, 
runOptions?): RunHandle<unknown>;
```

Defined in: [packages/plan/src/plan-runner.ts:2797](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-runner.ts#L2797)

The PlanRunner entry surface: mode (c) plus the extension in one call.
`runOptions` are the ordinary engine RunOptions of the created run:
`runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree,
immutable after start, while `opts.budget` only shapes the
orchestrator's own sub-account inside it (v1.18.0 review P1-5).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) & \{ `plan?`: [`PlanRunnerOptions`](/api/@rulvar/plan/interfaces/PlanRunnerOptions.md); \} |
| `runOptions?` | [`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md) |

## Returns

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
