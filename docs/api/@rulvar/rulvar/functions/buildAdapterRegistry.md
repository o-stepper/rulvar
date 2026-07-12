[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildAdapterRegistry

# Function: buildAdapterRegistry()

```ts
function buildAdapterRegistry(adapters): ReadonlyMap<string, ProviderAdapter>;
```

Defined in: `packages/core/dist/index.d.ts`

Per-engine adapter registry: strictly per engine, no global mutable
registry exists. A duplicate adapterId is a typed ConfigError.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapters` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] |

## Returns

`ReadonlyMap`\&lt;`string`, [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)\&gt;
