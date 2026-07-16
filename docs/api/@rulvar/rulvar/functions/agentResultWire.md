[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / agentResultWire

# Function: agentResultWire()

```ts
function agentResultWire(result, fallbackMessage): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

Projects a settled AgentResult's error to its wire form, carrying the
engine-decided abort class in data. AgentError itself has no data
field, so without this every projection past the terminal entry (the
run-level outcome.error, thrown AgentCallError wires, dropped items)
would keep only the message text and lose the typed class (v1.9.0
follow-up review).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt; |
| `fallbackMessage` | `string` |

## Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
