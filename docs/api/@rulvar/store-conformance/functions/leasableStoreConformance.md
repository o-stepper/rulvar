[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / leasableStoreConformance

# Function: leasableStoreConformance()

```ts
function leasableStoreConformance(mk, options?): ConformanceSuite;
```

Defined in: [packages/store-conformance/src/leasable.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/leasable.ts#L55)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mk` | [`StoreFactory`](/api/@rulvar/store-conformance/type-aliases/StoreFactory.md)\&lt;[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)\&gt; | - |
| `options?` | \{ `ttlMs?`: `number`; \} | - |
| `options.ttlMs?` | `number` | The store's configured lease TTL, when known: enables the wall-clock expiry and renew-keeps-held checks. |

## Returns

[`ConformanceSuite`](/api/@rulvar/store-conformance/interfaces/ConformanceSuite.md)
