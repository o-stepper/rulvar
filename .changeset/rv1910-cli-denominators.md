---
'@rulvar/cli': minor
---

`rulvar cost-audit <runId>` verifies the one-denominator contract on a concrete stored run (RV1910). The four-role benchmark's recovery run produced four mutually inconsistent cost views, and the judge reconciled them by hand; the lifecycle now admits one, and the audit checks it instead of trusting the doctrine: the roster is closed (every agent entry has a terminal), `run_settle` is recorded and is the billing boundary (no agent entry follows it), and the settled fold, the invoice totals and the wire cardinality agree. Text and `--json` forms, exit 1 with the failing checks named when any diverge, which is exactly what a pre-RV1904 journal, the benchmark's own, reports.
