---
'@rulvar/core': minor
'@rulvar/store-conformance': minor
---

Refuse unpriced, malformed, and stale-priced dispatches before the wire under the opt-in strict pricing gate (RV1508). The fourth PR of the eighteenth plan.

Dollars come from the price table, and a model absent from it debits NOTHING, so every USD ceiling silently fails to bound it; the docs called that hole honest, and the seventeenth comparison benchmark asked for a mode that closes it. `RunOptions.strictPricing` arms the gate: every paid dispatch must resolve a well-formed price row for its serving model BEFORE the wire call, at the same dispatch chokepoint the exposure admission holds, or the dispatch refuses with a typed `ConfigError` naming the model and the defect (no row, a non-finite or negative rate, a malformed long-context tier). `maxRatesAgeDays` additionally demands a fresh `ratesVerifiedAt` on the row, binding only when declared; `allowUnpriced` lists the exact model refs the host KNOWS are free, the one explicit exception. Each model vets once per run, since the price table is fixed for the run's life.

The posture follows the exposure cap's durability rule (RV1504): canonicalized and recorded in `RunMeta` at genesis, restored by every resume with no `ResumeOptions` override, absence stays absent, and the store conformance kit holds stores to the round-trip, because a FinOps gate a resumed segment silently drops is not a gate.
