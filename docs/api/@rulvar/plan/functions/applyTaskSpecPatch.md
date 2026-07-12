[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / applyTaskSpecPatch

# Function: applyTaskSpecPatch()

```ts
function applyTaskSpecPatch(spec, patch): TaskSpec;
```

Defined in: [packages/plan/src/task-spec.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/task-spec.ts#L53)

Applies an amend_task patch onto a spec (undefined fields untouched).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md) |
| `patch` | [`TaskSpecPatch`](/api/@rulvar/plan/type-aliases/TaskSpecPatch.md) |

## Returns

[`TaskSpec`](/api/@rulvar/plan/interfaces/TaskSpec.md)
