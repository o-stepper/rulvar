---
title: 'RFC: fenced run state'
description: 'Design proposal to fence every durable run mutation behind the lease epoch: the audit that motivates it, the reference store fix that shipped with it, and a phased, additive store SPI evolution.'
---

# RFC: fenced run state

Status: phases 1 through 3 shipped in full. Phase 1 (the reference store fix and the documentation corrections) shipped together with this page in v1.44.1. Phase 2 shipped next in v1.45.0: the SPI's optional lease parameters, the `fencedWrites` marker, engine threading of the lease into every meta and blob write, `SqliteStore` enforcement on `putMeta` and `delete` (closing F1 and the worker path of F4), the `fencedWritesConformance` suite, and the retention lease pass-through. v1.46.0 closed F2 with the sqlite transcript twin (`SqliteStore.transcripts()`, blobs beside the lease rows of the same database) and its `fencedTranscriptsConformance` suite. v1.47.0 shipped phase 3's reconcile and recover: the journaled run settle, the `auditRun`/`auditRuns`/`reconcileRunMeta` exports, and the `rulvar runs audit [--repair]` operator probe. The release after that closed the last open item, the adversarial multi-process soak over every write surface (`runMultiProcessSoak` in the conformance kit; `SqliteStore` runs it in CI), whose first storm also surfaced and fixed a concurrent-boot defect in the reference store's constructor.

## Why

Queue mode's safety story rests on the fencing epoch: a worker that stalls past its lease ttl must not be able to corrupt the run a successor already owns. Today the epoch fences exactly one surface, journal appends through the kernel's single append site. `RunMeta` writes, transcript blobs (turn checkpoints, compaction summaries, worktree patches, persisted workflow sources), and deletion are not fenced at all.

The durability guide used to describe that boundary as harmless: the meta row is a projection recoverable from the journal, so the worst a stale writer could do was briefly stale catalog metadata. The audit below found two reachable outcomes that are worse (a stranded run and a regressed turn boot), plus one implementation defect in the reference store where even the fenced surface leaked. This RFC records the audit, the fix that already shipped, and the proposal for closing the rest of the gap without breaking the frozen store seams.

## What was fenced at audit time (v1.44.0)

- Journal appends: the engine carries `ResumeOptions.lease` on every append of a resumed segment, and a conformant `LeasableStore` rejects a stale epoch with the typed `LeaseHeldError`, the entry never visible to a later `load`. The monotonic seq obligation is an independent second line: even an unfenced append from a stale journal tail loses the race typed, not silently.
- Offline resolutions: the CLI server acquires a lease where the store is leasable and threads it into the `Replayer`, so resolution appends ride the same fence.
- Compatibility: the hashVersion window scan repeats at every acquire, so an older library cannot write into a newer journal.
- Not fenced then: `putMeta`, every `TranscriptStore.put` and `TranscriptStore.delete`, `JournalStore.delete`, and the engine level `deleteRun` and `pruneRun` cascades. Phase 2 and the sqlite transcript twin have since closed all of these over a declaring store pair; the durability guide describes the current boundary.

## Findings

The audit ran against v1.44.0. F3 was demonstrated against the published `@rulvar/store-sqlite` 1.44.0 and is fixed in the release that carries this page. F1 was then demonstrated against the published 1.44.1 (the stale settle overwrote the successor's meta and the run vanished from sweep candidacy) and is closed by phase 2 over a `fencedWrites` journal store, as is the worker path of F4. F2 was demonstrated last, against the published 1.45.0: the engine threaded the stale segment's lease into its late checkpoint save, both shipped transcript stores ignored it, and the blob at the shared ref regressed from the successor's turn state to the stale segment's while the same holder's journal append bounced typed. It is closed by the sqlite transcript twin over a declaring pair.

### F1: a stale terminal `putMeta` can strand a run

Every settle writes terminal meta, and that write is unfenced and swallowed on error. A superseded segment that noticed its lease loss late (its cancel unwinds after the successor already resumed) overwrites the successor's `running` meta with a terminal status and with a `segments` counter one generation behind. The journal stays correct throughout. But the queue worker sweeps only `running` and `suspended` metas: if the successor crashes before its own settle write repairs the row, the run looks settled to every worker and sits stranded until an operator resumes it by runId. The regressed `segments` counter additionally re-derives an already used telemetry base, so the next segment's event seqs and span ids can collide with ones already emitted. At the time of the audit no reconciler existed that rebuilds meta from the journal; phase 3 shipped one, and over an unfenced store (where phase 2's prevention does not apply) the stranded residue is now at least findable and repairable after the fact.

### F2: a stale checkpoint save can regress a later boot (fixed)

Turn boundary checkpoints live in the transcript store at a deterministic ref derived from the dispatch seq, overwritten per boundary. Two segments continuing the same attempt (the stale one still finishing a turn, the successor booted from the same journal prefix) therefore share one blob ref, and `put` is last write wins. If the stale segment's save lands after the successor's, a later boot of that attempt (a crash resume of a dangling dispatch, park and unpark, a DEF-5 graft) decodes the stale segment's older turn state: turns the successor already paid for replay, and the at-least-once window for tool side effects widens beyond the single boundary it was designed to be. The journal cannot catch this because checkpoint blob contents never enter identity.

The fix is the sqlite transcript twin: `SqliteStore.transcripts()` returns a `TranscriptStore` whose blobs live in the store's own database, beside the lease rows, so a lease-carrying `put` or `delete` runs the fence check and the blob mutation as the same one immediate transaction the journal side uses (and the run-match rule applies, keyed on the ref's leading path segment). The engine already threads the lease into every blob write, so over the pair the stale segment's late save above is refused typed and the successor's blob survives byte intact. Sharing the connection is what makes the capability implementable: a blob write and a lease check in different domains cannot commit as one unit, and with `':memory:'` a separate connection would not even see the leases. The file and in-memory transcript stores stay single-writer by contract and undeclared.

### F3: the reference store's fence check was not atomic with its mutation (fixed)

`SqliteStore` checked the lease row in one autocommit statement and mutated in the next. In process the two calls are back to back synchronous statements, but across two processes a takeover can land between them. Demonstrated against the published 1.44.0 by shimming the check to admit a takeover inside the window (across two real processes the same interleave needs no shim):

- a stale `append` landed a visible journal entry after the epoch had already moved, violating the store's own contract that a stale append is rejected and never becomes visible;
- a stale `release` deleted the successor's live lease row, letting a third owner acquire while the successor was unexpired (exclusivity broken, and the successor's own appends started rejecting);
- a stale `renew` extended the successor's lease row with the stale holder's ttl, delaying the next legitimate reclaim past the advertised expiry.

