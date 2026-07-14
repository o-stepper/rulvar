[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / runWorktreeDisposedDegrade

# Function: runWorktreeDisposedDegrade()

```ts
function runWorktreeDisposedDegrade(): Promise<JournalEntry[]>;
```

Defined in: [packages/plan/src/m9-cassettes.ts:1787](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/m9-cassettes.ts#L1787)

worktree-disposed-degrade (DEF-5): a worktree-isolated graft donor
whose tree was NOT retained degrades to a fresh admit with the
embedded DedupNote graft_unsafe; a second section verifies reuse_full
stays allowed for a worktree donor whose root is terminal (the pin
condition applies to grafts only).

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
