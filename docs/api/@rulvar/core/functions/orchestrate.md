[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / orchestrate

# Function: orchestrate()

```ts
function orchestrate(
   engine, 
   goal, 
opts?): RunHandle<unknown>;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1396](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1396)

Top-level surface: creates a run (docs/06 9.3).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/core/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) |

## Returns

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
