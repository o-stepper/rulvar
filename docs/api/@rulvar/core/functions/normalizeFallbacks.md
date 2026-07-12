[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / normalizeFallbacks

# Function: normalizeFallbacks()

```ts
function normalizeFallbacks(refs): FailoverTarget[];
```

Defined in: [packages/core/src/model/failover.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/failover.ts#L30)

Normalizes the author-facing ModelChoice.fallbacks list (docs/04, 8.1).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `refs` | `` `${string}:${string}` ``[] \| `undefined` |

## Returns

[`FailoverTarget`](/api/@rulvar/core/interfaces/FailoverTarget.md)[]
