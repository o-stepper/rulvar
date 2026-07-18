[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / normalizeOpenAiUsage

# Function: normalizeOpenAiUsage()

```ts
function normalizeOpenAiUsage(raw): Usage;
```

Defined in: [packages/openai/src/wire.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L256)

Normalizes Responses usage into the canonical Usage invariant, where
`inputTokens` is the FULL prompt: wire `input_tokens` already includes
cached READS, while cache WRITE tokens arrive SEPARATELY in
`input_tokens_details.cache_write_tokens` (GPT-5.6 and later families;
they bill at the 1.25x write premium, and earlier families report no
field and pay no premium). Dropping the field lost the whole write
charge and weakened the budget guard (v1.18.0 review P1-2), so writes
are added into `inputTokens` and surfaced as `cacheWriteTokens` for
the premium rate, exactly mirroring the Anthropic adapter's mapping.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
