---
'@lurker/core': minor
---

M11-T03: TTL and staleness (docs/05, section "Grounding and decay"). The decay module (`src/knowledge/decay.ts`) becomes the decay owner: the asymmetric TTL table (eval 90/30, editorial 120/45; inbox 14 days exported as a constant, reserved for M12) and `claimExpiry`/`claimExpired` move there with their names re-exported through the claims module unchanged.

- The re-measurement queue lands as documented: `remeasureQueue(claims, at)` is JUST a status filter over expired, still-active eval-measured claims (nothing archives them: the next sweep re-measures the subjects); `ttlState` feeds maintenance views.
- Archive-never-delete maintenance: `archiveDeprecatedModelOps(claims, models)` produces archive ops (reason `deprecated`) for every live claim of a deprecated model; historical runs keep their audit trail.
- Expiry stays enforced at every pin AND repin through the M10-T03 read-path filter; the acceptance test drives the same filter across the boundary clock: an expired claim stops influencing the card at the next pin or repin.
