[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ConformanceExecutorFactory

# Type Alias: ConformanceExecutorFactory

```ts
type ConformanceExecutorFactory = (config) => ToolExecutorProvider;
```

Defined in: [packages/executor/src/conformance.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L39)

Builds the provider under test from a shared-contract config.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`ConformanceExecutorConfig`](/api/@rulvar/executor/interfaces/ConformanceExecutorConfig.md) |

## Returns

[`ToolExecutorProvider`](/api/@rulvar/rulvar/interfaces/ToolExecutorProvider.md)