The fix wraps the fence check and the guarded mutation in one `BEGIN IMMEDIATE` transaction (the shape `acquire` always had), and pins `owner` and `epoch` in the mutation's own `WHERE` clause as defense in depth. The store's cross-instance tests now shim the same interleave and prove the takeover cannot land mid-call.

### F4: destructive host operations are unfenced

`JournalStore.delete`, `TranscriptStore.delete`, and the engine cascades `deleteRun` and `pruneRun` take no lease. The queue worker's retention path does acquire a brief lease before deleting, but the store cannot verify that: the deletes themselves are not epoch checked, so a stale process that believes it holds retention duty can delete a live run's journal or blobs.

### F5: the documentation overclaimed (fixed)

The durability guide's boundary paragraph now states the true worst cases (F1 and F2) instead of "briefly stale catalog metadata, never a corrupted run", and points here.

## Proposal

Guiding constraint: the store SPI seams are frozen at 1.0. Every change below is additive and optional, following the precedent set by the `MetaLookupStore` capability and the `leaseTtlMs` introspection field: an existing store keeps compiling and keeps passing conformance untouched, and an engine over an existing store keeps today's behavior.

### Phase 2: the fenced writes capability (shipped)

The write methods take an optional trailing lease and a store declares the marker (the shipped shape; both interfaces carry the optional readonly field directly):

```ts
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  putMeta(m: RunMeta, lease?: Lease): Promise<void>;
  delete(runId: string, lease?: Lease): Promise<void>;
  readonly fencedWrites?: true;
}

interface TranscriptStore {
  put(ref: string, blob: Bytes, lease?: Lease): Promise<void>;
  delete(ref: string, lease?: Lease): Promise<void>;
  readonly fencedWrites?: true;
}
```

Optional trailing parameters are source compatible in both directions: an implementation written without them still satisfies the interface, and a caller passing nothing keeps the single-writer semantics. The marker is what makes the difference detectable, exactly like `leaseTtlMs`: the engine threads the segment's lease into every store mutation when it has one, and a host that requires full fencing asserts the marker at deployment time instead of trusting silence (`hasFencedWrites` and `assertFencedWrites` ship in core).

Enforcement contract for a store declaring `fencedWrites` (the executable definition is `fencedWritesConformance`): a mutation carrying a stale lease rejects with the typed `LeaseHeldError` and mutates nothing; a live lease for a DIFFERENT run guards nothing and rejects the same way; the fence check commits atomically with the mutation (the phase 1 rule). The transcript store fences per run: a blob ref's run prefix binds it to the run the lease names.

Engine changes are confined to threading: every meta write, checkpoint save, compaction summary, worktree patch, and workflow source write of a leased resume carries the segment's lease. The terminal settle already swallows `putMeta` failures, so a fenced stale settle degrades to exactly the intended no-op (F1 closed over a declaring journal store). A refusal of the segment's very FIRST meta write fails the segment typed at boot with zero paid calls, strictly better than the pre-phase-2 behavior where the stale segment paid a live dispatch before its first append bounced. A rejected checkpoint save fails the stale segment's turn and unwinds it, which is the correct outcome for a segment that no longer owns the run; the transcript store that enforces it is the sqlite twin described under F2 (`fencedTranscriptsConformance` is its executable definition, taking the `{ journal, transcripts }` pair that shares the fencing domain). The worker's retention delete passes its brief lease through the optional second argument of `engine.deleteRun` (F4 closed for the worker path; a bare host call without a lease stays a host-owned decision).

