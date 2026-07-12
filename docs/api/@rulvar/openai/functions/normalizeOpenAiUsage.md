[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / normalizeOpenAiUsage

# Function: normalizeOpenAiUsage()

```ts
function normalizeOpenAiUsage(raw): Usage;
```

Defined in: [packages/openai/src/wire.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L244)

Normalizes Responses usage: input_tokens already includes cached reads.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
