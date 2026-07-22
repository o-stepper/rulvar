---
title: Writing a store
description: How to implement a JournalStore, the lease capability, and a TranscriptStore against the frozen storage seam, and certify the result with @rulvar/store-conformance.
---

# Writing a store

Rulvar persists run truth through a deliberately tiny storage seam, and the seam is frozen: the journal contract has exactly five methods, it has not grown since 1.0, and every mechanism added since (suspensions, abandoned branches, plan revisions, reuse-by-reference) rides ordinary appends plus pure folds over loaded entries. That makes a third-party store a small, finishable project. This page walks you through building one, from the byte contract to a green conformance run and a publishable package.

If you have not read [Stores](/guide/stores) yet, start there: it covers the seam from the user's side and the shipped implementations. This page is the author's side. The reference implementation to crib from is `SqliteStore` in [`@rulvar/store-sqlite`](/api/@rulvar/store-sqlite/); the executable definition of correctness is [`@rulvar/store-conformance`](/api/@rulvar/store-conformance/).

| Contract | Required? | Holds |
|---|---|---|
| `JournalStore` | Yes | Journal entries and `RunMeta` records |
| `LeasableStore` | Optional capability | Adds run ownership for multi-worker deployments |
| `TranscriptStore` | Optional sibling seam | Large blobs: transcripts, checkpoints, worktree patches |

## The five-method byte contract

Everything you implement is imported from `@rulvar/core`; a store package depends on nothing else.

```ts
import type { JournalEntry, JournalStore, Lease, RunFilter, RunMeta } from '@rulvar/core';

interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
```

Your store is a dumb byte mover. The kernel above it derives every fact (replay decisions, budget ledgers, plan state) by folding loaded entries; the store never interprets what it holds. Five obligations define correctness:

| Obligation | Meaning |
|---|---|
| Atomicity | An append is all-or-nothing; a reader never observes a torn entry. |
| Total per-run order | `load(runId)` returns entries exactly in append order, stable across calls. The store never reorders. |
| Read-your-writes | Once an `append` promise resolves, an immediately following `load` from the same client sees the entry. |
| Opaque payload | Entries come back byte-equivalent as JSON values. Unknown kinds and unknown fields pass through untouched. |
| Monotonic seq | An append whose `seq` is not strictly greater than the run's stored tail rejects with the typed `JournalOrderViolation` and never becomes visible. Two entries with the same `(runId, seq)` can never both persist. |

Monotonic seq is the store's one integrity constraint, and the exception that proves the dumbness rule: it reads a single top-level field of the entry envelope (never the payload) to fence off a second writer racing the journal from a stale tail. Exactly one of the racers persists; the loser gets the typed conflict instead of silently corrupting replay.

Opacity is the one authors break most often, and it is the one with the worst blast radius. Content keys, the replay disposition, and every fold read loaded entries verbatim; a store that deduplicates, normalizes key order, trims fields, or coerces numbers silently corrupts replay identity, and the run pays for work it already paid for. Never parse a payload; store the serialized bytes and hand them back.

Two structural rules complete the contract:

