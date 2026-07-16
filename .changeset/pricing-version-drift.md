---
'@rulvar/core': minor
---

Report pricingVersion drift on resume.

The `orchestrator_budget_reserve` decision already pins the `pricingVersion` in effect when a run started, but the resume recovery only compared the frozen cap dollars. A resumed run now also compares the journaled version against the live table (`unpriced` when priced from the adapter caps fallback) and emits `termination:config-drift` with field `pricingVersion` when they differ. The divergence is reported, never honored or refused: price interpretation is live by design (the journal stores usage; dollars are re-derived from the current table against the frozen cap dollars), replay stays byte-identical, and no provider work is repeated. Reserve decisions journaled before the field shipped resume quietly.
