[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / tool

# Function: tool()

```ts
function tool<S>(init): ToolDef<S>;
```

Defined in: [packages/core/src/tools/tool.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/tool.ts#L43)

Defines a tool. Definition-time failures are typed ConfigErrors, never
first-call surprises: an illegal name, a Standard Schema without the
JSON Schema projection, a recursive local $ref, or a remote/dynamic
reference all fail here (docs/08, sections 1.1 and 2.3).

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `init` | [`ToolInit`](/api/@rulvar/core/interfaces/ToolInit.md)\&lt;`S`\&gt; |

## Returns

[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;`S`\&gt;
