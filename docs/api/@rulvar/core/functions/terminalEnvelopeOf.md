[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / terminalEnvelopeOf

# Function: terminalEnvelopeOf()

```ts
function terminalEnvelopeOf(input): TerminalEnvelope;
```

Defined in: [packages/core/src/engine/terminal-envelope.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L28)

Assembles one terminal envelope (RV1105). `settlement` present means
nothing durable records the terminal: `settled` reads false, and the
optional `settledReason: 'superseded'` names the fenced-out segment
(RV1009); absent means the settle held and `settled` reads true. The
per-model split is detached, so a consumer mutating the envelope
never reaches back into the cost report.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `agentsSpawned`: `number`; `outcome`: [`TerminalOutcomeFacts`](/api/@rulvar/core/type-aliases/TerminalOutcomeFacts.md); `runId`: `string`; `settlement?`: \{ `settledReason?`: `"superseded"`; \}; `workflow`: `string`; \} |
| `input.agentsSpawned` | `number` |
| `input.outcome` | [`TerminalOutcomeFacts`](/api/@rulvar/core/type-aliases/TerminalOutcomeFacts.md) |
| `input.runId` | `string` |
| `input.settlement?` | \{ `settledReason?`: `"superseded"`; \} |
| `input.settlement.settledReason?` | `"superseded"` |
| `input.workflow` | `string` |

## Returns

[`TerminalEnvelope`](/api/@rulvar/core/interfaces/TerminalEnvelope.md)
