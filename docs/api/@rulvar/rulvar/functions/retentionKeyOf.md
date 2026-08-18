[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / retentionKeyOf

# Function: retentionKeyOf()

```ts
function retentionKeyOf(adapter): string;
```

Defined in: `packages/core/dist/index.d.ts`

The RETENTION identity of an adapter (RV4007): the provider family,
composed with the adapter's declared `scopeKey` when one exists, so
two adapters of one family serving different accounts stop sharing
provider-raw blocks (cache handles, thinking blocks: provider-side
identifiers minted under one account are not portable to another).
Adapters without a scopeKey keep the family alone, byte for byte
the historical sharing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md), `"id"` \| `"provider"` \| `"scopeKey"`\&gt; |

## Returns

`string`
