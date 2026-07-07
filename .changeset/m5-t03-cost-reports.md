---
'@lurker/core': minor
'@lurker/cli': minor
---

M5-T03 cost reports. The CostReport builder moves to its own module
(`engine/cost-report.ts`) and report totals become the LEDGER FOLD
totals at settle: RunOutcome.usage and cost.totalUsd are computed from
the journal's terminal entries (the same summation the kernel budget
seed uses), so report totals equal ledger fold totals exactly, live and
across resume, by construction. The new `costReportFromJournal(entries,
priceUsd)` is the pure fold for STORED runs: byModel and totals from
terminal servedBy with abandoned subtrees contributing zero; phase,
agentType, and role attribution are live-run facts that entries do not
carry (byRole and the orchestrator block complete in M7 per DEF-7).
Unpriced models keep surfacing, never as silent zeros. `lurker inspect`
gains the cost view (total, byModel, unpriced) over the config-assembled
price function (table wins over caps.pricing), and live run output
prints the byModel/byPhase buckets.
