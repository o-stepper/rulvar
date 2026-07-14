[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runParkUnpark

# Function: runParkUnpark()

```ts
function runParkUnpark(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:422](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L422)

park-unpark: park of a running node with checkpoint retention, later
unpark and continuation. The worker
pays one tool turn, hangs in its second, parks at the boundary, and
the unparked continuation resumes from the retained checkpoint (the
booted history carries the paid turn).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
