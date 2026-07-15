---
'@rulvar/core': minor
'@rulvar/plan': minor
---

PlanRunner plan admission is now atomic with child dispatch admission (the v1.7.0 follow-up review's P1). Previously a `plan_revise` op could be journaled as `admit` (consuming its spawn unit) and only then have `scheduleReady`'s dispatch rejected by the engine budget, stranding the node ready forever, losing the `plan:revised` event, and burning the orchestrator budget with no worker output.

- An `add_task` op whose resolved profile `estCost` cannot fit the effective child ceiling (rung-resolved `maxCostUsd`, else `budgetUsd`) is bounced at rebase time with the new typed reason `reserve_exceeds_budget` naming the child account, requested and resolved reserve, ceiling, and minimum correction. No plan state changes and no spawn unit is consumed; the `plan_revise` tool result carries the reason verbatim.
- The read-only admission branch now projects the SAME reserve the dispatch layer will commit (estimate clamped by the explicit child budget only), plus the pending reserves of earlier ops in the same revision, so every embedded admit of one batch is dispatchable under the snapshot it was decided on. The dynamic `spawn_agent` path passes the profile estimate into admission for the same reason.
- Layer 1 (ctx.agent) clamps its committed reserve to the tightest `child-allowance` account headroom on the chain (a plan node's own sub-account, a `ctx.workflow` child ceiling): an allowance already bounds the child's lifetime spend, so an estimate above it clamps instead of denying, which is what makes "admit implies dispatchable" hold by construction. The run root and orchestrator cap are never clamped against; their headroom is shared money that projected admission keeps protecting.
- `plan:revised` and `termination:debit` now emit strictly after the durable revision append and before the scheduling effects, so a scheduling fault cannot erase an applied revision from the event stream.
- The residual class (facts that genuinely changed between admit and dispatch, e.g. the engine lifetime spawn cap) lands the node terminally `failed` through a journaled `plan.decision` with the new origin/cause `dispatch-rejected`; other ready nodes still dispatch and the run proceeds.

Acceptance tests cover the review's live shape (profile `estCost` 0.015 against `budgetUsd` 0.01), the positive control, resume idempotence, the containment path, and an admit-implies-dispatchable property grid over estimates, budgets, ceilings, flat reserves, and prior commitments.
