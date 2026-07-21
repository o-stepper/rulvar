[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / defineWorkflow

# Function: defineWorkflow()

```ts
function defineWorkflow<A, R, P>(meta, body): Workflow<A, R>;
```

Defined in: [packages/core/src/engine/ctx.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L535)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | - |
| `R` | - |
| `P` *extends* [`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | `"strict"` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `meta` | \{ `args?`: [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt;; `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `errorPolicy?`: `P`; `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); `name`: `string`; `routing?`: `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt;; \} | - |
| `meta.args?` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; | - |
| `meta.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - |
| `meta.errorPolicy?` | `P` | - |
| `meta.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Workflow defaults: resolution-chain layer 3. See Workflow. |
| `meta.name` | `string` | - |
| `meta.routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - |
| `body` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; | - |

## Returns

[`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt;
