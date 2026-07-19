/**
 * JournalEntry form, the kinds registry v2, the stored status vocabulary,
 * and hashVersion (M1-T04; frozen as the hashVersion 2 profile in M2).
 *
 * Full contract: https://docs.rulvar.com/guide/journal; hashVersion
 * (DEF-6): https://docs.rulvar.com/guide/journal-compatibility
 */
import type { Json } from './json.js';
import type { WireError } from './errors.js';
import type { InvocationRole, ModelRef, Usage } from './messages.js';

/**
 * Versions the ENTIRE identity and replay pipeline as one unit: canonical
 * JSON algorithm, identity field sets, hash function, schema/toolset hash
 * derivation, scope grammar and ordinal rules, replay predicate, fold
 * defaults, and the kind/status vocabularies.
 */
export type HashVersion = number;

/** 1 = round 1; 2 = current. */
export const CURRENT_HASH_VERSION: HashVersion = 2;

/**
 * The single kinds registry v2.
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
 * it is a derived fold status, never persisted.
 */
export type EntryStatus =
  'running' | 'ok' | 'error' | 'limit' | 'suspended' | 'cancelled' | 'escalated';

/** The canonical EntryRef between entries is seq. */
export type EntryRef = number;

/** The journaled by-source of a resolution. */
export type ResolutionBy =
  'external' | 'timeout' | 'class_decision' | 'operator' | 'quiescence' | 'engine_fallback';

/** Payload of resolution ref-entries (DEF-4). */
export type ResolutionPayload = {
  /** Duplicates ref for self-description. */
  target: number;
  by: ResolutionBy;
  /** awaitExternal resolution / EscalationDecision / WakeDigest. */
  value: Json;
  /** Seq of the class-level EscalationDecision when by = 'class_decision'. */
  decisionRef?: number;
  /** Lineage-fold attribution (DEF-3, M7). */
  logicalTaskId?: string;
  /** Only on escalation resolutions (DEF-3, M7). */
  countsAgainstLimit?: boolean;
};

/** Payload of abandon ref-entries (DEF-4/DEF-5). */
export type AbandonPayload = {
  /** Seq of the abandoned branch's spawn entry. */
  target: number;
  /** Seq of the plan.revision or decision entry sanctioning it. */
  authorizedBy: number;
  nodeId?: string;
  logicalTaskId?: string;
  reason: string;
  /** Default true (DEF-5). */
  retainCheckpoint?: boolean;
  /** Default false; counts against the pin cap (DEF-5). */
  retainWorktree?: boolean;
};

/**
 * One (invocation role, serving model) slice of an agent call's usage.
 * `role` is the phase that PAID the slice (v1.19.0 review P1-2: the
 * loop, extract, finalize, and summarize phases of one agent call must
 * land in their own CostReport.byRole buckets even when a single model
 * serves several of them). Absent on slices written before roles
 * shipped: readers fall back to the entry's primary
 * `costAttribution.role`, exactly like the other documented fallbacks.
 * Policy, never identity.
 */
export interface UsageSlice {
  servedBy: ModelRef;
  usage: Usage;
  role?: InvocationRole;
}

/**
 * Cost-attribution facts a live run knows at settlement and a pure
 * journal fold cannot re-derive: the innermost phase name at the call
 * site, the agent profile, the primary invocation role, the budget
 * account the call debited, and whether the dispatch spent the
 * orchestrator finalize reserve. Policy, never identity, exactly like
 * usageByModel: none of it enters the content key, and entries written
 * before the field shipped fold under the documented fallback buckets
 * (empty phase, 'unknown' agent type, role 'loop').
 */
export interface CostAttributionFacts {
  phase?: string;
  agentType?: string;
  role?: InvocationRole;
  budgetAccount?: string;
  finalizeReserve?: boolean;
}

/**
 * The per-model slices of a terminal entry: the recorded split when the
 * call spanned several models, else the whole usage attributed to
 * `servedBy`. The fallback is what makes every journal written before the
 * split shipped price exactly as it did before.
 */
export function entryUsageSlices(entry: JournalEntry): UsageSlice[] {
  if (entry.usage === undefined) {
    return [];
  }
  if (entry.usageByModel !== undefined && entry.usageByModel.length > 0) {
    return entry.usageByModel;
  }
  return entry.servedBy === undefined ? [] : [{ servedBy: entry.servedBy, usage: entry.usage }];
}

