---
'@rulvar/openai': minor
'@rulvar/evals': minor
---

An internally contradictory statement refuses typed at intake, totals decide beside components, and the reconciliation states the settlement-grade predicate first class (RV1005 + RV1006, PR III of the fourteenth plan)

The fourteenth comparison experiment fed `reconcileStatement` an export row carrying `usd: 100` beside a component split summing to 1 and read verdict `match`: each claim sat inside its own tolerance and nothing compared them to each other, because the presence of components suppressed the totals comparison entirely. The same review showed that a `match` verdict is a weaker claim than settlement needs: an export can cover every KNOWN row to the cent while a usage-unknown attempt still holds unattributed money.

- Intake internal consistency (RV1005): a request row carrying both `usd` and a `componentsUsd` split must have them agree within `totalToleranceUsd`, else it refuses with a typed `ConfigError` naming the row; an export whose own total contradicts its own components is not evidence.
- Totals decide beside components (RV1005): a split's presence no longer suppresses the totals comparison. It decides exactly when both sides' dollar claims cover the same set (every matched export row carries `usd` in requests mode; nothing statement-only and every component line claimed in categories mode; no covered model unpriced), so a total drifting beyond `totalToleranceUsd` reads `divergence` even while every component line sits inside its own tolerance, and a scope mismatch stays the coverage machinery's business instead of manufactured divergence.
- `StatementReconciliation.settleable` (RV1006): the settlement-grade composite first class, true exactly when the verdict is `match` AND coverage is complete AND no row settled `usageUnknown` AND no model went unpriced. A safe consumer no longer assembles that predicate by hand.
- `runFaultInjection` (`@rulvar/evals`) grows the eighteenth scenario, `statement-settleable-guard`: a REAL run whose first attempt dies before any usage report seeds a genuine usage-unknown ledger row, the clean export over it reads `match` with complete coverage yet `settleable: false`, the clean twin reads `settleable: true`, and the contradictory row refuses typed at intake. Reverting any of the fixes reports `matched: false` in the kit.
