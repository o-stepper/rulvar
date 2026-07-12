/**
 * createWorker (M8-T02): the queue shell over the public engine API
 * (FR-703). Canonical signature
 * `createWorker(engine, { store: LeasableStore, concurrency? })`.
 *
 * The worker leases resumable ('running' meta: a crashed or currently
 * owned run) and suspended runs via acquire/renew/release with the
 * fencing epoch; acquire on a held lease rejects with LeaseHeldError and
 * the worker simply moves on. Stateless workers call engine.resume,
 * passing the lease via ResumeOptions.lease so EVERY engine append of
 * the resumed run is fenced (M8 entry amendment):
 * lease theft is impossible because a stale writer's appends are
 * rejected by the store and never become visible, whether or not the
 * stale worker noticed it lost the lease.
 *
 * DEF-6 at acquire: the journal's hashVersion window is re-checked
 * immediately after every acquire, strictly before any append; a
 * JournalCompatibilityError releases the lease and poisons the run for
 * this worker (an older library never writes into a newer journal).
 *
 * Queue semantics are honestly at-least-once with deduplication by the
 * journal: re-leasing a settled or unchanged
 * run replays to the same outcome with zero live calls. Workflows
 * resolve through the engine's defaults.workflows registry plus the
 * persisted CompiledWorkflow sources, never through a worker parameter;
 * original in-process run arguments are not
 * journaled in v1, so the host MAY re-supply them per run via `argsFor`
 * (OQ-21).
 *
 * Appendix A (committed at M8 entry): concurrency defaults to 1 (one
 * leased run per worker process; hosts scale out by adding workers,
 * which the fencing epoch makes safe by construction); the renew
 * cadence is ttl/3 with the reference ttl of 60000 ms. There is no
 * distributed cross-process rate limiter in v1 (EXC-14; OQ-17):
 * divide provider quota per worker or front an external
 * gateway.
 */
import {
  ConfigError,
  JournalCompatibilityError,
  LeaseHeldError,
  buildDeriverRegistry,
  normalizeEntry,
  scanJournalCompatibility,
  type Engine,
  type JournalStore,
  type KeyDeriver,
  type LeasableStore,
  type Lease,
  type RunMeta,
} from '@rulvar/core';

/** Appendix A: the committed reference lease ttl. */
export const DEFAULT_WORKER_TTL_MS = 60_000;

export interface CreateWorkerOptions {
  /**
   * The LeasableStore to lease runs from; MUST be the same journal the
   * engine writes (Engine.stores.journal), or the fencing epoch would
   * protect a store nobody appends to. Verified at start.
   */
  store: LeasableStore;
  /** Appendix A: leased runs per worker process; default 1. */
  concurrency?: number;
  /** Lease owner id; defaults to a per-process identity. */
  owner?: string;
  /**
   * The store's lease ttl; the worker renews at ttl/3 (the normative
   * bound). Default: the Appendix A reference 60000 ms.
   * MUST match the store's configured ttl.
   */
  ttlMs?: number;
  /** Idle sweep cadence for start(); default 1000 ms. */
  pollMs?: number;
  /**
   * The OQ-21 interim channel: original in-process run arguments are not
   * journaled in v1, so the host re-supplies them per run. Absent means
   * args resume as undefined (fully replayed prefixes never notice).
   */
  argsFor?: (meta: RunMeta) => unknown;
  /** DEF-6 window extension, in lockstep with the engine assembly. */
  extraDerivers?: KeyDeriver[];
  /** Observability hook for per-run failures; never throws into the loop. */
  onError?: (runId: string, error: unknown) => void;
  /**
   * Opt-in retention (OQ-20 executed at M8-T04): evaluated
   * during sweeps over SETTLED runs (terminal meta); a true verdict
   * applies engine.deleteRun under a briefly held lease. Absent means
   * everything persists indefinitely.
   */
  retention?: (meta: RunMeta) => boolean;
}

