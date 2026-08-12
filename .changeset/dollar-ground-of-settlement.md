---
'@rulvar/core': minor
---

The statement reconciliation names its dollar ground (RV3305, RV3306). `settleable` deliberately never required a dollar claim, so a usage-only request export that matched on response ids and token counts read `settleable: true` while carrying not one dollar of provider evidence, the 2026-08-12 audit's counterexample. `StatementReconciliation` now carries `dollarCoverage` ('complete' when every matched export row or component line claims money, a row total or a component split; 'partial'; 'none') and `monetarySettleable`, which is `settleable` AND complete dollar coverage, the predicate to gate monetary closure on; `settleable` itself is byte identical and its docs now say out loud what it does not require. The docs honesty pair rides along: agents.md no longer states an unqualified never-pay-twice (dispatch is at-least-once and one partial turn is the documented worst case, matching durability.md), and providers.md documents the new fields.
