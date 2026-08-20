[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / executionScopeDigest

# Function: executionScopeDigest()

```ts
function executionScopeDigest(scope): string;
```

Defined in: `packages/core/dist/index.d.ts`

The canonical digest of a scope (RV4205): sha256 over the JCS bytes
of the NORMALIZED scope, a fixed-length identity for causal records
(the genesis decision, the invoice header) and external joins, so a
FinOps pipeline correlates runs by one column instead of comparing
structured objects field by field.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | [`ExecutionScope`](/api/@rulvar/rulvar/interfaces/ExecutionScope.md) |

## Returns

`string`
