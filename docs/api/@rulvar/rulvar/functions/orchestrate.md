[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / orchestrate

# Function: orchestrate()

```ts
function orchestrate(
   engine, 
   goal, 
opts?): RunHandle<unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

Top-level surface: creates a run.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) |

## Returns

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
