# @rulvar/executor

## 1.202.0

### Patch Changes

- @rulvar/core@1.202.0

## 1.201.0

### Patch Changes

- Updated dependencies [7e01189]
  - @rulvar/core@1.201.0

## 1.200.0

### Patch Changes

- Updated dependencies [e2ddbdf]
  - @rulvar/core@1.200.0

## 1.199.0

### Patch Changes

- Updated dependencies [29891c6]
  - @rulvar/core@1.199.0

## 1.198.0

### Patch Changes

- Updated dependencies [c097c96]
  - @rulvar/core@1.198.0

## 1.197.0

### Patch Changes

- @rulvar/core@1.197.0

## 1.196.0

### Patch Changes

- Updated dependencies [ec9c3e3]
  - @rulvar/core@1.196.0

## 1.195.0

### Patch Changes

- Updated dependencies [5702a70]
  - @rulvar/core@1.195.0

## 1.194.0

### Patch Changes

- Updated dependencies [360a659]
  - @rulvar/core@1.194.0

## 1.193.0

### Patch Changes

- Updated dependencies [2bca1d1]
  - @rulvar/core@1.193.0

## 1.192.0

### Patch Changes

- Updated dependencies [8757601]
  - @rulvar/core@1.192.0

## 1.191.0

### Patch Changes

- Updated dependencies [745387c]
  - @rulvar/core@1.191.0

## 1.190.0

### Patch Changes

- Updated dependencies [8e02021]
  - @rulvar/core@1.190.0

## 1.189.0

### Patch Changes

- Updated dependencies [6a5cc2d]
  - @rulvar/core@1.189.0

## 1.188.0

### Patch Changes

- @rulvar/core@1.188.0

## 1.187.0

### Patch Changes

- Updated dependencies [c9798ef]
  - @rulvar/core@1.187.0

## 1.186.0

### Patch Changes

- Updated dependencies [242647e]
  - @rulvar/core@1.186.0

## 1.185.0

### Patch Changes

- Updated dependencies [1248623]
  - @rulvar/core@1.185.0

## 1.184.0

### Patch Changes

- Updated dependencies [8a9caca]
  - @rulvar/core@1.184.0

## 1.183.0

### Patch Changes

- Updated dependencies [dd3767c]
  - @rulvar/core@1.183.0

## 1.182.0

### Patch Changes

- Updated dependencies [144d026]
  - @rulvar/core@1.182.0

## 1.181.0

### Patch Changes

- @rulvar/core@1.181.0

## 1.180.0

### Patch Changes

- Updated dependencies [b124d26]
  - @rulvar/core@1.180.0

## 1.179.0

### Patch Changes

- Updated dependencies [1a5a85a]
  - @rulvar/core@1.179.0

## 1.178.0

### Patch Changes

- @rulvar/core@1.178.0

## 1.177.0

### Patch Changes

- Updated dependencies [94db8ff]
  - @rulvar/core@1.177.0

## 1.176.0

### Patch Changes

- Updated dependencies [a74304d]
  - @rulvar/core@1.176.0

## 1.175.0

### Patch Changes

- Updated dependencies [1999c5d]
  - @rulvar/core@1.175.0

## 1.174.0

### Patch Changes

- Updated dependencies [aa9a772]
  - @rulvar/core@1.174.0

## 1.173.0

### Patch Changes

- Updated dependencies [67d27ac]
  - @rulvar/core@1.173.0

## 1.172.0

### Patch Changes

- Updated dependencies [0d4770b]
  - @rulvar/core@1.172.0

## 1.171.0

### Patch Changes

- Updated dependencies [f6116b9]
  - @rulvar/core@1.171.0

## 1.170.0

### Patch Changes

- Updated dependencies [86e4c06]
  - @rulvar/core@1.170.0

## 1.169.0

### Patch Changes

- Updated dependencies [623b2ae]
  - @rulvar/core@1.169.0

## 1.168.0

### Patch Changes

- Updated dependencies [ebba79a]
  - @rulvar/core@1.168.0

## 1.167.0

### Patch Changes

- @rulvar/core@1.167.0

## 1.166.0

### Patch Changes

- Updated dependencies [d8262c3]
  - @rulvar/core@1.166.0

