[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sanitizeUsageDelta

# Function: sanitizeUsageDelta()

```ts
function sanitizeUsageDelta(delta): Usage;
```

Defined in: [packages/core/src/l0/usage.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/usage.ts#L113)

The per-field repair for DELTAS (mid-stream usage reports and other
partial increments): each count is repaired like `sanitizeTokenCount`,
but the whole-usage subset rule is deliberately NOT applied, because a
delta legitimately carries cache counts without restating the full
input in the same event; clamping those to the subset rule would
silently drop a paid cache debit. Always returns a fresh object and
is the identity on valid deltas.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `delta` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/core/type-aliases/Usage.md)
