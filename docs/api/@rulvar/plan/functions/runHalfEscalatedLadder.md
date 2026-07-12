[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runHalfEscalatedLadder

# Function: runHalfEscalatedLadder()

```ts
function runHalfEscalatedLadder(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:551](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L551)

half-escalated-ladder: some rungs terminal, the active rung dangling
mid-attempt at the crash; resume continues the ladder without
repaying completed rungs (docs/09 round-2).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
