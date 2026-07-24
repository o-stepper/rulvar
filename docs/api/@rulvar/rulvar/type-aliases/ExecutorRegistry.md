[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ExecutorRegistry

# Type Alias: ExecutorRegistry

```ts
type ExecutorRegistry = Partial<Record<IsolatedExecutorTag, ToolExecutorProvider>>;
```

Defined in: `packages/core/dist/index.d.ts`

The engine's executor registry: at most one provider per non-inprocess
tag. A tool whose `executor` tag is absent here fails typed at spawn
time, before any provider or model call.