## 1.165.0

### Patch Changes

- Updated dependencies [6391274]
  - @rulvar/core@1.165.0

## 1.164.0

### Patch Changes

- Updated dependencies [9f2dda9]
  - @rulvar/core@1.164.0

## 1.163.0

### Patch Changes

- e8d9ada: Report the import bundle's reference closure, serve verify-only journal reads, and close the documentation gaps the benchmark named (RV1511, RV1512, RV1513). The sixth and final PR of the eighteenth plan.

  The import closure report (RV1511). The intake validated shapes, namespaces, and the runId, but nothing held the ENTRIES' own references against the blobs the bundle carries: a torn bundle imported whole and the missing transcript surfaced only when something later read it. `importRun` now returns `{ unresolvedRefs }`, every transcript, checkpoint, artifact, and workflow-source ref the entries (and meta) name that no bundle blob resolves; the default stays permissive (retention and checkpoint pruning legitimately drop blobs their entries still name) and the report makes the gap visible, while `requireClosure: true` refuses typed BEFORE any write. A duplicate blob ref refuses always: last-write-wins over transcript bytes is a torn or edited bundle, never a valid export.

  The verify-only load (RV1512). The A1 salvage model repairs a torn trailing line ON LOAD, which is right for an owner about to append and wrong for an auditor: a verification read that rewrites the artifact it verifies destroys the evidence of the tear. `JsonlFileStore({ repairOnLoad: false })` serves the salvageable records without touching the file, and `rulvar runs audit --no-load-repair` opens the default store that way (contradicting `--repair` is refused typed).

  The documentation debts (RV1513). The README package count now matches its own table (seventeen names, the unscoped pointer included); `@rulvar/executor` ships a README and LICENSE like every sibling; the package reference names the eval framework's real dependencies; and the isolated-executor guide gains "What the ledger is NOT", the explicit denial list (not an outbox, not authorization, not exactly-once, not always on) for exactly the facts the seventeenth comparison run's dossier inverted while citing the sources that state them.

- Updated dependencies [e8d9ada]
  - @rulvar/core@1.163.0

## 1.162.0

### Patch Changes

- Updated dependencies [2031e82]
  - @rulvar/core@1.162.0

## 1.161.0

### Patch Changes

- Updated dependencies [d4547b7]
  - @rulvar/core@1.161.0

## 1.160.0

### Patch Changes

- Updated dependencies [1c6f0d0]
  - @rulvar/core@1.160.0

## 1.159.0

### Patch Changes

- Updated dependencies [e881c8b]
  - @rulvar/core@1.159.0

## 1.158.0

### Patch Changes

- Updated dependencies [a266bc7]
  - @rulvar/core@1.158.0

## 1.157.0

### Patch Changes

- Updated dependencies [1883421]
  - @rulvar/core@1.157.0

## 1.156.0

### Patch Changes

- Updated dependencies [537144e]
  - @rulvar/core@1.156.0

## 1.155.0

### Patch Changes

- Updated dependencies [49b08a7]
  - @rulvar/core@1.155.0

## 1.154.0

### Patch Changes

- Updated dependencies [9259f24]
  - @rulvar/core@1.154.0

## 1.153.0

### Patch Changes

- Updated dependencies [d8bebcb]
  - @rulvar/core@1.153.0

## 1.152.0

### Patch Changes

- Updated dependencies [dd6a616]
  - @rulvar/core@1.152.0

## 1.151.0

### Patch Changes

- Updated dependencies [1de0610]
  - @rulvar/core@1.151.0

## 1.150.0

### Patch Changes

- Updated dependencies [a331211]
  - @rulvar/core@1.150.0

## 1.149.0

### Patch Changes

- Updated dependencies [08b4537]
  - @rulvar/core@1.149.0

## 1.148.0

### Patch Changes

- Updated dependencies [c85dac9]
  - @rulvar/core@1.148.0

## 1.147.0

### Patch Changes

- Updated dependencies [6367231]
  - @rulvar/core@1.147.0

## 1.146.0

### Patch Changes

- Updated dependencies [5d9bbc8]
  - @rulvar/core@1.146.0

## 1.145.0

### Patch Changes

- @rulvar/core@1.145.0

## 1.144.0

