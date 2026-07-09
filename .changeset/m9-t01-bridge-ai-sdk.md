---
'@lurker/bridge-ai-sdk': minor
---

M9-T01: bridgeAiSdk, the long-tail provider bridge (docs/04 section 7; FR-1xx). First real public surface of @lurker/bridge-ai-sdk.

- `bridgeAiSdk(model, options?)` wraps any Vercel AI SDK LanguageModelV4 (`@ai-sdk/provider` ^4, catalog-pinned per docs/13 "Dependency baseline pins") as a lurker ProviderAdapter for the long tail (Google, Bedrock, Vertex). A wrong `specificationVersion` fails at construction with a typed ConfigError, so a transitive provider-package major cannot mis-wire silently.
- The full ChatEvent vocabulary streams through: text and reasoning deltas, tool-call start/delta/end with engine-minted canonical ids mapped bijectively onto the wrapped provider's wire ids, incremental-free usage normalized under the Usage invariant (inputTokens always covers cache reads and writes), typed finish outcomes (length to max-tokens, content-filter to a typed refusal carrying the raw stop reason), and exactly one terminal event per stream.
- Retention rides `finish.providerMetadata[<id>].retainedParts` (docs/04 section 2.3): assembled reasoning parts with their provider signatures, custom blocks, generated files, and provider-executed tool exchanges round-trip to same-family models; response-side providerMetadata reinserts as prompt-side providerOptions.
- Conservative caps for a surface that has no introspection (the openaiCompatible posture, except structuredOutput 'native' because V4 responseFormat json is the interface-native mechanism); `options.caps` overrides per model. Canonical effort maps one to one for low/medium/high/xhigh; `max` downmaps to `xhigh` and the downmap is recorded in providerMetadata. cacheHint is ignored silently per docs/04 section 1.7.
- Errors: `aiSdkErrorToWire` projects thrown APICallErrors as typed WireErrors (429 as retryable rate-limit with retryAfterMs from the retry-after header; 5xx and status-less network failures retryable transport; other statuses terminal). Documented as the highest-churn package in the set; its provider-major bumps ride BREAKING releases, never minors.
