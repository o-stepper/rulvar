// The workflow-wide repair ledger a journal already holds (RV4002).
//
// The fifth comparison experiment's run contained exactly one repair: a
// coordination draft rejected by three validators and healed by a
// sectional resubmission, one more wire at $0.186. Every terminal
// aggregate answered truthfully for its own stage (`repairsUsed 0` on
// the composition, `semanticRepairRounds 0` on the claim meta) and no
// surface answered for the workflow, so the independent judge rebuilt
// the repair count from the raw coordination transcript. The judge's
// question ("how many repairs did this workflow pay for, by stage?")
// is a fold, and this module is that fold.
//
// What counts as a repair, by stage:
//   draft:       a journaled `orchestrator_draft_gate` rejection (the
//                RV808a/RV808b coordination draft gate; each rejection
//                grants the loop's next attempt, the experiment's
//                exact shape).
//   composition: a granted mechanical repair inside a composition
//                invocation: an `orchestrator_finish_validation`
//                decision with verdict 'repair'. Rows keep the finer
//                stage ('composition' for the initial invocation and
//                the no-synthesis coordination final, 'round' for the
//                RV3307 round's own pool), both counting here.
//   semantic:    a DISPATCHED claim repair round (RV3307): a settled
//                `final-composition` span whose costAttribution.phase
//                is 'repair' (RV3905 stamps it at dispatch).
//
// What it refuses to claim (RV1209: absence means NOT RECORDED, never
// zero). Journals written before RV4002 carry finish-validation
// decisions with no `stage` and draft-gate rejections not at all, so
// their rows land in `unstagedVerdicts` instead of being guessed into
// a bucket, and a caller that needs a workflow-complete answer must
// treat a nonzero `unstagedVerdicts` as "this journal predates the
// ledger". The repair wire's money is best effort by construction:
// the incremental billing rows append asynchronously (RV2008), so
// `wireRef`/`costUsd` attach only when the row is present and priced.
import type { JournalEntry, ProviderCallRecord } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';

/** One granted repair, folded from its journaled verdict (RV4002). */
export interface RepairLedgerRound {
  /** Which gate granted it: the draft gate, a composition invocation, or the RV3307 round's own pool. */
  stage: 'draft' | 'composition' | 'round';
  /** The verdict decision's seq: the repair's address in the run. */
  seq: number;
  /** The finish call id the verdict was keyed by, when journaled. */
  callId?: string;
  /** The failed validator names, verbatim from the verdict. */
  failedValidators: readonly string[];
  /**
   * The section markers the repair actually resubmitted, when the
   * healing attempt was a sectional splice whose acceptance journaled
   * them (the draft gate's `orchestrator_draft_gate` acceptance and
   * the RV808b finish splice both record theirs).
   */
  sections?: readonly string[];
  /**
   * The repair wire's own address: the seq of the first incremental
   * billing row after this verdict whose record carries the RV4002
   * wire-level `phase: 'repair'` stamp, in the same scope. Absent when
   * the row has not landed (the RV2008 async posture) or predates the
   * stamp.
   */
  wireRef?: number;
  /** That wire priced at the caller's table; absent when unpriceable. */
  costUsd?: number;
}

/** The workflow-wide repair aggregate (RV4002). */
export interface RepairLedger {
  /** Draft-gate rejections (each granted the loop's next attempt). */
  draft: number;
  /** Granted mechanical repairs inside composition invocations, the round's own included. */
  composition: number;
  /** Dispatched semantic repair rounds (RV3307). */
  semantic: number;
  /** draft + composition + semantic. */
  total: number;
  /** One row per counted repair, in seq order (semantic rounds carry no verdict row). */
  rounds: readonly RepairLedgerRound[];
  /**
   * Finish-validation 'repair' verdicts with no journaled stage: the
   * journal predates RV4002, so the buckets above are a FLOOR, not the
   * workflow answer. Zero on every journal this engine writes.
   */
  unstagedVerdicts: number;
}

interface DecisionValue {
  decisionType?: unknown;
  callId?: unknown;
  verdict?: unknown;
  failed?: unknown;
  stage?: unknown;
  sections?: unknown;
  spliced?: unknown;
}

interface WireRowValue {
  decisionType?: unknown;
  agentRef?: unknown;
  record?: { phase?: unknown; servedBy?: unknown; usage?: Usage };
}

const failedNamesOf = (failed: unknown): string[] => {
  if (!Array.isArray(failed)) {
    return [];
  }
  return failed
    .map((row) =>
      typeof (row as { name?: unknown }).name === 'string'
        ? String((row as { name: string }).name)
        : undefined,
    )
    .filter((name): name is string => name !== undefined);
};

const sectionsOf = (sections: unknown): string[] | undefined => {
  if (!Array.isArray(sections) || sections.length === 0) {
    return undefined;
  }
  const markers = sections.filter((marker): marker is string => typeof marker === 'string');
  return markers.length === 0 ? undefined : markers;
};

