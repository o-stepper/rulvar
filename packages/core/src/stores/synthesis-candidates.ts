// The synthesis candidates a journal already holds (RV2902).
//
// The ninth comparison run settled ok after one evidence-grade repair,
// and the one question its frozen telemetry could not answer was what
// the repair itself cost: both finish candidates sat inside a single
// 177 second synthesize span with one price on it. Every ingredient
// was already written down. The finish verdicts are journaled
// decisions (`orchestrator_finish_validation`, one per candidate, with
// the failed validators and their reasons verbatim), the incremental
// billing rows (`provider-call`, RV2008) carry each wire's seq, stamp,
// usage, and serving model, and a terminal agent entry names its
// running entry by `ref`. Sequence numbers partition the span's wires
// between its verdicts exactly, so the fold below attributes each
// candidate's wall, wires, usage, and priced floor without guessing.
//
// What it refuses to claim (RV1209: absence means NOT RECORDED, never
// zero). A verdict outside every settled synthesize span is counted,
// not invented into a candidate: draft-stage validations live in the
// coordination span and a crashed synthesis has no terminal to bound
// it. And the incremental rows append asynchronously by design (a
// failed append degrades to the terminal ledger), so when they do not
// cover the terminal's own call records the span's candidates keep
// their verdict facts and drop the money: a partial wire set cannot
// price a window, only misprice it.
import type { JournalEntry, ProviderCallRecord } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';

/** One failed validator on a journaled finish verdict, verbatim. */
export interface SynthesisCandidateFailure {
  name: string;
  reasons: readonly string[];
}

/** One finish candidate, folded from its journaled verdict (RV2902). */
export interface JournaledSynthesisCandidate {
  /** The journaled verdict: 'accepted', 'repair', or 'rejected'. */
  verdict: 'accepted' | 'repair' | 'rejected';
  /** The verdict decision's seq: the candidate's address in the run. */
  verdictSeq: number;
  /** The verdict decision's stamp, when the entry carried one. */
  verdictAt?: string;
  /** The finish call id the verdict was keyed by. */
  callId?: string;
  /** Repairs spent BEFORE this candidate, from the verdict itself. */
  repairsUsed?: number;
  maxRepairs?: number;
  /** The contract generation the verdict was rendered under. */
  contractHash?: string;
  /** The non-accepted candidate's identity (RV2507), when journaled. */
  candidateHash?: string;
  candidateChars?: number;
  /** The rejected candidate's transcript blob, under retention. */
  candidateRef?: string;
  /** The failed validators with their reasons, verbatim. */
  failed: readonly SynthesisCandidateFailure[];
  /** The hosting span's dispatch label (RV2901), when journaled. */
  spanLabel?: string;
  /**
   * The hosting span's running entry seq (RV3802): the span's identity
   * within the run, so two candidates can be read as neighbors of ONE
   * composition invocation (the repair-turn pairing below) instead of
   * accidental neighbors across spans. Absent exactly when unhosted.
   */
  spanSeq?: number;
  /**
   * Wall from the previous boundary (the span's start, or the prior
   * verdict) to this verdict's stamp. Absent when the candidate is not
   * hosted by a settled synthesize span or a stamp is missing.
   */
  windowMs?: number;
  /**
   * Provider wire requests inside this candidate's window (absorbed
   * continuations counted). Present only when the incremental rows
   * cover the hosting span's terminal call records exactly.
   */
  wires?: number;
  /** Summed recorded usage of the window's wires; same condition. */
  usage?: Usage;
  /**
   * Window wires that recorded NO usage on a non-ok outcome: the
   * provider may have billed them anyway, so `costUsd` is a floor
   * whenever this is nonzero.
   */
  usageUnknownWires?: number;
  /**
   * The window priced per call at the caller's table. Present only
   * when a price function was given and it priced EVERY window wire;
   * an unpriced model drops the field rather than shrinking it.
   */
  costUsd?: number;
}

