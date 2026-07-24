[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolatedExecutorTag

# Type Alias: IsolatedExecutorTag

```ts
type IsolatedExecutorTag = Exclude<ToolExecutor, "inprocess">;
```

Defined in: [packages/core/src/l0/spi/executor.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/executor.ts#L21)

The non-inprocess executor tags a provider can be registered under.
