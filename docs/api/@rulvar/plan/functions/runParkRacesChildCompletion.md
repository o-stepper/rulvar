[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runParkRacesChildCompletion

# Function: runParkRacesChildCompletion()

```ts
function runParkRacesChildCompletion(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:2502](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L2502)

park-races-child-completion (DEF-8): park_task lands on a running node
whose terminal appends moments later; parkRequested is extinguished by
the child-result transition, no checkpoint is written, and the node is
done.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
