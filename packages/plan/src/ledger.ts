/**
 * RunLedger (M7-T09): run-scoped, single-writer, journaled, strictly
 * advisory distilled state for recovery-context quality and replanning.
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section 9. ONLY
 * the orchestrator scope writes; every authored write is a journaled
 * effect entry of kind `ledger.op`; the VIEW is a pure fold of those ops
 * joined to the journal's task table. The journal always wins on what is
 * paid and completed: contradictions render as FLAGGED discrepancies,
 * never as truth. `ledger_read` is pinned to the turn snapshot;
 * fold-global counters never enter the transcript. The ledger is never a
 * second source of truth; vector stores, multi-writer, and cross-run
 * memory are rejected in v1 (the sole sanctioned exception is
 * ModelKnowledge).
 */
import { deriverV2 } from '@rulvar/core';
import type { EntryRef, JournalEntry, LogicalTaskId } from '@rulvar/core';

/** The CLOSED authored op vocabulary (docs/07, 9.2). */
export type LedgerOp =
  | { op: 'brief_set'; text: string }
  | {
      op: 'fact_add';
      factId: string;
      text: string;
      provenance: EntryRef[];
      confidence: 'low' | 'medium' | 'high';
    }
  | {
      op: 'fact_supersede';
      factId: string;
      supersededBy: string;
      text: string;
      provenance: EntryRef[];
      confidence: 'low' | 'medium' | 'high';
    }
  | { op: 'lesson_add'; key: { logicalTaskId: LogicalTaskId; approachSig: string }; text: string }
  | {
      op: 'observation_add';
      taskClass: string;
      logicalTaskId: LogicalTaskId;
      tierObserved?: number;
      outcomeClass?: string;
      note: string;
      evidenceRefs: EntryRef[];
    };

/** Appendix A per-section caps. */
export const LEDGER_SECTION_CAPS = { facts: 64, lessons: 32, observations: 16 } as const;

/** The content key of one authored op (ordinal distinguishes repeats). */
export function ledgerOpKey(op: LedgerOp): string {
  return deriverV2.deriveKey({ kind: 'ledger.op', op: op });
}

export interface LedgerFact {
  factId: string;
  text: string;
  provenance: EntryRef[];
  confidence: 'low' | 'medium' | 'high';
  supersededBy?: string;
  entryRef: EntryRef;
}

export interface LedgerLesson {
  key: { logicalTaskId: LogicalTaskId; approachSig: string };
  text: string;
  entryRef: EntryRef;
}

export interface LedgerObservation {
  taskClass: string;
  logicalTaskId: LogicalTaskId;
  tierObserved?: number;
  outcomeClass?: string;
  note: string;
  evidenceRefs: EntryRef[];
  entryRef: EntryRef;
}

/** One auto-derived revision history row (fold join, never authored). */
export interface LedgerRevisionRow {
  entryRef: EntryRef;
  rationale: string;
  applied: number;
  dropped: number;
}

/** The pure ledger fold (docs/07, 9.3). */
export interface LedgerView {
  brief?: { text: string; entryRef: EntryRef };
  facts: LedgerFact[];
  lessons: LedgerLesson[];
  observations: LedgerObservation[];
  /** Auto-derived: plan revision history with rationale. */
  revisionHistory: LedgerRevisionRow[];
  /** Auto-derived: task digests ordered by spawn ordinal (root seq). */
  taskDigests: Array<{ nodeId?: string; scope: string; status: string; entryRef: EntryRef }>;
  /** Auto-derived: the world-delta index from terminal artifacts. */
  worldDelta: Array<{ scope: string; entryRef: EntryRef; artifacts: number }>;
  /** Journal-vs-ledger contradictions, flagged and never resolved here. */
  discrepancies: string[];
}

