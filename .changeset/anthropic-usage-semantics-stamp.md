---
'@rulvar/anthropic': patch
---

Declare `usageSemantics: 'anthropic-cache-additive-v1'` on the adapter: the additive reading it has always normalized under (the Anthropic wire genuinely excludes cache reads and writes from `input_tokens`, so canonical `inputTokens` is the sum of all three) now rides usage-bearing journal entries as an auditable policy stamp (v1.20.0 review P1/P2-2).
