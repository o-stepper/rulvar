---
'@rulvar/core': minor
---

`ResumeReport.orphaned` now follows entry-type pairing rules and lists only effect roots that genuinely need recovery: dangling dispatches (a `running` entry with no terminal) and suspensions with no resolution, neither consumed by a live call nor covered by abandon. Terminal decisions, `termination.*` and `plan.*` entries, settled roots (whatever their terminal status), and resolved suspensions are complete by construction and never appear, so a fully successful replay reports `orphaned: []`. Previously the list contained every journaled operation not consumed through forward matching, which flagged spawn-admission decisions, plan revisions, settled agent roots, and resolved wake suspensions on perfectly healthy replays (the v1.7.0 follow-up review's finding).

Deleted settled calls are still silently skipped and never re-paid; they are just no longer listed. A deleted call whose dispatch was left dangling still reports, which is the case that actually needs attention.
