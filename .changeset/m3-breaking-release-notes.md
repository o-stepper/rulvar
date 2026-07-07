---
'@lurker/core': minor
'@lurker/testing': minor
---

M3-T11 gating cassettes and the v0.4.0 BREAKING release notes.

BREAKING (pre-1.0 convention, docs/12): `AgentStatus` now produces
`'escalated'` at runtime and `AgentResult` carries the optional
`escalation: EscalationReport` field (present if and only if the status
is escalated). This is the third kernel amendment of the replay
predicate (escalated-replays-as-ok, DEF-1) whose table row shipped
frozen in M2; the producers ship here. Migration: add an `escalated`
branch to every switch over `AgentStatus`; consumers not adopting the
protocol are advised to map `escalated` to `limit` (paid partial work,
output null, the report stays available for logs). `isEscalated` and
`EscalatedResult` are exported for narrowing. Status production stays
gated by opt-in: workflows that never pass `escalation` options cannot
observe the new status at runtime.

Cassettes: the DEF-1 live set (escalate-replay,
crash-between-report-and-decision, flavor-b-timeout) is recorded through
the live runtime and replayed strict; the M2 synthetic DEF-1 subset is
re-recorded (memoize-classifier fully live; abandon-subtree through the
kernel write APIs with a realistic escalated child report and an
authorizing owner cancel decision; both re-record again with the
orchestrator producers in M7). FakeAdapter gains fakeToolCalls and
fakeWireError responder markers; replayRun gains the onEscalation
pass-through so replay tests can prove the hook stays cold. The
deliberate fixture regeneration updates fixtures.sha256 in the same
change (the identity profile is UNCHANGED; this is the docs/10 M3-T11
ordered re-record, not an identity-pipeline revision).
