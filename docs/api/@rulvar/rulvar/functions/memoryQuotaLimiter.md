[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / memoryQuotaLimiter

# Function: memoryQuotaLimiter()

```ts
function memoryQuotaLimiter(rules, options?): MemoryQuotaLimiter;
```

Defined in: `packages/core/dist/index.d.ts`

The in-process reference QuotaLimiter: fixed epoch-aligned
one-minute windows over the shared rule model. Coordinates every
engine that shares THIS instance inside one process; processes
coordinate through a shared-storage implementation of the same SPI
(SqliteQuotaLimiter in @rulvar/store-sqlite) instead.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] |
| `options?` | \{ `now?`: () => `number`; \} |
| `options.now?` | () => `number` |

## Returns

[`MemoryQuotaLimiter`](/api/@rulvar/rulvar/interfaces/MemoryQuotaLimiter.md)
