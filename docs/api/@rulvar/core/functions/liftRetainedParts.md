[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / liftRetainedParts

# Function: liftRetainedParts()

```ts
function liftRetainedParts(providerMetadata, adapter): Part[];
```

Defined in: [packages/core/src/model/projector.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/projector.ts#L65)

Lifts the adapter-shipped retention payload of one finished turn into
provider-raw parts (docs/04, section 2.3 retention transport). Reads
providerMetadata[&lt;adapter id&gt;].retainedParts and tags each block with
the adapter's provider family. Returns [] when the adapter shipped
nothing.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `providerMetadata` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |
| `adapter` | `Pick`\&lt;[`ProviderAdapter`](/api/@rulvar/core/interfaces/ProviderAdapter.md), `"id"` \| `"provider"`\&gt; |

## Returns

[`Part`](/api/@rulvar/core/type-aliases/Part.md)[]
