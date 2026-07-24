[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExecutorRegistry

# Type Alias: ExecutorRegistry

```ts
type ExecutorRegistry = Partial<Record<IsolatedExecutorTag, ToolExecutorProvider>>;
```

Defined in: [packages/core/src/l0/spi/executor.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L82)

The engine's executor registry: at most one provider per non-inprocess
tag. A tool whose `executor` tag is absent here fails typed at spawn
time, before any provider or model call.
