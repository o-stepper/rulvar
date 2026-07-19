[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / normalizeOpenAiUsage

# Function: normalizeOpenAiUsage()

```ts
function normalizeOpenAiUsage(raw): Usage;
```

Defined in: [packages/openai/src/wire.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L295)

Normalizes Responses usage into the canonical Usage invariant, where
`inputTokens` is the FULL prompt. On the OpenAI wire `input_tokens`
is ALREADY that full count: `input_tokens_details.cached_tokens` and
`input_tokens_details.cache_write_tokens` (GPT-5.6 and later
families) are priced SUBSETS of it, never additional tokens, so both
pass through untouched and nothing is added. Verified on the live
wire 2026-07-18: two identical long prompts report the SAME
`input_tokens` while the details flip from write to read, and
`total_tokens` equals `input_tokens + output_tokens` on both calls.
Adding writes on top (the v1.19.0 reading of the field) double-billed
every written token at 1x + 1.25x and inflated budget debits
(v1.19.0 review P1-1). Contrast with the Anthropic adapter, whose
wire genuinely EXCLUDES both cache counts from `input_tokens`, so
that adapter adds them; the two wires differ, the canonical Usage
invariant does not.

Numeric hygiene is deliberately NOT this function's job: any `number`
the wire (or an injected client) reports passes through, and the core
enforces the full telemetry invariant at the adapter boundary for
every adapter uniformly, failing the call loud on non-finite,
negative, or fractional counts while accounting only sanitized values
(`usageViolations`/`sanitizeUsage` in @rulvar/core; v1.20.0 review
P1-1). Real wires report whole nonnegative integers; a violation here
means a broken transport, never plausible provider data.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `raw` | `Record`\&lt;`string`, `unknown`\&gt; \| `undefined` |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
