---
'@rulvar/core': minor
---

Resume telemetry says what it counts (RV2510). A resumed run's terminal mixes two kinds of figure with nothing marking which is which: money and usage are cumulative over the whole logical run (they fold from the journal), the spawn count resumes from the journaled ledger, and `cost.orchestrator.wakes`, the schema-exchange counters and the transport retries count ONLY the segment that produced the terminal. The twenty-fifth comparison run was killed and resumed, and turning its two terminals into one honest account of the logical run was hand work over a joined journal.

`TERMINAL_TELEMETRY_SCOPE` declares it as one exported table: every terminal field mapped to `'segment'`, `'cumulative'`, or `'terminal'` (not a count at all, but a claim about the run as it stands at this settle, which a later segment can only replace). A doctrine test holds the table against the keys a REAL outcome carries, so a new terminal field cannot ship without declaring what it counts.

`logicalRunTelemetry(entries)` is the aggregate for the whole run: how many segments ran, how each settled, how many entries each one appended, and `entriesAfterLastSettle`, nonzero exactly when the journal continued past its terminal (RV1407) so the last status is not the run's last word. It adds no journal field and folds only what the settle already records, so it reads journals written by every prior version exactly as well as today's, and no existing journal changes by a byte.

The replay dedup is the design. The aggregate deliberately carries no money and no usage: those already fold from the WHOLE journal, and re-summing them per segment would count every replayed operation once per segment that replayed it. What it reports instead is a PARTITION of the journal at the settle boundaries, so nothing is counted twice by construction, and the per-segment figures a terminal carries can finally be read against the segment that produced them.
