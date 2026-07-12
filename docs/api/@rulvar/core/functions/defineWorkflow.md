[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / defineWorkflow

# Function: defineWorkflow()

```ts
function defineWorkflow<A, R, P>(meta, body): Workflow<A, R>;
```

Defined in: [packages/core/src/engine/ctx.ts:473](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L473)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | - |
| `R` | - |
| `P` *extends* [`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | `"strict"` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `meta` | \{ `args?`: [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt;; `errorPolicy?`: `P`; `name`: `string`; \} |
| `meta.args?` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; |
| `meta.errorPolicy?` | `P` |
| `meta.name` | `string` |
| `body` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; |

## Returns

[`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt;
