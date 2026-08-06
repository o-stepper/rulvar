---
'@rulvar/core': minor
'@rulvar/anthropic': minor
'@rulvar/openai': minor
'@rulvar/testing': minor
---

First-class prompt-cache policy (RV2006). `ChatRequest.cacheHint` existed and the Anthropic adapter compiled it into `cache_control`, but nothing in the core ever populated it: the third parity rerun's workers re-paid the full input rate on every turn of their ~550k-token contexts (`cacheReadTokens 0` across the run), and the $6 envelope sized on OpenAI's implicit server cache was incomparable on Anthropic. The agent loop now compiles the hint on every tool-cycle turn: breakpoints after tools, after system, and after the deepest message, sliding with the history. Default ON exactly where the adapter declares the new `ModelCaps.promptCaching: 'explicit'` (the Anthropic adapter does); OpenAI declares `'implicit'` and undeclared adapters get byte-identical requests. Configure with `defaults.cache`, `AgentProfile.cache`, or per-call `opts.cache` (`CachePolicy { mode?: 'auto' | 'off'; ttl?: '5m' | '1h' }`), call over profile over engine. Billing note: on cache-capable Anthropic models this changes the wire requests of every loop turn to carry cache breakpoints, typically cutting long-cycle input cost several-fold (cached reads bill at a tenth of the input rate); `CostReport` cache accounting is unchanged, the hint never enters identity or journals, and `@rulvar/testing`'s `requestHash` strips it so existing cassettes replay byte for byte.
