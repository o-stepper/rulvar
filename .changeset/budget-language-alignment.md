---
'@rulvar/core': patch
---

Align every budget claim with the enforced contract.

One precise formulation now appears everywhere the budget is described (README, docs landing, quickstart, budgets guide, design principles, invariants table, and the `RunOptions.budgetUsd` API comment): an immutable run budget with pre-dispatch reservation (projected admission, exact fill allowed), a budget-derived `maxOutputTokens` clamp on every turn, live stream cuts on crossing, and a documented provider-dependent residual overshoot of at most one clamped in-flight turn per concurrent agent. No surface claims a literal hard dollar cap without stating the bound in the same breath.
