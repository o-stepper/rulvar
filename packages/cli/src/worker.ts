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
 * cadence is ttl/3 with the reference ttl of 60000 ms. Shared provider
 * quota coordination ships as QuotaLimiter references (RV508 header
 * refresh; EXC-14 and OQ-17 are closed): SqliteQuotaLimiter
 * (@rulvar/store-sqlite) coordinates PROCESSES over one database file,
 * PostgresQuotaLimiter (@rulvar/store-postgres) coordinates HOSTS over
 * one database and schema. Dividing quota per worker and fronting an
 * external gateway remain valid simpler deployments.
 *
 * Production fitness (RV4913, the tenth comparison experiment's code
 * review): the worker drains every driven run's event stream (the
 * engine buffers it from handle creation, unbounded, until a consumer
 * arrives), keeps an evicted run (a failed renew) in its slot until
 * the cancel settles so stop() waits for it too, surfaces sweep
 * failures through onSweepError and the lastSweepError readiness flag
 * instead of idling silently over a dead store, and forwards the
 * host's resume posture (bodyHash, configFingerprint, scope, the open
 * wire intent acknowledgment) to engine.resume through resumeOptions.
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
  type ResumeOptions,
  type RunMeta,
  type WorkflowEvent,
} from '@rulvar/core';

/** Appendix A: the committed reference lease ttl. */
export const DEFAULT_WORKER_TTL_MS = 60_000;

