---
'@lurker/plan': minor
'@lurker/cli': minor
---

M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

- `@lurker/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
- `@lurker/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
- Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).
