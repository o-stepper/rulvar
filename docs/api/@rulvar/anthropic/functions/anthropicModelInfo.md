[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / anthropicModelInfo

# Function: anthropicModelInfo()

```ts
function anthropicModelInfo(model): AnthropicModelInfo;
```

Defined in: [packages/anthropic/src/caps.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L113)

Unknown Anthropic models are assumed current-generation: adaptive
thinking, native structured outputs, no sampling parameters. refreshCaps
corrects window/output figures from the live model list.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

## Returns

[`AnthropicModelInfo`](/api/@rulvar/anthropic/interfaces/AnthropicModelInfo.md)
