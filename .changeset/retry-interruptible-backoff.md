---
'@rulvar/core': minor
'@rulvar/openai': minor
'@rulvar/anthropic': minor
---

Make the retry and failover backoff interruptible and validate every provider supplied retry delay (v1.28.0 review P1 and P2).

The retry engine now races its backoff wait against the host cancel signal (which the run deadline also drives) and the budget ceiling signal: an abort wakes the wait immediately, settles through the canonical aborted outcome (`cancelled` or `exhausted`, with every already recorded usage kept), and forbids every further dispatch, including the one behind a keyed limiter queue, so an adapter that ignores its signal can no longer be re entered after an abort. Previously a provider supplied `retryAfterMs` armed an uninterruptible sleep: a cancel, a crossed deadline, and a crossed budget ceiling all waited out the full backoff and the adapter was dispatched again. The injected `retry.sleep(ms)` test hook keeps its signature; a hook that loses the race is abandoned without an unhandled rejection, and the native timer path clears its timer so an abandoned long backoff never pins the event loop.

`retryDelayMs` is now the defensive boundary the docs promise: only a finite nonnegative provider `retryAfterMs` replaces the computed delay, anything else (NaN, Infinity, a negative) is ignored as adapter noise, and every returned delay is a finite nonnegative integer clamped to the Node timer maximum, so a malformed or huge value can never arm an instant or overflowing timer. Both first party adapters stop emitting unvalidated `Retry-After` parses: an unparsable header (the HTTP date form included) omits `retryAfterMs` entirely instead of producing NaN (which also broke the `WireError.data` Json invariant by serializing to null), and a huge but finite value is clamped. The `mapAnthropicStream` TSDoc now states precisely how a truncated stream is reported (the `finished` flag on the return value, with the adapter synthesizing the terminal error).

Four frozen fixture cassettes are refrozen for this release (the hashVersion-bump refreeze ceremony applies; hashVersion itself is unchanged and existing journals replay identically): in three cap freeze scenarios the main orchestrator entry now honestly settles cancelled at the cap instead of paying one more ordinary turn whose result the forced finish machinery discarded anyway, and one scenario loses a post abort wait suspension that can no longer be dispatched. Entry identities, keys, and every other row are byte identical.