`SqliteStore` declares the marker and enforces all three journal-side surfaces, plus the run-match rule on `append` as defense in depth.

### Phase 3: reconcile and recover (shipped)

- The journaled run settle, the prerequisite the audit surfaced: the run's terminal status used to live ONLY in the meta row, so "rebuild status from the journal" was not actually possible for a completed body. Now every settle whose segment appended durable work (or whose derived status differs from the last journaled settle) appends a `run_settle` decision entry, ordered BEFORE the meta write so a crash between the two leaves the row behind its journal, never the reverse. The write-on-change rule keeps pure replay byte stable and empty-journal runs empty, which is why the frozen v1 resume cassettes replay unchanged.
- The meta reconciler: `auditRun` derives the journal-supported state (the last journaled settle, dangling dispatches, open suspensions) and names the divergence; `reconcileRunMeta` rewrites the row from the journal for the two sound classes ('meta-behind': the crash residue between the journal flush and the meta write repairs with zero model calls and no workflow; 'stranded': a terminal meta over live journal work becomes sweepable again), preserving every other meta field byte for byte. Pre-settle-entry journals are audited structurally, and the ambiguous residues ('suspect': open suspensions under a completed meta, a journal with no meta row) are reported, never rewritten. `engine.resume` needs no reconciler of its own: its boot and settle rewrite the row from the run itself.
- The stranded run probe for operators: `auditRuns` sweeps the catalog (loading every journal it audits), and `rulvar runs audit [--repair]` is its CLI form, taking a brief per-run lease on a leasable store so a live owner is skipped, never raced, and exiting 0 only when the catalog ends consistent.
- The adversarial multi-process soak, the phase's last item: `runMultiProcessSoak` in the conformance kit spawns real OS processes that storm one store location through EVERY fenced write surface (journal append, meta write, transcript blob put and delete, fenced run deletion, renew, release) with stalls injected past the lease ttl, then rebuilds the one serial history the epochs promise (accepted mutations ordered by epoch and per-tenure counter) and diffs it against the actual store state. The stale probe sweep re-reads the journal tail before each stale append attempt on purpose, so the A5 monotonic-seq guard cannot mask a fencing hole. The storm runs until an activity quorum is met (takeover count, per-surface accepted writes, typed stale rejections), so a slow machine storms longer instead of asserting on thin coverage. `SqliteStore` runs the soak in its test suite; the M8 soak remains the engine-level complement over the append surface. The soak's first storm never reached the fenced surfaces: it found that N processes constructing `SqliteStore` over one fresh file (an ordinary fleet start) collided in the constructor's schema bootstrap and died with a raw SQLITE_BUSY (a 60 percent crash rate at six concurrent boots against the published 1.47.0), fixed by retrying the idempotent bootstrap as a unit under a wall-clock bound; every fenced surface then held under five writers, hundreds of takeovers, and thousands of stale probes.

## Non-goals

- Multiple concurrent writers per run. One live segment owns a run; fencing exists to enforce that, not to relax it.
- Fencing for single-process stores: `JsonlFileStore` stays single writer by contract, and the in-memory stores are process local by nature.
- Encryption, redaction, and retention policy: a separate track with its own design.

## Open questions

- Busy handling under `BEGIN IMMEDIATE` contention: today a locked writer surfaces the driver's busy error to the caller (the worker's error hook path), and the soak's writer protocol treats it as caller-retryable through the `retryable` hook. The BOOT half is answered: the constructor retries its idempotent schema bootstrap through the SQLITE_BUSY family under a wall-clock bound (`BOOT_BUSY_TIMEOUT_MS`), because the journal-mode conversion skips the driver's busy handler on some lock transitions. Still open for RUNTIME mutations: should `SqliteStoreOptions` expose the driver's busy timeout, and should the conformance kit pin a maximum?
- Should checkpoint refs also become segment qualified? Fencing is strictly stronger (it protects every blob, not only checkpoints), and segment qualified refs would orphan blobs and complicate `pruneRun` reference accounting, so the current answer is no.
- Should `deleteRun` and `pruneRun` refuse to run WITHOUT a lease when the journal store is leasable? Likely an opt-in strictness flag rather than a default, since single-process hosts delete legitimately today.

## Acceptance

Phases 2 and 3 are done when a superseded owner can mutate nothing at all (journal, meta, transcripts, leases, deletion) once the epoch has moved, the conformance kit proves that for every store declaring `fencedWrites`, and the durability guide promotes queue deployments over such stores from "plan around the boundary" to fully fenced. Met: the capability suites define the promise per surface, the multi-process soak proves it under real concurrent processes, and the durability guide describes the fenced boundary.
