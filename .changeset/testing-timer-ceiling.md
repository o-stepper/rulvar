---
'@rulvar/testing': minor
---

Cap `runLiveSmoke` backoffs at Node's timer maximum (v1.15 review P2-1). Both `baseDelayMs` and the largest scheduled backoff, `baseDelayMs * (attempts - 1)`, are now validated against the new exported `MAX_LIVE_SMOKE_DELAY_MS` (2^31 - 1 ms) before any stream opens; past that bound Node would not sleep longer, it would clamp the timer to 1 ms with a `TimeoutOverflowWarning` and retry almost immediately. Every option rejection now carries `field`, `value`, and `max` in the `ConfigError` `data`. Previously `baseDelayMs: 2_147_483_648` was accepted and silently turned the backoff into an immediate retry.
