[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / agentErrorFromWire

# Function: agentErrorFromWire()

```ts
function agentErrorFromWire(wire): AgentError;
```

Defined in: [packages/core/src/l0/errors.ts:378](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L378)

Reads an AgentError back from its WireError projection. Throws a
ConfigError when the wire code is not 'agent'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `wire` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) |

## Returns

[`AgentError`](/api/@rulvar/core/type-aliases/AgentError.md)
