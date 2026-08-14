/**
 * JournalEntry form, the kinds registry v2, the stored status vocabulary,
 * and hashVersion (M1-T04; frozen as the hashVersion 2 profile in M2).
 *
 * Full contract: https://docs.rulvar.com/guide/journal; hashVersion
 * (DEF-6): https://docs.rulvar.com/guide/journal-compatibility
 */
import type { Json } from './json.js';
import { ConfigError } from './errors.js';
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
 * One live provider dispatch of an agent invocation (P1.3, the durable
 * reconciliation ledger): every wire call the engine actually made,
 * successful or not, with the usage it consumed and the provider's
 * response id when the adapter surfaced one. Quota-denied attempts and
 * abort short circuits that never reached the adapter mint no record:
 * the ledger enumerates exactly the calls a provider could bill.
 * Records are minted from the same sanitized usage the phase slices
 * accumulate, so per-model sums over an entry's records reconcile with
 * `usageByModel` (and with `usage`) by construction on a fully live
 * invocation.
 */
export interface ProviderCallRecord {
  /** 1-based dispatch order across the whole invocation, phases included. */
  ordinal: number;
  /** The invocation phase that paid the call. */
  role: InvocationRole;
  servedBy: ModelRef;
  /**
   * 1-based DISPATCHED try number on the serving target; transport
   * retries increment it, a pre-wire quota denial never does (RV1601),
   * so the recorded attempts of one (role, target) series are always
   * dense from 1 and an attempt=2 row proves a prior dispatched try
   * with its own record.
   */
  attempt: number;
  /**
   * 'ok' = a terminal finish; 'error' = a wire failure after dispatch
   * (the provider may still have billed the recorded usage); 'aborted' =
   * the stream was severed by `aborted` below.
   */
  outcome: 'ok' | 'error' | 'aborted';
  /**
   * The provider's response id from the finish metadata
   * (`providerMetadata[<adapter id>].responseId`, surfaced by both
   * shipped adapters). Absent when the adapter reported none or the
   * call never finished; the invoice export marks such rows instead of
   * dropping them.
   */
  responseId?: string;
  /**
   * Every wire request's response id when the adapter absorbed
   * provider-side continuations into this one dispatch (RV905:
   * `providerMetadata[<adapter id>].wireRequests`, the Anthropic
   * pause_turn absorption). A per-request provider statement bills each
   * segment as its own row, so the reconciliation joins by ANY id of
   * this set. Absent on single-wire dispatches, keeping them
   * byte-identical.
   */
  wireResponseIds?: string[];
  /**
   * How many provider HTTP requests this ONE dispatch made, as the
   * adapter reported it (RV1210:
   * `providerMetadata[<adapter id>].wireRequests.count`). Recorded
   * independently of `wireResponseIds` because a provider may leave a
   * segment unnamed: counting ids alone understates the cardinality by
   * exactly those segments, and the quota window (which settles on the
   * count) would then disagree with the invoice. Absent on single-wire
   * dispatches, keeping them byte-identical.
   */
  wireRequests?: number;
  /** This call's usage exactly, sanitized like every accounted number. */
  usage: Usage;
  /** True when the stream was cut, so the usage is a lower bound. */
  usageApprox?: boolean;
  /** WireError.code on 'error' outcomes. */
  errorCode?: string;
  /** What severed an 'aborted' call. */
  aborted?: 'budget' | 'external' | 'idle';
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
  /**
   * The dispatch label, when the caller gave one (RV2803): what tells
   * two spans of ONE role apart, which the event stream has always
   * carried and the journal never did. Absent on every unlabelled
   * dispatch and on every journal written before it shipped, so a
   * reading that needs it reports absence rather than guessing. Policy,
   * never identity.
   */
  label?: string;
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

const foldOverflow = (seq: number, servedBy: string): ConfigError =>
  new ConfigError(
    `cost accounting overflow: the price sum for entry seq ${String(seq)} became non-finite ` +
      `at model ${servedBy} (individually finite prices overflowed); no public report may ` +
      'carry a non-finite number',
  );

/**
 * The single pricing fold over one terminal entry, shared by the kernel
 * ledger and the CostReport fold so a run's total and its per-model
 * breakdown can never disagree. Each slice is priced at ITS OWN model's
 * rate. A price function returning NaN or a negative amount (a broken
 * user-supplied rate) is treated exactly like a missing row: the slice
 * folds as unpriced instead of poisoning or crediting the totals
 * (v1.20.0 review follow-up). The optional third argument hands the
 * price function the entry's seq, so a segment-aware snapshot can
 * price the row under the rates of ITS segment (RV505); two-argument
 * price functions simply ignore it.
 */
export function priceEntryUsage(
  entry: JournalEntry,
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
): PricedUsage {
  const result: PricedUsage = { usd: 0, priced: [], unpriced: [] };
  for (const slice of entryUsageSlices(entry)) {
    const usd = priceUsd(slice.servedBy, slice.usage, entry.seq);
    if (usd === undefined || !Number.isFinite(usd) || usd < 0) {
      result.unpriced.push(slice);
      continue;
    }
    result.usd += usd;
    if (!Number.isFinite(result.usd)) {
      throw foldOverflow(entry.seq, slice.servedBy);
    }
    result.priced.push({ ...slice, usd });
  }
  return result;
}

/** One priced unit of {@link priceEntryBilling} (RV504). */
export interface EntryBillingUnit {
  /**
   * 'call' prices one provider dispatch (the per-request basis);
   * 'slice' is the historical per-model aggregate of an entry whose
   * records do not fully cover its usage.
   */
  source: 'call' | 'slice';
  servedBy: ModelRef;
  usage: Usage;
  role?: InvocationRole;
  /** The dispatch record behind a 'call' unit. */
  record?: ProviderCallRecord;
  usd: number;
}

/** What {@link priceEntryBilling} folds one terminal entry into. */
export interface EntryBillingFold {
  /** Priced units in fold order; `usd` is their sum in exactly this order. */
  units: EntryBillingUnit[];
  usd: number;
  /** Usage on models the price function refused; never a silent zero. */
  unpriced: UsageSlice[];
  /**
   * True when the entry's providerCalls exactly cover every usage
   * slice, counter for counter: the fold priced per call, so a
   * nonlinear tier fired per REQUEST, the pricing contract's own
   * semantics. False folds the aggregate slices, the historical basis.
   */
  fullyAttributed: boolean;
  /**
   * The models this fold priced per call: record sums equal slice sums
   * counter for counter under the symmetric per-model key (RV604).
   * Published so a row builder can honor the same decision (RV703): a
   * covered model's rows are exactly its records, so no per-slice
   * remainder may be fabricated for it; recomputing coverage elsewhere
   * is how the phantom-remainder skew was born.
   */
  coveredModels: ReadonlySet<ModelRef>;
}

const BILLING_FIELDS = [
  'inputTokens',
  'outputTokens',
  'cacheReadTokens',
  'cacheWriteTokens',
] as const;

/** Per-model billing-counter sums of either side of the coverage test. */
function sumUsageByModel(
  items: ReadonlyArray<{ servedBy: ModelRef; usage: Usage }>,
): Map<ModelRef, { fields: Record<string, number>; reasoning: number }> {
  const sums = new Map<ModelRef, { fields: Record<string, number>; reasoning: number }>();
  for (const item of items) {
    let sum = sums.get(item.servedBy);
    if (sum === undefined) {
      sum = {
        fields: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        reasoning: 0,
      };
      sums.set(item.servedBy, sum);
    }
    for (const field of BILLING_FIELDS) {
      sum.fields[field] = (sum.fields[field] ?? 0) + item.usage[field];
    }
    sum.reasoning += item.usage.reasoningTokens ?? 0;
  }
  return sums;
}

/**
 * The models whose records exactly cover their usage, counter for
 * counter. BOTH sides aggregate by `servedBy` (RV604): the usage slices
 * split one model's spend by role (a schema fires a same-model extract
 * by default, so several slices of one model are the ordinary shape),
 * and comparing a per-role slice against the per-model record sum
 * refused coverage on exactly that default, re-tiering aggregates no
 * single request crossed. The symmetric key compares model sum against
 * model sum, so coverage is per model: a covered model prices per call
 * while an uncovered one honestly keeps the aggregate basis.
 */
function coveredModels(
  slices: readonly UsageSlice[],
  records: readonly ProviderCallRecord[],
): Set<ModelRef> {
  const covered = new Set<ModelRef>();
  if (slices.length === 0 || records.length === 0) {
    return covered;
  }
  const recordSums = sumUsageByModel(records);
  const sliceSums = sumUsageByModel(slices);
  for (const [model, sliceSum] of sliceSums) {
    const recordSum = recordSums.get(model);
    if (recordSum === undefined) {
      continue;
    }
    const matches =
      BILLING_FIELDS.every((field) => recordSum.fields[field] === sliceSum.fields[field]) &&
      recordSum.reasoning === sliceSum.reasoning;
    if (matches) {
      covered.add(model);
    }
  }
  return covered;
}

/**
 * The billing fold over one terminal entry (RV504), shared by the
 * CostReport and invoice folds so the total, every breakdown, and the
 * per-row prices can never disagree. Coverage is decided per MODEL with
 * the symmetric key (RV604): for every model whose per-dispatch
 * `providerCalls` sum to exactly its usage, each call is priced
 * individually, so a nonlinear long-context tier fires per REQUEST,
 * which is the pricing contract's stated semantics; an aggregate that
 * crossed a threshold no single request crossed no longer re-prices
 * that model (the ninth-experiment 52% overreport, and the round-52
 * multi-role default). A model with no records, or records that do not
 * cover its usage, folds exactly as before: the per-model aggregate
 * slices of {@link priceEntryUsage}. `fullyAttributed` is true only
 * when every slice model is covered and no record names a model absent
 * from the slices.
 */
export function priceEntryBilling(
  entry: JournalEntry,
  priceUsd: (servedBy: ModelRef, usage: Usage, seq?: number) => number | undefined,
): EntryBillingFold {
  const slices = entryUsageSlices(entry);
  const records = entry.providerCalls ?? [];
  const covered = coveredModels(slices, records);
  const units: EntryBillingUnit[] = [];
  const unpricedByModel = new Map<ModelRef, Usage>();
  let usd = 0;
  // Covered models price per record, in dispatch order; the role rides
  // each record, so byRole attribution survives the aggregation.
  for (const record of records) {
    if (!covered.has(record.servedBy)) {
      continue;
    }
    const price = priceUsd(record.servedBy, record.usage, entry.seq);
    if (price === undefined || !Number.isFinite(price) || price < 0) {
      const sum = unpricedByModel.get(record.servedBy) ?? {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      for (const field of BILLING_FIELDS) {
        sum[field] += record.usage[field];
      }
      const reasoning = (sum.reasoningTokens ?? 0) + (record.usage.reasoningTokens ?? 0);
      if (reasoning > 0) {
        sum.reasoningTokens = reasoning;
      }
      unpricedByModel.set(record.servedBy, sum);
      continue;
    }
    usd += price;
    if (!Number.isFinite(usd)) {
      throw foldOverflow(entry.seq, record.servedBy);
    }
    units.push({
      source: 'call',
      servedBy: record.servedBy,
      usage: record.usage,
      role: record.role,
      record,
      usd: price,
    });
  }
  // Uncovered slices keep the historical aggregate basis, in slice order.
  for (const slice of slices) {
    if (covered.has(slice.servedBy)) {
      continue;
    }
    const price = priceUsd(slice.servedBy, slice.usage, entry.seq);
    if (price === undefined || !Number.isFinite(price) || price < 0) {
      const sum = unpricedByModel.get(slice.servedBy) ?? {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      for (const field of BILLING_FIELDS) {
        sum[field] += slice.usage[field];
      }
      const reasoning = (sum.reasoningTokens ?? 0) + (slice.usage.reasoningTokens ?? 0);
      if (reasoning > 0) {
        sum.reasoningTokens = reasoning;
      }
      unpricedByModel.set(slice.servedBy, sum);
      continue;
    }
    usd += price;
    if (!Number.isFinite(usd)) {
      throw foldOverflow(entry.seq, slice.servedBy);
    }
    units.push({
      source: 'slice',
      servedBy: slice.servedBy,
      usage: slice.usage,
      ...(slice.role === undefined ? {} : { role: slice.role }),
      usd: price,
    });
  }
  const fullyAttributed =
    slices.length > 0 &&
    slices.every((slice) => covered.has(slice.servedBy)) &&
    records.every((record) => slices.some((slice) => slice.servedBy === record.servedBy));
  return {
    units,
    usd,
    unpriced: [...unpricedByModel].map(([servedBy, usage]) => ({ servedBy, usage })),
    fullyAttributed,
    coveredModels: covered,
  };
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
   * Terminal agent entries: the per-dispatch reconciliation ledger
   * (P1.3), one record per live provider call the invocation made,
   * failed and retried attempts included, so every billable wire call
   * maps to a journal entry and the invoice export can name the
   * provider response ids behind the usage total. Absent on entries
   * written before this shipped and on fully replayed invocations
   * (which made no calls); the invoice fold surfaces such entries as
   * unattributed rows instead of losing their spend. Policy, never
   * identity, exactly like usageByModel.
   */
  providerCalls?: ProviderCallRecord[];
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
   * Terminal agent entries: the evidence verdict under a declared
   * contract (RV806), journaled so replay restores
   * AgentResult.evidence without re-deriving a window it no longer
   * holds (the RV1501 entries plumbing). Policy, never identity,
   * exactly like usageByModel.
   */
  evidence?: { recordedEntries: number; minEntries: number; met: boolean };
  /**
   * Terminal agent entries: the recorded evidence entry CONTENT (the
   * RV1501 entries plumbing): each successful record_evidence
   * execution's claim plus its file or file:lines citation, in record
   * order, bounded at collection time (40 entries, 400 chars per
   * claim). Rides the terminal payload so replay reconstructs
   * AgentResult.evidenceEntries without live calls and a resumed
   * orchestrator pairs its claim pools against what the child
   * actually recorded, exactly like a live run. Policy, never
   * identity.
   */
  evidenceEntries?: Array<{ claim: string; citation?: string }>;
  /**
   * Terminal agent entries: the durable subset of the tool-budget
   * summary (RV3002): the loop's executed-call counter and the
   * effective cap at the end, journaled at settle whenever the live
   * result carried a summary. The counter has always been durable in
   * the terminal checkpoint, but checkpoints are blobs and journal
   * folds read entries only, so without this field observed
   * calls-per-evidence-entry calibration cannot be a pure fold. Replay
   * restores AgentResult.toolBudget from here unconditionally; entries
   * without the field (every pre-existing journal) keep the RV509
   * decision-conditional path byte for byte. Live-only summary fields
   * (unitsUsed, noticesFired, limiter, and the rest) never journal.
   * Policy, never identity, exactly like evidence.
   */
  toolBudget?: { used: number; cap?: number };
  /**
   * Terminal agent entries whose invocation was aborted by the host's
   * finish rejection (RV3702): the declared finish contract rejected
   * the candidate past its repair bound, so the span died by host
   * hand with its wires fine. Stamped at settle from the typed abort
   * reason; never on a defective (throwing) validator, whose abort
   * carries its own reason, because a host defect is not a verdict on
   * the candidate. Policy, never identity, exactly like usageByModel.
   */
  hostRejected?: boolean;
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
