[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / agentResultWire

# Function: agentResultWire()

```ts
function agentResultWire(result, fallbackMessage): WireError;
```

Defined in: [packages/core/src/engine/ctx.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L300)

Projects a settled AgentResult's error to its wire form, carrying the
engine-decided abort class in data. AgentError itself has no data
field, so without this every projection past the terminal entry (the
run-level outcome.error, thrown AgentCallError wires, dropped items)
would keep only the message text and lose the typed class (v1.9.0
follow-up review).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |
| `fallbackMessage` | `string` |

## Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)
