---
'@lurker/core': minor
---

M2-T01/T02 groundwork: JsonlFileStore (one JSON entry per line, the
journal doubles as an event log; torn-trailing-line tolerance and repair
for A1 atomicity; atomic temp-plus-rename meta replace; listRuns without
payload parsing; mid-file corruption is a hard JournalOrderViolation) and
the committed large-value soft warn threshold (262144 bytes, docs/06
Appendix A M2 entry gate) wired into the journal append path as a
warning event, never an error.
