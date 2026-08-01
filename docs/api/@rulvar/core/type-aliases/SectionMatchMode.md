[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SectionMatchMode

# Type Alias: SectionMatchMode

```ts
type SectionMatchMode = "anywhere" | "line";
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L109)

How section markers must appear in the judged text (cycle 74):
'anywhere' is the historical substring test; 'line' demands the
marker as its own line (surrounding whitespace ignored), so a
mid sentence mention or a quoted marker no longer satisfies a
heading requirement.
