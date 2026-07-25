[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / finishContract

# Function: finishContract()

```ts
function finishContract(manifest): FinishContract;
```

Defined in: `packages/core/dist/index.d.ts`

Builds a [FinishContract](/api/@rulvar/rulvar/interfaces/FinishContract.md) from one manifest: validation and the
golden fixtures happen HERE, at configuration time, so a
self-contradictory contract (mandatory content alone above words.max,
an unsampled custom pattern) fails before any run exists. Spread
`contract.validators` into finishValidation.validators and pass the
contract itself as finishValidation.contract; the orchestrator then
injects `promptLines` into the coordination and synthesis prompts,
runs the golden self test at construction, and journals the frozen
bundle descriptor.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | [`FinishContractManifest`](/api/@rulvar/rulvar/interfaces/FinishContractManifest.md) |

## Returns

[`FinishContract`](/api/@rulvar/rulvar/interfaces/FinishContract.md)
