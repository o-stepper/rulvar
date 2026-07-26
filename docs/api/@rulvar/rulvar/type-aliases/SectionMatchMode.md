[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SectionMatchMode

# Type Alias: SectionMatchMode

```ts
type SectionMatchMode = "anywhere" | "line";
```

Defined in: `packages/core/dist/index.d.ts`

How section markers must appear in the judged text (cycle 74):
'anywhere' is the historical substring test; 'line' demands the
marker as its own line (surrounding whitespace ignored), so a
mid sentence mention or a quoted marker no longer satisfies a
heading requirement.
