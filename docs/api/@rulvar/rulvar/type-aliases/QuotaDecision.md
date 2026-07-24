[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / QuotaDecision

# Type Alias: QuotaDecision

```ts
type QuotaDecision = 
  | {
  granted: true;
  reservationId: string;
}
  | {
  granted: false;
  reason?: string;
  retryAfterMs?: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

The admission verdict. `retryAfterMs` on a denial is the
provider-shaped hint the retry engine honors verbatim: the time
until the limiter expects capacity (0 = retry immediately, e.g. a
request whose estimate can never fit its cap, so exhaustion and
failover happen without waiting; absent = the caller's backoff
policy applies).
