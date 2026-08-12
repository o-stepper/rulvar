[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / manifestValidators

# Function: manifestValidators()

```ts
function manifestValidators(manifest): FinishValidator[];
```

Defined in: `packages/core/dist/index.d.ts`

The manifest's gate half (RV3308): heading structure (ordered,
exclusive), word bounds, the citation floor, and the mention
universe, in that stable order, each through the existing named
validator. Everything is derived from the SAME object the prompt
block renders from.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | [`OutputContractManifest`](/api/@rulvar/rulvar/interfaces/OutputContractManifest.md) |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[]
