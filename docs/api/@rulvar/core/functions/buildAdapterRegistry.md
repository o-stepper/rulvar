[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildAdapterRegistry

# Function: buildAdapterRegistry()

```ts
function buildAdapterRegistry(adapters): ReadonlyMap<string, ProviderAdapter>;
```

Defined in: [packages/core/src/model/router.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/router.ts#L31)

Per-engine adapter registry: strictly per engine, no global mutable
registry exists. A duplicate adapterId is a typed ConfigError
(docs/04, section "Registry and ModelRef").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapters` | [`ProviderAdapter`](/api/@rulvar/core/interfaces/ProviderAdapter.md)[] |

## Returns

`ReadonlyMap`\&lt;`string`, [`ProviderAdapter`](/api/@rulvar/core/interfaces/ProviderAdapter.md)\&gt;
