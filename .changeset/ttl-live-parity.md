---
'@rulvar/core': minor
'@rulvar/evals': minor
---

Live-budget parity for the cache-write TTL split, and the fault kit gates it on the real live path (RV1001 + RV1002, PR I of the fourteenth plan)

The fourteenth comparison experiment reproduced a hard-ceiling breach: a run with `budgetUsd: 4` settled `ok` at $4.50, because the mid-stream usage inlet, the reported/remainder fold, and every usage aggregate dropped `cacheWrite5mTokens`/`cacheWrite1hTokens`, so the live ledger priced a differentiated cache write at the plain 5m rate ($3.75) while settlement priced the split ($4.50). The two money paths now read one provider usage identically:

- The mid-stream cleaner and the finish remainder carry the TTL split to the live debit, so the layer-3 ceiling holds against the same dollars settlement records; a ceiling between the unsplit and split readings severs the run instead of letting it settle `ok` over the ceiling.
- `@rulvar/core` exports `sumUsage`, the canonical usage adder: aggregates (the run outcome, the settled ledger fold, the budget telemetry, `reduceInvocationTable` buckets) keep the split they were billed under, and an undifferentiated side's writes count as the 5m share so mixed aggregates stay canonical under the split-sum invariant.
- Mid-stream TTL counts the finish total does not confirm are a usage-invariant violation, loud like every other telemetry anomaly; per-field catch-up over a shifted attribution only ever overcharges, never credits.
- `runFaultInjection` (`@rulvar/evals`) grows a sixteenth scenario, `ttl-live-budget-parity`: a mid-stream differentiated write against the real engine must debit live and settle to the same $4.50, keep the split on the aggregate, and refuse to settle `ok` under a $4 ceiling. Reverting the fix reports `matched: false` in the kit, not only in the unit suite that shipped it.
