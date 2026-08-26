[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / anchorGroundingFindingsOf

# Function: anchorGroundingFindingsOf()

```ts
function anchorGroundingFindingsOf(text, options): AnchorGroundingFinding[];
```

Defined in: [packages/core/src/orchestrator/anchor-grounding.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L388)

The pure engine behind [anchorGroundingValidator](/api/@rulvar/core/functions/anchorGroundingValidator.md): every wrong
line finding of `text` against the snapshot, in document order. The
validator renders these as reasons; a harness reads them directly.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `text` | `string` |
| `options` | [`AnchorGroundingOptions`](/api/@rulvar/core/interfaces/AnchorGroundingOptions.md) |

## Returns

[`AnchorGroundingFinding`](/api/@rulvar/core/interfaces/AnchorGroundingFinding.md)[]
