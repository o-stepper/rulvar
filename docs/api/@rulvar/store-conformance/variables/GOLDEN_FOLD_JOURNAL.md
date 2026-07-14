[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / GOLDEN\_FOLD\_JOURNAL

# Variable: GOLDEN\_FOLD\_JOURNAL

```ts
const GOLDEN_FOLD_JOURNAL: readonly JournalEntry[];
```

Defined in: [packages/store-conformance/src/fixtures/golden-fold.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/fixtures/golden-fold.ts#L50)

seq 0  agent spawn (running; abandoned by seq 6)
seq 1  suspended external gate-a under the spawn's child scope
seq 2  suspended external gate-b at the root
seq 3  resolution of gate-a: schema-INVALID (never closes)
seq 4  resolution of gate-a: applied
seq 5  resolution of gate-a: noop (already_resolved)
seq 6  abandon of the spawn: applied (covers the agent:0 subtree)
seq 7  resolution of gate-b: applied (root scope, not covered)
seq 8  abandon of gate-b: noop (already_resolved; first-closing-wins)
seq 9  abandon of the spawn again: noop (target_abandoned)
