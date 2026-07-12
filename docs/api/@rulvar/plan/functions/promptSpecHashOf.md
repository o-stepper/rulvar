[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / promptSpecHashOf

# Function: promptSpecHashOf()

```ts
function promptSpecHashOf(spec): string;
```

Defined in: [packages/plan/src/task-spec.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L47)

The deterministic spec digest entering PlanNode.promptSpecHash:
the canonical JSON of the full TaskSpec through the
frozen hashVersion 2 canonicalization. A plan-internal digest, not a
kernel content key: the paid-call identity stays with the child's own
spawn entry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md) |

## Returns

`string`
