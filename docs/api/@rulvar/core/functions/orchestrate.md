[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / orchestrate

# Function: orchestrate()

```ts
function orchestrate(
   engine, 
   goal, 
   opts?, 
runOptions?): RunHandle<unknown>;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1872](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1872)

Top-level surface: creates a run. `runOptions` are the ordinary
engine [RunOptions](/api/@rulvar/core/interfaces/RunOptions.md) of the created run; in particular
`runOptions.budgetUsd` is the ROOT hard ceiling over the WHOLE tree
(the orchestrator and every child), immutable after start, while
`opts.budget` only shapes the orchestrator's own sub-account inside
that ceiling. The shortcut previously accepted no RunOptions at all,
so the canonical entry point could not set a root ceiling without
dropping to `engine.run(makeOrchestratorWorkflow(...))` (v1.18.0
review P1-5).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/core/interfaces/Engine.md) |
| `goal` | `string` |
| `opts?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) |
| `runOptions?` | [`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md) |

## Returns

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`unknown`\&gt;