/**
 * The options of {@link createWorker}, the queue shell over the public
 * engine API.
 *
 * What the stock worker does NOT check (plan 49 wave B, the RV4913
 * remainder). The worker is not a regulated worker: the production
 * host guide's RACI applies to a worker deployment unchanged, and the
 * list below is what stays the host's to assert, enforce, or supply.
 * Before RV4913 the resume was blind (`{ lease, args }` only), so none
 * of the assertions could reach the engine from a worker at all;
 * 1.253.0 forwards them, and the rest is read from the code.
 *
 * 1. It asserts no resume posture of its own. What reaches
 *    `engine.resume` is `{ ...resumeOptions, args, lease }`, so without
 *    a host supplied `resumeOptions` the engine defaults decide: a
 *    changed workflow body warns and proceeds (`bodyHash` defaults to
 *    `'warn'`), a recorded `configFingerprint` goes unchecked (the
 *    engine warns `RULVAR_RESUME_FINGERPRINT_UNCHECKED`), a recorded
 *    `scope` resumes verbatim without an assertion, and a run holding
 *    open wire intents refuses typed and is poisoned for this worker.
 *    The worker computes none of those values: it has no config
 *    module, no fingerprint of the engine it was built from, and no
 *    scope of its own. The function form receives the run's `RunMeta`
 *    (its recorded `configFingerprint`, `scope`, `budgetUsd`,
 *    `workflowName`), so the host re asserts what genesis recorded or
 *    throws a `ConfigError` to refuse.
 * 2. It compiles no regulated profile and attests nothing.
 *    `compileRegulatedProfile` is a host call at engine assembly; the
 *    worker never reads a `profileHash` and never compares the engine
 *    it runs to the posture a run was started under. The only bridge
 *    is `resumeOptions.configFingerprint`, and it is the ENGINE that
 *    compares it against the genesis record before ownership; a worker
 *    built over a loosened engine drives a regulated run like any other
 *    unless the host supplies that fingerprint.
 * 3. It trusts `argsFor`. Run arguments are not journaled; the engine
 *    records `argsProvided` and a canonical `argsHash` at genesis,
 *    carries them through every resume, and does not enforce them. The
 *    worker passes whatever `argsFor(meta)` returns and compares
 *    nothing against `meta.argsHash`, so the refusal belongs to the
 *    host (`hashRunArgs(args)` against the recorded hash before the
 *    resume), which is what `rulvar resume` does and what its
 *    `--allow-args-change` overrides.
 * 4. It bounds no money and no admission. `concurrency` caps leased
 *    runs in one process and nothing else: a run's ceiling is what its
 *    own `RunMeta` recorded (or what a host `resumeOptions.run`
 *    override asks, journaled by the engine as a `run_budget_override`
 *    decision), spawn admission and quotas are the engine's, and two
 *    workers with `concurrency: 1` over one store drive two runs,
 *    because no fleet wide cap on active runs lives here.
 * 5. It selects nothing by identity. Every meta the store lists as
 *    `running` or `suspended` is a candidate whatever its tenant,
 *    region, or account (`listRuns({ statuses })` carries no scope
 *    filter), so a fleet that must not drive another fleet's runs
 *    separates stores, or refuses per run from the `resumeOptions`
 *    function (a thrown `ConfigError` poisons the run for this worker;
 *    a `scope` it asserts that differs from the recorded one is refused
 *    by the engine).
 * 6. It reads the meta row, never the journal, to decide candidacy. A
 *    row behind a journaled settle, or a terminal row stranded over
 *    live journal work, is invisible to a sweep; `rulvar runs audit`
 *    names those divergences and its `--repair` rewrites them.
 * 7. Poison is process local and retry is unbounded. A run the worker
 *    poisons (a `ConfigError`, a `JournalCompatibilityError`, an
 *    unregistered workflow) is skipped by THIS worker until a restart
 *    or a new generation of the runId; nothing is written to the store,
 *    so another worker retries it. A run whose resume rejects without
 *    settling (a withheld settlement, a failed store write) stays a
 *    candidate and is re leased on every sweep with no attempt counter
 *    and no backoff, so a deterministic failure is a paid loop until a
 *    human reads `onError`.
 * 8. It authenticates nobody and isolates nothing. The worker has no
 *    network surface (the HTTP server's authentication is host
 *    middleware, and the worker sits behind none of it); tools run
 *    wherever the engine's executors and profiles put them, and the
 *    worker configures no executor, permission layer, worktree, or
 *    container.
 * 9. Retention is the host's predicate: `retention(meta)` alone decides
 *    deletion, applied under a brief lease; absent, everything
 *    persists, and no age or size policy exists in the worker.
 * 10. The lease protocol is the store's. The ttl match is verified only
 *    over a store that exposes `leaseTtlMs`; a store without the
 *    capability is trusted with the worker's ttl, and a stale writer's
 *    meta and blob writes are rejected only over a store declaring
 *    `fencedWrites` (the journal is fenced always). The worker adds no
 *    fencing of its own.
 * 11. It observes events and persists none. `onEvent` sees the stream
 *    in order and the drain keeps memory bounded; nothing is exported
 *    (`toOtel` is the host's call) and the journal stays the record.
 * 12. The recorded postures are the engine's to restore.
 *    `strictPricing`, `clampTurnToExposure` (since RV4913),
 *    `budgetPolicy`, the scope with its normalization table, and the
 *    fingerprint come back from `RunMeta` on every resume without the
 *    worker's help; the worker neither re arms nor checks them, and
 *    `resumeOptions.run` is the one door that changes a ceiling.
 */
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
  /**
   * Observer of every event of every run this worker drives (RV4913),
   * in emission order, called from the worker's own drain of the
   * handle's event stream. The engine subscribes that stream at handle
   * creation and buffers it without bound until a consumer arrives,
   * and the stock worker never arrived, so a long run held its whole
   * event history in memory until settle, multiplied by `concurrency`.
   * The drain now runs whether or not this hook is set (compaction
   * keeps the queue bounded behind it); the hook is where a host
   * renders or exports per run. A throw is swallowed: observability
   * never breaks the loop.
   */
  onEvent?: (event: WorkflowEvent) => void;
  /**
   * Observability hook for sweep failures (RV4913): a `listRuns` or
   * `acquire` that rejects (a store outage) used to be swallowed by the
   * poll timer, so a worker over a dead store idled silently. The timer
   * path now reports each failed sweep here and raises
   * `Worker.lastSweepError()` until the next sweep completes; a direct
   * `sweep()` call still rejects to its caller. Never throws into the
   * loop.
   */
  onSweepError?: (error: unknown) => void;
  /**
   * The resume posture forwarded to `engine.resume` for every driven
   * run (RV4913), as one value or computed per run from the run's
   * meta: everything `ResumeOptions` offers except `lease` (the
   * worker's own) and `args` (`argsFor`), so `bodyHash: 'refuse'`, the
   * `configFingerprint` and `scope` assertions, `run` overrides, and the
   * RV4006 `acknowledgeOpenWireIntents` acknowledgment reach the
   * engine. Without it the worker resumes under the engine defaults: a
   * changed body warns and proceeds, a recorded fingerprint or scope
   * goes unchecked, and a run holding open wire intents refuses typed
   * and poisons for this worker (before this option nothing could lift
   * that refusal: a run that died mid wire under the intent posture
   * was never resumed by a worker again). A throw from the function
   * form is reported through `onError` and the lease is handed back
   * (a ConfigError poisons the run for this worker, the binding rule).
   */
  resumeOptions?: WorkerResumeOptions | ((meta: RunMeta) => WorkerResumeOptions);
}

