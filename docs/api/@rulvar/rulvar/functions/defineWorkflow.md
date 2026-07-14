[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / defineWorkflow

# Function: defineWorkflow()

```ts
function defineWorkflow<A, R, P>(meta, body): Workflow<A, R>;
```

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | - |
| `R` | - |
| `P` *extends* [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | `"strict"` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `meta` | \{ `args?`: [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt;; `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `errorPolicy?`: `P`; `model?`: [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md); `name`: `string`; `routing?`: `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt;; \} |
| `meta.args?` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; |
| `meta.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) |
| `meta.errorPolicy?` | `P` |
| `meta.model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) |
| `meta.name` | `string` |
| `meta.routing?` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; |
| `body` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; |

## Returns

[`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt;
