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
import type { RejectedFinishCandidate, RunOutcome, RunStatus } from '../engine/run-handle.js';

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

/**
 * The last journaled run settle of a journal, if any. `outputHash` is
 * present when that settle recorded the result digest (RV-209; settles
 * written before it, or over undefined/non-serializable results, carry
 * none).
 */
export function lastRunSettle(entries: readonly JournalEntry[]):
  | {
      runStatus: RunStatus;
      seq: number;
      outputHash?: string;
      completion?: 'complete' | 'partial' | 'rejected';
      /**
       * The rejected finish candidates the settle recorded (RV2507),
       * read back for offline readers (RV2605). The settle persists the
       * whole completion lift, so this needs no re-fold and no
       * validator re-run; it is parsed defensively, exactly like
       * `completion`, so a foreign or older journal reads as "not
       * recorded" rather than as a claim.
       */
      rejectedFinishCandidates?: RejectedFinishCandidate[];
    }
  | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry === undefined || entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as
      | {
          decisionType?: unknown;
          runStatus?: unknown;
          outputHash?: unknown;
          completion?: unknown;
          rejectedFinishCandidates?: unknown;
        }
      | undefined;
    if (
      value?.decisionType === RUN_SETTLE_DECISION_TYPE &&
      typeof value.runStatus === 'string' &&
      RUN_STATUSES.has(value.runStatus)
    ) {
      // The semantic completion literal, when the settle recorded the
      // lift (the persisted-terminal tail): defensively parsed, so a
      // foreign or older journal reads as "not recorded", never as a
      // claim.
      const completion = value.completion;
      const rejected = readRejectedFinishCandidates(value.rejectedFinishCandidates);
      return {
        runStatus: value.runStatus as RunStatus,
        seq: entry.seq,
        ...(typeof value.outputHash === 'string' ? { outputHash: value.outputHash } : {}),
        ...(completion === 'complete' || completion === 'partial' || completion === 'rejected'
          ? { completion }
          : {}),
        ...(rejected === undefined ? {} : { rejectedFinishCandidates: rejected }),
      };
    }
  }
  return undefined;
}

/**
 * The rejected finish candidates of a persisted settle, or `undefined`
 * (RV2605). The WHOLE list drops on any malformed row, the same posture
 * the live lift takes (RV2507): a partial history read as complete
 * would under-report exactly the runs that misbehaved most.
 */
function readRejectedFinishCandidates(raw: unknown): RejectedFinishCandidate[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const rows: RejectedFinishCandidate[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) {
      return undefined;
    }
    const { callId, verdict, hash, chars, failed, ref } = row as Record<string, unknown>;
    if (
      typeof callId !== 'string' ||
      (verdict !== 'repair' && verdict !== 'rejected') ||
      typeof hash !== 'string' ||
      typeof chars !== 'number' ||
      !Number.isSafeInteger(chars) ||
      chars < 0 ||
      !Array.isArray(failed) ||
      (ref !== undefined && typeof ref !== 'string')
    ) {
      return undefined;
    }
    const validators: { name: string; reasons: string[] }[] = [];
    for (const entry of failed) {
      if (typeof entry !== 'object' || entry === null) {
        return undefined;
      }
      const { name, reasons } = entry as Record<string, unknown>;
      if (
        typeof name !== 'string' ||
        !Array.isArray(reasons) ||
        reasons.some((reason) => typeof reason !== 'string')
      ) {
        return undefined;
      }
      validators.push({ name, reasons: reasons as string[] });
    }
    rows.push({
      callId,
      verdict,
      hash,
      chars,
      failed: validators,
      ...(ref === undefined ? {} : { ref }),
    });
  }
  return rows;
}

/**
 * Whether a terminal figure counts THIS segment's work or the whole
 * logical run (RV2510).
 *
 * * `'segment'`: only the segment that produced this terminal. A
 *   resumed run reports the resumed segment's number, and the figure
 *   for the logical run is the SUM over every segment
 *   ({@link logicalRunTelemetry} computes it).
 * * `'cumulative'`: the whole logical run, every prior segment
 *   included, because the figure folds from the journal (money, usage),
 *   resumes from the journaled ledger (the spawn count), or is
 *   RE-DERIVED by replay (the loss list: a resumed segment re-executes
 *   the workflow and reads the same journaled terminals, so the drops
 *   of earlier segments come back). Summing these across segments
 *   double counts.
 * * `'terminal'`: not a count at all: a claim about the run as it
 *   stands at this settle, which a later segment can only replace.
 */
export type TelemetryScope = 'segment' | 'cumulative' | 'terminal';

/**
 * The scope table's type, and the gate that keeps it complete
 * (RV2701).
 *
 * Every field of `RunOutcome` is required, so a new terminal field
 * does not COMPILE until it declares what it counts; the string index
 * signature then admits the nested paths a consumer reads off the same
 * outcome (`cost.orchestrator.wakes`), which are not keys of the type.
 *
 * It replaces a sample: the original gate read the keys of one
 * successful run, which is structurally blind to every field that
 * exists only on a FAILED terminal, and RV2602's `childrenAtFailure`
 * (present exactly when no acceptance verdict exists) shipped straight
 * through it. A table about resumed and killed runs cannot be
 * defended by an outcome that neither died nor resumed.
 */
