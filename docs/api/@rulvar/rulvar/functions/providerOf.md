[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / providerOf

# Function: providerOf()

```ts
function providerOf(adapter): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The provider family of an adapter: `provider` when set, else `id`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md), `"id"` \| `"provider"`\&gt; |

## Returns

`string`