/**
 * Folds the workflow-wide repair ledger from a journal (RV4002). Pure
 * over the entries, so the acceptance envelope's live aggregate
 * (computed from the run's own snapshot at assembly) and a post-hoc
 * fold over the persisted journal agree by construction on every
 * count and row identity; `wireRef`/`costUsd` enrich rows exactly when
 * the asynchronous billing lane covered them.
 */
export function repairLedgerFromJournal(
  entries: readonly JournalEntry[],
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined,
): RepairLedger {
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);
  const rounds: RepairLedgerRound[] = [];
  const rowScopes = new Map<RepairLedgerRound, string>();
  let draft = 0;
  let composition = 0;
  let semantic = 0;
  let unstagedVerdicts = 0;
  /** Sectional acceptances by scope, to pair sections onto the rejection they healed. */
  const draftAccepts: Array<{ seq: number; scope: string; sections: readonly string[] }> = [];
  const wireRows: Array<{ seq: number; scope: string; record: ProviderCallRecord }> = [];
  for (const entry of ordered) {
    if (entry.kind === 'agent' && entry.status !== 'running' && entry.status !== 'suspended') {
      // The dispatched RV3307 round: RV3905 stamps the round's own
      // invocation phase 'repair' at dispatch, so the count needs no
      // new journal field and holds for every RV3905+ journal.
      if (
        entry.costAttribution?.label === 'final-composition' &&
        entry.costAttribution.phase === 'repair'
      ) {
        semantic += 1;
      }
      continue;
    }
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as DecisionValue | undefined;
    if (value === undefined) {
      continue;
    }
    if (value.decisionType === 'provider-call') {
      const row = entry.value as WireRowValue;
      if (row.record?.phase === 'repair') {
        wireRows.push({
          seq: entry.seq,
          scope: entry.scope,
          record: row.record as ProviderCallRecord,
        });
      }
      continue;
    }
    if (value.decisionType === 'orchestrator_draft_gate') {
      if (value.verdict === 'rejected') {
        draft += 1;
        const row: RepairLedgerRound = {
          stage: 'draft',
          seq: entry.seq,
          ...(typeof value.callId === 'string' ? { callId: value.callId } : {}),
          failedValidators: failedNamesOf(value.failed),
        };
        rounds.push(row);
        rowScopes.set(row, entry.scope);
      } else if (value.verdict === 'accepted' && value.spliced === true) {
        const sections = sectionsOf(value.sections);
        if (sections !== undefined) {
          draftAccepts.push({ seq: entry.seq, scope: entry.scope, sections });
        }
      }
      continue;
    }
    if (value.decisionType === 'orchestrator_finish_validation' && value.verdict === 'repair') {
      if (value.stage !== 'composition' && value.stage !== 'round') {
        unstagedVerdicts += 1;
        continue;
      }
      composition += 1;
      const sections = sectionsOf(value.sections);
      const row: RepairLedgerRound = {
        stage: value.stage,
        seq: entry.seq,
        ...(typeof value.callId === 'string' ? { callId: value.callId } : {}),
        failedValidators: failedNamesOf(value.failed),
        ...(sections === undefined ? {} : { sections }),
      };
      rounds.push(row);
      rowScopes.set(row, entry.scope);
      continue;
    }
    // A spliced ACCEPTANCE after a finish-validation repair carries the
    // resubmitted markers on its own decision; pair them back onto the
    // repair row they healed (same scope, the nearest earlier row).
    if (
      value.decisionType === 'orchestrator_finish_validation' &&
      value.verdict === 'accepted' &&
      value.spliced === true
    ) {
      const sections = sectionsOf(value.sections);
      if (sections !== undefined) {
        draftAccepts.push({ seq: entry.seq, scope: entry.scope, sections });
      }
    }
  }
  // Pair sectional acceptances onto the nearest earlier row of the
  // same scope that has no sections yet.
  for (const accept of draftAccepts) {
    for (let index = rounds.length - 1; index >= 0; index -= 1) {
      const row = rounds[index];
      if (
        row === undefined ||
        row.seq >= accept.seq ||
        row.sections !== undefined ||
        rowScopes.get(row) !== accept.scope
      ) {
        continue;
      }
      row.sections = accept.sections;
      break;
    }
  }
  // Attach each repair-stamped wire to the nearest earlier row of the
  // same scope that has none yet (the wire follows its verdict).
  for (const wire of wireRows) {
    let target: RepairLedgerRound | undefined;
    for (const row of rounds) {
      if (row.seq >= wire.seq || row.wireRef !== undefined || rowScopes.get(row) !== wire.scope) {
        continue;
      }
      target = row;
    }
    if (target === undefined) {
      continue;
    }
    target.wireRef = wire.seq;
    if (priceUsd !== undefined && wire.record.servedBy !== undefined) {
      const usd = priceUsd(wire.record.servedBy, wire.record.usage);
      if (usd !== undefined && Number.isFinite(usd) && usd >= 0) {
        target.costUsd = usd;
      }
    }
  }
  rounds.sort((a, b) => a.seq - b.seq);
  return {
    draft,
    composition,
    semantic,
    total: draft + composition + semantic,
    rounds,
    unstagedVerdicts,
  };
}
