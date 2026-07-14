---
title: Stores
description: Where run truth lives - the five-method journal store SPI, leases with fencing epochs for queue workers, transcript and model-knowledge stores, and the shipped in-memory, JSONL, and SQLite implementations.
---

# Stores

Run truth lives in the [journal](/guide/journal), and the journal lives in a store. Everything else Rulvar persists goes through two sibling seams: a `TranscriptStore` for large blobs, and an optional `ModelKnowledgeStore` for cross-run model claims. All three contracts are deliberately tiny. The journal and transcript seams treat your data as opaque bytes: neither parses a payload, interprets an entry kind, or derives state; the kernel derives every fact by folding entries, and those stores just keep them. The knowledge store follows its own discipline, a versioned snapshot with compare-and-swap, described below.

| Seam | Holds | Shipped implementations |
|---|---|---|
| `JournalStore` | Journal entries and `RunMeta` records | `InMemoryStore`, `JsonlFileStore` (`@rulvar/core`), `SqliteStore` (`@rulvar/store-sqlite`) |
| `TranscriptStore` | Transcripts, turn-boundary checkpoints, worktree patches, persisted compiled-workflow sources | `InMemoryTranscriptStore`, `FileTranscriptStore` (`@rulvar/core`) |
| `ModelKnowledgeStore` | Evidence-backed cross-run model claims | `FileModelKnowledgeStore` (`@rulvar/core`) |

## The journal store contract

A journal store is exactly five methods:

```ts
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
```

That is the whole seam. Suspensions, resolutions, abandoned branches, plan revisions, reuse-by-reference: every mechanism above the kernel is expressed as ordinary appends plus pure folds over the loaded entries, so the storage contract never grows. There is no compare-and-swap, no entry mutation, no query language.

The store is dumb by design, and the dumbness is normative. Four obligations define correctness:

| Obligation | Meaning |
|---|---|
| Atomicity | An append is all-or-nothing; a reader never observes a torn entry. |
| Total per-run order | `load(runId)` returns entries exactly in append order, stable across calls. |
| Read-your-writes | Once an `append` promise resolves, an immediate `load` sees the entry. |
| Opaque payload | Entries come back byte-equivalent as JSON values; unknown kinds and unknown fields pass through untouched. |

The last one matters most. Content keys, the replay disposition, and every fold read loaded entries verbatim; a store that normalizes, deduplicates, reorders, or trims fields silently corrupts replay identity. Run metadata is kept apart on purpose: the engine writes `RunMeta` through `putMeta` as a separate record, so `listRuns` never has to parse journal payloads.

Any store satisfying these obligations works, and the executable definition of "satisfying" is [`@rulvar/store-conformance`](/api/@rulvar/store-conformance/). If you want to build one, see [Writing a store](/guide/store-authors).

## Leases and fencing epochs

A plain `JournalStore` assumes one writing process per run. For queue deployments, where any worker may pick up a suspended run, a store can add the lease capability:

```ts
type Lease = { runId: string; owner: string; epoch: number };

interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
```

The rules:

- `acquire` on a run whose lease is currently held rejects with a typed `LeaseHeldError`. The error is retryable by contract: try again after the holder releases or the ttl expires.
- Leases carry a store-configured ttl; the holder must `renew` at an interval of at most ttl/3.
- The `epoch` is a fencing token: monotonic per run, surviving release and expiry. An `append` or `renew` carrying a stale epoch (an old epoch, a foreign owner, or an expired lease) is rejected, and the rejected entry never becomes visible to a subsequent `load`.

The fencing epoch is what makes multiple workers safe. Pass the lease to `engine.resume(runId, wf, { lease })` and the engine carries it on every journal append of that resume, through the kernel's single append site. A worker that stalls, loses its lease to a timeout, and wakes up later cannot corrupt the journal: its writes carry a stale epoch and bounce. You do not have to trust the zombie to notice it died; the store refuses it. An append carrying no lease is not fenced; it asserts the single-writer precondition instead.

One more check rides the lease path: the [hashVersion compatibility scan](/guide/journal-compatibility) is repeated at acquire, so a worker running an older library cannot write into a journal that already contains newer entries.

## TranscriptStore: big bytes out of the journal

Agent transcripts, turn-boundary checkpoints, and worktree patches are large. Putting them in journal entries would bloat the run's source of truth, so they live in a sibling blob store and journal entries carry only references (`transcriptRef`, `checkpointRef`):

```ts
interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
  delete(ref: string): Promise<void>; // deleting a missing ref is a no-op
}
```

