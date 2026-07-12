[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / checkFloors

# Function: checkFloors()

```ts
function checkFloors(options): void;
```

Defined in: [packages/core/src/model/floors.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/floors.ts#L50)

Enforces the floors for one resolved invocation. `taskClass` is the
profile-declared class; when absent (unclassified) only byRole floors
apply. Throws a typed ConfigError on violation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `floors?`: [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md); `ref`: `` `${string}:${string}` ``; `role`: [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md); `taskClass?`: [`TaskClass`](/api/@rulvar/core/type-aliases/TaskClass.md); \} |
| `options.floors?` | [`QualityFloors`](/api/@rulvar/core/interfaces/QualityFloors.md) |
| `options.ref` | `` `${string}:${string}` `` |
| `options.role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) |
| `options.taskClass?` | [`TaskClass`](/api/@rulvar/core/type-aliases/TaskClass.md) |

## Returns

`void`