/** Fold every ledger.op plus the auto-derived joins up to `uptoSeq`. */
export function foldLedger(
  entries: readonly JournalEntry[],
  options?: { ledgerScope?: string; planScope?: string; uptoSeq?: number },
): LedgerView {
  const uptoSeq = options?.uptoSeq ?? Number.POSITIVE_INFINITY;
  const view: LedgerView = {
    facts: [],
    lessons: [],
    observations: [],
    revisionHistory: [],
    taskDigests: [],
    worldDelta: [],
    discrepancies: [],
  };
  const factsById = new Map<string, LedgerFact>();
  for (const entry of entries) {
    if (entry.seq > uptoSeq) {
      continue;
    }
    if (entry.kind === 'ledger.op') {
      if (options?.ledgerScope !== undefined && entry.scope !== options.ledgerScope) {
        // Single-writer: only the orchestrator scope writes (docs/07, 9).
        view.discrepancies.push(
          `ledger.op at seq ${String(entry.seq)} from foreign scope '${entry.scope}' ignored`,
        );
        continue;
      }
      const op = (entry.value as { op?: LedgerOp } | undefined)?.op ?? (entry.value as LedgerOp);
      if (op === undefined || typeof op !== 'object') {
        continue;
      }
      switch (op.op) {
        case 'brief_set':
          if (view.brief === undefined) {
            view.brief = { text: op.text, entryRef: entry.seq };
          } else {
            view.discrepancies.push(
              `brief_set at seq ${String(entry.seq)} ignored: the mission brief is immutable`,
            );
          }
          break;
        case 'fact_add': {
          const fact: LedgerFact = {
            factId: op.factId,
            text: op.text,
            provenance: op.provenance,
            confidence: op.confidence,
            entryRef: entry.seq,
          };
          factsById.set(op.factId, fact);
          view.facts.push(fact);
          break;
        }
        case 'fact_supersede': {
          const prior = factsById.get(op.factId);
          if (prior !== undefined) {
            prior.supersededBy = op.supersededBy;
          }
          const fact: LedgerFact = {
            factId: op.supersededBy,
            text: op.text,
            provenance: op.provenance,
            confidence: op.confidence,
            entryRef: entry.seq,
          };
          factsById.set(op.supersededBy, fact);
          view.facts.push(fact);
          break;
        }
        case 'lesson_add':
          view.lessons.push({ key: op.key, text: op.text, entryRef: entry.seq });
          break;
        case 'observation_add':
          view.observations.push({
            taskClass: op.taskClass,
            logicalTaskId: op.logicalTaskId,
            ...(op.tierObserved === undefined ? {} : { tierObserved: op.tierObserved }),
            ...(op.outcomeClass === undefined ? {} : { outcomeClass: op.outcomeClass }),
            note: op.note,
            evidenceRefs: op.evidenceRefs,
            entryRef: entry.seq,
          });
          break;
      }
      continue;
    }
    if (
      entry.kind === 'plan.revision' &&
      (options?.planScope === undefined || entry.scope === options.planScope)
    ) {
      const value = entry.value as
        { rationale?: string; outcomes?: Array<{ kind: string }> } | undefined;
      const outcomes = value?.outcomes ?? [];
      view.revisionHistory.push({
        entryRef: entry.seq,
        rationale: value?.rationale ?? '',
        applied: outcomes.filter((outcome) => outcome.kind !== 'dropped').length,
        dropped: outcomes.filter((outcome) => outcome.kind === 'dropped').length,
      });
      continue;
    }
    if (entry.kind === 'agent' && entry.ref !== undefined) {
      // Terminal agent entries feed the task table and the world-delta
      // index (auto-derived fold joins, never authored ops).
      if (entry.scope.includes('plan/')) {
        view.taskDigests.push({
          scope: entry.scope,
          status: entry.status,
          entryRef: entry.seq,
        });
      }
      const artifacts = entry.artifacts;
      if (Array.isArray(artifacts) && artifacts.length > 0) {
        view.worldDelta.push({
          scope: entry.scope,
          entryRef: entry.seq,
          artifacts: artifacts.length,
        });
      }
    }
  }
  return view;
}

/**
 * The committed ledger_read render budget (docs/06, Appendix A: 65536
 * chars over the serialized view, the character measure; OQ-04 closed
 * at M10 entry). The section caps stay the primary bound; under the
 * default termination limits this belt never engages.
 */
export const LEDGER_RENDER_BUDGET_CHARS = 65536;

/**
 * Deterministic render bound (docs/07, 9.3): over budget, rows drop
 * oldest-first, auto-derived joins before authored sections, and the
 * mission brief slices last; every drop is a FLAGGED discrepancy line.
 * A pure function of (view, budget): a re-executed wake turn renders
 * byte-identical bounded bytes from the same pinned fold.
 */