This keeps the journal small and diffable while agents still resume mid-loop: with a durable transcript store, the runtime writes a checkpoint of the canonical history at every turn boundary, so a crash or an approval wait continues the agent from the same turn without repaying turns or re-invoking tools. Blob contents are engine-internal; the seam carries opaque bytes, same discipline as the journal.

Retention is engine-side, never a store obligation. Stores delete single blobs; the engine owns the cascade:

```ts
await engine.deleteRun(runId);              // every blob list(runId) returns, then the journal
const removed = await engine.pruneRun(runId); // checkpoint blobs of completed attempts nothing references
```

`pruneRun` only touches checkpoints of attempts that finished `ok`: completed, paid work replays from the journal and never boots its checkpoint again. Parked, cancelled, escalated, and hanging attempts keep theirs, because park/unpark and crash recovery boot from them.

## ModelKnowledgeStore: the sibling seam

The [model knowledge](/guide/model-knowledge) subsystem keeps evidence-backed claims about models in its own store, with a different write discipline: instead of append-plus-fencing it uses compare-and-swap on a monotonic snapshot version.

```ts
interface ModelKnowledgeStore {
  current(): Promise<KnowledgeSnapshot>;
  commit(ops: ClaimOp[], expectedVersion: number): Promise<number>;
}
```

A `commit` against a version that is no longer current rejects with a typed `KnowledgeCasError`; the recovery mirrors the lease discipline: re-read `current()`, rebase your ops, commit again. Concurrent maintenance writers serialize through CAS rejection rather than locks.

The seam is optional and off by default: an engine without a configured `ModelKnowledgeStore` writes no knowledge entries at all. And even with one configured, workflow runs receive a `current()`-only handle; `commit` is unreachable from the runtime, so a run has no write path into the cross-run medium. The shipped `FileModelKnowledgeStore` keeps the claim store in a single JSON file, `./rulvar.models.json` by default.

## Shipped stores

### In-memory (tests)

`createEngine` without a `stores` block gives you `InMemoryStore` and an in-memory transcript store. Runs execute normally, budgets and journaling all work, and a kept engine instance can even resume its own runs within the same process, but nothing survives a process exit, so a run can never be resumed from another process; a one-time loud warning makes sure the misconfiguration cannot hide in production logs. This is the right default exactly once: in tests, where you want zero filesystem residue.

### The JSONL file store

`JsonlFileStore` is the default durable choice and what the umbrella install path steers you to: it ships in `@rulvar/core`, comes with [`@rulvar/rulvar`](/guide/installation), and is the store the [CLI](/guide/cli) writes by default (a `.rulvar` directory, overridable with `--store`). Each run is a plain JSONL journal file plus a meta record under one directory:

```ts
import { createEngine, FileTranscriptStore, JsonlFileStore } from '@rulvar/core';
import { anthropic } from '@rulvar/anthropic';

const engine = createEngine({
  adapters: [anthropic()],
  stores: {
    journal: new JsonlFileStore({ dir: './runs' }),
    transcripts: new FileTranscriptStore({ dir: './runs' }),
  },
});
```

Because entries are appended as JSON lines in append order, the journal doubles as a human-readable event log: `tail -f` a live run, `git diff` two runs, grep for an entry kind. A crash in the middle of an append leaves at most a torn final line, which the store detects and repairs at load, so atomicity holds. `FileTranscriptStore` keeps blobs as one file per ref beside the journal; pair the two whenever you pair them at all, since a durable journal with in-memory transcripts loses agent checkpoints on crash and cannot resume compiled runs across processes.

`JsonlFileStore` has no lease capability. It is single-writer by contract: one writing process per store directory.

### `@rulvar/store-sqlite`

```bash
pnpm add @rulvar/store-sqlite
```

`SqliteStore` implements both `JournalStore` and `LeasableStore` with fencing epochs, on the `node:sqlite` driver built into Node, so it adds no native build step. It is the reference implementation for community stores: when the [store authors guide](/guide/store-authors) needs a pattern shown against a real backend, this is the store it points at.

```ts
import { SqliteStore } from '@rulvar/store-sqlite';

const store = new SqliteStore({
  path: './rulvar.db', // or ':memory:' for an in-process store
  ttlMs: 60_000,       // lease ttl; 60000 ms is the default
});
```

The options are `path` (a database file, or `':memory:'`), `ttlMs` (lease ttl, default `DEFAULT_LEASE_TTL_MS`, 60000 ms), and an injectable `now` clock so lease expiry is testable without wall-clock sleeps. Call `close()` when you are done with the handle.

A queue worker acquires the lease, resumes with it, renews on a timer, and releases when the run settles:

