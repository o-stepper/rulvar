[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / archiveDeprecatedModelOps

# Function: archiveDeprecatedModelOps()

```ts
function archiveDeprecatedModelOps(claims, deprecated): ClaimOp[];
```

Defined in: `packages/core/dist/index.d.ts`

Deprecation maintenance (deprecations archive claims, never delete
them, so historical runs keep their audit trail): archive ops for
every non-terminal claim of the deprecated
models. The caller commits them under its own gate-free archive ops.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claims` | readonly [`ModelClaim`](/api/@rulvar/rulvar/interfaces/ModelClaim.md)[] |
| `deprecated` | readonly `` `${string}:${string}` ``[] |

## Returns

[`ClaimOp`](/api/@rulvar/rulvar/type-aliases/ClaimOp.md)[]
