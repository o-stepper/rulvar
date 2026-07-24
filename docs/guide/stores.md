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

That is the whole seam. Suspensions, resolutions, abandoned branches, plan revisions, reuse-by-reference: every mechanism above the kernel is expressed as ordinary appends plus pure folds over the loaded entries, so the storage contract never grows. There is no caller-driven compare-and-swap, no entry mutation, no query language.

The store is dumb by design, and the dumbness is normative. Five obligations define correctness:

| Obligation | Meaning |
|---|---|
| Atomicity | An append is all-or-nothing; a reader never observes a torn entry. |
| Total per-run order | `load(runId)` returns entries exactly in append order, stable across calls. |
| Read-your-writes | Once an `append` promise resolves, an immediate `load` sees the entry. |
| Opaque payload | Entries come back byte-equivalent as JSON values; unknown kinds and unknown fields pass through untouched. |
| Monotonic seq | An append whose `seq` is not strictly greater than the run's stored tail rejects with the typed `JournalOrderViolation` and never becomes visible; two entries with the same `(runId, seq)` can never both persist. |

Monotonic seq is the store's one integrity constraint, and it reads a single top-level field of the entry envelope, never the payload. It exists to fence off a second writer racing the same journal from a stale tail (a double resume, a zombie segment): exactly one racer persists and the loser gets the typed conflict instead of silently corrupting replay. In-process it complements the engine's own rule that exactly one live segment owns a run (see [Resolving a settled run](/guide/durability#resolving-a-settled-run)); cross-process, fencing remains the lease epoch's job.

Opaque payload matters most. Content keys, the replay disposition, and every fold read loaded entries verbatim; a store that normalizes, deduplicates, reorders, or trims fields silently corrupts replay identity. Run metadata is kept apart on purpose: the engine writes `RunMeta` through `putMeta` as a separate record, so `listRuns` never has to parse journal payloads.

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

## The fenced writes capability

The epoch above fences journal appends. `putMeta` and `delete` accept the same optional trailing lease, and a store can promise to enforce it there too by declaring the marker:

```ts
interface FencedJournalStore extends JournalStore {
  readonly fencedWrites: true;
}
```

The promise (the executable definition is `fencedWritesConformance` in the conformance kit): every mutation carrying a lease verifies it is the current holder FOR THE RUN THE MUTATION TARGETS, atomically with the mutation itself, and rejects with the typed `LeaseHeldError` leaving nothing changed when it is not; a lease for a different run guards nothing; a mutation carrying no lease keeps single-writer semantics. The engine threads the segment's lease into every meta write and every transcript blob write of a leased resume, so over a declaring store a superseded worker can no longer overwrite the successor's meta row at its late settle (the stranded run finding of the [fenced run state RFC](/contributing/rfc-fenced-run-state)), and the queue worker's retention sweep passes its brief lease through `engine.deleteRun` so a fenced store refuses a deletion from a superseded holder. Note the boot consequence: a stale segment's very first meta write is refused typed, so it dies with zero paid calls instead of paying a live dispatch whose append then bounces.

`SqliteStore` declares the marker on both sides. The journal store itself enforces it on `append`, `putMeta`, and `delete`, and its `transcripts()` method returns the transcript-side twin: a `TranscriptStore` whose blobs live in the same database as the lease rows, which is what makes the capability implementable at all (fencing a blob write atomically needs the blobs and the lease state in one transactional domain). Over the pair, a superseded segment's late checkpoint save is refused typed instead of landing last write wins at the deterministic ref both segments share, so a later boot of the attempt can no longer decode regressed turn state and replay turns the successor already paid for (the checkpoint finding of the RFC). The shipped file and in-memory transcript stores do NOT declare the marker (they are single-writer by contract), so checkpoint blobs stay advisory over those. A host that requires the full fence asserts it at deployment time with `assertFencedWrites(engine.stores)` (or checks one store with `hasFencedWrites`), both exported from `@rulvar/core`:

```ts
import { createEngine, assertFencedWrites } from '@rulvar/core';
import { anthropic } from '@rulvar/anthropic';
import { SqliteStore } from '@rulvar/store-sqlite';

const store = new SqliteStore({ path: './rulvar.db' });
const stores = { journal: store, transcripts: store.transcripts() };
assertFencedWrites(stores); // throws unless BOTH declare fencedWrites
const engine = createEngine({ adapters: [anthropic()], stores });
```

## The multi-process soak

The capability suites above prove each fenced surface in isolation. The soak proves the whole promise under real concurrency: `runMultiProcessSoak` in the conformance kit spawns writer processes that storm one store location through every fenced surface (journal appends, meta writes, transcript blob puts and deletes, fenced run deletion, renew, release), with stalls injected past the lease ttl so takeovers happen while superseded holders are still alive and probing every surface with their dead leases. Each accepted mutation carries the holder's epoch and a per-tenure counter, so afterwards the referee rebuilds the one serial history fencing requires and diffs it against the actual journal, meta row, and blobs: any stale acceptance, lost accepted write, epoch inversion, or divergent final byte fails the soak. The storm runs until an activity quorum is met (takeover count, per-surface accepted writes, typed stale rejections), so a slower machine storms longer instead of asserting on thin coverage.

Concurrent construction is deliberately part of the exercise: every writer constructs the store bare, at the same moment, over the same fresh location, because a fleet start does exactly that. The soak's first storm found that defect in the reference store (concurrent boots collided in the schema bootstrap and died with a raw SQLITE_BUSY) before it reached the fencing at all; the constructor now retries its idempotent bootstrap under a wall-clock bound. `SqliteStore` runs the soak in its own test suite; wiring it for your store is shown in [Writing a store](/guide/store-authors#the-multi-process-soak).

## The meta lookup capability

Point operations (`engine.resume`, the HTTP status endpoint, CLI `resume` and `inspect`, the deterministic planner lookup) need ONE run's metadata, and forcing them through `listRuns` makes each of them scan the whole catalog. A store can add the exact lookup capability, optional exactly like the lease capability:

```ts
interface MetaLookupStore extends JournalStore {
  getMeta(runId: string): Promise<RunMeta | undefined>;
}
```

A missing run resolves `undefined`, never a rejection. Callers detect the capability with `hasMetaLookup(store)` or just go through `readRunMeta(store, runId)`, which uses `getMeta` when present and falls back to the `listRuns` scan for stores written before the capability; both are exported from `@rulvar/core`. All three shipped stores implement it (`SqliteStore` as a primary key query, `JsonlFileStore` as a single file read, `InMemoryStore` as a map hit), and the serialization hook wrapper preserves it, meta being unhooked either way.

Alongside it, `RunFilter` carries an advisory `statuses` array (match any; combines with the singular `status` so a meta matches when either does). The queue worker asks for `{ statuses: ['running', 'suspended'] }` so its poll cost tracks the resumable backlog, not the whole history. Advisory means a store may ignore the field and return a superset, and callers re-check status on what comes back; a conformant store must never DROP a matching meta (the conformance kit checks exactly that, plus `getMeta` agreement when the capability is present).

`RunMeta` also records `genesis`: a token minted at the run's fresh start and preserved verbatim by every resume segment. It is the generation identity that tells a `deleteRun`-then-recreate of the same explicit runId apart from the original run, which journal length and workflow hash cannot. Stores must round-trip it like every optional meta field.

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

Refs stay inside the store. Every segment of a ref (and every `runId`, which prefixes the checkpoint and workflow source refs) must be a safe filename token over `[A-Za-z0-9._-]`, and be neither empty, `.`, nor `..`; the resolved path must stay under the configured directory. `FileTranscriptStore` enforces this on `put`, `get`, `list`, and `delete`, and the engine refuses an unsafe `runId` with a typed `ConfigError` before its first write. An untrusted ref or run id therefore cannot read, write, or delete a blob outside the root.

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

::: warning Synchronous I/O behind async signatures
Both shipped durable stores use synchronous Node primitives under their async signatures: `JsonlFileStore` reads and writes with `node:fs` sync calls, and `SqliteStore` runs on the synchronous `node:sqlite` driver. Every call blocks the event loop for its duration, which is negligible for point operations (`getMeta`, an append) and noticeable for large scans (`listRuns` over tens of thousands of runs, `load` of a huge journal) inside a server process that must stay responsive. Pass filters so scans stay narrow, keep the catalog pruned with retention, or put a worker process between the store and the request path when the catalog grows large.
:::

### `@rulvar/store-sqlite`

```bash
pnpm add @rulvar/store-sqlite
```

`SqliteStore` implements both `JournalStore` and `LeasableStore` with fencing epochs, on the `node:sqlite` driver built into Node, so it adds no native build step. It is the reference implementation for community stores: when the [store authors guide](/guide/store-authors) needs a pattern shown against a real backend, this is the store it points at. The fence check and the mutation it guards (an append's insert, a renew's extension, a release's deletion) commit as one immediate transaction, so a takeover from another process cannot land between the check and the write; a store author porting the pattern to another backend must keep that atomicity (the [fenced run state RFC](/contributing/rfc-fenced-run-state) records what went wrong when the reference store itself checked in one statement and mutated in the next).

```ts
import { SqliteStore } from '@rulvar/store-sqlite';

const store = new SqliteStore({
  path: './rulvar.db', // or ':memory:' for an in-process store
  ttlMs: 60_000,       // lease ttl; 60000 ms is the default
});
```

The options are `path` (a database file, or `':memory:'`), `ttlMs` (lease ttl, default `DEFAULT_LEASE_TTL_MS`, 60000 ms), and an injectable `now` clock so lease expiry is testable without wall-clock sleeps. `ttlMs` must be an integer between 1 and 2147483647 ms, refused as a `ConfigError` before the database opens: zero or a negative would make every lease born expired (an immediate takeover by a second owner), NaN failed the first acquire with a raw sqlite error, and Infinity never expired. The configured value is exposed as the readonly `leaseTtlMs`, the optional `LeasableStore` capability `createWorker` verifies its own ttl against. `transcripts()` returns the [fenced transcript twin](#the-fenced-writes-capability) over the same database (one per store, sharing its connection, so it works for `':memory:'` too and there is nothing separate to close). Call `close()` when you are done with the handle.

A queue worker acquires the lease, resumes with it, renews on a timer, and releases when the run settles:

```ts
import { createEngine, LeaseHeldError, type Lease } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { anthropic } from '@rulvar/anthropic';
import { review } from './workflows/review.js';

const store = new SqliteStore({ path: './rulvar.db' });
const engine = createEngine({
  adapters: [anthropic()],
  // The transcript twin keeps blobs in the same database, so checkpoint
  // saves ride the same fence as journal appends and meta writes.
  stores: { journal: store, transcripts: store.transcripts() },
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

The package also ships `SqliteQuotaLimiter`, the cross-process reference implementation of the core `QuotaLimiter` SPI: engine processes pointing it at one database file (its own file, or the store's) enforce one global provider quota, with admission inside a single `BEGIN IMMEDIATE` transaction, reservations as rows so reconciliation works from any process, and both tables lazily pruned to two accounting windows. Its options are `path`, the shared `rules` (validated by the core's `validateQuotaRules`, and required to be identical across processes because buckets key on rule content), and an injectable `now`. What the engine does with a denial, and the rule model itself, is the subject of [shared provider quotas](/guide/model-routing#shared-provider-quotas-across-processes).

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
Journal payloads are stored as-is, because replay is the product: the engine re-reads entries byte-for-byte. Secret masking applies at the telemetry boundary (emitted events), never to stored entries. If your prompts or step values are sensitive at rest, use the serialization hook below or put the store on an encrypted volume. `RunMeta` is not hooked (the serialization hook covers journal entries only), and `RunMeta.argsHash` is a deterministic, unsalted SHA-256 of the genesis args: it reveals when two runs shared identical args and low-entropy args are recoverable by hashing candidate values, so treat meta and `rulvar inspect` output as sensitive alongside the journal and transcripts.
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

The hook must be symmetric: `fromStored(toStored(e))` has to reproduce the entry byte-identically, because content keys, the replay disposition, and the folds all read loaded entries. Encryption satisfies this; lossy redaction of journaled content voids replay for the affected entries (forward matching reports the misses honestly) and is a deliberate trade, never a default. Kernel identity fields (`seq`, `scope`, `key`, `ordinal`, `kind`, `status`, `hashVersion`) pass through unmodified, and leases and `RunMeta` are not hooked: fencing tokens are not secrets, and the meta record is written whole by the engine, so there is nothing for a payload policy to intercept.

Do not read "not hooked" as "disposable". The journal entries stay the sole source of truth for paid work and replay, and within `RunMeta` only the listing conveniences read as summaries: `status`, `name`, and `tags` serve `listRuns`, and the hash-version summary fields (`hashVersionLow`/`hashVersionHigh`) are advisory by contract, with the journal authoritative. Every other field must round-trip byte-stably, unknown fields included (persist the record opaquely and additions never break you): the engine restores a resumed run's immutable ceiling from `budgetUsd` (a store that drops it silently uncaps the resume), rebinds and rehydrates through `workflowName`/`workflowHash`/`workflowSourceRef` (losing them strands compiled runs and voids binding checks), seeds each segment's telemetry counters from `segments`, and hosts verify re-supplied resume args against `argsProvided`/`argsHash`. The [conformance kit](/guide/store-authors) checks the round-trip of all of these.

## Where to go next

- [The journal](/guide/journal) for entry identity and the replay predicate the stores exist to serve.
- [Durability](/guide/durability) for resume semantics, crash windows, and the resume preview.
- [Writing a store](/guide/store-authors) for the full community walkthrough and the conformance kit.
- [`@rulvar/core` API](/api/@rulvar/core/) and [`@rulvar/store-sqlite` API](/api/@rulvar/store-sqlite/) for the complete signatures.