/** A priced slice, plus the total and the gaps the price table did not cover. */
export interface PricedUsage {
  /** Total of every slice the price table covered. */
  usd: number;
  /** Covered slices with their prices; the basis of per-model attribution. */
  priced: Array<UsageSlice & { usd: number }>;
  /** Slices with no price row: surfaced as unpriced, never a silent zero. */
  unpriced: UsageSlice[];
}

/**
 * The single pricing fold over one terminal entry, shared by the kernel
 * ledger and the CostReport fold so a run's total and its per-model
 * breakdown can never disagree. Each slice is priced at ITS OWN model's
 * rate. A price function returning NaN or a negative amount (a broken
 * user-supplied rate) is treated exactly like a missing row: the slice
 * folds as unpriced instead of poisoning or crediting the totals
 * (v1.20.0 review follow-up).
 */
export function priceEntryUsage(
  entry: JournalEntry,
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined,
): PricedUsage {
  const result: PricedUsage = { usd: 0, priced: [], unpriced: [] };
  for (const slice of entryUsageSlices(entry)) {
    const usd = priceUsd(slice.servedBy, slice.usage);
    if (usd === undefined || !Number.isFinite(usd) || usd < 0) {
      result.unpriced.push(slice);
      continue;
    }
    result.usd += usd;
    result.priced.push({ ...slice, usd });
  }
  return result;
}

/**
 * Final entry form (hashVersion 2).
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
  /**
   * Terminal agent entries whose phases were served by MORE THAN ONE
   * model: usage split by the model that actually served each slice. The
   * loop, extract, finalize, and summarize roles resolve independently,
   * so a single agent call routinely spans models at different prices;
   * pricing the whole call at `servedBy` bills the cheap extract at the
   * loop model's rate. Absent when one model served the whole call, and
   * on entries written before the split shipped: readers fall back to
   * pricing `usage` at `servedBy`, which is exactly correct for those.
   * Policy, never identity: it does not enter the content key.
   */
  usageByModel?: UsageSlice[];
  /**
   * Terminal usage-bearing entries: the attribution facts behind the
   * CostReport breakdowns, so a pure journal fold reproduces the live
   * report byte for byte on replay. Policy, never identity, exactly
   * like usageByModel.
   */
  costAttribution?: CostAttributionFacts;
  /**
   * The serving adapters' declared usage-telemetry semantics at write
   * time (ProviderAdapter.usageSemantics), stamped so cost numbers stay
   * auditable across normalization corrections: an UNSTAMPED OpenAI
   * entry with cacheWriteTokens > 0 may have been written by rulvar
   * v1.19.0, whose adapter double-counted cache writes into inputTokens
   * (v1.20.0 review P1/P2-2). The stamp unions every adapter that
   * served a slice of the entry, distinct declarations joined with '+'
   * in first-appearance order, so a mixed-adapter call whose primary
   * declares nothing is still dated by its declaring slices. Absent
   * only when NO serving adapter declares semantics, and on all entries
   * written before this shipped. Policy, never identity, exactly like
   * usageByModel.
   */
  usageSemantics?: string;
  transcriptRef?: string;
  checkpointRef?: string;
  /**
   * Terminal agent entries: the Artifact list (worktree patch refs and
   * inline values); rides the terminal payload so replay reconstructs
   * AgentResult.artifacts without live calls.
   */
  artifacts?: Json;
  /**
   * Terminal escalated entries ONLY: the schema-validated
   * EscalationReport with runtime-filled costToDate and salvage; replay
   * synthesizes the byte-identical report from here (DEF-1).
   */
  escalation?: Json;
  /** Only when kind === 'resolution'. */
  resolution?: ResolutionPayload;
  /** Only when kind === 'abandon'. */
  abandon?: AbandonPayload;
  /**
   * Policy field on agent entries, fixed in the payload at dispatch
   * time: the M2 predicate reads
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

/** Rand-entry payload. */
export type RandPayload =
  | { subtype: 'now'; value: number }
  | { subtype: 'random'; value: number; key?: string }
  | { subtype: 'uuid'; value: string };

/**
 * Round-1 normalization: hashVersion is taken from `hashVersion`, else
 * from the legacy `v` field, else 1. Stores are never rewritten;
 * normalization happens at read.
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
