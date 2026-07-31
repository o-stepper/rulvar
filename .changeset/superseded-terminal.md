---
'@rulvar/core': minor
'@rulvar/cli': minor
'@rulvar/evals': minor
---

A superseded segment refuses green everywhere: typed SupersededError, the distinct settledReason on run:end, and exactly one authoritative successor (RV1009, PR V of the fourteenth plan)

The fencing design swallowed a superseded segment's `LeaseHeldError` on both settlement writes, so a stale segment whose settle bounced off the successor's fence resolved `ok` with an unmarked `run:end`: a green terminal that no durable store wrote, exactly the split view the RV907 doctrine forbids.

- The stale segment now rejects `handle.result` with the typed `SupersededError` (code `superseded`, not retryable, `data { runId, runStatus }`, cause the fencing rejection): the successor owns settlement, and the authoritative outcome is its settle or the store's run meta, never the stale computation. The meta write is skipped instead of re-proving the fence.
- `run:end` refuses green with `settled: false` and the distinct `settledReason: 'superseded'` (an l0-compatible extension), so an event-only consumer can tell a superseded segment from a settlement write failure; the settlement-failure path and every ordinary terminal keep their exact bytes.
- A meta-only lease bounce over an already durable settle stays swallowed: the journal records the outcome, and only the projection belongs to the current holder (the takeover no-op contract is unchanged).
- The CLI progress line renders `settled=false (superseded; the successor owns settlement)` instead of the resume hint, and the OTel exporter stamps `rulvar.run.settled_reason` beside the refused span status.
- `runFaultInjection` (`@rulvar/evals`) grows the nineteenth scenario, `superseded-terminal-honesty`: the fenced-out segment must reject typed with the distinct reason and zero settle entries, and the successor must settle `ok` by replay with exactly one settle entry and no second paid call.