### Patch Changes

- Updated dependencies [c11bcd6]
  - @rulvar/core@1.144.0

## 1.143.0

### Patch Changes

- Updated dependencies [f412169]
  - @rulvar/core@1.143.0

## 1.142.0

### Patch Changes

- @rulvar/core@1.142.0

## 1.141.0

### Patch Changes

- Updated dependencies [4f12a62]
  - @rulvar/core@1.141.0

## 1.140.0

### Patch Changes

- @rulvar/core@1.140.0

## 1.139.0

### Patch Changes

- Updated dependencies [03a2141]
  - @rulvar/core@1.139.0

## 1.138.0

### Patch Changes

- Updated dependencies [ed0c4fb]
  - @rulvar/core@1.138.0

## 1.137.0

### Patch Changes

- Updated dependencies [96f6788]
  - @rulvar/core@1.137.0

## 1.136.0

### Patch Changes

- Updated dependencies [aa6ca71]
  - @rulvar/core@1.136.0

## 1.135.0

### Patch Changes

- Updated dependencies [cf75e22]
  - @rulvar/core@1.135.0

## 1.134.0

### Patch Changes

- @rulvar/core@1.134.0

## 1.133.0

### Patch Changes

- @rulvar/core@1.133.0

## 1.132.0

### Patch Changes

- Updated dependencies [2bec904]
  - @rulvar/core@1.132.0

## 1.131.0

### Patch Changes

- Updated dependencies [256cae1]
  - @rulvar/core@1.131.0

## 1.130.0

### Patch Changes

- Updated dependencies [d6bec7a]
  - @rulvar/core@1.130.0

## 1.129.0

### Patch Changes

- Updated dependencies [1612439]
  - @rulvar/core@1.129.0

## 1.128.0

### Patch Changes

- Updated dependencies [27c4e38]
  - @rulvar/core@1.128.0

## 1.127.0

### Patch Changes

- Updated dependencies [b3b1805]
  - @rulvar/core@1.127.0

## 1.126.0

### Patch Changes

- @rulvar/core@1.126.0

## 1.125.0

### Patch Changes

- @rulvar/core@1.125.0

## 1.124.0

### Patch Changes

- Updated dependencies [37fd1f2]
  - @rulvar/core@1.124.0

## 1.123.0

### Patch Changes

- Updated dependencies [5c46468]
  - @rulvar/core@1.123.0

## 1.122.0

### Patch Changes

- Updated dependencies [8cf45c5]
  - @rulvar/core@1.122.0

## 1.121.0

### Patch Changes

- Updated dependencies [3d67d41]
  - @rulvar/core@1.121.0

## 1.120.0

### Patch Changes

- Updated dependencies [d630c9e]
  - @rulvar/core@1.120.0

## 1.119.0

### Patch Changes

- Updated dependencies [1e4ff3c]
  - @rulvar/core@1.119.0

## 1.118.0

### Patch Changes

- Updated dependencies [f8341a3]
  - @rulvar/core@1.118.0

## 1.117.0

### Patch Changes

- @rulvar/core@1.117.0

## 1.116.0

### Patch Changes

- Updated dependencies [a213878]
  - @rulvar/core@1.116.0

## 1.115.0

### Patch Changes

- Updated dependencies [63642ae]
  - @rulvar/core@1.115.0

## 1.114.0

### Patch Changes

- Updated dependencies [5759731]
  - @rulvar/core@1.114.0

## 1.113.0

### Minor Changes

- a60807a: The pricing composition's second half names itself, and the effect-ledger quarantine is byte-true (RV706, RV707). `InvoicePricingProvenance` gains optional `currentPricingVersion`: on composed exports it is the version of the caller's current table, the one that priced everything past `pinnedThroughSeq` (on current-table exports, the whole fold), so an invoice folded across a rotation now names both halves of the composition where the pinned segments already declared theirs; `rulvar invoice` and `rulvar inspect` fill it from the configured table and extend their text suffix to `pins composed with the current table (v-a, v-b; current v-live)`, byte for byte unchanged when the config declares no version. The executor ledger's torn-tail quarantine row now carries `bytesBase64` and `sha256` of the exact torn bytes alongside the lossy `bytes` string kept for old readers (two different byte tails used to collapse into one indistinguishable row), and the repair's parseable decision is made on the bytes, strict UTF-8 before `JSON.parse`: the lossy decode could make a fragment with invalid bytes inside a string literal parse, and the repair then terminated a line of invalid bytes in place, manufacturing exactly the corruption the fail-closed scan refuses.

