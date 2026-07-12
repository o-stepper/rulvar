[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DispositionRule

# Type Alias: DispositionRule

```ts
type DispositionRule = "replay" | "rerun" | "memoize-limit" | "memoize-task-error";
```

Defined in: `packages/core/dist/index.d.ts`

Per-effective-status disposition rules; DATA on the profile, consumed
only by the single canonical replayDisposition function (there is NO
replayAction method).
