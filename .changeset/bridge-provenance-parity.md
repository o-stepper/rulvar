---
'@rulvar/bridge-ai-sdk': minor
'@rulvar/openai': minor
'@rulvar/core': minor
---

Provider-id provenance parity across every adapter path (RV401, the eighth comparison experiment). The AI SDK bridge now ships the flat `responseId` the core reconciliation record reads, beside the nested `response` object it always emitted, and an error finish carries the accumulated response metadata and warnings on the error event instead of dropping them (retained parts stay deliberately absent there: a failed turn is discarded, never re-injected). The core agent loop captures provider metadata from error events and falls back to the AI SDK's nested `response.id` shape when a third-party adapter ships only that, with the flat first-class form winning when both are present. The OpenAI adapter attaches the failed response's id to its `response.failed` error event, so a billed failure reconciles against the provider statement exactly like an ok row. End-to-end tests pin a bridged engine run whose per-call reconciliation records carry ids on the success, retry, and billed-failure paths alike.
