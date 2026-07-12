[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / normalizeAnthropicUsage

# Function: normalizeAnthropicUsage()

```ts
function normalizeAnthropicUsage(raw): Usage;
```

Defined in: [packages/anthropic/src/wire.ts:396](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L396)

Normalizes Messages API usage under the Usage invariant: Anthropic
reports input_tokens EXCLUDING cache reads and writes, so the canonical
inputTokens is the sum of all three.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
