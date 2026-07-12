[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / agentErrorToWire

# Function: agentErrorToWire()

```ts
function agentErrorToWire(error, message): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L342)

Projects an AgentError to its WireError form: code 'agent', with kind,
retryAfterMs, and issues carried in data (docs/02, section "Error
taxonomy"). Issue paths are flattened to JSON-safe segments.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | [`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md) |
| `message` | `string` |

## Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)
