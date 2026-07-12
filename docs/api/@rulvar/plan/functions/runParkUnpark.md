[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runParkUnpark

# Function: runParkUnpark()

```ts
function runParkUnpark(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:423](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L423)

park-unpark: park of a running node with checkpoint retention, later
unpark and continuation (docs/09 round-2; docs/03 11.2). The worker
pays one tool turn, hangs in its second, parks at the boundary, and
the unparked continuation resumes from the retained checkpoint (the
booted history carries the paid turn).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
