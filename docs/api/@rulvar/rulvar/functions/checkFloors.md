[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / checkFloors

# Function: checkFloors()

```ts
function checkFloors(options): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Enforces the floors for one resolved invocation. `taskClass` is the
profile-declared class; when absent (unclassified) only byRole floors
apply. Throws a typed ConfigError on violation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `floors?`: [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md); `ref`: `` `${string}:${string}` ``; `role`: [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md); `taskClass?`: [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md); \} |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/rulvar/interfaces/QualityFloors.md) |
| `options.ref` | `` `${string}:${string}` `` |
| `options.role` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) |
| `options.taskClass?` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) |

## Returns

`void`
