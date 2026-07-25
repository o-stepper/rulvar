---
'@rulvar/core': minor
'@rulvar/openai': minor
'@rulvar/anthropic': minor
'@rulvar/cli': minor
---

Quota drift telemetry and the honest zero (the v1.71 experiment review, P0.5 resized + P1.4). The experiment declared 12M TPM over a provider-real 1M, the local limiter went quiet, and seven live 429s followed with nothing recording the mismatch. Now: both wire adapters parse the provider's x-ratelimit headers on every real 429 into normalized per-minute limits (`WireError.data.reportedLimits`; the openai wire also gains the raw bucket capture the anthropic wire already had), the loop remembers them per (provider, model) as live telemetry, and the opt-in `quota.declaredRules` (the SAME rule array preflight takes) makes the engine journal a `quota_drift` decision plus a warn log whenever a binding declared cap EXCEEDS the provider-reported one, per invocation and dimension, with anthropic's split input and output windows summed against a combined declared tokensPerMinute. Purely observational, synthetic limiter denials never count, and without declaredRules journals and events stay byte identical. On the invoice, an `unconfirmed` row that recorded zero usage on every counter now carries `usageUnknown: true` (export-level `usageUnknownRows` count, CLI `usage-unknown` marker): the zeros mean "nothing recorded", never "the provider metered nothing"; derived at export time, no journal shape change.
