[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / runPlanned

# Function: runPlanned()

```ts
function runPlanned(
   engine, 
   goal, 
   args?, 
options?): Promise<RunHandle<unknown>>;
```

Defined in: [packages/planner/src/plan.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L298)

plan-then-run in one call (amended during M6-T05:
the composition is async because planning itself is a run).
options.plan bounds the planning conversation, options.run bounds the
generated workflow's execution; the two ceilings are independent, and
the bare form without options runs BOTH legs unbounded, as before.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `args?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |
| `options?` | [`RunPlannedOptions`](/api/@rulvar/planner/interfaces/RunPlannedOptions.md) |

## Returns

`Promise`\&lt;[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;\&gt;
