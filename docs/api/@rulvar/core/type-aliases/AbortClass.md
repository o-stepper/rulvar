[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AbortClass

# Type Alias: AbortClass

```ts
type AbortClass = "no-progress" | "output-truncated";
```

Defined in: [packages/core/src/runtime/no-progress.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L31)

The consumer-visible engine-decided abort classes (FR-424).
'no-progress' is the detector below; 'output-truncated' is a
schema-less turn that ended at its output token allowance
(finish reason 'max-tokens') without visible output (v1.9.0
follow-up review). Both stamp memoizeOutcome on the terminal:
the work is paid, so every resume replays the abort instead of
re-paying the same bounded failure.