- **Meta separation.** The engine writes `RunMeta` through `putMeta` as its own record, precisely so that `listRuns` can filter by `status`, `name`, and `tags` without ever parsing a journal payload. Keep the two record types apart in your schema. `RunFilter` also carries an advisory `statuses` array (match any, combining with the singular `status` so a meta matches when either does): you may ignore it and return a superset, but you must never drop a meta whose status matches. Round-trip every optional `RunMeta` field byte for byte, including `genesis` (the run's generation token). Consider the optional exact lookup capability, `getMeta(runId): Promise<RunMeta | undefined>` (interface `MetaLookupStore`): the engine, the HTTP shell, and the CLI route every point lookup through it when present instead of scanning `listRuns`, and a missing run resolves `undefined`, never a rejection.
- **`delete(runId)` removes the journal and the meta** (and any lease state you keep). It does not touch transcript blobs: the engine owns that cascade (`Engine.deleteRun` lists and deletes blobs first, then calls your `delete`), so stores never reach into a `TranscriptStore`.

There is no caller-driven compare-and-swap, no entry mutation, no query language, and nothing for you to validate inside a payload. The one envelope field you read is `seq`, for the monotonicity guard, and monotonic means strictly greater than the stored tail, never contiguous: do not require `seq` to advance by exactly one, and do not inspect anything else. Your store validates no payload contents; it preserves order and rejects a stale tail.

## The lease capability and fencing

A plain `JournalStore` asserts one writing process per run. To support queue deployments, where any worker may pick up a run, implement the lease capability:

```ts
interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}

type Lease = { runId: string; owner: string; epoch: number };
```

The semantics, all of which the conformance kit checks:

- `acquire` on a run whose lease is currently held and unexpired rejects with the typed `LeaseHeldError` from `@rulvar/core`. The error is retryable by contract: callers retry after the holder releases or the ttl elapses.
- `acquire` on an **expired** lease succeeds. Expiry means the run is free; only a live lease rejects.
- Leases carry a store-configured ttl, and holders renew at an interval of at most ttl/3. The shipped `SqliteStore` defaults its ttl to 60000 ms and takes an injectable clock so expiry is testable without wall-clock sleeps; copy both decisions.
- The `epoch` is a fencing token: **monotonic per run, surviving release and expiry**. Every `acquire` hands out a strictly higher epoch than any lease that run has ever had.
- Fencing: an `append` or `renew` carrying a lease that is not the current holder (stale epoch, foreign owner, or expired) rejects with `LeaseHeldError`, and the rejected entry must never become visible to a subsequent `load`.
- Atomicity of the fence: the check and the mutation it guards must commit as one unit. The in-memory store below gets this for free (each method is one synchronous step), but on a real backend a check in one statement and a mutation in the next leaves a window where a takeover lands between them and the stale holder's write wins anyway; the shipped `SqliteStore` wraps both in one immediate transaction, and the [fenced run state RFC](/contributing/rfc-fenced-run-state) records the three ways the window bit before it did.

That last rule is the entire point. During a leased resume the engine carries the lease on every journal append, so a worker that stalls, loses its lease, and wakes up later cannot corrupt the journal: its writes carry a stale epoch and your store refuses them. Nobody has to trust the zombie to notice it died. An `append` carrying no lease is not fenced; it asserts the single-writer precondition instead, which is the honest contract of embedded single-process use.

## A complete minimal store

The store below is the smallest correct `LeasableStore`: in-memory maps, a JSON round-trip for payload isolation, per-run epoch counters that survive release, and an injectable clock. It passes the full conformance kit, and Rulvar's own test suite exercises the same store (the listing differs only in comments and formatting), so it cannot rot unnoticed.

`LeasableStore` also declares an OPTIONAL readonly `leaseTtlMs` capability: a
store exposing its configured ttl lets `createWorker` verify at construction
that the worker's renew cadence matches the store's expiry (and lets an
omitted worker `ttlMs` adopt the store's value). Stores without the member
are still conformant; the worker then trusts its own configured ttl. If your
store takes a ttl option, validate it as a positive integer within the Node
timer range and expose it here.

```ts
import {
  JournalOrderViolation,
  LeaseHeldError,
  type JournalEntry,
  type Lease,
  type LeasableStore,
  type RunFilter,
  type RunMeta,
} from '@rulvar/core';

export interface CommunityMemoryStoreOptions {
  /** Lease ttl in milliseconds; the reference default is 60000. */
  ttlMs?: number;
  /** Injectable clock for deterministic expiry tests. */
  now?: () => number;
}

export class CommunityMemoryStore implements LeasableStore {
  private readonly entries = new Map<string, string[]>();
  private readonly metas = new Map<string, RunMeta>();
  private readonly leases = new Map<string, { lease: Lease; expiresAt: number }>();
  private readonly epochs = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly clock: () => number;

  constructor(options: CommunityMemoryStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 60_000;
    this.clock = options.now ?? Date.now;
  }

  /** The current holder, or undefined once expired: expiry frees the run. */
  private liveLease(runId: string): Lease | undefined {
    const held = this.leases.get(runId);
    if (held === undefined || held.expiresAt <= this.clock()) {
      return undefined;
    }
    return held.lease;
  }

  private assertFencing(lease: Lease): void {
    const live = this.liveLease(lease.runId);
    if (live === undefined || live.owner !== lease.owner || live.epoch !== lease.epoch) {
      throw new LeaseHeldError(
        `stale fencing epoch for run '${lease.runId}': (owner ${lease.owner}, epoch ` +
          `${lease.epoch}) is not the current holder; nothing became visible`,
      );
    }
  }

  async append(runId: string, e: JournalEntry, lease?: Lease): Promise<void> {
    if (lease !== undefined) {
      this.assertFencing(lease);
    }
    // Serialize BEFORE the push: a JSON.stringify failure appends nothing
    // (atomicity), and the string snapshot isolates the store from later
    // caller mutation (opaque payload).
    const row = JSON.stringify(e);
    const rows = this.entries.get(runId) ?? [];
    // Monotonic seq: a stale or duplicate seq means a second writer raced
    // this journal from an outdated tail; the loser gets the typed
    // conflict and nothing becomes visible.
    const tail = rows[rows.length - 1];
    const tailSeq = tail === undefined ? undefined : (JSON.parse(tail) as JournalEntry).seq;
    if (typeof tailSeq === 'number' && Number.isFinite(e.seq) && e.seq <= tailSeq) {
      throw new JournalOrderViolation(
        `append of seq ${e.seq} to run '${runId}' is not after the stored tail seq ${tailSeq}`,
      );
    }
    rows.push(row);
    this.entries.set(runId, rows);
  }

  async load(runId: string): Promise<JournalEntry[]> {
    return (this.entries.get(runId) ?? []).map((row) => JSON.parse(row) as JournalEntry);
  }

  async putMeta(m: RunMeta): Promise<void> {
    this.metas.set(m.runId, JSON.parse(JSON.stringify(m)) as RunMeta);
  }

  async listRuns(f?: RunFilter): Promise<RunMeta[]> {
    return [...this.metas.values()].filter(
      (m) =>
        (f?.status === undefined || m.status === f.status) &&
        (f?.name === undefined || m.name === f.name) &&
        (f?.tags === undefined || f.tags.every((tag) => m.tags?.includes(tag))),
    );
  }

  async delete(runId: string): Promise<void> {
    this.entries.delete(runId);
    this.metas.delete(runId);
    this.leases.delete(runId);
  }

  async acquire(runId: string, owner: string): Promise<Lease> {
    const live = this.liveLease(runId);
    if (live !== undefined) {
      throw new LeaseHeldError(
        `run '${runId}' is leased by '${live.owner}' (epoch ${live.epoch})`,
      );
    }
    // The epoch counter outlives releases and expiries: a returning
    // holder can never reuse an old epoch, so its stale appends stay
    // rejectable forever.
    const epoch = (this.epochs.get(runId) ?? 0) + 1;
    this.epochs.set(runId, epoch);
    const lease: Lease = { runId, owner, epoch };
    this.leases.set(runId, { lease, expiresAt: this.clock() + this.ttlMs });
    return lease;
  }

  async renew(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.set(l.runId, { lease: l, expiresAt: this.clock() + this.ttlMs });
  }

  async release(l: Lease): Promise<void> {
    this.assertFencing(l);
    this.leases.delete(l.runId);
  }
}
```

Three implementation notes generalize beyond memory:

- **Make acquire atomic.** Durable backends must make the check-and-bump a single atomic operation. `SqliteStore` wraps it in `BEGIN IMMEDIATE`; a SQL backend can use one conditional `UPDATE`; an object store can compare-and-swap on a lease document.
- **Keep the epoch counter in its own record.** Never store the epoch only inside the lease row: if release deletes the row and the counter with it, a later acquire restarts at epoch 1 and a zombie's old lease becomes current again. The counter must outlive every lease.
- **Snapshot at the boundary.** Whatever your backend, make sure a caller mutating an object after `append` (or after `load`) cannot mutate stored history. Serializing on the way in, as above, solves both directions at once.

## TranscriptStore: the blob seam

Transcripts, turn-boundary checkpoints, and worktree patches are large, so they live in a sibling blob store and journal entries carry only references. The contract is four methods over opaque bytes (`Bytes` is `Uint8Array`):

```ts
import type { Bytes, TranscriptStore } from '@rulvar/core';

interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
  delete(ref: string): Promise<void>;
}
```

The same discipline applies: blob contents are engine-internal, so store and return the bytes exactly. Two behaviors are contractual: `get` on a missing ref returns `null`, and `delete` on a missing ref is a no-op, never an error. As with the journal, the cascade over a run's blobs is engine-side: `Engine.deleteRun` deletes every blob `list(runId)` returns and then the journal, so your `delete` only ever removes one blob.

## Certifying with the conformance kit

`@rulvar/store-conformance` is the executable definition of the seam: a store that passes it is a Rulvar store, and a store that does not is not. Add it as a dev dependency and wire it into any vitest (or jest) suite:

```bash
pnpm add -D @rulvar/store-conformance
```

```ts
import { describe, it } from 'vitest';
import {
  journalStoreConformance,
  leasableStoreConformance,
  registerConformance,
} from '@rulvar/store-conformance';
import { CommunityMemoryStore } from './community-memory-store.js';

registerConformance(
  journalStoreConformance(() => new CommunityMemoryStore()),
  { describe, it },
);

registerConformance(
  leasableStoreConformance(() => new CommunityMemoryStore({ ttlMs: 150 }), { ttlMs: 150 }),
  { describe, it },
);
```

The factory you pass must return a **fresh, isolated store on every call**; checks run against independent instances, so a file-backed store should create a new temp directory per call. Passing `ttlMs` to `leasableStoreConformance` enables the wall-clock expiry and renew-keeps-held checks; keep it small (about 150 ms) so the suite stays fast. Outside a test framework, every suite also runs standalone:

```ts
const suite = journalStoreConformance(() => new CommunityMemoryStore());
await suite.run(); // throws a descriptive Error on the first violation
```

What the kit proves:

| Check | What it proves |
|---|---|
| The four byte obligations | Atomicity, total per-run order, read-your-writes, and byte-for-byte opaque payloads, including unknown kinds and fields. |
| Meta separation | `putMeta` and `listRuns` operate on separate records and honor the `RunFilter` fields. |
| Golden fold-state fixture | A fixed journal of resolution, noop, invalid, and abandon entries round-trips your store; the sha256 of the materialized fold state must equal the frozen reference hash, identical across every store. |
| Decide-once oracle | An end-to-end scripted race of two resolution attempts yields exactly one applied classification, and a replay-strict pass over your store then makes zero live calls. |
| Abandon fixture | Resume issues not a single live call inside an abandoned subtree: the covered dispatch derives skipped and contributes zero to the ledger fold. |
| Lease exclusivity | `acquire` on a held, unexpired lease rejects with the typed `LeaseHeldError`. |
| Epoch monotonicity | The fencing epoch never repeats for a run, across release and expiry. |
| Stale-append invisibility | An append carrying a stale epoch is rejected and never appears in `load`. |
| Ttl expiry and renew cadence | Expiry frees the run; renewing keeps it held (enabled by `ttlMs`). |

The golden fixture is exported for debugging. When the fold-state check fails, replay it by hand to see where your bytes diverge:

```ts
import {
  GOLDEN_FOLD_JOURNAL,
  GOLDEN_FOLD_STATE_SHA256,
  foldStateSha256,
} from '@rulvar/store-conformance';

const store = new CommunityMemoryStore();
for (const entry of GOLDEN_FOLD_JOURNAL) {
  await store.append('golden', entry);
}
console.log(foldStateSha256(await store.load('golden')) === GOLDEN_FOLD_STATE_SHA256);
```

If that prints `false`, your store altered a payload somewhere between append and load; diff the loaded entries against `GOLDEN_FOLD_JOURNAL` field by field.

## Common failure modes

- **Normalizing payloads.** Dropping undefined-like fields, reordering keys, or coercing numbers breaks the opaque-payload obligation and, downstream, replay identity. Store the serialized bytes.
- **Shared mutable objects.** Handing the same object to `append` bookkeeping and later `load` callers lets a caller mutate history. Snapshot on the way in or the way out.
- **Resetting the epoch on release.** A zombie writer can then reuse an epoch after a failover; the fencing conformance check will catch it, but design it right first: the counter lives outside the lease.
- **Rejecting `acquire` on an expired lease.** Expiry means the run is free. Only a live lease rejects.
- **Enforcing `seq` contiguity instead of monotonicity.** The guard rejects a `seq` that is not strictly greater than the stored tail; requiring exactly tail plus one is stricter than the contract and will fail journals with legitimate gaps. And the guard reads only that one envelope field: the store still validates no payload contents.
- **Skipping the monotonicity guard.** Without it, two writers racing the same journal from a stale tail (a double resume, a zombie segment) both persist, and replay folds over a corrupt double history. The `a5-monotonic-seq` and `a5-stale-tail-race` conformance checks fail a store that accepts duplicates.

## Packaging and versioning

A store package should be small and boring. The checklist to hold yours to:

- **Depend only on the public SPI.** Import `JournalStore`, `LeasableStore`, `TranscriptStore`, `Lease`, `LeaseHeldError`, and the entry types from `@rulvar/core`; never reach into internals. Since the imports are types plus one error class, a third-party store should declare `@rulvar/core` as a peer dependency with a wide range, so the host never ends up with two copies of the engine (a single engine instance, no duplicated registries). `@rulvar/store-sqlite` itself ships a regular dependency on `@rulvar/core`, pinned to the matching version by the monorepo's lockstep releases; outside the monorepo, the peer range is the safer default.
- **Match the platform baseline.** Rulvar is ESM only and requires Node 22.12.0 or newer; publish your store the same way.
- **Round-trip every `RunMeta` field**, the optional ones included: the engine restores a resumed run's budget ceiling from `RunMeta.budgetUsd` (a store that drops unknown fields silently uncaps resumed runs), seeds per-segment telemetry counters from `segments`, and hosts verify re-supplied resume args against `argsProvided`/`argsHash`. Persist the record opaquely (the shipped stores store it as one JSON payload) and the conformance kit's round-trip check stays green as fields are added.
- **Run the full conformance kit in CI**, on every backend configuration you claim to support, and say so in the README. The kit is the compatibility statement: the seam is frozen, so a store that passes today keeps working across engine versions. Journal-format evolution happens inside payloads via per-entry versioning and is invisible to a correct store, precisely because payloads are opaque (see [Journal compatibility](/guide/journal-compatibility)).
- **Exercise cross-process fencing** where the backend supports it: two store instances over one database, one acquires, the other's appends must bounce. The `@rulvar/store-sqlite` suite shows the pattern.
- **Make the lease ttl configurable and documented**, and take an injectable clock (`now`) so lease expiry is testable without wall-clock sleeps.
- **State the durability model in the README**: what survives a process crash, and which backend primitive makes `acquire` atomic.

Version the package on your backend's terms; Rulvar's own release policy is in [Versioning](/reference/versioning).

## Where to go next

- [Stores](/guide/stores) for the user-side view of the seam and the shipped implementations.
- [The journal](/guide/journal) for entry identity and the replay machinery your bytes serve.
- [Durability](/guide/durability) for resume semantics and crash windows.
- [`@rulvar/store-conformance` API](/api/@rulvar/store-conformance/) and [`@rulvar/store-sqlite` API](/api/@rulvar/store-sqlite/) for complete signatures.
