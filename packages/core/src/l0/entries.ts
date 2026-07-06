/**
 * JournalEntry form, the kinds registry v2, the stored status vocabulary,
 * and hashVersion (M1-T04; frozen as the hashVersion 2 profile in M2).
 *
 * Owning spec: docs/03-journal-spec.md, sections "JournalEntry form and the
 * kinds registry v2", "hashVersion (DEF-6)", and "Identity model".
 */
import type { Json } from './json.js';
import type { WireError } from './errors.js';
import type { ModelRef, Usage } from './messages.js';

/**
 * Versions the ENTIRE identity and replay pipeline as one unit: canonical
 * JSON algorithm, identity field sets, hash function, schema/toolset hash
 * derivation, scope grammar and ordinal rules, replay predicate, fold
 * defaults, and the kind/status vocabularies (docs/03, section
 * "hashVersion").
 */
export type HashVersion = number;

/** 1 = round 1; 2 = current. */
export const CURRENT_HASH_VERSION: HashVersion = 2;

/**
 * The single kinds registry v2 (docs/03, section "Kinds registry v2").
 * Readers MUST tolerate unknown kinds; stores pass them through
 * byte-for-byte (obligation A4).
 */
export type EntryKind =
  | 'agent'
  | 'step'
  | 'child'
  | 'external'
  | 'approval'
  | 'rand'
  | 'decision'
  | 'plan.revision'
  | 'plan.decision'
  | 'ledger.op'
  | 'resolution'
  | 'abandon'
  | 'node.link'
  | 'termination.init'
  | 'termination.denied';

/**
 * The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent:
 * it is a derived fold status, never persisted (docs/03, section "Stored
 * status vocabulary").
 */
export type EntryStatus =
  'running' | 'ok' | 'error' | 'limit' | 'suspended' | 'cancelled' | 'escalated';

/** The canonical EntryRef between entries is seq (docs/03, section "Full entry identity"). */
export type EntryRef = number;

/** Payload of resolution ref-entries; the full schema lands with DEF-4 in M2. */
export type ResolutionPayload = {
  by: string;
  value?: Json;
  [key: string]: Json | undefined;
};

/** Payload of abandon ref-entries; the full schema lands with DEF-5 in M2/M7. */
export type AbandonPayload = {
  reason: string;
  authorizedBy?: EntryRef;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
  [key: string]: Json | undefined;
};

/**
 * Final entry form (hashVersion 2; docs/03, section "JournalEntry form").
 * All journaled values MUST be JSON-serializable; a violation raises a
 * typed NonSerializableValueError at the call site. append is serialized
 * by a per-run queue.
 */
export type JournalEntry = {
  /** Identity-derivation and replay-semantics version of THIS entry. */
  hashVersion: HashVersion;
  /** Total order per run; canonical EntryRef = seq. */
  seq: number;
  /**
   * Backward reference by seq, always ref < seq: on ref-entries
   * (resolution/abandon) the seq of the target; on terminal phase entries
   * the seq of the running entry.
   */
  ref?: number;
  scope: string;
  key: string;
  ordinal: number;
  kind: EntryKind;
  status: EntryStatus;
  value?: Json;
  error?: WireError;
  usage?: Usage;
  /** True when the stream was cut at the budget ceiling or by a stream failure. */
  usageApprox?: boolean;
  /** Who actually served (failover changes only this, never the key). */
  servedBy?: ModelRef;
  transcriptRef?: string;
  checkpointRef?: string;
  /** Only when kind === 'resolution'. */
  resolution?: ResolutionPayload;
  /** Only when kind === 'abandon'. */
  abandon?: AbandonPayload;
  /**
   * Policy field on agent entries, fixed in the payload at dispatch time
   * (docs/03, section "Normative payload schemas"): the M2 predicate reads
   * the flag from the ENTRY, never from current code. Excluded from
   * identity like every policy field.
   */
  memoizeOutcome?: boolean;
  /** On suspended entries: the journaled deadline. */
  deadlineAt?: string;
  spanId: string;
  startedAt: string;
  endedAt?: string;
};

/** Rand-entry payload (docs/03, section "Normative payload schemas"). */
export type RandPayload =
  | { subtype: 'now'; value: number }
  | { subtype: 'random'; value: number; key?: string }
  | { subtype: 'uuid'; value: string };

/**
 * Round-1 normalization: hashVersion is taken from `hashVersion`, else
 * from the legacy `v` field, else 1. Stores are never rewritten;
 * normalization happens at read (docs/03, section "The single versioning
 * mechanism").
 */
export function normalizeEntry(raw: unknown): JournalEntry {
  const record = raw as Record<string, unknown> & { hashVersion?: number; v?: number };
  if (typeof record.hashVersion === 'number') {
    return record as JournalEntry;
  }
  const hashVersion = typeof record.v === 'number' ? record.v : 1;
  const { v: _legacy, ...rest } = record;
  return { ...rest, hashVersion } as JournalEntry;
}
