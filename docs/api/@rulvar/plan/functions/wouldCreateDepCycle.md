[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / wouldCreateDepCycle

# Function: wouldCreateDepCycle()

```ts
function wouldCreateDepCycle(
   plan, 
   nodeId, 
   deps): boolean;
```

Defined in: [packages/plan/src/plan-state.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L180)

Cycle check for rewire_deps (docs/07, 3.6: a resulting cycle drops the
WHOLE op with dep_cycle; rewire_deps is atomic). Answers whether the
graph with `nodeId`'s deps replaced by `deps` contains a cycle
reachable from `nodeId`. add_task cannot create cycles (nothing depends
on a node that does not exist yet), so the check is rewire-only.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `plan` | [`TaskPlan`](/api/@rulvar/plan/interfaces/TaskPlan.md) |
| `nodeId` | `string` |
| `deps` | readonly `string`[] |

## Returns

`boolean`