```ts
import { createEngine, FileTranscriptStore, LeaseHeldError, type Lease } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { anthropic } from '@rulvar/anthropic';
import { review } from './workflows/review.js';

const store = new SqliteStore({ path: './rulvar.db' });
const engine = createEngine({
  adapters: [anthropic()],
  stores: { journal: store, transcripts: new FileTranscriptStore({ dir: './blobs' }) },
});

async function resumeAsWorker(runId: string): Promise<void> {
  let lease: Lease;
  try {
    lease = await store.acquire(runId, `worker-${process.pid}`);
  } catch (error) {
    if (error instanceof LeaseHeldError) return; // another worker owns this run
    throw error;
  }
  const renewer = setInterval(() => void store.renew(lease), 20_000); // at most ttl/3
  try {
    const handle = engine.resume(runId, review, { lease });
    await handle.result;
  } finally {
    clearInterval(renewer);
    await store.release(lease);
  }
}
```

Every append of that resume carries the lease, so if this worker is presumed dead and another acquires the run, the stale worker's remaining writes are fenced out rather than interleaved.

## Choosing a store

| Situation | Store |
|---|---|
| Unit and integration tests | `InMemoryStore` (the default) |
| One application process, durable runs | `JsonlFileStore` + `FileTranscriptStore` |
| Multiple workers over a shared queue | `SqliteStore` (leases and fencing) |
| Ops visibility, greppable and diffable journals | `JsonlFileStore` |
| Another backend (Postgres, an object store, a KV) | Write your own against the SPI; see [Writing a store](/guide/store-authors) |

The contracts are the only coupling point: any `JournalStore` that passes the conformance kit slots into `createEngine` unchanged, and the kernel's determinism does not depend on the backend. Whatever total order a store persists, the folds yield the same outcome on every store and every replay.

## Durability expectations

What "durable" means, per store:

| Store | Survives a process crash | Concurrent writers |
|---|---|---|
| `InMemoryStore` | Nothing; no resume from another process | Not applicable |
| `JsonlFileStore` | Everything appended; a torn tail line from a mid-append crash is repaired at load | One writing process per directory; no lease capability |
| `SqliteStore` | Everything appended, in one database file | Safe under leases; stale epochs are fenced out |

A few engine-level guarantees hold on every durable store:

- An awaited `append` is durable and visible before any of its effects run. Decision entries are written strictly before what they authorize, so a crash between decision and effect rolls forward on resume instead of re-deciding.
- Completed entries are never repaid: replay serves them from the journal with zero live calls (the never-pay-twice invariant). A `running` entry whose terminal write never arrived is re-dispatched at-least-once; see [Durability](/guide/durability) for the full crash-window story.
- Turn-boundary checkpoints require a durable `TranscriptStore`. With one configured, an agent interrupted mid-loop resumes from its last completed turn; without one, the run's journal still replays, but in-flight agent turns are repaid.

::: warning The journal is plaintext by default
Journal payloads are stored as-is, because replay is the product: the engine re-reads entries byte-for-byte. Secret masking applies at the telemetry boundary (emitted events), never to stored entries. If your prompts or step values are sensitive at rest, use the serialization hook below or put the store on an encrypted volume.
:::

## Encrypting stored bytes

The engine offers one policy point between itself and persistence: a serialization hook applied at the append/put boundaries and symmetrically at load/get. Stores stay dumb; the engine wraps whatever stores you configured, and `engine.stores` exposes the wrapped instances so every reader passes the same policy point.

```ts
const engine = createEngine({
  adapters: [anthropic()],
  stores: { journal: store, transcripts: blobs },
  serialization: {
    transcripts: {
      toStored: (ref, blob) => encrypt(blob),   // your cipher
      fromStored: (ref, blob) => decrypt(blob),
    },
  },
});
```

The hook must be symmetric: `fromStored(toStored(e))` has to reproduce the entry byte-identically, because content keys, the replay disposition, and the folds all read loaded entries. Encryption satisfies this; lossy redaction of journaled content voids replay for the affected entries (forward matching reports the misses honestly) and is a deliberate trade, never a default. Kernel identity fields (`seq`, `scope`, `key`, `ordinal`, `kind`, `status`, `hashVersion`) pass through unmodified, and leases and `RunMeta` are not hooked: fencing tokens are not secrets and meta is advisory.

## Where to go next

- [The journal](/guide/journal) for entry identity and the replay predicate the stores exist to serve.
- [Durability](/guide/durability) for resume semantics, crash windows, and the resume preview.
- [Writing a store](/guide/store-authors) for the full community walkthrough and the conformance kit.
- [`@rulvar/core` API](/api/@rulvar/core/) and [`@rulvar/store-sqlite` API](/api/@rulvar/store-sqlite/) for the complete signatures.
