---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Durable provider reconciliation (the experiment-review P1.3): every live provider dispatch now mints a `ProviderCallRecord` on the terminal entry's `providerCalls` ledger, the CostReport splits gross from net, and `invoiceFromJournal` plus `rulvar invoice` export the rows.

- **The per-dispatch ledger.** Every wire call the engine actually makes, successful or not, records `{ ordinal, role, servedBy, attempt, outcome, responseId?, usage, usageApprox?, errorCode?, aborted? }`, minted at the single dispatch chokepoint from the same sanitized usage the phase slices accumulate. Failed and retried attempts keep their billed usage attributable instead of dissolving into the aggregate; quota denials and abort short circuits that never reached the adapter mint nothing. The provider `responseId` both shipped adapters already surface on every finish is now persisted. The ledger rides every checkpoint boundary (kill-and-resume keeps pre-kill calls attributable, ordinals continuing) and restores verbatim on replay with zero live calls.
- **Gross versus net.** `CostReport.totalUsd` stays the net ledger it always was (abandoned subtrees contribute zero). New required fields make the provider's view first class: `grossUsd` (net plus abandoned, the figure an invoice reconciles against; abandoning a branch never shrinks it) and `abandoned: { usd, unpriced, usageApprox? }`. `rulvar inspect` prints the gross line whenever a run abandoned paid work.
- **The invoice export.** `invoiceFromJournal(entries, priceUsd)` returns one row per billable call with a reconciliation verdict per row: `matched` (response id present), `missing-provider-id` (a finished call without one), `unconfirmed` (a failed or severed call without one), `unattributed` (pre-ledger entries and restored remainders; the spend surfaces instead of vanishing). Totals are the same slice fold the CostReport runs, so `totalUsd === CostReport.grossUsd` exactly. `rulvar invoice <runId> [--json]` is the CLI form.

The frozen cassette catalog is re-recorded for the additive `providerCalls` field on terminal agent entries (journal-shape-revision, policy not identity: no hashVersion change, no matching impact).
