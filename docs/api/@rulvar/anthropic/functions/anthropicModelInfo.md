[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / anthropicModelInfo

# Function: anthropicModelInfo()

```ts
function anthropicModelInfo(model): AnthropicModelInfo;
```

Defined in: [packages/anthropic/src/caps.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L122)

Unknown Anthropic models are assumed current-generation: adaptive
thinking, native structured outputs, no sampling parameters. refreshCaps
corrects window/output figures from the live model list. Pricing stays
ABSENT for an unknown model: a fabricated row silently misprices every
model newer than this table. Hosts price it via a versioned
createEngine({ pricing }) row; until then its usage surfaces in
CostReport.unpriced and a run ceiling warns that it cannot bound the
model.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

## Returns

[`AnthropicModelInfo`](/api/@rulvar/anthropic/interfaces/AnthropicModelInfo.md)
