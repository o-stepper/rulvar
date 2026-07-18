---
'@rulvar/core': minor
'@rulvar/plan': minor
---

`orchestrate(engine, goal, opts?, runOptions?)` and `orchestratePlanned(engine, goal, opts?, runOptions?)` accept the created run's `RunOptions` as an optional fourth argument, threaded verbatim to `engine.run`. `runOptions.budgetUsd` is the ROOT hard ceiling over the whole tree (the orchestrator and every child), immutable after start and frozen into `RunMeta`, while `opts.budget` only shapes the orchestrator's own sub-account inside that ceiling; the two layers were previously conflatable, and the canonical shortcuts could not set a root ceiling (or signal, runId, limits, deadline) at all without dropping to `engine.run(makeOrchestratorWorkflow(goal, opts), undefined, runOptions)`. Purely additive; existing calls are unchanged, and a call without `runOptions` still starts an UNCAPPED run, which the docs now state explicitly.