/** What `synthesisCandidatesFromJournal` folded, beside the candidates. */
export interface JournaledSynthesisCandidateReport {
  /** Every hosted candidate, in verdict seq order. */
  candidates: readonly JournaledSynthesisCandidate[];
  /** Settled synthesize spans the journal holds. */
  synthesisSpans: number;
  /**
   * Finish verdicts NOT hosted by a settled synthesize span: draft
   * stage validations in the coordination span, and verdicts inside a
   * synthesis that never settled. Counted, never guessed into
   * candidates.
   */
  unhostedVerdicts: number;
  /**
   * Settled synthesize spans whose incremental billing rows do not
   * cover their terminal call records (the rows append asynchronously
   * and may be missing); their candidates carry verdict facts only.
   */
  unattributedSpans: number;
  /** Wires after a span's LAST verdict: attributed to no candidate. */
  tailWires: number;
}

interface VerdictValue {
  decisionType?: unknown;
  callId?: unknown;
  verdict?: unknown;
  failed?: unknown;
  repairsUsed?: unknown;
  maxRepairs?: unknown;
  contractHash?: unknown;
  candidateHash?: unknown;
  candidateChars?: unknown;
  candidateRef?: unknown;
}

interface WireValue {
  decisionType?: unknown;
  agentRef?: unknown;
  record?: {
    ordinal?: unknown;
    servedBy?: unknown;
    outcome?: unknown;
    usage?: Usage;
    wireRequests?: unknown;
  };
}

interface WireRow {
  seq: number;
  ordinal: number;
  servedBy?: string;
  outcome: string;
  usage?: Usage;
  wireRequests: number;
}

const parse = (at: string | undefined): number | undefined => {
  if (at === undefined) {
    return undefined;
  }
  const ms = Date.parse(at);
  return Number.isFinite(ms) ? ms : undefined;
};

const VERDICTS = new Set(['accepted', 'repair', 'rejected']);

const OPTIONAL_USAGE_KEYS = [
  'reasoningTokens',
  'cacheWrite5mTokens',
  'cacheWrite1hTokens',
] as const;

function sumUsage(rows: readonly WireRow[]): Usage {
  const total: Usage = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  for (const row of rows) {
    if (row.usage === undefined) {
      continue;
    }
    total.inputTokens += row.usage.inputTokens;
    total.outputTokens += row.usage.outputTokens;
    total.cacheReadTokens += row.usage.cacheReadTokens;
    total.cacheWriteTokens += row.usage.cacheWriteTokens;
    for (const key of OPTIONAL_USAGE_KEYS) {
      const share = row.usage[key];
      if (share !== undefined) {
        total[key] = (total[key] ?? 0) + share;
      }
    }
  }
  return total;
}

const usageUnknown = (row: WireRow): boolean => {
  if (row.outcome === 'ok') {
    return false;
  }
  const usage = row.usage;
  if (usage === undefined) {
    return true;
  }
  return (
    usage.inputTokens === 0 &&
    usage.outputTokens === 0 &&
    usage.cacheReadTokens === 0 &&
    usage.cacheWriteTokens === 0 &&
    (usage.reasoningTokens ?? 0) === 0
  );
};

/**
 * Fold the finish candidates (RV2902) out of a run's journal: each
 * journaled validation verdict with the window of wall, wires, usage,
 * and priced cost that produced the candidate it judged.
 *
 * @param entries the journal of one run, in any order
 * @param priceUsd prices one call's usage at its serving model, the
 *   same shape `invoiceFromJournal` takes; omit to fold without money
 */
