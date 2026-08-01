[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / persistedTerminalEnvelope

# Function: persistedTerminalEnvelope()

```ts
function persistedTerminalEnvelope(input): PersistedTerminalResult;
```

Defined in: [packages/core/src/engine/persisted-terminal.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/persisted-terminal.ts#L84)

Rebuilds one run's terminal envelope from its journal (RV1209).
`priceUsd` is the caller's composed pricing, exactly what the cost
endpoint passes: the settle's pinned rows composed over the host's
current table, so a rebuilt envelope reports the dollars the run
settled at rather than today's rates.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `entries`: readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]; `meta`: [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined`; `priceUsd`: (`servedBy`, `usage`, `seq?`) => `number` \| `undefined`; `runId`: `string`; \} |
| `input.entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `input.meta` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) \| `undefined` |
| `input.priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |
| `input.runId` | `string` |

## Returns

[`PersistedTerminalResult`](/api/@rulvar/core/type-aliases/PersistedTerminalResult.md)