### Patch Changes

- Updated dependencies [a60807a]
  - @rulvar/core@1.113.0

## 1.112.0

### Patch Changes

- Updated dependencies [00ae55b]
  - @rulvar/core@1.112.0

## 1.111.0

### Patch Changes

- Updated dependencies [fd25169]
  - @rulvar/core@1.111.0

## 1.110.0

### Patch Changes

- Updated dependencies [58afdb5]
  - @rulvar/core@1.110.0

## 1.109.0

### Patch Changes

- Updated dependencies [85b1d39]
  - @rulvar/core@1.109.0

## 1.108.0

### Patch Changes

- Updated dependencies [affa3d4]
  - @rulvar/core@1.108.0

## 1.107.0

### Patch Changes

- Updated dependencies [9f5f6f6]
  - @rulvar/core@1.107.0

## 1.106.0

### Patch Changes

- Updated dependencies [9a4ce49]
  - @rulvar/core@1.106.0

## 1.105.0

### Patch Changes

- Updated dependencies [531dc88]
  - @rulvar/core@1.105.0

## 1.104.0

### Minor Changes

- 3edecd8: Make the effect ledger's tail repair mutually exclusive across processes and its scan fail closed on every malformed line (RV606, RV607).

  Repair exclusion (RV606): the destructive half of the torn-tail repair (truncate plus quarantine) now runs under a sidecar `<path>.repair-lock` taken with `O_EXCL`, and the ledger file is re-read AFTER the lock is held, so a writer never truncates by a boundary computed from a stale read. A waiter polls; a lock whose mtime is further than ten seconds from now (either direction, so a skewed clock cannot pin the file) is presumed abandoned by a crashed holder and stolen, and ownership is re-verified immediately before the truncate. Two writer processes meeting on one torn file previously could erase each other's confirmed intents: the slower instance truncated at its stale boundary, cutting away the faster instance's quarantine and any rows appended after it. A clean file is still returned untouched, byte for byte, without the lock ever existing. The considered alternative, an append-only repair that terminates the fragment in place and quarantines it without truncating, was rejected because it turns the fragment into an unparseable interior line: a repaired file must stay readable by EVERY reader version, and pre-1.104 scans fail closed on exactly that construction. The writer contract is now stated publicly on `jsonlEffectLedger` and in the guide: prefer one writer per path (an `effects.<worker>.jsonl` per worker process, merged at reconciliation), and when writers do meet on one local path, the repair lock makes the meeting cost duplicated effort at worst, never a truncated confirmed row.

  Fail-closed scan (RV607): `loadEffectLedger` now decodes every physical line with `TextDecoder('utf-8', { fatal: true })` and validates the shape before anything dereferences it: the phase must be exactly `intent`, `outcome`, or `torn`, and every required field of that phase must carry its type (extra fields still pass through). Invalid UTF-8, non-object JSON (`null`, `42`, `"str"`, arrays), a missing or mistyped required field, and an unknown phase are all `CorruptLedgerLine`s: the default scan throws the typed `LedgerCorruptionError`, and `{ tolerateCorrupt: true }` returns the same lines as data and never leaks a raw `TypeError` (a `null` line used to pierce both modes as one). An unterminated tail that fails to decode or parse remains the tolerated, named `tornTail`; an unterminated line that PARSES but fails the shape is corruption, because a torn prefix of the writer's own flat record can never parse, so such a line is foreign, not a crash artifact.

  Migration note: scans that previously resolved while silently skipping malformed rows (a replacement-character key entering reconciliation as genuine, an unknown phase erasing an orphan, primitives vanishing) now surface them: the default mode throws `LedgerCorruptionError` where it previously returned a partial result or leaked a `TypeError`. Hosts that hit the new refusal on an existing file should triage with `{ tolerateCorrupt: true }`, which reports each offending line's number, byte offset, and sha256. Rows written by `jsonlEffectLedger` itself are unaffected: every line the writer emits passes the validation it now demands.