export interface Worker {
  /** Begins sweeping on the poll cadence. Idempotent. */
  start(): void;
  /**
   * One sweep: lease and resume eligible runs up to the concurrency
   * cap. Returns the number of runs picked up. Exposed so hosts and
   * tests can drive the worker deterministically without timers.
   */
  sweep(): Promise<number>;
  /** Stops sweeping, cancels in-flight runs, releases held leases. */
  stop(): Promise<void>;
  /** runIds currently held by this worker. */
  active(): string[];
}

const CANDIDATE_STATUSES = new Set(['running', 'suspended']);

// A process-local counter, not Math.random(): worker identity needs
// uniqueness within the store, and the dev-mode bare-randomness guard
// stays armed while any suspended body is parked.
let workerOrdinal = 0;

function workerIdentity(): string {
  workerOrdinal += 1;
  return `rulvar-worker:${process.pid}:${workerOrdinal}`;
}

export function createWorker(engine: Engine, options: CreateWorkerOptions): Worker {
  const store = options.store;
  const isLeasable =
    typeof (store as Partial<LeasableStore>).acquire === 'function' &&
    typeof (store as Partial<LeasableStore>).renew === 'function' &&
    typeof (store as Partial<LeasableStore>).release === 'function';
  if (!isLeasable) {
    // Never a silent split-brain (FR-703).
    throw new ConfigError(
      'createWorker requires a LeasableStore (acquire/renew/release with fencing epochs); ' +
        'the supplied store has no lease capability. Use ' +
        '@rulvar/store-sqlite or another conformant LeasableStore.',
    );
  }
  if (engine.stores.journal !== (store as JournalStore)) {
    throw new ConfigError(
      'createWorker must lease the SAME journal store the engine writes ' +
        '(engine.stores.journal); leasing a different store would fence nothing',
    );
  }
  const concurrency = options.concurrency ?? 1;
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new ConfigError(
      `createWorker concurrency must be a positive integer, got ${concurrency}`,
    );
  }
  const owner = options.owner ?? workerIdentity();
  const ttlMs = options.ttlMs ?? DEFAULT_WORKER_TTL_MS;
  const renewMs = Math.max(1, Math.floor(ttlMs / 3));
  const pollMs = options.pollMs ?? 1000;
  const registry = buildDeriverRegistry(options.extraDerivers);

  interface ActiveRun {
    lease: Lease;
    renewTimer: ReturnType<typeof setInterval>;
    cancel: (reason: string) => Promise<void>;
    settled: Promise<void>;
  }

  const active = new Map<string, ActiveRun>();
  /** Runs this worker must not retry (DEF-6 violations, binding errors). */
  const poisoned = new Set<string>();
  /**
   * Journal length at our last release of a still-suspended run: nothing
   * new to consume until it grows (an offline resolution appends).
   */
  const suspendedAt = new Map<string, number>();
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let stopping = false;

  function reportError(runId: string, error: unknown): void {
    try {
      options.onError?.(runId, error);
    } catch {
      // Observability must never break the loop.
    }
  }

  async function releaseQuietly(lease: Lease): Promise<void> {
    try {
      await store.release(lease);
    } catch {
      // A lost lease is already released for us (reclaimed by another
      // worker); fencing made our writes reject either way.
    }
  }

  /** Drives one leased run to its next settle. */
  async function drive(runId: string, meta: RunMeta, lease: Lease): Promise<void> {
    const handle = engine.resume(runId, undefined, {
      lease,
      ...(options.argsFor === undefined ? {} : { args: options.argsFor(meta) }),
    });
    const renewTimer = setInterval(() => {
      store.renew(lease).catch((thrown: unknown) => {
        // The lease is lost (paused process, reclaim after ttl): every
        // further append already rejects by fencing; cancel to unwind
        // the loop promptly instead of burning live calls. A stale run
        // whose landings all reject may never settle, so the slot is
        // freed HERE: fencing keeps the journal safe either way, and
        // the settled chain stays harmless if it ever completes.
        reportError(runId, thrown);
        void handle.cancel('lease lost: fencing epoch superseded');
        clearInterval(renewTimer);
        active.delete(runId);
      });
    }, renewMs);
    const settled = handle.result
      .then(async (outcome) => {
        if (outcome.status === 'suspended') {
          // Remember the journal length: this run is not worth
          // re-leasing until something (an offline resolution) grows it.
          const entries = await store.load(runId);
          suspendedAt.set(runId, entries.length);
        } else {
          suspendedAt.delete(runId);
        }
      })
      .catch((thrown: unknown) => {
        // Binding and compatibility errors need the host, not a retry
        // loop: poison the run for this worker (a restart clears it).
        if (thrown instanceof ConfigError || thrown instanceof JournalCompatibilityError) {
          poisoned.add(runId);
        }
        reportError(runId, thrown);
      })
      .finally(async () => {
        clearInterval(renewTimer);
        await releaseQuietly(lease);
        active.delete(runId);
      });
    active.set(runId, {
      lease,
      renewTimer,
      cancel: async (reason) => {
        await handle.cancel(reason);
      },
      settled: settled.then(() => undefined),
    });
    await settled;
  }

  /** Opt-in retention over settled runs (M8-T04). */
  async function applyRetention(meta: RunMeta): Promise<void> {
    if (options.retention?.(meta) !== true) {
      return;
    }
    let lease: Lease;
    try {
      // The brief lease excludes a concurrent worker mid-decision; the
      // deletion removes the lease row with the run.
      lease = await store.acquire(meta.runId, owner);
    } catch (thrown) {
      if (thrown instanceof LeaseHeldError) {
        return;
      }
      throw thrown;
    }
    try {
      await engine.deleteRun(meta.runId);
      suspendedAt.delete(meta.runId);
      poisoned.delete(meta.runId);
    } finally {
      await releaseQuietly(lease);
    }
  }

  async function sweep(): Promise<number> {
    if (stopping) {
      return 0;
    }
    let picked = 0;
    const metas = await store.listRuns();
    for (const meta of metas) {
      if (active.size >= concurrency) {
        break;
      }
      if (!CANDIDATE_STATUSES.has(meta.status)) {
        // Terminal meta: never resumed, only retention applies here.
        if (options.retention !== undefined && !active.has(meta.runId)) {
          await applyRetention(meta).catch((thrown: unknown) => {
            reportError(meta.runId, thrown);
          });
        }
        continue;
      }
      if (active.has(meta.runId) || poisoned.has(meta.runId)) {
        continue;
      }
      let lease: Lease;
      try {
        lease = await store.acquire(meta.runId, owner);
      } catch (thrown) {
        if (thrown instanceof LeaseHeldError) {
          // Another worker owns it; at-least-once makes skipping safe.
          continue;
        }
        throw thrown;
      }
      try {
        const entries = (await store.load(meta.runId)).map((raw) => normalizeEntry(raw));
        // DEF-6, repeated at acquire: an older library cannot write into
        // a newer journal.
        scanJournalCompatibility(meta.runId, entries, registry);
        if (meta.status === 'suspended' && suspendedAt.get(meta.runId) === entries.length) {
          // Unchanged since our last suspended settle: nothing to do.
          await releaseQuietly(lease);
          continue;
        }
        picked += 1;
        void drive(meta.runId, meta, lease);
      } catch (thrown) {
        await releaseQuietly(lease);
        if (thrown instanceof JournalCompatibilityError || thrown instanceof ConfigError) {
          poisoned.add(meta.runId);
          reportError(meta.runId, thrown);
          continue;
        }
        reportError(meta.runId, thrown);
      }
    }
    return picked;
  }

  return {
    start: () => {
      if (pollTimer !== undefined || stopping) {
        return;
      }
      pollTimer = setInterval(() => {
        sweep().catch(() => undefined);
      }, pollMs);
      void sweep().catch(() => undefined);
    },
    sweep,
    stop: async () => {
      stopping = true;
      if (pollTimer !== undefined) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
      const held = [...active.values()];
      await Promise.all(
        held.map(async (run) => {
          await run.cancel('worker stopping');
          await run.settled;
        }),
      );
    },
    active: () => [...active.keys()],
  };
}
