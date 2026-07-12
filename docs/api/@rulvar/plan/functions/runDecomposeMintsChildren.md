[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runDecomposeMintsChildren

# Function: runDecomposeMintsChildren()

```ts
function runDecomposeMintsChildren(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/cassettes.ts:862](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L862)

decompose-mints-children (DEF-3): an escalation decomposition mints
FRESH logical tasks inside the decision entry; the spawn debits ride
the same entry (docs/07, 8.1 rule 6, 11.3 b).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
