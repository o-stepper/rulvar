/**
 * Run state audit and reconciliation (the fenced run state RFC, phase
 * 3): the journal is the source of truth and RunMeta is a rebuildable
 * projection of it. `auditRun` compares the two for one run, `auditRuns`
 * sweeps a catalog for the divergences worker sweeps can never see (a
 * terminal meta over a journal that still holds open work is exactly the
 * stranded run of finding F1), and `reconcileRunMeta` rewrites a
 * divergent meta row from the journal where that is sound, with zero
 * model calls and no workflow needed.
 *
 * What makes the comparison exact is the journaled settle: the engine
 * appends a decision entry (decisionType 'run_settle') at every settle
 * whose segment did durable work or changed the recorded status, so the
 * run's outcome is part of the journal instead of living only in the
 * meta row. Journals from before that entry existed are audited
 * structurally (dangling dispatches, open suspensions) and only the
 * unambiguous cases repair; everything else is reported as 'suspect',
 * never rewritten.
 */
import type { JournalEntry } from '../l0/entries.js';
import type { JournalStore, Lease, RunMeta } from '../l0/spi/store.js';
import { ResolutionFold } from '../journal/resolution.js';
import { readRunMeta } from './meta-lookup.js';
import type { RunStatus } from '../engine/run-handle.js';

/** The decisionType of the journaled run settle entry. */
export const RUN_SETTLE_DECISION_TYPE = 'run_settle';

const RUN_STATUSES: ReadonlySet<string> = new Set([
  'ok',
  'error',
  'cancelled',
  'exhausted',
  'suspended',
  'running',
]);
const TERMINAL: ReadonlySet<string> = new Set(['ok', 'error', 'cancelled', 'exhausted']);

// Bound at module load, before any dev-mode bare-Date patch can install
// (the same convention as the engine's real clock).
const wallClock: () => number = Date.now.bind(globalThis);

/** The last journaled run settle of a journal, if any. */
export function lastRunSettle(
  entries: readonly JournalEntry[],
): { runStatus: RunStatus; seq: number } | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry === undefined || entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as { decisionType?: unknown; runStatus?: unknown } | undefined;
    if (
      value?.decisionType === RUN_SETTLE_DECISION_TYPE &&
      typeof value.runStatus === 'string' &&
      RUN_STATUSES.has(value.runStatus)
    ) {
      return { runStatus: value.runStatus as RunStatus, seq: entry.seq };
    }
  }
  return undefined;
}

export type RunAuditVerdict = 'consistent' | 'meta-behind' | 'stranded' | 'suspect';

export interface RunStateAudit {
  runId: string;
  verdict: RunAuditVerdict;
  /** The stored meta row; absent when the store has none. */
  meta?: RunMeta;
  journalEntries: number;
  /** The last journaled settle, when the journal carries one. */
  journalSettle?: { runStatus: RunStatus; seq: number };
  /** Entries appended after the last journaled settle. */
  entriesAfterSettle: number;
  /** Running dispatch entries no terminal ever referenced. */
  danglingDispatches: number;
  openSuspensions: number;
  /** The status a repair would write; absent when no repair is sound. */
  repairTo?: RunStatus;
  /** One sentence naming the evidence behind the verdict. */
  reason: string;
}

function structure(entries: readonly JournalEntry[]): {
  dangling: number;
  open: number;
} {
  const referenced = new Set<number>();
  for (const entry of entries) {
    if (entry.ref !== undefined) {
      referenced.add(entry.ref);
    }
  }
  const dangling = entries.filter(
    (entry) => entry.status === 'running' && !referenced.has(entry.seq),
  ).length;
  const open = new ResolutionFold(entries).openSuspensions().length;
  return { dangling, open };
}

/**
 * Audits one run: loads the meta row and the journal, derives the state
 * the journal supports, and names the divergence. Read only.
 */
