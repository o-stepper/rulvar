[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / terminalEnvelopeOf

# Function: terminalEnvelopeOf()

```ts
function terminalEnvelopeOf(input): TerminalEnvelope;
```

Defined in: [packages/core/src/engine/terminal-envelope.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L33)

Assembles one terminal envelope (RV1105). `settlement` present means
nothing durable records the terminal: `settled` reads false, and the
optional `settledReason: 'superseded'` names the fenced-out segment
(RV1009); absent means the settle held and `settled` reads true. The
per-model split is detached, so a consumer mutating the envelope
never reaches back into the cost report.

`provenance: 'journal'` marks a copy rebuilt from the journal after
the run left its process (RV1209). It is the same producer on
purpose: a persisted reader must not assemble a second, subtly
different shape, which is the whole point of the arc.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `agentsSpawned`: `number`; `outcome`: [`TerminalOutcomeFacts`](/api/@rulvar/core/type-aliases/TerminalOutcomeFacts.md); `provenance?`: `"journal"`; `runId`: `string`; `settlement?`: \{ `settledReason?`: `"superseded"`; \}; `workflow`: `string`; \} |
| `input.agentsSpawned` | `number` |
| `input.outcome` | [`TerminalOutcomeFacts`](/api/@rulvar/core/type-aliases/TerminalOutcomeFacts.md) |
| `input.provenance?` | `"journal"` |
| `input.runId` | `string` |
| `input.settlement?` | \{ `settledReason?`: `"superseded"`; \} |
| `input.settlement.settledReason?` | `"superseded"` |
| `input.workflow` | `string` |

## Returns

[`TerminalEnvelope`](/api/@rulvar/core/interfaces/TerminalEnvelope.md)