export type TerminalTelemetryScopes = Readonly<Record<keyof RunOutcome<unknown>, TelemetryScope>> &
  Readonly<Record<string, TelemetryScope>>;

/**
 * The scope of every field the engine writes onto a terminal (RV2510),
 * as one exported table rather than as sentences scattered through
 * field docs.
 *
 * The twenty-fifth comparison run was killed and resumed, and its two
 * terminals mixed both kinds with nothing marking which was which: the
 * money was cumulative, the wake count and the replay figures were not,
 * and reconciling them into one honest account of the logical run was
 * hand work over a joined journal. Keys are field paths as a consumer
 * reads them off `RunOutcome` (`cost.orchestrator.wakes`), and
 * {@link TerminalTelemetryScopes} requires every one of them.
 */
export const TERMINAL_TELEMETRY_SCOPE: TerminalTelemetryScopes = Object.freeze({
  status: 'terminal',
  value: 'terminal',
  error: 'terminal',
  envelope: 'terminal',
  completion: 'terminal',
  childStatusCounts: 'cumulative',
  degradedReasons: 'cumulative',
  salvagedPartialChildren: 'cumulative',
  salvagedTerminalOutputChildren: 'cumulative',
  belowFloorOkChildren: 'cumulative',
  acceptanceChildren: 'cumulative',
  // Cumulative for the loss-list reason (RV2602 read under RV2510): a
  // resumed segment re-admits every recovered child into the same
  // roster before it dispatches anything new, so the fold re-derives
  // the whole logical run's children rather than this segment's.
  childrenAtFailure: 'cumulative',
  semanticPasses: 'terminal',
  claimConsistencyMeta: 'terminal',
  synthesisSkipped: 'terminal',
  deliverableAccepted: 'terminal',
  resultAvailable: 'terminal',
  acceptedArtifactRef: 'terminal',
  rejectedFinishCandidates: 'cumulative',
  dropped: 'cumulative',
  pending: 'terminal',
  usage: 'cumulative',
  cost: 'cumulative',
  'cost.totalUsd': 'cumulative',
  'cost.grossUsd': 'cumulative',
  'cost.wireRequests': 'cumulative',
  'cost.orchestrator.spentUsd': 'cumulative',
  'cost.orchestrator.wakes': 'segment',
  'cost.orchestrator.forcedFinish': 'segment',
  'cost.orchestrator.reserveUsedUsd': 'segment',
  transportRetries: 'segment',
  schemaRejectedFinishExchanges: 'segment',
  schemaRecoveredFinishExchanges: 'segment',
});

/** One logical run's telemetry, folded across every segment (RV2510). */
export interface LogicalRunTelemetry {
  /** How many settles the journal records: the number of segments that ran. */
  segments: number;
  /** Each segment's settled status, in journal order. */
  statuses: RunStatus[];
  /**
   * Journal entries each segment APPENDED, in the same order: its own
   * share of the run's durable work, which is the one honest
   * per-segment measure of effort a resumed run has. A pure-replay
   * segment that appended nothing but its settle reads 1.
   */
  entriesPerSegment: number[];
  /**
   * Entries the run holds in total. Equal to the sum of
   * `entriesPerSegment` plus whatever follows the last settle: the
   * partition is exact BECAUSE it is a partition, which is what makes
   * this figure safe to read beside a cumulative one.
   */
  entries: number;
  /**
   * Entries appended AFTER the last settle. Nonzero means the journal
   * continued past its terminal (RV1407: a detached resolution
   * awaiting its resume, or a successor segment over a stale settle),
   * so the last status is not the run's last word.
   */
  entriesAfterLastSettle: number;
}

/**
 * Folds a run's journal into the logical run's telemetry (RV2510): how
 * many segments ran, how each settled, and how much durable work each
 * one did, from entries the journal already holds. No new field, so it
 * reads journals written by every prior version exactly as well as
 * today's.
 *
 * The replay dedup is the design. Cumulative figures are deliberately
 * NOT here: money and usage fold from the WHOLE journal through
 * `costReportFromJournal` and the usage ledger, and re-summing them per
 * segment would count every replayed operation once per segment that
 * replayed it, which is exactly the reconciliation this fold exists to
 * make unnecessary. What it reports instead is a PARTITION of the
 * journal by settle boundary, so no entry is counted twice by
 * construction, and the segment-scoped figures a terminal carries
 * ({@link TERMINAL_TELEMETRY_SCOPE} names them) can be read against the
 * segment that produced them.
 */
export function logicalRunTelemetry(entries: readonly JournalEntry[]): LogicalRunTelemetry {
  const statuses: RunStatus[] = [];
  const entriesPerSegment: number[] = [];
  let sinceLastSettle = 0;
  for (const entry of entries) {
    sinceLastSettle += 1;
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as { decisionType?: unknown; runStatus?: unknown } | undefined;
    if (
      value?.decisionType !== RUN_SETTLE_DECISION_TYPE ||
      typeof value.runStatus !== 'string' ||
      !RUN_STATUSES.has(value.runStatus)
    ) {
      continue;
    }
    statuses.push(value.runStatus as RunStatus);
    entriesPerSegment.push(sinceLastSettle);
    sinceLastSettle = 0;
  }
  return {
    segments: statuses.length,
    statuses,
    entriesPerSegment,
    entries: entries.length,
    entriesAfterLastSettle: sinceLastSettle,
  };
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
