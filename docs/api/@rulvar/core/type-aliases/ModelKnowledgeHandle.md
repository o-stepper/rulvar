[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelKnowledgeHandle

# Type Alias: ModelKnowledgeHandle

```ts
type ModelKnowledgeHandle = Pick<ModelKnowledgeStore, "current">;
```

Defined in: [packages/core/src/l0/spi/knowledge.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L145)

The runtime handle: with propose() deleted from the design and
commit absent from this shape, a run has no write path into the
cross-run medium at all.
