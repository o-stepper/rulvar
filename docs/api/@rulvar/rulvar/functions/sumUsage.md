[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sumUsage

# Function: sumUsage()

```ts
function sumUsage(total, turn): Usage;
```

Defined in: `packages/core/dist/index.d.ts`

Canonical usage addition for aggregates. The four required counts sum
field by field and reasoning appears when the sum is positive, byte
for byte the historical fold. The cache-write TTL split survives
aggregation (RV1001): when either side differentiates its writes, an
undifferentiated side's writes count as the 5m share, which is
financially identical (both bill at the plain write rate) and keeps
the sum canonical under the split-sum rule instead of dropping the 1h
attribution the money was debited under. Sides carrying no split add
exactly as before, so aggregates over undifferentiated usage stay
byte stable.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `total` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |
| `turn` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
