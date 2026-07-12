[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / agentErrorToWire

# Function: agentErrorToWire()

```ts
function agentErrorToWire(error, message): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

Projects an AgentError to its WireError form: code 'agent', with kind,
retryAfterMs, and issues carried in data. Issue paths are flattened to
JSON-safe segments.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md) |
| `message` | `string` |

## Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
