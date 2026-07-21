[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateRetryPolicy

# Function: validateRetryPolicy()

```ts
function validateRetryPolicy(policy, source?): void;
```

Defined in: [packages/core/src/model/retry.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/retry.ts#L122)

Validates a RetryPolicy and throws a typed ConfigError naming the
offending field before any provider, journal, or store side effect
can happen under it (v1.29.0 review P2). The engine calls this
eagerly in createEngine for `defaults.retry` and every profile
retry, and again after the call > profile > engine precedence merge
of each agent call, so an invalid policy can never dispatch an
adapter. The contract:

- `attempts` is a positive safe integer (total tries, the initial
  attempt included; the engine always makes the first try, so a
  zero-attempts policy has no meaning and is rejected).
- `backoff.initialMs` and `backoff.maxMs` are integers between 0 and
  2147483647 ms (the Node timer maximum). `maxMs` below `initialMs`
  is allowed: `maxMs` is a ceiling applied through `Math.min`, so
  the pair stays well defined.
- `backoff.factor` is a finite number above zero. A factor below 1
  is allowed and yields a decaying backoff.
- `backoff.jitter`, when given, is a boolean.
- `retryOn`, when given, is an array of unique values drawn from
  'transport' | 'rate-limit' | 'overloaded'. An empty array is
  allowed and disables retries.

`source` names where the policy came from (an engine default, a
profile, or the call option) so the error points at the exact
config path.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `policy` | [`RetryPolicy`](/api/@rulvar/core/interfaces/RetryPolicy.md) | `undefined` |
| `source` | `string` | `'retry'` |

## Returns

`void`
