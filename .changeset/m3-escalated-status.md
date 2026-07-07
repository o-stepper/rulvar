---
'@lurker/core': minor
---

M3-T07 terminal escalated status and EscalationProtocol producers (the
BREAKING section for v0.4.0 rides the milestone release notes). Typed
EscalationKind/EscalationReport/EscalationDecision/EscalationOptions;
the escalate tool registers under escalation opt-in of either flavor
through the same path as any tool (opting in changes toolsetHash by
design) and is engine-intercepted after the permission chain. Status
production is gated: without opt-in the escalate tool does not exist and
'escalated' is physically unproducible. Flavor A terminates the worker
with a runtime-completed report (costToDate and salvage are never
model-authored; the request schema rejects them; the full report is
validated BEFORE append; usage/costUsd/turns/transcriptRef as for ok,
output null). Flavor B suspends on the approval machinery with a
journaled deadlineAt (explicit deadlineMs required); a live decision and
the deadline timer race through the ResolutionArbiter first-closing-wins
(timeout applies defaultDecision, default accept); dispose collects the
worktree patch into salvage BEFORE destruction; the terminal escalated
entry and the authoritative escalation-decision entry follow strictly
after, with countsAgainstLimit derived once (true iff scope_bigger).
Replays synthesize the byte-identical report with zero adapter calls and
read the owner's decision from the decision entry (a crash between
report and decision pays the decision live exactly once). In ctx.parallel
an escalated child is a settled outcome that never aborts siblings; a
plain value-form call opting in requires the onEscalation hook
(ConfigError before any LLM call otherwise). The in-run minSpend gate
(M3-T09) rejects early scope_bigger escalations with a bounded "keep
working" re-prompt; scope_different and blocked_with_evidence are
exempt and never debit the counter.
