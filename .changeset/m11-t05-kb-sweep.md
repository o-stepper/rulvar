---
'@rulvar/cli': minor
---

M11-T05: `rulvar kb sweep` (docs/05, section "Grounding and decay"). Falsification sweeps run manually, from CI, or from a user cron, never engine-scheduled, configured by the `kbSweep` section of rulvar.config.mjs (committerId, the FIXED model pool, taskClass-tagged eval cases, optional thresholds and canary probes; @rulvar/evals loads dynamically like @rulvar/planner does for plan).

- The falsification guarantee: the matrix is the configured pool UNIONED with every model carrying an active, unexpired negative claim, plus the re-measurement queue (expired active eval claims); the pool renders with each member's origin.
- With canary probes configured, every pool member fingerprints BEFORE measurement and drift flips its eval claims to stale in place; the sweep then re-measures and commits threshold-crossing claims through the eval-committer identity, reporting cells, emitted claims, and the committed store version.
