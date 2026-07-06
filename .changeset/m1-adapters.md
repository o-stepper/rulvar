---
'@lurker/anthropic': minor
'@lurker/openai': minor
---

M1-T12/T13: the two first-class adapters on the July 2026 surfaces.
@lurker/anthropic: adaptive thinking, the output_config umbrella (effort
passthrough including max, native json_schema format), strict tools,
cache_control compilation from cacheHint (deepest-4 kept), thinking-block
retention with provider-granularity projection, pause_turn absorption
without synthetic user messages, the full stop-reason table with typed
refusal stop details, count_tokens, capabilities-bearing refreshCaps,
retry-after/x-ratelimit/529 signaling, SDK autoretries disabled, usage
normalization under the Usage invariant. @lurker/openai: Responses API
with manual item replay only (store false, encrypted reasoning echoed
verbatim; previous_response_id/Conversations rejected as ConfigError),
flattened strict function tools, text.format json_schema, the typed SSE
catalog mapped to ChatEvent, the Chat Completions degraded path (visible
via providerMetadata), effort mapping with the documented lossy
max-to-xhigh downmap and provider none via providerOptions only, usage
normalization.
