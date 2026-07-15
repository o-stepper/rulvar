[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / orchestrate

# Function: orchestrate()

```ts
function orchestrate(
   engine, 
   goal, 
opts?): RunHandle<unknown>;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1577](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1577)

Top-level surface: creates a run.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/core/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) |

## Returns

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
