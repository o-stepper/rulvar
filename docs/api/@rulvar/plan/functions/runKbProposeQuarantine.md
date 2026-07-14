[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runKbProposeQuarantine

# Function: runKbProposeQuarantine()

```ts
function runKbProposeQuarantine(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m12-cassettes.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m12-cassettes.ts#L148)

kb-propose-quarantine: injected garbage in a proposal is inert, and
nothing commits during the run.

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
