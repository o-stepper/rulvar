[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FencedCodeMode

# Type Alias: FencedCodeMode

```ts
type FencedCodeMode = "counted" | "excluded";
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L133)

Whether fenced code participates in textual validation (cycle 74):
'counted' is the historical behavior; 'excluded' removes fenced code
blocks (see [stripFencedBlocks](/api/@rulvar/core/functions/stripFencedBlocks.md)) before matching, counting, or
slicing, so code samples can neither satisfy a section marker nor
inflate word and citation counts.
