[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / runPlanned

# Function: runPlanned()

```ts
function runPlanned(
   engine, 
   goal, 
args?): Promise<RunHandle<unknown>>;
```

Defined in: [packages/planner/src/plan.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L223)

plan-then-run in one call (amended during M6-T05:
the composition is async because planning itself is a run).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `args?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

## Returns

`Promise`\&lt;[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt;\&gt;
