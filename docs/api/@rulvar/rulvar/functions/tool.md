[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / tool

# Function: tool()

```ts
function tool<S>(init): ToolDef<S>;
```

Defined in: `packages/core/dist/index.d.ts`

Defines a tool. Definition-time failures are typed ConfigErrors, never
first-call surprises: an illegal name, a Standard Schema without the
JSON Schema projection, a recursive local $ref, or a remote/dynamic
reference all fail here.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `init` | [`ToolInit`](/api/@rulvar/rulvar/interfaces/ToolInit.md)\&lt;`S`\&gt; |

## Returns

[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;`S`\&gt;
