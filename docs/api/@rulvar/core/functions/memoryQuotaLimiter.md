[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / memoryQuotaLimiter

# Function: memoryQuotaLimiter()

```ts
function memoryQuotaLimiter(rules, options?): MemoryQuotaLimiter;
```

Defined in: [packages/core/src/model/quota.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L210)

The in-process reference QuotaLimiter: fixed epoch-aligned
one-minute windows over the shared rule model. Coordinates every
engine that shares THIS instance inside one process; processes
coordinate through a shared-storage implementation of the same SPI
(SqliteQuotaLimiter in @rulvar/store-sqlite) instead.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/core/interfaces/QuotaRule.md)[] |
| `options` | \{ `now?`: () => `number`; \} |
| `options.now?` | () => `number` |

## Returns

[`MemoryQuotaLimiter`](/api/@rulvar/core/interfaces/MemoryQuotaLimiter.md)
