[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runReserveSurvivesRunExhaustion

# Function: runReserveSurvivesRunExhaustion()

```ts
function runReserveSurvivesRunExhaustion(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2599](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2599)

reserve-survives-run-exhaustion (DEF-7): cheap workers eat the run
ceiling until admission rejects the spawn that would invade the
committed finalize reserve; the final wake executes from the reserve
and the rejections forward-match on replay (docs/07, 12.4).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
