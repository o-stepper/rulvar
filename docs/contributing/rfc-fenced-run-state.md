---
title: 'RFC: fenced run state'
description: 'Design proposal to fence every durable run mutation behind the lease epoch: the audit that motivates it, the reference store fix that shipped with it, and a phased, additive store SPI evolution.'
---

# RFC: fenced run state

Status: proposed. Phase 1 (the reference store fix and the documentation corrections) shipped together with this page; phases 2 and 3 are open for review before any SPI change lands.

## Why

Queue mode's safety story rests on the fencing epoch: a worker that stalls past its lease ttl must not be able to corrupt the run a successor already owns. Today the epoch fences exactly one surface, journal appends through the kernel's single append site. `RunMeta` writes, transcript blobs (turn checkpoints, compaction summaries, worktree patches, persisted workflow sources), and deletion are not fenced at all.

The durability guide used to describe that boundary as harmless: the meta row is a projection recoverable from the journal, so the worst a stale writer could do was briefly stale catalog metadata. The audit below found two reachable outcomes that are worse (a stranded run and a regressed turn boot), plus one implementation defect in the reference store where even the fenced surface leaked. This RFC records the audit, the fix that already shipped, and the proposal for closing the rest of the gap without breaking the frozen store seams.

## What is fenced today

- Journal appends: the engine carries `ResumeOptions.lease` on every append of a resumed segment, and a conformant `LeasableStore` rejects a stale epoch with the typed `LeaseHeldError`, the entry never visible to a later `load`. The monotonic seq obligation is an independent second line: even an unfenced append from a stale journal tail loses the race typed, not silently.
- Offline resolutions: the CLI server acquires a lease where the store is leasable and threads it into the `Replayer`, so resolution appends ride the same fence.
- Compatibility: the hashVersion window scan repeats at every acquire, so an older library cannot write into a newer journal.
- Not fenced: `putMeta`, every `TranscriptStore.put` and `TranscriptStore.delete`, `JournalStore.delete`, and the engine level `deleteRun` and `pruneRun` cascades.

## Findings

The audit ran against v1.44.0. F3 was demonstrated against the published `@rulvar/store-sqlite` 1.44.0 and is fixed in the release that carries this page; F1 and F2 are design gaps this RFC proposes to close.

### F1: a stale terminal `putMeta` can strand a run

Every settle writes terminal meta, and that write is unfenced and swallowed on error. A superseded segment that noticed its lease loss late (its cancel unwinds after the successor already resumed) overwrites the successor's `running` meta with a terminal status and with a `segments` counter one generation behind. The journal stays correct throughout. But the queue worker sweeps only `running` and `suspended` metas: if the successor crashes before its own settle write repairs the row, the run looks settled to every worker and sits stranded until an operator resumes it by runId. The regressed `segments` counter additionally re-derives an already used telemetry base, so the next segment's event seqs and span ids can collide with ones already emitted. No reconciler exists today that rebuilds meta from the journal.

### F2: a stale checkpoint save can regress a later boot

Turn boundary checkpoints live in the transcript store at a deterministic ref derived from the dispatch seq, overwritten per boundary. Two segments continuing the same attempt (the stale one still finishing a turn, the successor booted from the same journal prefix) therefore share one blob ref, and `put` is last write wins. If the stale segment's save lands after the successor's, a later boot of that attempt (a crash resume of a dangling dispatch, park and unpark, a DEF-5 graft) decodes the stale segment's older turn state: turns the successor already paid for replay, and the at-least-once window for tool side effects widens beyond the single boundary it was designed to be. The journal cannot catch this because checkpoint blob contents never enter identity.

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

### Phase 2: the fenced writes capability

Widen the write methods with an optional trailing lease and add a declared marker:

```ts
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  putMeta(m: RunMeta, lease?: Lease): Promise<void>;
  delete(runId: string, lease?: Lease): Promise<void>;
}

interface TranscriptStore {
  put(ref: string, blob: Bytes, lease?: Lease): Promise<void>;
  delete(ref: string, lease?: Lease): Promise<void>;
}

interface FencedWrites {
  readonly fencedWrites: true;
}
```

Optional trailing parameters are source compatible in both directions: an implementation written without them still satisfies the interface, and a caller passing nothing keeps the single-writer semantics. The marker is what makes the difference detectable, exactly like `leaseTtlMs`: the engine threads the segment's lease into every store mutation when it has one, and a host that requires full fencing asserts the marker at deployment time instead of trusting silence.

Enforcement contract for a store declaring `fencedWrites`: a mutation carrying a stale lease rejects with the typed `LeaseHeldError` and mutates nothing, and the fence check commits atomically with the mutation (the phase 1 rule). The transcript store fences per run: a blob ref's run prefix binds it to the run the lease names.

Engine changes are confined to threading: `putMeta` and checkpoint saves pass the lease when the segment has one. The terminal settle already swallows `putMeta` failures, so a fenced stale settle degrades to exactly the intended no-op (F1 closed). A rejected checkpoint save fails the stale segment's turn and unwinds it, which is the correct outcome for a segment that no longer owns the run (F2 closed). The worker's retention delete passes its brief lease through an optional argument on `engine.deleteRun` (F4 closed for the worker path; a bare host call without a lease stays a host-owned decision).

Conformance grows a `fencedWritesConformance` suite, run when the factory declares the marker: a stale `putMeta` rejects and the successor's meta is intact; a stale transcript `put` rejects and the prior blob is intact; stale deletes reject; and an interleave probe (the shim technique the sqlite tests use) proves check and mutation are atomic where the backend allows a second connection.

### Phase 3: reconcile and recover

- A meta reconciler that rebuilds status from the journal fold when meta and journal disagree (a terminal journal under a `running` meta, or the reverse), run at resume and available to sweeps. Status is fully derivable from the journal; the `segments` counter is not journaled, so its protection is phase 2 prevention rather than after the fact repair.
- A stranded run probe for operators: list runs whose journal is non-terminal but whose meta is, the exact F1 signature.
- An adversarial multi-process soak for the conformance kit: two real processes, injected stalls, takeover windows over every write surface.

## Non-goals

- Multiple concurrent writers per run. One live segment owns a run; fencing exists to enforce that, not to relax it.
- Fencing for single-process stores: `JsonlFileStore` stays single writer by contract, and the in-memory stores are process local by nature.
- Encryption, redaction, and retention policy: a separate track with its own design.

## Open questions

- Busy handling under `BEGIN IMMEDIATE` contention: today a locked writer surfaces the driver's busy error to the caller (the worker's error hook path). Should `SqliteStoreOptions` expose the driver's busy timeout, and should the conformance kit pin a maximum?
- Should checkpoint refs also become segment qualified? Fencing is strictly stronger (it protects every blob, not only checkpoints), and segment qualified refs would orphan blobs and complicate `pruneRun` reference accounting, so the current answer is no.
- Should `deleteRun` and `pruneRun` refuse to run WITHOUT a lease when the journal store is leasable? Likely an opt-in strictness flag rather than a default, since single-process hosts delete legitimately today.

## Acceptance

Phases 2 and 3 are done when a superseded owner can mutate nothing at all (journal, meta, transcripts, leases, deletion) once the epoch has moved, the conformance kit proves that for every store declaring `fencedWrites`, and the durability guide promotes queue deployments over such stores from "plan around the boundary" to fully fenced.