export function synthesisCandidatesFromJournal(
  entries: readonly JournalEntry[],
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined,
): JournaledSynthesisCandidateReport {
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);

  interface Span {
    runningSeq: number;
    terminalSeq: number;
    startedAt?: number;
    label?: string;
    records: readonly ProviderCallRecord[] | undefined;
    wires: WireRow[];
    verdictSeqs: number[];
  }
  const spans: Span[] = [];
  for (const entry of ordered) {
    if (
      entry.kind !== 'agent' ||
      entry.status === 'running' ||
      entry.status === 'suspended' ||
      entry.costAttribution?.role !== 'synthesize' ||
      typeof entry.ref !== 'number'
    ) {
      continue;
    }
    spans.push({
      runningSeq: entry.ref,
      terminalSeq: entry.seq,
      startedAt: parse(entry.startedAt),
      ...(entry.costAttribution.label === undefined ? {} : { label: entry.costAttribution.label }),
      records: entry.providerCalls,
      wires: [],
      verdictSeqs: [],
    });
  }
  const bySeqOpen = new Map<number, Span>();
  for (const span of spans) {
    bySeqOpen.set(span.runningSeq, span);
  }

  interface Verdict {
    seq: number;
    at?: string;
    value: VerdictValue;
    span?: Span;
  }
  const verdicts: Verdict[] = [];
  for (const entry of ordered) {
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as VerdictValue | WireValue | undefined;
    if (value === undefined) {
      continue;
    }
    if (value.decisionType === 'provider-call') {
      const wire = value as WireValue;
      if (typeof wire.agentRef !== 'number') {
        continue;
      }
      const span = bySeqOpen.get(wire.agentRef);
      const record = wire.record;
      if (span === undefined || record === undefined || typeof record.ordinal !== 'number') {
        continue;
      }
      span.wires.push({
        seq: entry.seq,
        ordinal: record.ordinal,
        ...(typeof record.servedBy === 'string' ? { servedBy: record.servedBy } : {}),
        outcome: typeof record.outcome === 'string' ? record.outcome : 'ok',
        ...(record.usage === undefined ? {} : { usage: record.usage }),
        wireRequests: typeof record.wireRequests === 'number' ? record.wireRequests : 1,
      });
      continue;
    }
    if (value.decisionType !== 'orchestrator_finish_validation') {
      continue;
    }
    const verdictValue = value as VerdictValue;
    if (typeof verdictValue.verdict !== 'string' || !VERDICTS.has(verdictValue.verdict)) {
      continue;
    }
    // The hosting span: the innermost settled synthesize interval the
    // verdict's seq falls inside. Coordination-hosted verdicts (the
    // draft gate) and verdicts of a synthesis that never settled match
    // nothing and stay unhosted.
    let host: Span | undefined;
    for (const span of spans) {
      if (entry.seq > span.runningSeq && entry.seq < span.terminalSeq) {
        if (host === undefined || span.runningSeq > host.runningSeq) {
          host = span;
        }
      }
    }
    if (host !== undefined) {
      host.verdictSeqs.push(entry.seq);
    }
    verdicts.push({
      seq: entry.seq,
      ...(entry.startedAt === undefined ? {} : { at: entry.startedAt }),
      value: verdictValue,
      ...(host === undefined ? {} : { span: host }),
    });
  }

  // A span's wires attribute only when the incremental rows cover the
  // terminal's own call records exactly (same ordinal multiset): the
  // rows append asynchronously and a missing one cannot be priced
  // around, only mispriced around.
  const attributable = new Set<Span>();
  let unattributedSpans = 0;
  for (const span of spans) {
    const recorded = (span.records ?? []).map((record) => record.ordinal).sort((a, b) => a - b);
    const rows = [...span.wires].map((wire) => wire.ordinal).sort((a, b) => a - b);
    const covered =
      span.records !== undefined &&
      recorded.length === rows.length &&
      recorded.every((ordinal, index) => ordinal === rows[index]);
    if (covered) {
      attributable.add(span);
    } else {
      unattributedSpans += 1;
    }
  }

  let tailWires = 0;
  for (const span of spans) {
    if (!attributable.has(span)) {
      continue;
    }
    const lastVerdict = span.verdictSeqs.length === 0 ? undefined : Math.max(...span.verdictSeqs);
    if (lastVerdict === undefined) {
      continue;
    }
    for (const wire of span.wires) {
      if (wire.seq > lastVerdict) {
        tailWires += wire.wireRequests;
      }
    }
  }

  const candidates: JournaledSynthesisCandidate[] = [];
  let unhostedVerdicts = 0;
  const previousBoundary = new Map<Span, { seq: number; at?: number }>();
  for (const verdict of verdicts) {
    const value = verdict.value;
    if (verdict.span === undefined) {
      unhostedVerdicts += 1;
      continue;
    }
    const span = verdict.span;
    const boundary = previousBoundary.get(span) ?? {
      seq: span.runningSeq,
      ...(span.startedAt === undefined ? {} : { at: span.startedAt }),
    };
    const verdictAtMs = parse(verdict.at);
    previousBoundary.set(span, {
      seq: verdict.seq,
      ...(verdictAtMs === undefined ? {} : { at: verdictAtMs }),
    });
    const candidate: JournaledSynthesisCandidate = {
      verdict: value.verdict as 'accepted' | 'repair' | 'rejected',
      verdictSeq: verdict.seq,
      ...(verdict.at === undefined ? {} : { verdictAt: verdict.at }),
      ...(typeof value.callId === 'string' ? { callId: value.callId } : {}),
      ...(typeof value.repairsUsed === 'number' ? { repairsUsed: value.repairsUsed } : {}),
      ...(typeof value.maxRepairs === 'number' ? { maxRepairs: value.maxRepairs } : {}),
      ...(typeof value.contractHash === 'string' ? { contractHash: value.contractHash } : {}),
      ...(typeof value.candidateHash === 'string' ? { candidateHash: value.candidateHash } : {}),
      ...(typeof value.candidateChars === 'number' ? { candidateChars: value.candidateChars } : {}),
      ...(typeof value.candidateRef === 'string' ? { candidateRef: value.candidateRef } : {}),
      failed: Array.isArray(value.failed)
        ? (value.failed as { name?: unknown; reasons?: unknown }[])
            .filter((failure) => typeof failure.name === 'string')
            .map((failure) => ({
              name: failure.name as string,
              reasons: Array.isArray(failure.reasons)
                ? failure.reasons.filter((reason): reason is string => typeof reason === 'string')
                : [],
            }))
        : [],
      ...(span.label === undefined ? {} : { spanLabel: span.label }),
      spanSeq: span.runningSeq,
    };
    if (boundary.at !== undefined && verdictAtMs !== undefined) {
      candidate.windowMs = Math.max(0, verdictAtMs - boundary.at);
    }
    if (attributable.has(span)) {
      const window = span.wires.filter((wire) => wire.seq > boundary.seq && wire.seq < verdict.seq);
      candidate.wires = window.reduce((sum, wire) => sum + wire.wireRequests, 0);
      candidate.usage = sumUsage(window);
      const unknown = window.filter((wire) => usageUnknown(wire)).length;
      if (unknown > 0) {
        candidate.usageUnknownWires = unknown;
      }
      if (priceUsd !== undefined) {
        let priced = 0;
        let complete = true;
        for (const wire of window) {
          const usd =
            wire.servedBy === undefined || wire.usage === undefined
              ? undefined
              : priceUsd(wire.servedBy as ModelRef, wire.usage);
          if (usd === undefined) {
            complete = false;
            break;
          }
          priced += usd;
        }
        if (complete) {
          candidate.costUsd = priced;
        }
      }
    }
    candidates.push(candidate);
  }

  return {
    candidates,
    synthesisSpans: spans.length,
    unhostedVerdicts,
    unattributedSpans,
    tailWires,
  };
}

/**
 * The observed price of the run's LAST mechanical repair turn
 * (RV3802): the window of the candidate that FOLLOWED a 'repair'
 * verdict inside the same settled synthesize span, priced by the same
 * per-call fold every candidate window uses. This is the fallback the
 * repair round's mechanical money leg sizes itself from when the host
 * declared no estimate: by the time the round is admitted the initial
 * composition has settled, so a mechanical repair it performed is a
 * priced window in the journal. Fail closed under RV1209: no such
 * pairing, an unattributed span, or an unpriceable window all return
 * undefined (never a guessed number), and the caller treats undefined
 * as an inert zero-size leg.
 */
export function lastMechanicalRepairCostUsd(
  entries: readonly JournalEntry[],
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined,
): number | undefined {
  const { candidates } = synthesisCandidatesFromJournal(entries, priceUsd);
  let observed: number | undefined;
  for (let index = 1; index < candidates.length; index += 1) {
    const previous = candidates[index - 1];
    const row = candidates[index];
    if (
      previous?.verdict === 'repair' &&
      row?.spanSeq !== undefined &&
      row.spanSeq === previous.spanSeq &&
      row.costUsd !== undefined
    ) {
      observed = row.costUsd;
    }
  }
  return observed;
}
