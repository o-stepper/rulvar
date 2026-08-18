[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / openWireIntentsOf

# Function: openWireIntentsOf()

```ts
function openWireIntentsOf(entries): OpenWireIntent[];
```

Defined in: `packages/core/dist/index.d.ts`

The open provider wire intents of a journal (RV4006): every
`provider-intent` decision with neither a `provider-call` receipt
row nor a settled terminal record covering its (agentRef, ordinal,
attempt). ONE pairing rule, shared by the invoice's `openIntents`
lane and the resume refusal, the dispatchProjectionReserveUsd
precedent: the linter and the gate cannot drift.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

## Returns

[`OpenWireIntent`](/api/@rulvar/rulvar/interfaces/OpenWireIntent.md)[]
