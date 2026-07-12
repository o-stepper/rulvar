[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / defineWorkflow

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
| `meta` | \{ `args?`: [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt;; `errorPolicy?`: `P`; `name`: `string`; \} |
| `meta.args?` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; |
| `meta.errorPolicy?` | `P` |
| `meta.name` | `string` |
| `body` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; |

## Returns

[`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt;