### Patch Changes

- @rulvar/core@1.104.0

## 1.103.0

### Patch Changes

- Updated dependencies [f2b809e]
  - @rulvar/core@1.103.0

## 1.102.0

### Patch Changes

- Updated dependencies [3eb6515]
  - @rulvar/core@1.102.0

## 1.101.0

### Patch Changes

- Updated dependencies [51b215c]
  - @rulvar/core@1.101.0

## 1.100.0

### Patch Changes

- Updated dependencies [9785bea]
  - @rulvar/core@1.100.0

## 1.99.1

### Patch Changes

- Updated dependencies [ef08d73]
  - @rulvar/core@1.99.1

## 1.99.0

### Patch Changes

- Updated dependencies [9e00888]
  - @rulvar/core@1.99.0

## 1.98.0

### Patch Changes

- @rulvar/core@1.98.0

## 1.97.0

### Patch Changes

- Updated dependencies [5c3b453]
  - @rulvar/core@1.97.0

## 1.96.0

### Minor Changes

- 89fd032: Attempt-exact effect-ledger identity, torn-tail repair, and workdir cleanup on a failed audit write (RV501/RV502/RV503, the two ninth-experiment P0s plus their P1 neighbor).

  RV501: every reference-executor dispatch now mints a unique `attemptId`, written into the intent row and copied verbatim onto the same attempt's outcome row, and `loadEffectLedger` pairs the two phases exactly: an outcome of ANY class resolves only its own attempt (rows written before the id shipped pair by the legacy `(idempotencyKey, startedAt)` join). This deliberately changes `orphanedIntents` in the conservative direction: a sibling retry's outcome no longer clears an older attempt whose effect may already have applied, so files that previously scanned clean can now (correctly) report orphans. Closing the logical idempotency key belongs to the host reconciler, against the effect provider's receipt. A SIGKILL test drives the real crash window against the built package.

  RV502: before its first append, `jsonlEffectLedger` repairs a torn tail left by a crashed predecessor: a complete record missing only its newline is terminated in place; an unparseable fragment is truncated and quarantined verbatim as a `{"phase":"torn"}` line (surfaced as `tornArtifacts`), so an append can never glue onto torn bytes and hide the next valid record. `loadEffectLedger` now tolerates and NAMES a live unterminated trailing fragment (`tornTail`) but fails closed on an unparseable interior line with a typed `LedgerCorruptionError` (line numbers, byte offsets, sha256 hashes); pass `{ tolerateCorrupt: true }` to receive those lines as `corrupt` data for triage. Previously both records vanished silently after an append over a torn tail, and interior corruption was skipped without a signal.

  RV503: the outcome record write and the workdir removal are now nested, so the ephemeral workdir never survives the dispatch even when the audit write fails, and a rejected `ledger.record` surfaces as a typed `ExecutorError` with code `ledger` (naming the dispatch failure too when both broke) instead of an untyped rejection that leaked the directory.

### Patch Changes

- @rulvar/core@1.96.0

## 1.95.0

### Patch Changes

- @rulvar/core@1.95.0

## 1.94.0

### Patch Changes

- @rulvar/core@1.94.0

## 1.93.0

### Patch Changes

- Updated dependencies [c62150a]
  - @rulvar/core@1.93.0

## 1.92.0

### Patch Changes

- 351d1f5: Honest ledger outcomes for dispatches that never ran. A failure between the intent point and the spawn (a credentials mint that throws, a sandbox launcher that throws, cancellation mid-mint) used to ledger `outcome: 'ok'` with a null exit code even though nothing was dispatched. Both reference executors now default the outcome to `error` and set `ok` at exactly one place, the successful protocol return, so every unclassified throw ledgers as the error it is. All previously classified paths (spawn failure, timeout, abort, output cap, non-zero exit, protocol violation, success) keep byte-identical records.
- Updated dependencies [351d1f5]
  - @rulvar/core@1.92.0

## 1.91.0

### Minor Changes

