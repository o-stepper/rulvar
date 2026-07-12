[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / agentErrorFromWire

# Function: agentErrorFromWire()

```ts
function agentErrorFromWire(wire): AgentError;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Reads an AgentError back from its WireError projection. Throws a
ConfigError when the wire code is not 'agent'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `wire` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) |

## Returns

[`AgentError`](/api/@rulvar/rulvar/type-aliases/AgentError.md)
