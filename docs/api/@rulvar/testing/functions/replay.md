[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / replay

# Function: replay()

```ts
function replay(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L208)

Builds replay adapters from a cassette. `onMiss: 'throw'` is the
hermetic CI mode; `'passthrough'` forwards unrecorded requests to the
matching live adapter in `adapters` (a development convenience only).

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `adapters?`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `onMiss`: `"throw"` \| `"passthrough"`; \} | - |
| `options.adapters?` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] | Live adapters for the passthrough mode. |
| `options.cassette` | `string` | - |
| `options.onMiss` | `"throw"` \| `"passthrough"` | - |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]
