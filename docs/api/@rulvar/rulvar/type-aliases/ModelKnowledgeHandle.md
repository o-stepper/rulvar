[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelKnowledgeHandle

# Type Alias: ModelKnowledgeHandle

```ts
type ModelKnowledgeHandle = Pick<ModelKnowledgeStore, "current">;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The runtime handle: with propose() deleted from the design and
commit absent from this shape, a run has no write path into the
cross-run medium at all (docs/05, section "Security", channel 3).
