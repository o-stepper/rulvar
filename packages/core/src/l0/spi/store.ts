/**
 * JournalStore (exactly five methods) and LeasableStore with the fencing
 * epoch: one SPI seam frozen at 1.0. Stores are dumb byte stores; they
 * never parse payloads (M1-T04; contract tightened by DEF-4 in M2).
 *
 * Normative store obligations (full contract: https://docs.rulvar.com/guide/stores):
 * - A1 atomicity: a partially written entry is NEVER visible in load.
 * - A2 total per-run order: load returns exactly the order of successful
 *   appends, stable across calls.
 * - A3 read-your-writes: after an append promise resolves, an immediate
 *   load sees the entry.
 * - A4 opaque payload: unknown kinds and unknown fields pass through
 *   byte-for-byte without normalization.
 */
import type { JournalEntry } from '../entries.js';

/** Lease token for queue-mode ownership; epoch is the fencing token. */
export type Lease = { runId: string; owner: string; epoch: number };

/**
 * Run-level metadata written by the ENGINE via putMeta as a separate
 * record, so listRuns never parses payloads. The hashVersion range fields
 * are advisory only; the journal is authoritative.
 */
export type RunMeta = {
  runId: string;
  status: string;
  name?: string;
  tags?: string[];
  updatedAt: string;
  hashVersionLow?: number;
  hashVersionHigh?: number;
  /** Registered workflow name (in-process Workflow). */
  workflowName?: string;
  /** Content hash of the body or of the compiled source. */
  workflowHash?: string;
  /** TranscriptStore ref of the persisted CompiledWorkflow source. */
  workflowSourceRef?: string;
  /**
   * The run's immutable USD ceiling (RunOptions.budgetUsd), recorded so
   * resume restores the original invocation's bound. Absent when the
   * run started without a ceiling. Stores must round-trip the field
   * (the conformance kit checks); a store that drops it degrades a
   * resumed run to uncapped.
   */
  budgetUsd?: number;
  /**
   * Count of execution segments this run has STARTED (a fresh start
   * writes 1; every resume writes prior + 1, durably, BEFORE the
   * segment emits its first event). The engine derives each segment's
   * WorkflowEvent seq and span-id base from it, which is what keeps
   * `seq` strictly increasing and `spanId` unique per run across
   * suspend/resume and process recreation, even after a crash-killed
   * segment (v1.22.0 review P1-2). Stores must round-trip the field
   * (the conformance kit checks); a store that drops it degrades a
   * resumed run's telemetry counters to per-segment, never the journal.
   */
  segments?: number;
  /**
   * Whether the run started with defined args. Engine-recorded at
   * genesis and preserved verbatim by every later segment (a resume
   * never rewrites it from its own re-supplied args). Args themselves
   * are not journaled; the host re-supplies them on resume, and this
   * marker plus `argsHash` let a host refuse a resume whose args
   * silently diverge from the original invocation (the v1.23.0 review:
   * a CLI resume that forgot `--args` silently changed the logical run
   * and paid again). Absent on runs started before v1.24.0. Stores must
   * round-trip the field (the conformance kit checks).
   */
  argsProvided?: boolean;
  /**
   * sha256 hex over the JCS canonical serialization of the genesis args
   * (`hashRunArgs`). Absent when the run started without args or when
   * the args are not JCS-serializable (`argsProvided` still records
   * presence). The raw args are never journaled, but the digest is
   * sensitive-derived metadata, not an opaque token: it is deterministic
   * and unsalted, so it reveals when two runs (in this store or another)
   * were started with identical args, and low-entropy args (a boolean,
   * an approval flag, a role, a short id) are recoverable by hashing
   * candidate values. Protect meta, `inspect` output, and run listings
   * with the same access control as the journal and transcripts; the
   * digest confers no confidentiality on the args it binds. Stores must
   * round-trip the field (the conformance kit checks).
   */
  argsHash?: string;
  /**
   * Unique token minted at the run's fresh start (genesis) and preserved
   * verbatim by every later segment, so two runs that reuse the same
   * explicit runId after a `deleteRun` are distinguishable: journal
   * length and workflow identity can coincide, this token cannot (the
   * v1.25.0 scale review: the queue worker's skip cache mistook a
   * recreated run for the old unchanged one and never resumed it).
   * Absent on runs started before the field shipped; readers treat
   * absence as "cannot prove same generation" and act accordingly.
   * Stores must round-trip the field (the conformance kit checks).
   */
  genesis?: string;
};

export type RunFilter = {
  status?: string;
  /**
   * Match any of these statuses (the resumable candidate sweep asks for
   * `['running', 'suspended']` in one query). Advisory optimization, not
   * a correctness gate: a store written before this field ignores it and
   * returns a superset, so callers re-check status on what comes back.
   * When both `status` and `statuses` are present, a meta matches if it
   * satisfies either.
   */
  statuses?: string[];
  tags?: string[];
  name?: string;
};

export interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}

/**
 * Exact lookup capability: fetch one run's meta without materializing
 * the whole catalog (the v1.25.0 scale review: `resume`, HTTP status,
 * and CLI point lookups were O(all runs) through `listRuns`). Optional
 * exactly like the lease capability: engines and shells detect it with
 * `hasMetaLookup` and fall back to `listRuns` + find, so a conformant
 * store written before this capability keeps working unoptimized. A
 * missing run resolves `undefined`, never a rejection.
 */
export interface MetaLookupStore extends JournalStore {
  getMeta(runId: string): Promise<RunMeta | undefined>;
}

/**
 * Lease capability: acquire on a held lease MUST reject with a typed
 * LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
 * append carrying a stale epoch MUST be rejected and never appear in load.
 */
export interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
