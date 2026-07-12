[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runRevisionExhaustion

# Function: runRevisionExhaustion()

```ts
function runRevisionExhaustion(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:811](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L811)

revision-exhaustion (DEF-2): the absolute revision budget hits zero;
termination.denied precedes the typed error; the guards chain closes
the run without HITL.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
