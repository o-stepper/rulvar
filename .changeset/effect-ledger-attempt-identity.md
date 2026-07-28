---
'@rulvar/executor': minor
---

Attempt-exact effect-ledger identity, torn-tail repair, and workdir cleanup on a failed audit write (RV501/RV502/RV503, the two ninth-experiment P0s plus their P1 neighbor).

RV501: every reference-executor dispatch now mints a unique `attemptId`, written into the intent row and copied verbatim onto the same attempt's outcome row, and `loadEffectLedger` pairs the two phases exactly: an outcome of ANY class resolves only its own attempt (rows written before the id shipped pair by the legacy `(idempotencyKey, startedAt)` join). This deliberately changes `orphanedIntents` in the conservative direction: a sibling retry's outcome no longer clears an older attempt whose effect may already have applied, so files that previously scanned clean can now (correctly) report orphans. Closing the logical idempotency key belongs to the host reconciler, against the effect provider's receipt. A SIGKILL test drives the real crash window against the built package.

RV502: before its first append, `jsonlEffectLedger` repairs a torn tail left by a crashed predecessor: a complete record missing only its newline is terminated in place; an unparseable fragment is truncated and quarantined verbatim as a `{"phase":"torn"}` line (surfaced as `tornArtifacts`), so an append can never glue onto torn bytes and hide the next valid record. `loadEffectLedger` now tolerates and NAMES a live unterminated trailing fragment (`tornTail`) but fails closed on an unparseable interior line with a typed `LedgerCorruptionError` (line numbers, byte offsets, sha256 hashes); pass `{ tolerateCorrupt: true }` to receive those lines as `corrupt` data for triage. Previously both records vanished silently after an append over a torn tail, and interior corruption was skipped without a signal.

RV503: the outcome record write and the workdir removal are now nested, so the ephemeral workdir never survives the dispatch even when the audit write fails, and a rejected `ledger.record` surfaces as a typed `ExecutorError` with code `ledger` (naming the dispatch failure too when both broke) instead of an untyped rejection that leaked the directory.
