[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / runAgent

# Function: runAgent()

```ts
function runAgent<S>(options): Promise<AgentResult<Out<S>>>;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L628)

Runs one agent to a typed AgentResult. Never throws past policy: every
failure mode becomes a typed status on the result.

## Type Parameters

| Type Parameter |
| ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`RunAgentOptions`](/api/@rulvar/core/interfaces/RunAgentOptions.md)\&lt;`S`\&gt; |

## Returns

`Promise`\&lt;[`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;[`Out`](/api/@rulvar/core/type-aliases/Out.md)\&lt;`S`\&gt;\&gt;\&gt;
