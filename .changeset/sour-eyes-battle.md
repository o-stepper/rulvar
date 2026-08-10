---
'@rulvar/core': minor
---

Every terminal field declares its telemetry scope, enforced by the type
(RV2701).

`TERMINAL_TELEMETRY_SCOPE` promised that a new terminal field cannot
ship without saying whether it counts the segment, the logical run, or
nothing at all, and the gate behind that promise read the keys of one
SUCCESSFUL outcome. A field that exists only where a run FAILED is
absent from every such sample by construction, so RV2602's
`childrenAtFailure` (present exactly when no acceptance verdict exists)
shipped straight through it. A table whose whole subject is killed and
resumed runs cannot be defended by an outcome that neither died nor
resumed.

The table's type is now `TerminalTelemetryScopes`: every key of
`RunOutcome` is required, so an undeclared field is a compile error at
the table itself, and a string index signature still admits the nested
paths a consumer reads off the same outcome (`cost.orchestrator.wakes`).
`childrenAtFailure` is declared `'cumulative'`, for the loss-list
reason: a resumed segment re-admits every recovered child into the same
roster before it dispatches anything new, so the fold covers the logical
run rather than the segment that happened to die. Two doctrine tests
hold the table against real terminals, one ok and one dead before
acceptance, because a key that reaches an outcome without reaching the
type would satisfy the compiler and still leave a reader guessing.
