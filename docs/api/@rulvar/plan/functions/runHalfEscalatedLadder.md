[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runHalfEscalatedLadder

# Function: runHalfEscalatedLadder()

```ts
function runHalfEscalatedLadder(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:550](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L550)

half-escalated-ladder: some rungs terminal, the active rung dangling
mid-attempt at the crash; resume continues the ladder without
repaying completed rungs.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
