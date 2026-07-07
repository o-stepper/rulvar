---
'eslint-plugin-lurker': minor
---

M6-T03: the determinism rule set with structural JSON diagnostics (docs/06 8.4). Rules: no-bare-date (Date.now and new Date), no-bare-random (Math.random), no-fetch (bare and globalThis.fetch), no-process-env, no-promise-all-over-ctx (Promise.all/allSettled/race/any spawning ctx or bare sandbox calls; ctx.parallel instead), and the duplicate-identical-call advisory (byte-identical ctx.agent/ctx.workflow calls in one function forward-match to one journal entry; opts.key distinguishes deliberate repeats). Locally shadowed globals are never flagged. The flat preset `configs.workflows` wires every rule at its intended severity, and `toJsonDiagnostics` projects lint messages into the machine-readable shape the mode (b) self-repair loop consumes.
