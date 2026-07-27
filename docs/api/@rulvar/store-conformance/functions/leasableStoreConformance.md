[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / leasableStoreConformance

# Function: leasableStoreConformance()

```ts
function leasableStoreConformance(mk, options?): ConformanceSuite;
```

Defined in: [packages/store-conformance/src/leasable.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/leasable.ts#L55)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mk` | [`StoreFactory`](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md)\&lt;[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)\&gt; | - |
| `options?` | \{ `expiry?`: \{ `mk`: [`StoreFactory`](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md)\&lt;[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)\&gt;; `ttlMs`: `number`; \}; `ttlMs?`: `number`; \} | - |
| `options.expiry?` | \{ `mk`: [`StoreFactory`](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md)\&lt;[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)\&gt;; `ttlMs`: `number`; \} | The wall-clock expiry check's OWN store and ttl (cycle 80): hand the mandatory checks a main factory whose ttl no realistic stall can cross, and give the expiry check its short-ttl store here. Wins over `ttlMs` when both are present. |
| `options.expiry.mk?` | [`StoreFactory`](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md)\&lt;[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)\&gt; | - |
| `options.expiry.ttlMs?` | `number` | - |
| `options.ttlMs?` | `number` | The store's configured lease TTL, when known: enables the wall-clock expiry and renew-keeps-held checks against the MAIN factory. LEGACY single-ttl pairing: the mandatory checks follow the suite's no-wall-clock convention, and a short shared ttl lets one scheduler stall expire a just-acquired lease inside them (the cycle 80 CI flake). Prefer `expiry`. |

## Returns

[`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md)
