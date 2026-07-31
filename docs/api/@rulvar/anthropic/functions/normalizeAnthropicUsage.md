[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / normalizeAnthropicUsage

# Function: normalizeAnthropicUsage()

```ts
function normalizeAnthropicUsage(raw): Usage;
```

Defined in: [packages/anthropic/src/wire.ts:405](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L405)

Normalizes Messages API usage under the Usage invariant: Anthropic
reports input_tokens EXCLUDING cache reads and writes, so the canonical
inputTokens is the sum of all three. The `cache_creation` breakdown
(ephemeral_5m_input_tokens / ephemeral_1h_input_tokens) fills the
canonical TTL split (RV810) when it agrees with the flat total, so the
1h premium prices at its own rate downstream; a breakdown that
contradicts the flat total is dropped rather than shipped as a broken
invariant (the flat total is the billable number, and the
undifferentiated 5m-rate fold is the historical conservative default).
With no flat field, the breakdown IS the total.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
