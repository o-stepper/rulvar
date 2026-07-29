---
'@rulvar/core': minor
---

Price the live and replayed event telemetry per provider request, exactly like the settled fold, and label every money-bearing event with its basis (RV702).

The eleventh comparison experiment measured the defect live: `agent:phase:end` priced the phase-aggregate usage delta in one call, so a nonlinear long-context tier fired on aggregates no single request crossed; `agent:end` and `reduceInvocationTable` inherited the inflated dollars (raw sum +60.2%, loop bucket +82.9%) while the settled CostReport and invoice priced per request (RV504). Now every recorded provider call is priced individually at its own chokepoint, phase events carry the delta of that per-call accumulator, `agent:end` carries its sum, the replay path folds the terminal entry through the same `priceEntryBilling` the invoice uses, and the reducer's rows and `byRole` buckets match the settled fold whenever records cover the usage.

New `costBasis: 'per-call' | 'aggregate-estimate'` on `agent:phase:end`, `agent:end`, `AgentResult`, and the reducer's rows and buckets: `'aggregate-estimate'` appears only where per-request records cannot cover the number (a checkpoint written before the reconciliation ledger shipped restores usage without call records; the invocation total then keeps the aggregate-priced figure, labeled, instead of silently dropping restored spend), and the reducer defaults an absent field to `'aggregate-estimate'`, never to a per-call claim the stream cannot back.
