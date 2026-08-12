[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / renderContractRequirements

# Function: renderContractRequirements()

```ts
function renderContractRequirements(manifest): string;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1783](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1783)

The manifest's prompt half (RV3308): a deterministic requirements
block enumerating the SAME headings, bounds, citation floor and
literals the validators hold, byte for byte, for the host to embed
in its question. Rendering is pure string assembly; nothing here
consults the result.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | [`OutputContractManifest`](/api/@rulvar/core/interfaces/OutputContractManifest.md) |

## Returns

`string`
