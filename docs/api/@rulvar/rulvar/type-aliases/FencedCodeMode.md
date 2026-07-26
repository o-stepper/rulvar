[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FencedCodeMode

# Type Alias: FencedCodeMode

```ts
type FencedCodeMode = "counted" | "excluded";
```

Defined in: `packages/core/dist/index.d.ts`

Whether fenced code participates in textual validation (cycle 74):
'counted' is the historical behavior; 'excluded' removes fenced code
blocks (see [stripFencedBlocks](/api/@rulvar/rulvar/functions/stripFencedBlocks.md)) before matching, counting, or
slicing, so code samples can neither satisfy a section marker nor
inflate word and citation counts.
