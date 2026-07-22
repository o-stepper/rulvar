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
   * bound). An integer between 1 and 2147483647 ms, refused as a
   * ConfigError at construction. MUST match the store's configured ttl:
   * when the store exposes the optional `leaseTtlMs` capability
   * (SqliteStore does), the match is VERIFIED at construction and a
   * mismatch is a ConfigError; a store without the capability is
   * trusted. Omitted, the worker ADOPTS the store's exposed ttl, falling
   * back to the Appendix A reference 60000 ms.
   */
  ttlMs?: number;
  /**
   * Idle sweep cadence for start(); default 1000 ms. An integer between
   * 1 and 2147483647 ms, refused as a ConfigError at construction (an
   * overflow or a value that is not finite would collapse to the 1 ms floor
   * and storm the store; v1.35.0 review P2-4). Zero is not a manual
   * mode: drive sweeps directly with worker.sweep() instead of
   * start().
   */
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
  // Both cadences land in setInterval as-is, so both are refused outside
  // the Node timer range (v1.35.0 review P2-4): an overflow, NaN, zero,
  // a negative, or a fraction would collapse to the 1 ms floor and storm
  // the store with renew/poll writes.
  const requireTimerMs = (value: number, site: string): void => {
    if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
      throw new ConfigError(
        `${site} must be an integer between 1 and 2147483647 ms; got ${String(value)}`,
      );
    }
  };
  const storeTtlMs = (store as Partial<LeasableStore>).leaseTtlMs;
  if (storeTtlMs !== undefined && !Number.isInteger(storeTtlMs)) {
    throw new ConfigError(
      `the store's leaseTtlMs capability must report an integer; got ${String(storeTtlMs)}`,
    );
  }
  // Omitted ttl ADOPTS the store's exposed one, so a single config
  // source drives both sides of the lease protocol by default.
  const ttlMs = options.ttlMs ?? storeTtlMs ?? DEFAULT_WORKER_TTL_MS;
  requireTimerMs(ttlMs, 'createWorker ttlMs');
  if (storeTtlMs !== undefined && ttlMs !== storeTtlMs) {
    // The TSDoc "MUST match" is executable now (v1.35.0 review P2-4): a
    // worker renewing on a cadence derived from the WRONG ttl either
    // hammers the store or lets the lease expire while the run is live.
    throw new ConfigError(
      `createWorker ttlMs ${String(ttlMs)} does not match the store's configured lease ttl ` +
        `${String(storeTtlMs)} (the store exposes leaseTtlMs; omit createWorker ttlMs to ` +
        'adopt it)',
    );
  }
  const renewMs = Math.max(1, Math.floor(ttlMs / 3));
  const pollMs = options.pollMs ?? 1000;
  requireTimerMs(pollMs, 'createWorker pollMs');
  const registry = buildDeriverRegistry(options.extraDerivers);

  interface ActiveRun {
    lease: Lease;
    renewTimer: ReturnType<typeof setInterval>;
    cancel: (reason: string) => Promise<void>;
    settled: Promise<void>;
  }

  const active = new Map<string, ActiveRun>();
  /**
   * Runs this worker must not retry (DEF-6 violations, binding errors),
   * keyed to the run's generation (RunMeta.genesis) at poison time: a
   * deleteRun and recreate of the same runId is a NEW run and must not
   * inherit the poison. Entries for runIds that leave the candidate set
   * are dropped each sweep, so an external delete cannot pin
   * process-local state forever (v1.25.0 scale review).
   */
  const poisoned = new Map<string, string | undefined>();
  /**
   * Journal length AND generation at our last release of a
   * still-suspended run: nothing new to consume until the journal grows
   * (an offline resolution appends) or the generation changes (the same
   * runId was deleted and recreated; length alone cannot tell the new
   * run from the old unchanged one, the v1.25.0 scale review). Runs
   * whose meta predates the genesis field compare as equal when both
   * sides are undefined, the historical behavior of length alone.
   */
  const suspendedAt = new Map<string, { length: number; genesis?: string }>();
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  /** An interval tick never overlaps a sweep that is still running. */
  let sweeping = false;
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
          // Remember the journal length and the generation: this run is
          // not worth re-leasing until something (an offline resolution)
          // grows the journal, or the runId is reborn as a NEW run. The
          // generation never changes across segments, so the meta
          // captured at sweep time is exact here.
          const entries = await store.load(runId);
          suspendedAt.set(runId, { length: entries.length, genesis: meta.genesis });
        } else {
          suspendedAt.delete(runId);
        }
      })
      .catch((thrown: unknown) => {
        // Binding and compatibility errors need the host, not a retry
        // loop: poison the run for this worker (a restart clears it, and
        // so does a new generation of the same runId).
        if (thrown instanceof ConfigError || thrown instanceof JournalCompatibilityError) {
          poisoned.set(runId, meta.genesis);
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
      // The brief lease rides the cascade: over a fencedWrites store a
      // retention sweep that lost this lease mid-delete is refused
      // instead of deleting a run another worker took over (fenced run
      // state RFC, F4).
      await engine.deleteRun(meta.runId, { lease });
      suspendedAt.delete(meta.runId);
      poisoned.delete(meta.runId);
    } finally {
      await releaseQuietly(lease);
    }
  }

  async function sweep(): Promise<number> {
    if (stopping || sweeping) {
      // Sweeps never overlap: a tick that fires mid scan reports zero
      // picks instead of racing the sweep already scanning the store.
      return 0;
    }
    sweeping = true;
    try {
      let picked = 0;
      // The query narrows to candidates unless durable retention needs
      // the terminal metas too. The `statuses` filter is advisory (a
      // store written before the field returns a superset), so candidacy
      // is re-checked on every meta below either way.
      const metas =
        options.retention === undefined
          ? await store.listRuns({ statuses: [...CANDIDATE_STATUSES] })
          : await store.listRuns();
      // Drop process-local state for runIds that left the candidate set:
      // a settled run's skip entry is dead weight, and an externally
      // deleted run must not pin skip or poison state until restart.
      const candidateIds = new Set(
        metas.filter((meta) => CANDIDATE_STATUSES.has(meta.status)).map((meta) => meta.runId),
      );
      for (const runId of [...suspendedAt.keys()]) {
        if (!candidateIds.has(runId)) {
          suspendedAt.delete(runId);
        }
      }
      for (const runId of [...poisoned.keys()]) {
        if (!candidateIds.has(runId)) {
          poisoned.delete(runId);
        }
      }
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
        if (active.has(meta.runId)) {
          continue;
        }
        if (poisoned.has(meta.runId)) {
          if (poisoned.get(meta.runId) === meta.genesis) {
            continue;
          }
          // Same runId, different generation: the poison belonged to a
          // deleted run, and this NEW run gets its chance.
          poisoned.delete(meta.runId);
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
          const cached = suspendedAt.get(meta.runId);
          if (
            meta.status === 'suspended' &&
            cached !== undefined &&
            cached.length === entries.length &&
            cached.genesis === meta.genesis
          ) {
            // Unchanged since our last suspended settle: nothing to do.
            // Both length AND generation must match; a recreated run of
            // the same runId and length is new work.
            await releaseQuietly(lease);
            continue;
          }
          picked += 1;
          void drive(meta.runId, meta, lease);
        } catch (thrown) {
          await releaseQuietly(lease);
          if (thrown instanceof JournalCompatibilityError || thrown instanceof ConfigError) {
            poisoned.set(meta.runId, meta.genesis);
            reportError(meta.runId, thrown);
            continue;
          }
          reportError(meta.runId, thrown);
        }
      }
      return picked;
    } finally {
      sweeping = false;
    }
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
