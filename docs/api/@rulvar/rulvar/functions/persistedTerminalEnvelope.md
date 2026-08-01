[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / persistedTerminalEnvelope

# Function: persistedTerminalEnvelope()

```ts
function persistedTerminalEnvelope(input): PersistedTerminalResult;
```

Defined in: `packages/core/dist/index.d.ts`

Rebuilds one run's terminal envelope from its journal (RV1209).
`priceUsd` is the caller's composed pricing, exactly what the cost
endpoint passes: the settle's pinned rows composed over the host's
current table, so a rebuilt envelope reports the dollars the run
settled at rather than today's rates.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `entries`: readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]; `meta`: [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined`; `priceUsd`: (`servedBy`, `usage`, `seq?`) => `number` \| `undefined`; `runId`: `string`; \} |
| `input.entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `input.meta` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined` |
| `input.priceUsd` | (`servedBy`, `usage`, `seq?`) => `number` \| `undefined` |
| `input.runId` | `string` |

## Returns

[`PersistedTerminalResult`](/api/@rulvar/rulvar/type-aliases/PersistedTerminalResult.md)
