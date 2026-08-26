[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / anchorGroundingValidator

# Function: anchorGroundingValidator()

```ts
function anchorGroundingValidator(options): FinishValidator;
```

Defined in: `packages/core/dist/index.d.ts`

The wrong line lint as a finish validator. Each finding is one
reason naming the anchor, the resolved window, the asserted tokens
it never carries, and the exact lines that do, so the repair turn
moves the anchor instead of guessing. Default name
'anchor-grounding'; see the module comment for the doctrine.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AnchorGroundingOptions`](/api/@rulvar/rulvar/interfaces/AnchorGroundingOptions.md) & \{ `name?`: `string`; \} |

## Returns

[`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)
