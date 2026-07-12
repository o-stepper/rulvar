[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DispositionRule

# Type Alias: DispositionRule

```ts
type DispositionRule = "replay" | "rerun" | "memoize-limit" | "memoize-task-error";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Per-effective-status disposition rules; DATA on the profile, consumed
only by the single canonical replayDisposition function (docs/03,
section 4.2: there is NO replayAction method).
