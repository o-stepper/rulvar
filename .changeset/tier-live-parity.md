---
'@rulvar/core': minor
'@rulvar/evals': minor
---

The live budget debits each provider call marginally against the call's own accumulated price (RV1101): a long-context tier crossed by the call's sum that no single mid-stream slice reached now re-prices the whole call live at the crossing slice, exactly the dollars the settled fold records, and a ceiling between the per-slice and tiered readings severs the run instead of settling ok over its own hard cap. `RunBudget.openCallMeter` and the optional `BudgetHooks.openCallMeter` carry the seam (one meter per provider call, the settled fold's billing basis; the mid-stream deltas and the settle remainder of one call share one accumulation; a marginal debit never credits; the tier still never fires on a run aggregate no single call crossed). The fault kit gains the `tier-crossing-live-parity` scenario (RV1102), pinning both money paths and the marginal live ladder on the real engine.
