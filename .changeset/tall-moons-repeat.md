---
'@rulvar/core': minor
'@rulvar/cli': minor
---

The child roster of a run that died before acceptance is readable
OFFLINE (RV2702).

`childrenAtFailure` (RV2602) answers "what had the children produced"
for a consumer watching the run, and it dies with the process that held
it. The settle persists the completion lift and nothing else, so a
post-mortem over a journal, which is all a paid run leaves behind, had
no way to ask the question at all: not for a run that crossed its
ceiling mid-roster, and not for any run in an archive written before
the field existed.

`childRostersFromJournal(entries)` is the fold, and it reads what
resume reads. A `spawn-admission` decision names every child the
controller judged, with its ordinal, its profile, its verdict and the
scope its dispatch pins to; the dispatch and terminal `agent` entries
under that scope are the child itself, and the RV806 evidence verdict
rides the terminal. Nothing new is written, nothing is re-derived and
no validator runs again, so a journal from any prior version reads
exactly as well as today's.

`rulvar inspect` prints it: how many children were admitted, how many
settled and with what statuses, how many were refused admission, and
the ones that settled ok below a declared evidence floor, named by the
dispatch seq the orchestrator's own turns used as their handle.

Two things it does not claim. It is not the live roster: this reading
happens after the RV1903 exit barrier settled the stragglers, so a
child the live field called unsettled usually has a terminal here, and
an absent status means the journal truly ends mid-flight rather than a
child that failed. And it counts CHILDREN: the coordination loop, the
synthesis and the judge dispatch through the same `ctx.agent`, and only
a child carries the spawn admission that pins it to the child scope.
