[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / liftRetainedParts

# Function: liftRetainedParts()

```ts
function liftRetainedParts(providerMetadata, adapter): Part[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Lifts the adapter-shipped retention payload of one finished turn into
provider-raw parts (docs/04, section 2.3 retention transport). Reads
providerMetadata[&lt;adapter id&gt;].retainedParts and tags each block with
the adapter's provider family. Returns [] when the adapter shipped
nothing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `providerMetadata` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md), `"id"` \| `"provider"`\&gt; |

## Returns

[`Part`](/api/@rulvar/rulvar/type-aliases/Part.md)[]
