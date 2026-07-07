---
'@lurker/planner': minor
'@lurker/core': minor
---

M6-T05: the plan agent and the self-repair loop (mode b). `plan(engine, goal, { model?, profiles?, repairRounds? })` asks a planner model under role `plan` to write a script against the API card plus the engine's profile card, lints it (eslint-plugin-lurker preset + compileScript), self-repairs up to repairRounds (default 3) from the machine-readable JSON diagnostics, and returns `{ source, workflow, lint }`. The planner conversation is an ordinary journaled run with a goal-derived deterministic runId, so re-planning the same goal replays the unchanged prefix free; exhausting the rounds throws a typed ScriptRejected carrying the last diagnostics. `runPlanned(engine, goal, args?)` composes plan-then-sandbox-run (async by amendment). Core gains `AgentOpts.role` (`'loop' | 'plan' | 'orchestrate'`, the primary invocation role threading through resolution, effort defaults, floors, cost buckets, and events) and the narrow `Engine.profileCard(names?)` accessor rendering the registered profiles through the public API.
