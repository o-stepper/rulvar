[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runRaceTimeoutVsLive

# Function: runRaceTimeoutVsLive()

```ts
function runRaceTimeoutVsLive(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:528](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L528)

race-timeout-vs-live (DEF-2): a Flavor B deadline resolution and a
live class decision race on one suspension; first-wins applies the
timeout, the live attempt lands as a noop, and exactly ONE
escalationUnits debit exists. Store-independence is asserted by the
replay suite.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
