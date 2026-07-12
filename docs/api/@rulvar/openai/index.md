[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/openai

# @rulvar/openai

## Classes

| Class | Description |
| ------ | ------ |
| [OpenAiIdMap](/api/@rulvar/openai/classes/OpenAiIdMap.md) | Bijective canonical-to-wire (call_*) id map (docs/04, section 1.2). |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [OpenAiAdapterOptions](/api/@rulvar/openai/interfaces/OpenAiAdapterOptions.md) | - |
| [OpenAiClientLike](/api/@rulvar/openai/interfaces/OpenAiClientLike.md) | The client sub-surface the adapter consumes; injectable for tests. |
| [OpenAiCompatibleConfig](/api/@rulvar/openai/interfaces/OpenAiCompatibleConfig.md) | - |
| [OpenAiModelInfo](/api/@rulvar/openai/interfaces/OpenAiModelInfo.md) | - |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ResponsesStreamEvent](/api/@rulvar/openai/type-aliases/ResponsesStreamEvent.md) | Raw Responses SSE events, structurally typed. |

## Variables

| Variable | Description |
| ------ | ------ |
| [CONSERVATIVE\_COMPATIBLE\_CAPS](/api/@rulvar/openai/variables/CONSERVATIVE_COMPATIBLE_CAPS.md) | Gateways cannot be introspected reliably: when caps are not supplied the factory assumes the most conservative capability set (docs/04, section 6). Callers SHOULD supply caps for anything beyond it; the window and output floors here are deliberately small so an unprobed endpoint is never overcommitted. Absent pricing is legitimate for local models: they surface as unpriced in CostReport. |
| [OPENAI\_MODELS](/api/@rulvar/openai/variables/OPENAI_MODELS.md) | Static seed table; docs/04 section 5 names the current model set. |

## Functions

| Function | Description |
| ------ | ------ |
| [buildChatCompletionsParams](/api/@rulvar/openai/functions/buildChatCompletionsParams.md) | The Chat Completions degraded path (docs/04, section 5.6): delta-patched chunk assembly instead of typed SSE, nested function tools with explicit strict where supported, response_format instead of text.format, no reasoning item replay. Selected by caps (api: 'chat'), visible in events, never silent. |
| [buildResponsesParams](/api/@rulvar/openai/functions/buildResponsesParams.md) | Builds Responses API params. Manual item replay ONLY: store: false plus include reasoning.encrypted_content; previous_response_id and the Conversations API place state server-side, break replay identity, and are REJECTED as a typed ConfigError (docs/04, section 5.1). Role 'system' messages project into top-level instructions on every request. |
| [mapChatCompletionsStream](/api/@rulvar/openai/functions/mapChatCompletionsStream.md) | Delta-patched chunk assembly for the degraded path. |
| [mapOpenAiEffort](/api/@rulvar/openai/functions/mapOpenAiEffort.md) | Canonical-to-wire effort (docs/04, sections 3.3 and 5.5): low through xhigh pass through; canonical max downmaps to xhigh (documented lossy; recorded in providerMetadata); provider 'none' is reachable only via providerOptions.openai.reasoningEffort. |
| [mapResponsesStream](/api/@rulvar/openai/functions/mapResponsesStream.md) | Maps the typed Responses SSE stream to ChatEvents per the docs/04 section 5.4 table. Canonical parts come from the typed output array, never the output_text aggregate. Raw output items ride finish.providerMetadata.openai.outputItems so the runtime can retain reasoning items as provider-raw parts. |
| [normalizeOpenAiUsage](/api/@rulvar/openai/functions/normalizeOpenAiUsage.md) | Normalizes Responses usage: input_tokens already includes cached reads. |
| [openai](/api/@rulvar/openai/functions/openai.md) | @rulvar/openai: the first-class OpenAI Responses API adapter with the Chat Completions degraded path, plus the openaiCompatible factory for Ollama, vLLM, and gateways (docs/04, sections "@rulvar/openai" and "openaiCompatible factory"). |
| [openaiCompatible](/api/@rulvar/openai/functions/openaiCompatible.md) | Creates a Chat Completions dialect adapter for a compatible endpoint. |
| [openAiErrorToWire](/api/@rulvar/openai/functions/openAiErrorToWire.md) | Projects SDK/API errors into the retryable WireError vocabulary. |
| [openAiModelInfo](/api/@rulvar/openai/functions/openAiModelInfo.md) | Unknown OpenAI models are assumed current-generation Responses models. |
