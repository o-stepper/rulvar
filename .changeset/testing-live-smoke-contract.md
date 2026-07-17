---
'@rulvar/testing': minor
---

Harden `runLiveSmoke` (v1.14 review P2-1 and P3-1). Options are validated before any stream opens: `attempts` must be an integer from 1 to the new exported `MAX_LIVE_SMOKE_ATTEMPTS` (10) and `baseDelayMs` a non-negative integer; anything else, `NaN`, `Infinity`, and fractions included, rejects with a typed `ConfigError` instead of being clamped, defaulted, or (for `Infinity`) allowed to spend without bound. The provider SPI's terminal contract is now enforced per attempt: a stream with multiple terminal events, or whose single terminal is not the final event, classifies as the new `'contract-violation'` outcome (`reason: 'multiple-terminals' | 'terminal-not-final'`) and is never retried; `'no-terminal'` keeps meaning exactly zero terminals. Previously an `error` followed by a `finish` classified as `'ok'`, and explicit `attempts: 0` or fractional values were silently coerced. `DEFAULT_LIVE_SMOKE_ATTEMPTS` is also exported.
