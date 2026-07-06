---
'@lurker/core': minor
'@lurker/lurker': minor
---

M1-T10/T11: the WorkflowEvent envelope and M1 catalog (per-run telemetry
seq distinct from JournalEntry.seq, span hierarchy run > phase > agent),
the per-run EventBus feeding RunHandle.events and on(), RunOutcome with
exhausted-overrides-error precedence and the normative CostReport
(byModel/byPhase/byAgentType/byRole, the all-zero orchestrator block,
unpriced evidence); createEngine with per-engine registries and
engine.run over the ScriptRunner seam; InProcessRunner with the dev-mode
bare-Date.now/Math.random warnings; run cancellation (host signal,
handle.cancel, run deadline) and RunMeta run-to-definition binding
fields. The umbrella ships the minimal terminal progress renderer
(renderProgress) and re-exports the core surface.
