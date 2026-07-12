[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / agentScope

# Function: agentScope()

```ts
function agentScope(parent, seq): string;
```

Defined in: [packages/core/src/journal/scope.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L39)

Orchestrator handle spawns nest under the orchestrator's own spawn entry: `agent:<seq>`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `parent` | `string` |
| `seq` | `number` |

## Returns

`string`
