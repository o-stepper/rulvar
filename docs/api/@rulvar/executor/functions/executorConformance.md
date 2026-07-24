[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / executorConformance

# Function: executorConformance()

```ts
function executorConformance(factory, options?): ExecutorConformanceSuite;
```

Defined in: [packages/executor/src/conformance.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L113)

Builds the conformance suite. `factory` produces the provider under
test from a shared config; the kit supplies the command (its own
runner, run by `runtime`, default the current Node) and the per-check
options.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `factory` | [`ConformanceExecutorFactory`](/api/@rulvar/executor/type-aliases/ConformanceExecutorFactory.md) |
| `options` | \{ `runtime?`: `string`; \} |
| `options.runtime?` | `string` |

## Returns

[`ExecutorConformanceSuite`](/api/@rulvar/executor/interfaces/ExecutorConformanceSuite.md)
