---
'@rulvar/core': minor
---

Cache-aware preflight (RV2007). Every spawn report now prices its loop input floors both ways: `uncachedLoopInputFloorUsd` (the declared `estInputTokens` re-billed at the full input rate on every projected provider turn, exactly what the third parity rerun paid at ~$1.10 per worker cycle) and `cachedLoopInputFloorUsd` (one cache write plus a read per later turn at the price row's cache rates, the RV2006 policy's economics, ~$0.19 for the same shape). The new `uncached-long-loop` warning fires when a shape projecting four or more provider turns is about to run with the cache policy OFF on an adapter that declares explicit prompt caching, naming both figures; under the default policy the loop caches and nothing fires. The budgets guide's sizing section carries the worked parity numbers.