/**
 * The resume posture a worker may forward (RV4913): `ResumeOptions`
 * without the two fields the worker owns, `lease` and `args`.
 */
export type WorkerResumeOptions = Omit<ResumeOptions, 'lease' | 'args'>;

export interface Worker {
  /** Begins sweeping on the poll cadence. Idempotent. */
  start(): void;
  /**
   * One sweep: lease and resume eligible runs up to the concurrency
   * cap. Returns the number of runs picked up. Exposed so hosts and
   * tests can drive the worker deterministically without timers. A
   * store failure rejects here and raises `lastSweepError()`.
   */
  sweep(): Promise<number>;
  /**
   * Stops sweeping, cancels in flight runs (evicted runs included) and
   * waits for their settle, releases held leases.
   */
  stop(): Promise<void>;
  /**
   * runIds occupying a slot: runs held under a lease, plus evicted runs
   * (a failed renew) still unwinding their cancel. A slot frees only
   * when its run settles, never before the cancel lands (RV4913).
   */
  active(): string[];
  /**
   * Readiness (RV4913): the error of the most recent sweep that failed
   * against the store, or undefined once a later sweep completed. A
   * store outage used to be a silent idle; with this flag a health
   * probe can report a worker that polls a store it cannot read.
   */
  lastSweepError(): unknown;
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

/**
 * The queue shell over the public engine API (M8, FR-703): leases
 * resumable and suspended runs from a `LeasableStore` under the
 * fencing epoch and drives each through `engine.resume`.
 *
 * It is not a regulated worker. What it does NOT check (plan 49 wave
 * B, the RV4913 remainder; the same list as {@link CreateWorkerOptions}):
 *
 * 1. It asserts no resume posture of its own: `engine.resume` receives
 *    `{ ...resumeOptions, args, lease }`, and without a host supplied
 *    `resumeOptions` the engine defaults decide (`bodyHash` `'warn'`, a
 *    recorded `configFingerprint` unchecked, a recorded `scope` restored
 *    without an assertion, open wire intents refused and poisoned). The
 *    worker computes none of those values; the function form sees the
 *    run's `RunMeta` so the host re asserts what genesis recorded or
 *    throws a `ConfigError` to refuse.
 * 2. It compiles no regulated profile and attests nothing; the only
 *    bridge is `resumeOptions.configFingerprint`, which the ENGINE
 *    compares against the genesis record before ownership.
 * 3. It trusts `argsFor`: arguments are not journaled, the engine
 *    records `argsProvided` and `argsHash` at genesis and does not
 *    enforce them, and the worker compares nothing; the refusal is the
 *    host's (`hashRunArgs(args)` against `meta.argsHash`), which is
 *    what `rulvar resume` does and `--allow-args-change` overrides.
 * 4. It bounds no money and no admission: `concurrency` caps leased
 *    runs in one process only; a run's ceiling is its recorded one (or
 *    the host's `resumeOptions.run` override, journaled by the engine),
 *    and no fleet wide cap on active runs lives here.
 * 5. It selects nothing by identity: every `running` or `suspended`
 *    meta in the store is a candidate whatever its tenant, region, or
 *    account; separate stores, or refuse per run from the
 *    `resumeOptions` function.
 * 6. It reads the meta row, never the journal, for candidacy; the
 *    divergences `rulvar runs audit` names are invisible to a sweep.
 * 7. Poison is process local and retry is unbounded: a poisoned run is
 *    skipped by THIS worker until a restart or a new generation and
 *    nothing is written to the store, and a resume that rejects without
 *    settling is re leased on every sweep with no attempt counter and
 *    no backoff.
 * 8. It authenticates nobody and isolates nothing: no network surface,
 *    no executor, permission layer, worktree, or container of its own.
 * 9. Retention is the host's predicate; absent, everything persists.
 * 10. The lease protocol is the store's: the ttl match is verified only
 *    over a store exposing `leaseTtlMs`, stale meta and blob writes are
 *    rejected only over a store declaring `fencedWrites` (the journal is
 *    fenced always), and the worker adds no fencing of its own.
 * 11. It observes events and persists none: `onEvent` sees the stream,
 *    nothing is exported, the journal stays the record.
 * 12. The recorded postures (`strictPricing`, `clampTurnToExposure`,
 *    `budgetPolicy`, the scope with its normalization table, the
 *    fingerprint) are restored from `RunMeta` by the engine; the worker
 *    neither re arms nor checks them, and `resumeOptions.run` is the
 *    one door that changes a ceiling.
 */
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
    /**
     * A failed renew evicted this run (RV4913): its lease is lost, its
     * cancel is in flight, and the slot stays occupied until the
     * settle chain frees it, so stop() waits for it like any other.
     */
    evicted: boolean;
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

