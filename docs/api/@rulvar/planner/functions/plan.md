[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / plan

# Function: plan()

```ts
function plan(
   engine, 
   goal, 
o?): Promise<PlanResult>;
```

Defined in: [packages/planner/src/plan.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L192)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `goal` | `string` |
| `o?` | [`PlanOptions`](/api/@rulvar/planner/interfaces/PlanOptions.md) |

## Returns

`Promise`\&lt;[`PlanResult`](/api/@rulvar/planner/interfaces/PlanResult.md)\&gt;