export function boundLedgerRender(
  view: LedgerView,
  budgetChars: number = LEDGER_RENDER_BUDGET_CHARS,
): LedgerView {
  const size = (candidate: LedgerView): number => JSON.stringify(candidate).length;
  if (size(view) <= budgetChars) {
    return view;
  }
  const bounded: LedgerView = {
    ...view,
    facts: [...view.facts],
    lessons: [...view.lessons],
    observations: [...view.observations],
    revisionHistory: [...view.revisionHistory],
    taskDigests: [...view.taskDigests],
    worldDelta: [...view.worldDelta],
    discrepancies: [...view.discrepancies],
  };
  const sections = [
    'worldDelta',
    'taskDigests',
    'revisionHistory',
    'observations',
    'lessons',
    'facts',
  ] as const;
  for (const section of sections) {
    let droppedRows = 0;
    while (bounded[section].length > 0 && size(bounded) > budgetChars) {
      bounded[section].shift();
      droppedRows += 1;
    }
    if (droppedRows > 0) {
      bounded.discrepancies.push(
        `renderBudget: dropped the ${String(droppedRows)} oldest ${section} rows ` +
          '(docs/06, Appendix A)',
      );
    }
    if (size(bounded) <= budgetChars) {
      return bounded;
    }
  }
  if (bounded.brief !== undefined && size(bounded) > budgetChars) {
    bounded.discrepancies.push('renderBudget: the mission brief was sliced (docs/06, Appendix A)');
    const over = size(bounded) - budgetChars;
    const keep = Math.max(0, bounded.brief.text.length - over);
    bounded.brief = { ...bounded.brief, text: bounded.brief.text.slice(0, keep) };
  }
  return bounded;
}

/** Section-cap check for one authored op (docs/06, Appendix A). */
export function ledgerCapViolation(view: LedgerView, op: LedgerOp): string | undefined {
  if (op.op === 'brief_set' && view.brief !== undefined) {
    return 'the mission brief is immutable (brief_set is once per run)';
  }
  if (
    (op.op === 'fact_add' || op.op === 'fact_supersede') &&
    view.facts.length >= LEDGER_SECTION_CAPS.facts
  ) {
    return `the facts section is capped at ${String(LEDGER_SECTION_CAPS.facts)}`;
  }
  if (op.op === 'lesson_add' && view.lessons.length >= LEDGER_SECTION_CAPS.lessons) {
    return `the lessons section is capped at ${String(LEDGER_SECTION_CAPS.lessons)}`;
  }
  if (op.op === 'observation_add' && view.observations.length >= LEDGER_SECTION_CAPS.observations) {
    return `the observations section is capped at ${String(LEDGER_SECTION_CAPS.observations)}`;
  }
  return undefined;
}

/**
 * Compaction sufficiency (docs/07, 9.3): the orchestrate role may
 * compact aggressively only when the ledger measurably suffices (at
 * least one authored revision recorded and a minimum fact count);
 * otherwise the engine falls back to conservative summarize.
 */
export function ledgerSufficiency(view: LedgerView, minimumFacts = 3): boolean {
  return view.revisionHistory.length >= 1 && view.facts.length >= minimumFacts;
}

/** The draft-versioned outward seam (docs/07, 9.3; OQ in docs/14). */
export interface LedgerExport {
  ledgerExportVersion: 'draft-1';
  brief?: string;
  facts: Array<Omit<LedgerFact, 'entryRef'>>;
  lessons: Array<Omit<LedgerLesson, 'entryRef'>>;
  observations: Array<Omit<LedgerObservation, 'entryRef'>>;
  revisionHistory: LedgerRevisionRow[];
}

export function exportLedger(view: LedgerView): LedgerExport {
  return {
    ledgerExportVersion: 'draft-1',
    ...(view.brief === undefined ? {} : { brief: view.brief.text }),
    facts: view.facts.map(({ entryRef: _entryRef, ...fact }) => fact),
    lessons: view.lessons.map(({ entryRef: _entryRef, ...lesson }) => lesson),
    observations: view.observations.map(({ entryRef: _entryRef, ...observation }) => observation),
    revisionHistory: view.revisionHistory,
  };
}
