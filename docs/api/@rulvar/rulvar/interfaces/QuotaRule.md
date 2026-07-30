[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / QuotaRule

# Interface: QuotaRule

Defined in: `packages/core/dist/index.d.ts`

One shared-quota rule. The dimension fields select which requests
the rule governs (an absent dimension matches every value); EVERY
matching rule must admit a request, and a grant consumes capacity
from each of them. The counters are rule-scoped: one rule matching
two models pools them under one cap; write one rule per model for
per-model buckets.

Window semantics, named as the deliberate compromise it is (RV708):
every PerMinute cap counts over FIXED epoch-aligned 60 s windows
([QUOTA\_WINDOW\_MS](/api/@rulvar/rulvar/variables/QUOTA_WINDOW_MS.md)), not a sliding minute. Each fixed window
enforces its cap exactly, and a burst placed astride a boundary can
therefore consume up to TWO caps inside one sliding 60 s; that
bounded burst is the price of cross-process parity (every reference
limiter in every process computes the same window from the same
clock with no shared sliding state), and provider-side minute
windows are themselves fuzzy. Size caps with the boundary burst in
mind; the semantics are pinned as intended, not scheduled to change.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-provider"></a> `provider?` | `string` | Adapter id, as in `concurrency.perProvider` keys. | `packages/core/dist/index.d.ts` |
| <a id="property-requestsperminute"></a> `requestsPerMinute?` | `number` | Wire attempts admitted per window; the exact, hard cap. | `packages/core/dist/index.d.ts` |
| <a id="property-tenant"></a> `tenant?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-tokensperminute"></a> `tokensPerMinute?` | `number` | Input plus output tokens admitted per window: estimated at admission, reconciled to actual usage. | `packages/core/dist/index.d.ts` |
