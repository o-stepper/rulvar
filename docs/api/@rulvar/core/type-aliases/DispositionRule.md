[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DispositionRule

# Type Alias: DispositionRule

```ts
type DispositionRule = "replay" | "rerun" | "memoize-limit" | "memoize-task-error";
```

Defined in: [packages/core/src/journal/keyderiver.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L26)

Per-effective-status disposition rules; DATA on the profile, consumed
only by the single canonical replayDisposition function (there is NO
replayAction method).
