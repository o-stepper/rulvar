[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / archiveDeprecatedModelOps

# Function: archiveDeprecatedModelOps()

```ts
function archiveDeprecatedModelOps(claims, deprecated): ClaimOp[];
```

Defined in: [packages/core/src/knowledge/decay.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L73)

Deprecation maintenance (deprecations archive claims, never delete
them, so historical runs keep their audit trail): archive ops for
every non-terminal claim of the deprecated
models. The caller commits them under its own gate-free archive ops.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/core/interfaces/ModelClaim.md)[] |
| `deprecated` | readonly `` `${string}:${string}` ``[] |

## Returns

[`ClaimOp`](/api/@rulvar/core/type-aliases/ClaimOp.md)[]
