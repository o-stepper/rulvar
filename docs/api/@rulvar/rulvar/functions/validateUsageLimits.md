[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateUsageLimits

# Function: validateUsageLimits()

```ts
function validateUsageLimits(limits, site): void;
```

Defined in: `packages/core/dist/index.d.ts`

Validates one UsageLimits layer at its intake boundary (v1.34.0
review P2-3): a malformed field (NaN, Infinity, a negative, a
fraction) is a typed ConfigError before the merge, before any journal
entry, and before any provider dispatch. `site` names the layer in the
error text (e.g. `RunOptions.limits`). Counts are positive integers
(maxToolCalls may be 0: a spawn that must not call tools).
streamIdleTimeoutMs is handed to setTimeout as-is, so it is bounded by
the Node timer maximum like RetryPolicy delays; timeoutMs is a
wall-clock comparison, so it has no upper bound. Every present field
is checked; absent fields keep their defaults.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `limits` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) |
| `site` | `string` |

## Returns

`void`
