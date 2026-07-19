[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sanitizeTokenCount

# Function: sanitizeTokenCount()

```ts
function sanitizeTokenCount(value): number;
```

Defined in: `packages/core/dist/index.d.ts`

One count, repaired in the conservative direction: non-numbers and
non-finite values floor to zero (no evidence, no charge and no
credit), negatives floor to zero (a negative count can only CREDIT
the budget, which hostile telemetry must never do), and fractions
round UP so a repaired charge is never an undercharge.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `number` \| `undefined` |

## Returns

`number`
