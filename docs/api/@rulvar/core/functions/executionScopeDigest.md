[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / executionScopeDigest

# Function: executionScopeDigest()

```ts
function executionScopeDigest(scope): string;
```

Defined in: [packages/core/src/engine/engine.ts:1073](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L1073)

The canonical digest of a scope (RV4205): sha256 over the JCS bytes
of the NORMALIZED scope, a fixed-length identity for causal records
(the genesis decision, the invoice header) and external joins, so a
FinOps pipeline correlates runs by one column instead of comparing
structured objects field by field.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`ExecutionScope`](/api/@rulvar/core/interfaces/ExecutionScope.md) |

## Returns

`string`
