---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Per-request cost accounting and per-segment pricing pins (RV504/RV505/RV511, the ninth-experiment accounting P1s).

RV504: when a terminal entry's per-dispatch `providerCalls` exactly cover its usage, `costReportFromJournal` and `invoiceFromJournal` now price each provider call individually, so a nonlinear long-context tier fires per REQUEST, which is the pricing contract's stated semantics. An aggregate that crossed a threshold no single request crossed no longer re-prices the whole entry: the ninth comparison experiment's settled report ran 52.4% above the live budget's per-dispatch debits for exactly this reason, and the two figures now converge. Entries without records, or with records that do not cover their usage, fold exactly as before (the per-model aggregate), and the invoice says so: `rowUsdNonAdditive` is now a computed boolean (false exactly when every contributing entry is fully attributed, so the per-call rows sum to the total; `allocatedUsd` remains the column that sums exactly in every case). The shared fold is public: `priceEntryBilling` with `EntryBillingUnit`/`EntryBillingFold` beside `priceEntryUsage`.

RV505: `journalPricingSnapshot` now composes the run-settle pricing pins by their settle seq, with no journal shape change: a seq-aware fold prices each row under the pin of ITS OWN segment (the rates its live debits actually used), so a suspend/resume across a price-table rotation no longer re-prices settled history under the new table. Seq-less callers keep the historical last-pin behavior. `priceUsd` callbacks across the accounting folds accept an optional third `seq` argument (existing two-argument implementations are unaffected), the snapshot exposes `pinnedThroughSeq`, and the engine's settled-outcome cost mirror composes pinned history with the live table for the segment being settled.

RV511: the CLI invoice text output now states the pricing basis honestly per export: additive per-request rows, or the aggregate basis with the reason (a remainder or legacy entry in the fold).
