[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / runAgent

# Function: runAgent()

```ts
function runAgent<S>(options): Promise<AgentResult<Out<S>>>;
```

Defined in: `packages/core/dist/index.d.ts`

Runs one agent to a typed AgentResult. Never throws past policy: every
failure mode becomes a typed status on the result.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt; |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`RunAgentOptions`](/api/@rulvar/rulvar/interfaces/RunAgentOptions.md)\&lt;`S`\&gt; |

## Returns

`Promise`\&lt;[`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;[`Out`](/api/@rulvar/rulvar/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;\&gt;