  function reportSweepError(error: unknown): void {
    try {
      options.onSweepError?.(error);
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
    // The host's resume posture rides in (RV4913): bodyHash 'refuse',
    // the configFingerprint and scope assertions, and the open wire
    // intent acknowledgment all reach engine.resume, so the worker
    // checks what the engine can check instead of resuming blind with
    // the lease and the args alone. The lease lands LAST: the worker's
    // own ownership token is never overridden by host input. A
    // throwing host callback is the host's defect, classified exactly
    // like a settle failure (a ConfigError poisons, anything else is
    // reported and retried next sweep), never an unhandled rejection
    // out of the sweep.
    let resumeOptions: ResumeOptions;
    try {
      const posture =
        typeof options.resumeOptions === 'function'
          ? options.resumeOptions(meta)
          : (options.resumeOptions ?? {});
      resumeOptions = {
        ...posture,
        ...(options.argsFor === undefined ? {} : { args: options.argsFor(meta) }),
        lease,
      };
    } catch (thrown) {
      if (thrown instanceof ConfigError) {
        poisoned.set(runId, meta.genesis);
      }
      reportError(runId, thrown);
      await releaseQuietly(lease);
      return;
    }
    const handle = engine.resume(runId, undefined, resumeOptions);
    // The drain (RV4913): the engine subscribes handle.events at handle
    // creation and buffers every event until a consumer arrives, and
    // the stock worker never arrived, so a long run held its whole
    // event history in memory until settle, multiplied by concurrency.
    // Consuming keeps the queue compacted behind the reader, and the
    // host's onEvent sees every event of the leased run in order. A
    // refused resume closes the stream with the typed refusal that
    // handle.result reports below; the drain itself never throws.
    const drained = (async () => {
      for await (const event of handle.events) {
        try {
          options.onEvent?.(event);
        } catch {
          // Observability must never break the loop.
        }
      }
    })().catch(() => undefined);
    const renewTimer = setInterval(() => {
      store.renew(lease).catch((thrown: unknown) => {
        // The lease is lost (paused process, reclaim after ttl): every
        // further append already rejects by fencing; cancel to unwind
        // the loop promptly instead of burning live calls. The slot is
        // NOT freed here (RV4913): the record is marked evicted and
        // stays active until the cancel settles, so the settle chain
        // below frees the slot a single time, after the run is really
        // gone, and a stop() taken meanwhile still waits for it instead
        // of resolving over a run that is still live (the old code
        // dropped the record at once, and stop()'s snapshot never saw
        // the evicted run). Fencing keeps the journal safe either way.
        clearInterval(renewTimer);
        const record = active.get(runId);
        if (record !== undefined) {
          record.evicted = true;
        }
        reportError(runId, thrown);
        void handle.cancel('lease lost: fencing epoch superseded').catch(() => undefined);
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
        // Every event reached onEvent before the slot frees: the stream
        // ends at settle, so this wait is bounded by the backlog.
        await drained;
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
      evicted: false,
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

  /** The sweep in flight, so stop() can wait it out before snapshotting. */
  let sweepInFlight: Promise<void> | undefined;
  /**
   * The readiness flag (RV4913): the error of the last sweep that
   * failed against the store, cleared by the next completed sweep.
   */
  let lastSweepError: unknown;

  async function sweepBody(): Promise<number> {
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
      if (stopping) {
        // stop() mid sweep: pick nothing further, so the cancel
        // snapshot it takes after this sweep resolves is complete
        // (cycle 79 review).
        break;
      }
      if (!CANDIDATE_STATUSES.has(meta.status)) {
        // Terminal meta: never resumed, only retention applies here.
        // Retention is not slot-bound: a worker whose every concurrency
        // slot is busy still sweeps settled runs, or a loaded worker
        // would starve its own retention (cycle 80).
        if (options.retention !== undefined && !active.has(meta.runId)) {
          await applyRetention(meta).catch((thrown: unknown) => {
            reportError(meta.runId, thrown);
          });
        }
        continue;
      }
      if (active.size >= concurrency) {
        if (options.retention === undefined) {
          // Without retention only candidates are listed; once the
          // slots are full there is nothing further to do.
          break;
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
        if (stopping) {
          // stop() arrived while this candidate was being validated:
          // hand the lease back instead of driving a run past the
          // cancel snapshot (cycle 79 review).
          await releaseQuietly(lease);
          break;
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
  }

  async function sweep(): Promise<number> {
    if (stopping || sweeping) {
      // Sweeps never overlap: a tick that fires mid scan reports zero
      // picks instead of racing the sweep already scanning the store.
      return 0;
    }
    sweeping = true;
    const work = sweepBody();
    sweepInFlight = work.then(
      () => undefined,
      () => undefined,
    );
    try {
      const picked = await work;
      // A completed scan clears the flag: readiness reads the LAST sweep.
      lastSweepError = undefined;
      return picked;
    } catch (thrown) {
      // A store the worker cannot read is a loud fact (RV4913): the
      // flag stays raised until a later sweep completes, and the
      // caller (the timer path's onSweepError, or a host driving
      // sweep() itself) receives the rejection.
      lastSweepError = thrown;
      throw thrown;
    } finally {
      sweeping = false;
      sweepInFlight = undefined;
    }
  }

  return {
    start: () => {
      if (pollTimer !== undefined || stopping) {
        return;
      }
      // The timer path used to swallow every rejection, so a store
      // outage was a silent idle: the worker polled a store it could
      // not read and nothing in the process said so (RV4913).
      pollTimer = setInterval(() => {
        sweep().catch((thrown: unknown) => {
          reportSweepError(thrown);
        });
      }, pollMs);
      void sweep().catch((thrown: unknown) => {
        reportSweepError(thrown);
      });
    },
    sweep,
    stop: async () => {
      stopping = true;
      if (pollTimer !== undefined) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
      // A sweep already scanning the store must finish BEFORE the cancel
      // snapshot, or a run it picks after the snapshot would survive
      // stop() with a live lease and paid calls (cycle 79 review).
      const inFlight = sweepInFlight;
      if (inFlight !== undefined) {
        await inFlight;
      }
      // Evicted runs are still in the map (RV4913): their lease lost
      // cancel is already in flight and their slot frees at settle, so
      // stop() waits for them exactly like the runs it cancels itself.
      const held = [...active.values()];
      await Promise.all(
        held.map(async (run) => {
          if (!run.evicted) {
            await run.cancel('worker stopping');
          }
          await run.settled;
        }),
      );
    },
    active: () => [...active.keys()],
    lastSweepError: () => lastSweepError,
  };
}
