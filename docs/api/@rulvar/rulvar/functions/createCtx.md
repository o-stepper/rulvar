[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / createCtx

# Function: createCtx()

```ts
function createCtx(internals, rootWorkflow?): Ctx<ErrorPolicy>;
```

Defined in: `packages/core/dist/index.d.ts`

Creates the per-run Ctx bound to `internals`. The current scope travels
through AsyncLocalStorage so parallel branches and pipeline stages keep
one ctx object while journaling under their own scope paths (I3:
structure from call-and-return only).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `internals` | [`RunInternals`](/api/@rulvar/rulvar/interfaces/RunInternals.md) |
| `rootWorkflow?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model?`: [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md); `routing?`: `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt;; \} |
| `rootWorkflow.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) |
| `rootWorkflow.model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) |
| `rootWorkflow.routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; |

## Returns

[`Ctx`](/api/@rulvar/rulvar/interfaces/Ctx.md)\&lt;[`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md)\&gt;
