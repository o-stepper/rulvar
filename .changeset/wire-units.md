---
'@rulvar/core': minor
'@rulvar/anthropic': minor
'@rulvar/openai': minor
'@rulvar/store-sqlite': minor
'@rulvar/store-postgres': minor
---

pause_turn continuations become accounted wire units (RV905, the thirteenth experiment's fifth release risk). The Anthropic adapter absorbs server-side turn pauses by re-sending, making up to six wire requests inside ONE core dispatch; until now the request quota window, the provider call record, and the invoice row all saw one, and a per-request provider statement matched one segment while the rest read statement-only.

The adapter's finish metadata now names the whole segment set (`providerMetadata.anthropic.wireRequests = { count, responseIds }`); the provider call record and the invoice row carry `wireResponseIds`; and the quota reconciliation settles the reservation against the TRUE wire request count. The `QuotaLimiter.reconcile` SPI gains an optional `actual.requests` argument, honored by all three reference limiters through one shared arithmetic (`quotaActualRequestsDelta`), so a window that admitted one request per reservation now reflects what the provider's own RPM meter saw; a settlement only ever adds, never denies retroactively, and implementations written against the two-argument form remain valid. `reconcileStatement` joins a multi-wire invoice row by ANY id of its segment set, all-or-nothing: a partially delivered segment set reads `partial-coverage` with its delivered segments never counted as statement-only (and never `no-overlap` when segments touched our data), and provider-reported token counts compare as the SUM over the segments against the dispatch's recorded usage. Single-wire dispatches carry none of the new fields and stay byte-identical, journals and events included.
