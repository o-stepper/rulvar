[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / openWireIntentsOf

# Function: openWireIntentsOf()

```ts
function openWireIntentsOf(entries): OpenWireIntent[];
```

Defined in: [packages/core/src/engine/invoice.ts:618](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L618)

The open provider wire intents of a journal (RV4006): every
`provider-intent` decision with neither a `provider-call` receipt
row nor a settled terminal record covering its (agentRef, ordinal,
attempt). ONE pairing rule, shared by the invoice's `openIntents`
lane and the resume refusal, the dispatchProjectionReserveUsd
precedent: the linter and the gate cannot drift.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

## Returns

[`OpenWireIntent`](/api/@rulvar/core/interfaces/OpenWireIntent.md)[]
