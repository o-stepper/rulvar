[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / openAiModelInfo

# Function: openAiModelInfo()

```ts
function openAiModelInfo(model): OpenAiModelInfo;
```

Defined in: [packages/openai/src/caps.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L89)

Unknown OpenAI models are assumed current-generation Responses models
with conservative transport caps and NO pricing: a fabricated price row
silently misprices every model newer than this table (it priced
gpt-5.6-sol as gpt-5.4 before the 5.6 entries landed). Hosts price an
unrecognized hosted model via a versioned createEngine({ pricing }) row;
until then its usage surfaces in CostReport.unpriced and a run ceiling
warns that it cannot bound the model.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

## Returns

[`OpenAiModelInfo`](/api/@rulvar/openai/interfaces/OpenAiModelInfo.md)
