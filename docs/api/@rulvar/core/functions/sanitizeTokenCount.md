[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sanitizeTokenCount

# Function: sanitizeTokenCount()

```ts
function sanitizeTokenCount(value): number;
```

Defined in: [packages/core/src/l0/usage.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/usage.ts#L74)

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