- f93f5ca: Two-phase intent protocol for external effects (RV404, the eighth-experiment review, variant a). A `ToolEffectLedger` that implements the new optional `intent` method opts into the capability: both reference executors durably record the intent (idempotency key, tool, `argsHash`, runId, spanId, workdir, the attempt's `startedAt`) strictly BEFORE the external effect is dispatched and the outcome `record` after it, so a host crash between the effect and the outcome row leaves an orphan intent, the mandatory reconciliation signal, instead of an untracked effect. A failed intent write refuses the dispatch with the new typed `ledger` error code; a ledger without the method keeps the historical single-record contract byte for byte. Ships the durable JSONL reference (`jsonlEffectLedger`, `loadEffectLedger` with `orphanedIntents` precomputed, a torn trailing line skipped), the two-phase `memoryEffectLedger` upgrade with `intents()`, the conformance scenario e13 (a simulated kill between the phases must leave the orphan intent, recorded before the effect), and the documented host reconciliation contract. Full outbox, business authorization, and monetary reconciliation remain host obligations built on the ledger, not inside it.

### Patch Changes

- @rulvar/core@1.91.0

## 1.90.0

### Patch Changes

- Updated dependencies [9603940]
  - @rulvar/core@1.90.0

## 1.89.0

### Patch Changes

- Updated dependencies [f18b671]
- Updated dependencies [f18b671]
  - @rulvar/core@1.89.0

## 1.88.0

### Patch Changes

- Updated dependencies [3b339d9]
  - @rulvar/core@1.88.0

## 1.87.0

### Patch Changes

- Updated dependencies [c4c02b1]
  - @rulvar/core@1.87.0

## 1.86.0

### Patch Changes

- Updated dependencies [2f71894]
  - @rulvar/core@1.86.0

## 1.85.0

### Patch Changes

- Updated dependencies [6932a9f]
  - @rulvar/core@1.85.0

## 1.84.0

### Patch Changes

- @rulvar/core@1.84.0

## 1.83.0

### Patch Changes

- @rulvar/core@1.83.0

## 1.82.0

### Patch Changes

- Updated dependencies [9cc5d66]
  - @rulvar/core@1.82.0

## 1.81.2

### Patch Changes

- Updated dependencies [296885b]
  - @rulvar/core@1.81.2

## 1.81.1

### Patch Changes

- c030982: The side-effect ledger records the outcome a dispatch actually had: a tool whose stdout violates the result protocol (non-JSON output from a clean exit) now ledgers `error` instead of `ok`, in both the subprocess and container executors, and the executor conformance kit pins it as check e12. In `@rulvar/core`, `stripFencedBlocks` closes fences in CRLF text (a trailing carriage return no longer keeps a fence open and swallows the rest of the document), which `fencedCode: 'excluded'` validators and `headingStructureValidator` inherit. Docs drift closed alongside: the package count, tables, and dependency graphs catch up to `@rulvar/executor` and `@rulvar/store-postgres`, the durability page reflects the shipped data protection hooks instead of denying them, and the architecture page no longer claims only the in-process executor exists.
- Updated dependencies [c030982]
  - @rulvar/core@1.81.1

## 1.81.0

### Patch Changes

- Updated dependencies [ce4c392]
  - @rulvar/core@1.81.0

## 1.80.0

### Patch Changes

- Updated dependencies [262e397]
  - @rulvar/core@1.80.0

## 1.79.0

### Patch Changes

- Updated dependencies [85956ab]
  - @rulvar/core@1.79.0

## 1.78.0

### Patch Changes

- Updated dependencies [941b6e1]
  - @rulvar/core@1.78.0

## 1.77.0

### Patch Changes

- Updated dependencies [6aba271]
  - @rulvar/core@1.77.0

## 1.76.0

### Patch Changes

- Updated dependencies [22cba47]
  - @rulvar/core@1.76.0

## 1.75.1

### Patch Changes

- Updated dependencies [82bc0f0]
  - @rulvar/core@1.75.1

## 1.75.0

### Patch Changes

- Updated dependencies [c486de8]
  - @rulvar/core@1.75.0

## 1.74.0

### Patch Changes

- Updated dependencies [d94beab]
  - @rulvar/core@1.74.0

## 1.73.0

### Patch Changes

- Updated dependencies [3e95bd1]
  - @rulvar/core@1.73.0

## 1.72.0

### Patch Changes

- Updated dependencies [662e9e0]
  - @rulvar/core@1.72.0

## 1.71.0

### Patch Changes

- Updated dependencies [20d02e0]
  - @rulvar/core@1.71.0

## 1.70.1

### Patch Changes

- @rulvar/core@1.70.1

## 1.70.0

### Patch Changes

- @rulvar/core@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [b21a681]
  - @rulvar/core@1.69.0

## 1.68.0

### Patch Changes

- Updated dependencies [b227874]
  - @rulvar/core@1.68.0

## 1.67.0

### Patch Changes

- Updated dependencies [8e6006d]
  - @rulvar/core@1.67.0

## 1.66.0

### Patch Changes

- Updated dependencies [1b8987e]
  - @rulvar/core@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [0b6b859]
  - @rulvar/core@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [991f9b5]
  - @rulvar/core@1.64.0

## 1.63.0

### Patch Changes

- Updated dependencies [8a28aed]
  - @rulvar/core@1.63.0

## 1.62.0

### Patch Changes

- Updated dependencies [fca5fd1]
  - @rulvar/core@1.62.0

## 1.61.0

### Patch Changes

- Updated dependencies [b4c1f1f]
  - @rulvar/core@1.61.0

## 1.60.0

### Patch Changes

- Updated dependencies [59bbeaa]
  - @rulvar/core@1.60.0

## 1.59.4

### Patch Changes

- Updated dependencies [c49d7a1]
  - @rulvar/core@1.59.4

## 1.59.3

### Patch Changes

- Updated dependencies [deaef36]
  - @rulvar/core@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [dd0e10f]
  - @rulvar/core@1.59.2

## 1.59.1

### Patch Changes

- Updated dependencies [c127770]
  - @rulvar/core@1.59.1

## 1.59.0

### Minor Changes

- 615dc90: RV-216: the isolated tool executor, the last open item in the improvement plan. In-process tools are ordinary function calls with full host capabilities (an execution convenience, never a sandbox for hostile or model-generated code); this release adds an official out-of-process executor contract so a tool whose input is untrusted cannot reach host capabilities. (1) THE SEAM in `@rulvar/core`: a `ToolExecutorProvider` SPI, registered on the engine as `createEngine({ executors: { subprocess, container } })`. A tool declaring `executor: 'subprocess'` or `'container'` (previously a hard "only inprocess in v1" rejection) dispatches through the matching provider instead of running its `execute` closure; an unregistered tag is a typed ConfigError at spawn time, before any provider or model call. The dispatch mints the tool span exactly like an inprocess call and derives a stable idempotency key (a pure function of runId, tool name, and canonical args) so a side-effecting tool can fold an at-least-once retry into effectively-once; the tag never enters `toolsetHash`, so opting a tool into isolation does not change run identity, and inprocess dispatch stays byte-identical. (2) THE REFERENCE ADAPTERS in the new `@rulvar/executor` package: `subprocessExecutor` runs the tool in a child process with a REPLACED environment (host credentials scrubbed; the usual exfiltration path removed), a fresh ephemeral working directory per call, per-call short-lived credentials, a hard timeout that escalates SIGTERM to SIGKILL, and a bounded output capture, plus a `sandbox` launcher hook where bwrap/firejail/sandbox-exec plug in for filesystem and network isolation; `containerExecutor` runs it in a one-shot container with the network dropped (`--network none`), the root filesystem read-only, memory/CPU/pid caps, and all Linux capabilities dropped, which is where the strong isolation the subprocess adapter cannot promise on its own actually holds (a microVM adapter implements the same seam). `subprocessTool` defines a tool that dispatches through them; a `ToolEffectLedger` records every dispatch (idempotency key, tool, argsHash, workdir, outcome) so a host can bind an approval to the effect it authorized. (3) THE CONFORMANCE KIT: `executorConformance` is the executable shared-contract battery any command-based executor must pass, foremost the gate the epic exists for, a hostile tool cannot read the host's ambient credentials; the subprocess reference passes all of it, and the container reference additionally proves the network and filesystem isolation against a real runtime. New guide page: https://docs.rulvar.com/guide/isolated-executor.

### Patch Changes

- Updated dependencies [615dc90]
  - @rulvar/core@1.59.0
