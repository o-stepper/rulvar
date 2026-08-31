---
'@rulvar/core': minor
'@rulvar/store-postgres': minor
---

The durable admission bracket hardens on every seam the ninth experiment named
(RV4804). The queued wait honors a verdict's `retryAfterMs` verbatim for its
next sleep (`pollMs` stays the fallback cadence) and ends with the RUN: the
run's cancel signal rides into the wait, so host abort and the deadline stop
the polling, cancel the ticket best effort, and hand the run to its own
cancellation machinery, where before a cancelled run camped in the queue
forever. Renew failures are announced, never fatal: the first failure warns, a
verify recover that no longer answers `granted` emits the new
`admission:lease-lost` event once (the scheduler expired the grant and may
re-admit the capacity while the holder is alive), and the run continues,
because the wire quota still gates every dispatch and the settle release is
idempotent. The postgres scheduler takes its schema-scoped advisory lock under
a `lock_timeout` bound (`lockTimeoutMs`, default 10 seconds, validated typed):
a holder that hangs mid-transaction used to block every lifecycle call of the
whole fleet forever; past the bound the call refuses with the typed retryable
`LeaseHeldError` instead of camping.
