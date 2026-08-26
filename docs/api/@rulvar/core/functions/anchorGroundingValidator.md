[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / anchorGroundingValidator

# Function: anchorGroundingValidator()

```ts
function anchorGroundingValidator(options): FinishValidator;
```

Defined in: [packages/core/src/orchestrator/anchor-grounding.ts:630](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/anchor-grounding.ts#L630)

The wrong line lint as a finish validator. Each finding is one
reason naming the anchor, the resolved window, the asserted tokens
it never carries, and the exact lines that do, so the repair turn
moves the anchor instead of guessing. Default name
'anchor-grounding'; see the module comment for the doctrine.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AnchorGroundingOptions`](/api/@rulvar/core/interfaces/AnchorGroundingOptions.md) & \{ `name?`: `string`; \} |

## Returns

[`FinishValidator`](/api/@rulvar/core/interfaces/FinishValidator.md)