export async function auditRun(store: JournalStore, runId: string): Promise<RunStateAudit> {
  const meta = await readRunMeta(store, runId);
  const entries = await store.load(runId);
  const settle = lastRunSettle(entries);
  const { dangling, open } = structure(entries);
  const tail = settle === undefined ? entries : entries.filter((e) => e.seq > settle.seq);
  const base: RunStateAudit = {
    runId,
    verdict: 'consistent',
    ...(meta === undefined ? {} : { meta }),
    journalEntries: entries.length,
    ...(settle === undefined ? {} : { journalSettle: settle }),
    entriesAfterSettle: settle === undefined ? 0 : tail.length,
    danglingDispatches: dangling,
    openSuspensions: open,
    reason: '',
  };

  if (meta === undefined) {
    if (entries.length === 0) {
      return { ...base, reason: 'no journal and no meta row' };
    }
    // A crash before the first meta write. Not auto-repaired: a
    // fabricated row could not name the workflow, so a by-runId resume
    // is the honest recovery.
    return {
      ...base,
      verdict: 'suspect',
      reason: 'a journal exists but no meta row does (crash before the first meta write)',
    };
  }

  if (settle !== undefined) {
    const tailDangling = tail.filter(
      (entry) => entry.status === 'running' && !entries.some((later) => later.ref === entry.seq),
    ).length;
    const derived: RunStatus =
      tailDangling > 0
        ? 'running'
        : tail.length > 0
          ? open > 0
            ? 'suspended'
            : 'running'
          : settle.runStatus;
    if (meta.status === derived) {
      return { ...base, reason: 'meta matches the journaled settle' };
    }
    const strands = TERMINAL.has(meta.status) && !TERMINAL.has(derived);
    return {
      ...base,
      verdict: strands ? 'stranded' : 'meta-behind',
      repairTo: derived,
      reason:
        tail.length > 0
          ? `the journal continued past the settle at seq ${String(settle.seq)} (derived ` +
            `'${derived}') but the meta row says '${meta.status}'`
          : `the journal settled '${settle.runStatus}' at seq ${String(settle.seq)} but the ` +
            `meta row says '${meta.status}'`,
    };
  }

  // Pre-settle-entry journals: structural evidence only.
  if (TERMINAL.has(meta.status)) {
    if (dangling > 0) {
      // Paid work in flight cannot coexist with a legitimately settled
      // run: every clean settle (ok, error, cancelled, exhausted)
      // terminates its dispatch pairs before the meta write, and a
      // crash never reaches the meta write at all. This residue is a
      // stale terminal write over a live successor (RFC finding F1).
      return {
        ...base,
        verdict: 'stranded',
        repairTo: 'running',
        reason:
          `${String(dangling)} dangling dispatch(es) under terminal meta '${meta.status}': ` +
          'a stale settle overwrote a run that was still working',
      };
    }
    if (open > 0 && (meta.status === 'ok' || meta.status === 'exhausted')) {
      // A completed run can hold abandoned suspensions legitimately, so
      // this is evidence, not proof: reported, never auto-repaired.
      return {
        ...base,
        verdict: 'suspect',
        reason:
          `${String(open)} open suspension(s) under terminal meta '${meta.status}'; ` +
          'inspect before resuming by runId',
      };
    }
    return { ...base, reason: 'terminal meta over a structurally quiet journal' };
  }
  return { ...base, reason: 'meta is resumable; worker sweeps can reach this run' };
}

export interface AuditRunsOptions {
  /** Also return runs whose audit found nothing wrong. Default false. */
  includeConsistent?: boolean;
}

/**
 * Audits every run the catalog lists. Loads EVERY journal it audits:
 * this is operator tooling for finding stranded runs, not a hot path.
 */
export async function auditRuns(
  store: JournalStore,
  opts?: AuditRunsOptions,
): Promise<RunStateAudit[]> {
  const metas = await store.listRuns();
  const audits: RunStateAudit[] = [];
  for (const meta of metas) {
    const audit = await auditRun(store, meta.runId);
    if (opts?.includeConsistent === true || audit.verdict !== 'consistent') {
      audits.push(audit);
    }
  }
  return audits;
}

export interface ReconcileOptions {
  /**
   * A live lease for the run, passed through to the meta write. Over a
   * `fencedWrites` store this makes the repair itself takeover safe: a
   * successor acquiring mid-repair fences the stale rewrite out.
   */
  lease?: Lease;
}

export interface ReconcileResult {
  audit: RunStateAudit;
  /** True when a divergent meta row was rewritten from the journal. */
  repaired: boolean;
}

/**
 * Repairs a divergent meta row from the journal: 'meta-behind' and
 * 'stranded' audits rewrite `status` (every other meta field, unknown
 * fields included, is preserved byte for byte), 'suspect' and
 * 'consistent' audits change nothing. Zero model calls, no workflow
 * needed; the crash residue between a settle's journal flush and its
 * meta write repairs without resuming the run at all.
 */
export async function reconcileRunMeta(
  store: JournalStore,
  runId: string,
  opts?: ReconcileOptions,
): Promise<ReconcileResult> {
  const audit = await auditRun(store, runId);
  if (audit.repairTo === undefined || audit.meta === undefined) {
    return { audit, repaired: false };
  }
  await store.putMeta(
    {
      ...audit.meta,
      status: audit.repairTo,
      updatedAt: new Date(wallClock()).toISOString(),
    },
    opts?.lease,
  );
  return { audit, repaired: true };
}
