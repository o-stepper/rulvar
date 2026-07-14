[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / createCtx

# Function: createCtx()

```ts
function createCtx(internals, rootWorkflow?): Ctx<ErrorPolicy>;
```

Defined in: [packages/core/src/engine/ctx.ts:679](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L679)

Creates the per-run Ctx bound to `internals`. The current scope travels
through AsyncLocalStorage so parallel branches and pipeline stages keep
one ctx object while journaling under their own scope paths (I3:
structure from call-and-return only).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `internals` | [`RunInternals`](/api/@rulvar/core/interfaces/RunInternals.md) | - |
| `rootWorkflow?` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); `routing?`: `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt;; \} | The workflow whose body this ctx runs: its defaults become the root scope's layer 3. Absent for a CompiledWorkflow (the sandbox dialect declares no routing), which then contributes no layer, exactly as before. |
| `rootWorkflow.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - |
| `rootWorkflow.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - |
| `rootWorkflow.routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - |

## Returns

[`Ctx`](/api/@rulvar/core/interfaces/Ctx.md)\&lt;[`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md)\&gt;
