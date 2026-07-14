[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / buildAnthropicParams

# Function: buildAnthropicParams()

```ts
function buildAnthropicParams(req, options): Record<string, unknown>;
```

Defined in: [packages/anthropic/src/wire.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L145)

Builds Messages API params from a ChatRequest. cacheHint compiles into
cache_control breakpoints; beyond the provider cap of 4 the DEEPEST
breakpoints are kept and the shallowest dropped, deterministically.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `options` | \{ `ids`: [`IdMap`](/api/@rulvar/anthropic/classes/IdMap.md); `maxOutputTokens`: `number`; `thinkingForm`: `"adaptive"` \| `"enabled-budget"`; \} |
| `options.ids` | [`IdMap`](/api/@rulvar/anthropic/classes/IdMap.md) |
| `options.maxOutputTokens` | `number` |
| `options.thinkingForm` | `"adaptive"` \| `"enabled-budget"` |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
