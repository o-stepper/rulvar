[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / assertPlanTransition

# Function: assertPlanTransition()

```ts
function assertPlanTransition(node, to): void;
```

Defined in: [packages/plan/src/plan-state.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/plan-state.ts#L114)

Asserts one status transition against the closed machine. Op-level
legality (which ops may request which transitions in which state) is
the rebase conflict table's job (M7-T04); the machine
itself enforces exactly the structural rules:

- nothing leaves a terminal status (`done` is immutable; failed,
  cancelled, skipped are final),
- `running` is entered only from `ready` (the engine schedules ready
  nodes),
- a transition never restates the current status (the engine writes no
  no-op set_node_status).

A violation is an engine bug and raises the typed PlanInvariantError
(never a silent brick).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `node` | [`PlanNode`](/api/@rulvar/plan/interfaces/PlanNode.md) |
| `to` | [`PlanNodeStatus`](/api/@rulvar/plan/type-aliases/PlanNodeStatus.md) |

## Returns

`void`
