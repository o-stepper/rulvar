[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / classifyAttemptOutcome

# Function: classifyAttemptOutcome()

```ts
function classifyAttemptOutcome(terminal): AttemptOutcomeClass;
```

Defined in: [packages/core/src/journal/lineage.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L233)

Classifies one settled root terminal into its attempt outcome class.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `terminal` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

[`AttemptOutcomeClass`](/api/@rulvar/core/type-aliases/AttemptOutcomeClass.md)
