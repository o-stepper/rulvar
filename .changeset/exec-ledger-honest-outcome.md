---
'@rulvar/executor': patch
---

Honest ledger outcomes for dispatches that never ran. A failure between the intent point and the spawn (a credentials mint that throws, a sandbox launcher that throws, cancellation mid-mint) used to ledger `outcome: 'ok'` with a null exit code even though nothing was dispatched. Both reference executors now default the outcome to `error` and set `ok` at exactly one place, the successful protocol return, so every unclassified throw ledgers as the error it is. All previously classified paths (spawn failure, timeout, abort, output cap, non-zero exit, protocol violation, success) keep byte-identical records.
