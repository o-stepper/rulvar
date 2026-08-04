/**
 * The decision-chain fold (RV1705): one pure pass over a run's journal
 * that reconstructs the AUTHORITY record, every entry that admitted,
 * approved, resolved, abandoned, or terminated something, in seq order
 * with its back references intact. The eighteenth comparison
 * benchmark's operational acceptance asked exactly this of a host
 * ("audit reconstructs the decision chain"), and the raw journal
 * already contains every fact; what was missing is the one-call fold
 * that separates the authority-bearing kinds from the work entries
 * around them, so an auditor walks admissions to approvals to
 * resolutions to effects without hand-rolling kind filters.
 *
 * Tolerant by the journal's own reader obligation (A4): unknown kinds
 * pass through unfolded, work kinds (`agent`, `step`, `child`, `rand`,
 * `node.link`) are deliberately excluded, and the fold never invents a
 * field: `decisionType` appears only when the entry's journaled value
 * carries one as a string, references only when the entry recorded
 * them. Pure and deterministic over bytes, exactly like the other l0
 * reducers: replaying the same entries folds the same chain.
 */
import type { Json } from './json.js';
import type { EntryKind, EntryStatus, JournalEntry, ResolutionBy } from './entries.js';

/** The authority-bearing kinds the chain folds, in the registry's order. */
export const DECISION_CHAIN_KINDS: readonly EntryKind[] = [
  'external',
  'approval',
  'decision',
  'plan.revision',
  'plan.decision',
  'ledger.op',
  'resolution',
  'abandon',
  'termination.init',
  'termination.denied',
];

/** One authority record of the chain, seq-ordered. */
export interface DecisionChainRow {
  seq: number;
  kind: EntryKind;
  scope: string;
  key: string;
  status: EntryStatus;
  /** Present when the journaled value names its decision type. */
  decisionType?: string;
  /** Present on resolutions: who resolved. */
  by?: ResolutionBy;
  /** Present on resolutions and abandons: the referenced seq. */
  target?: number;
  /** Present on abandons: the seq of the sanctioning entry. */
  authorizedBy?: number;
  /** Present on class-decision resolutions: the class decision's seq. */
  decisionRef?: number;
  /** The journaled value verbatim, when the entry carries one. */
  value?: Json;
}

const numberField = (value: Json | undefined, field: string): number | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, Json>)[field];
  return typeof candidate === 'number' ? candidate : undefined;
};

const stringField = (value: Json | undefined, field: string): string | undefined => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, Json>)[field];
  return typeof candidate === 'string' ? candidate : undefined;
};

/**
 * Folds a run's entries into its decision chain: the seq-ordered
 * authority records only. Input order is not trusted; rows sort by seq
 * ascending, the journal's own total order.
 */
export function reduceDecisionChain(entries: readonly JournalEntry[]): DecisionChainRow[] {
  const rows: DecisionChainRow[] = [];
  for (const entry of entries) {
    if (!DECISION_CHAIN_KINDS.includes(entry.kind)) {
      continue;
    }
    const decisionType = stringField(entry.value, 'decisionType');
    const by = stringField(entry.value, 'by') as ResolutionBy | undefined;
    const target = numberField(entry.value, 'target') ?? entry.ref;
    const authorizedBy = numberField(entry.value, 'authorizedBy');
    const decisionRef = numberField(entry.value, 'decisionRef');
    rows.push({
      seq: entry.seq,
      kind: entry.kind,
      scope: entry.scope,
      key: entry.key,
      status: entry.status,
      ...(decisionType === undefined ? {} : { decisionType }),
      ...(entry.kind === 'resolution' && by !== undefined ? { by } : {}),
      ...(target === undefined ? {} : { target }),
      ...(authorizedBy === undefined ? {} : { authorizedBy }),
      ...(decisionRef === undefined ? {} : { decisionRef }),
      ...(entry.value === undefined ? {} : { value: entry.value }),
    });
  }
  return rows.sort((a, b) => a.seq - b.seq);
}
