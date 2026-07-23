[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DeterminismMode

# Type Alias: DeterminismMode

```ts
type DeterminismMode = "off" | "warn" | "error";
```

Defined in: [packages/core/src/runner/determinism.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/determinism.ts#L42)

Detection modes. 'off': never detect. 'warn' (the default, and the
pre-RV-209 behavior): detect outside production (NODE_ENV !==
'production'), emit one `determinism:warning` event and one process
warning per category per segment, never reject. 'error': detect in
EVERY environment including production, and reject the run at the
first workflow-origin call with a typed DeterminismError (the strict
gate for replay-verified pipelines).
