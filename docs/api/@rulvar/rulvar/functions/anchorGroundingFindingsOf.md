[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / anchorGroundingFindingsOf

# Function: anchorGroundingFindingsOf()

```ts
function anchorGroundingFindingsOf(text, options): AnchorGroundingFinding[];
```

Defined in: `packages/core/dist/index.d.ts`

The pure engine behind [anchorGroundingValidator](/api/@rulvar/rulvar/functions/anchorGroundingValidator.md): every wrong
line finding of `text` against the snapshot, in document order. The
validator renders these as reasons; a harness reads them directly.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options` | [`AnchorGroundingOptions`](/api/@rulvar/rulvar/interfaces/AnchorGroundingOptions.md) |

## Returns

[`AnchorGroundingFinding`](/api/@rulvar/rulvar/interfaces/AnchorGroundingFinding.md)[]
