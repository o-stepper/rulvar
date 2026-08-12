[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / renderContractRequirements

# Function: renderContractRequirements()

```ts
function renderContractRequirements(manifest): string;
```

Defined in: `packages/core/dist/index.d.ts`

The manifest's prompt half (RV3308): a deterministic requirements
block enumerating the SAME headings, bounds, citation floor and
literals the validators hold, byte for byte, for the host to embed
in its question. Rendering is pure string assembly; nothing here
consults the result.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `manifest` | [`OutputContractManifest`](/api/@rulvar/rulvar/interfaces/OutputContractManifest.md) |

## Returns

`string`
