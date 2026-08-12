[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / manifestValidators

# Function: manifestValidators()

```ts
function manifestValidators(manifest): FinishValidator[];
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1750](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1750)

The manifest's gate half (RV3308): heading structure (ordered,
exclusive), word bounds, the citation floor, and the mention
universe, in that stable order, each through the existing named
validator. Everything is derived from the SAME object the prompt
block renders from.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | [`OutputContractManifest`](/api/@rulvar/core/interfaces/OutputContractManifest.md) |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)[]
