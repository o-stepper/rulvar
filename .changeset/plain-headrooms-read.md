---
'@rulvar/core': minor
---

The admission cliff becomes a one-field read (RV3208). Preflight already named the whole-wave `requiredMinimumCeilingUsd`, but the DISTANCE to the declared ceiling was left to the operator's subtraction: the 2026-08-11 experiment ran its whole workflow on a $0.20 remainder of a $7.00 ceiling (2.86 percent) that a small pricing or context drift would have refused at admission. The admission block now carries `ceilingHeadroomUsd` and `ceilingHeadroomShare` (present exactly when both sides are recorded, absence means NOT RECORDED), and the opt-in `orchestrator.minCeilingHeadroomShare` threshold turns a thin share into the `ceiling-headroom-thin` warning finding. The default threshold is 0, so existing preflight reports gain the two fields and change nothing else.
