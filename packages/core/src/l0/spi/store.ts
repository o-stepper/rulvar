/**
 * JournalStore (exactly five methods) and LeasableStore with the fencing
 * epoch: one SPI seam frozen at 1.0. Stores are dumb byte stores; they
 * never parse payloads (M1-T04; contract tightened by DEF-4 in M2).
 *
 * Normative store obligations (docs/03, section "Storage SPI"):
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
 * are advisory only; the journal is authoritative (docs/03, section
 * "RunMeta").
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
};

export type RunFilter = {
  status?: string;
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
 * Lease capability: acquire on a held lease MUST reject with a typed
 * LeaseHeldError; renew MUST run at an interval of at most ttl/3; an
 * append carrying a stale epoch MUST be rejected and never appear in load
 * (docs/03, section "LeasableStore").
 */
export interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>;
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
