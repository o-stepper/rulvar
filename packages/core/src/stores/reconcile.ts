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
import type { EntryStatus, JournalEntry } from '../l0/entries.js';
import type { JournalStore, Lease, RunMeta } from '../l0/spi/store.js';
import { buildAbandonFold } from '../journal/disposition.js';
import { ResolutionFold } from '../journal/resolution.js';
import { readRunMeta } from './meta-lookup.js';
import type {
  CostReport,
  RejectedFinishCandidate,
  RunOutcome,
  RunStatus,
} from '../engine/run-handle.js';

/** The decisionType of the journaled run settle entry. */
export const RUN_SETTLE_DECISION_TYPE = 'run_settle';

/**
 * The decisionType of the journaled spawn admission (RV2702): the
 * entry that names every child an orchestration judged, which is what
 * makes an offline roster a read rather than a guess.
 */
export const SPAWN_ADMISSION_DECISION_TYPE = 'spawn-admission';

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
      /**
       * The semantic outcome the settle recorded (RV3304), read back
       * the same defensive way: the acceptance verdict, the
       * deliverable presence, the acceptance ref and the judge meta,
       * so a restarted reader recovers the facts a live consumer
       * gated on. Absent on journals written before the lift carried
       * them; absence means NOT RECORDED, never a verdict.
       */
      deliverableAccepted?: boolean;
      resultAvailable?: boolean;
      acceptedArtifactRef?: number;
      claimConsistencyMeta?: Record<string, unknown>;
      /**
       * The citation audit meta and the one-word semantic verdict the
       * settle recorded (RV4403), read back the same defensive way:
       * the seventh comparison run's restart reader could not see the
       * ten unsupported citations its own failure named. Absence
       * means NOT RECORDED, never a verdict.
       */
      citationAuditMeta?: Record<string, unknown>;
      semanticTerminalVerdict?: Record<string, unknown>;
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
          deliverableAccepted?: unknown;
          resultAvailable?: unknown;
          acceptedArtifactRef?: unknown;
          claimConsistencyMeta?: unknown;
          citationAuditMeta?: unknown;
          semanticTerminalVerdict?: unknown;
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
      const judgeMeta = readClaimConsistencyMeta(value.claimConsistencyMeta);
      const auditMeta = readCitationAuditMeta(value.citationAuditMeta);
      const semanticVerdict = readSemanticTerminalVerdict(value.semanticTerminalVerdict);
      return {
        runStatus: value.runStatus as RunStatus,
        seq: entry.seq,
        ...(typeof value.outputHash === 'string' ? { outputHash: value.outputHash } : {}),
        ...(completion === 'complete' || completion === 'partial' || completion === 'rejected'
          ? { completion }
          : {}),
        ...(rejected === undefined ? {} : { rejectedFinishCandidates: rejected }),
        ...(typeof value.deliverableAccepted === 'boolean'
          ? { deliverableAccepted: value.deliverableAccepted }
          : {}),
        ...(typeof value.resultAvailable === 'boolean'
          ? { resultAvailable: value.resultAvailable }
          : {}),
        ...(typeof value.acceptedArtifactRef === 'number' &&
        Number.isSafeInteger(value.acceptedArtifactRef) &&
        value.acceptedArtifactRef >= 0
          ? { acceptedArtifactRef: value.acceptedArtifactRef }
          : {}),
        ...(judgeMeta === undefined ? {} : { claimConsistencyMeta: judgeMeta }),
        ...(auditMeta === undefined ? {} : { citationAuditMeta: auditMeta }),
        ...(semanticVerdict === undefined ? {} : { semanticTerminalVerdict: semanticVerdict }),
      };
    }
  }
  return undefined;
}

/**
 * The judge meta of a persisted settle, or `undefined` (RV3304). The
 * whole object drops unless its load bearing fields are shaped as the
 * live producer writes them (`judgeInvoked`, the coverage grade, the
 * judged stage and hash): a partially shaped meta read as a verdict
 * would claim semantic ground the journal does not hold, the same
 * posture as `readRejectedFinishCandidates`.
 */
function readClaimConsistencyMeta(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const meta = raw as {
    judgeInvoked?: unknown;
    coverage?: unknown;
    judgedStage?: unknown;
    judgedHash?: unknown;
  };
  if (
    typeof meta.judgeInvoked !== 'boolean' ||
    typeof meta.coverage !== 'string' ||
    (meta.judgedStage !== 'draft' && meta.judgedStage !== 'final') ||
    typeof meta.judgedHash !== 'string'
  ) {
    return undefined;
  }
  return { ...(raw as Record<string, unknown>) };
}

/**
 * The citation audit meta of a persisted settle, or `undefined`
 * (RV4403). Load bearing fields as the live producer writes them: the
 * counts and the audited hash; a partially shaped meta read back as a
 * verdict would claim audit ground the journal does not hold, the
 * `readClaimConsistencyMeta` posture exactly.
 */
function readCitationAuditMeta(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const meta = raw as {
    sampled?: unknown;
    supported?: unknown;
    partial?: unknown;
    unsupported?: unknown;
    auditedHash?: unknown;
  };
  const count = (value: unknown): boolean =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (
    !count(meta.sampled) ||
    !count(meta.supported) ||
    !count(meta.partial) ||
    !count(meta.unsupported) ||
    typeof meta.auditedHash !== 'string'
  ) {
    return undefined;
  }
  return { ...(raw as Record<string, unknown>) };
}

/**
 * The one-word semantic verdict of a persisted settle, or `undefined`
 * (RV4403): the verdict literal must be one the RV4209 fold can
 * produce; everything else rides back verbatim. A restart reader gates
 * on the same recorded word the live consumer saw, instead of
 * re-deriving (and possibly disagreeing) from the metas.
 */
function readSemanticTerminalVerdict(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const verdict = (raw as { verdict?: unknown }).verdict;
  if (
    verdict !== 'clean' &&
    verdict !== 'findings' &&
    verdict !== 'partial' &&
    verdict !== 'vacuous' &&
    verdict !== 'waived' &&
    verdict !== 'not-judged'
  ) {
    return undefined;
  }
  return { ...(raw as Record<string, unknown>) };
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
 * A figure a scope is a claim ABOUT: a count or a flag. Text is not
 * counted by anything, so `cost.basis` (a pricing-provenance literal)
 * needs no scope and declaring one would say nothing.
 */
type CountedLeaf = number | boolean;

/** The counted leaves of one struct, as keys. */
type CountedKeys<T> = {
  [K in keyof T & string]-?: NonNullable<T[K]> extends CountedLeaf ? K : never;
}[keyof T & string];

/**
 * The counted leaves of one struct and of every struct one level below
 * it, as dotted paths. Arrays are not structs a consumer reads figures
 * off, and a member with no counted leaf contributes nothing.
 */
type CountedPaths<T> = {
  [K in keyof T & string]-?: NonNullable<T[K]> extends CountedLeaf
    ? K
    : NonNullable<T[K]> extends readonly unknown[]
      ? never
      : NonNullable<T[K]> extends object
        ? `${K}.${CountedKeys<NonNullable<T[K]>>}`
        : never;
}[keyof T & string];

/**
 * The breakdown maps of `CostReport`. Their keys are DATA (a model ref,
 * a phase name, a role), so a required path per key would be a required
 * path per run; their scope is their container's.
 */
type CostBreakdownMap = 'byModel' | 'byPhase' | 'byAgentType' | 'byRole';

/**
 * Every nested path under `cost` that must declare a scope of its own.
 *
 * `cost` is the container a reader reaches INTO: the report carries a
 * dozen separately named figures, five of which were declared by hand
 * and four of which were not declared at all. Where a container is read
 * whole (`usage`), its own declaration settles it.
 */
type CostScopePath = `cost.${Exclude<CountedPaths<CostReport>, `${CostBreakdownMap}.${string}`>}`;

/**
 * The scope table's type, and the gate that keeps it complete
 * (RV2701).
 *
 * Every field of `RunOutcome` is required, so a new terminal field
 * does not COMPILE until it declares what it counts; the string index
 * signature then admits the nested paths a consumer reads off the same
 * outcome (`cost.orchestrator.wakes`), which are not keys of the type.
 * Those it admits but cannot demand, so the table itself is held to
 * every counted leaf under `cost` where it is declared (RV2801).
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
 * money was cumulative, the live-only counters were not,
 * and reconciling them into one honest account of the logical run was
 * hand work over a joined journal. Keys are field paths as a consumer
 * reads them off `RunOutcome` (`cost.orchestrator.wakes`): the type
 * requires every field of the outcome, and the `satisfies` below
 * requires every counted leaf under `cost` (RV2801), because an index
 * signature admits nested paths and demands none, so the five that were
 * declared were declared by hand and by luck while four
 * (`cost.usageApprox`, `cost.abandoned.usd`, `cost.abandoned.usageApprox`,
 * `cost.orchestrator.share`) were simply missing. That is the RV2701
 * blindness one level down: a gate whose subject is nested figures
 * cannot stop at the top level.
 *
 * What neither can decide is whether a declared scope is TRUE, and a
 * wrong scope is worse than a missing one: a missing one is noticed, a
 * wrong one is believed. The doctrine test suspends a real run, resumes
 * it, and holds every declared figure against its own claim (RV2801),
 * which is how three `cost.orchestrator.*` paths were found calling
 * themselves `'segment'` while the terminal folded them cumulatively.
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
  citationAuditMeta: 'terminal',
  // The one-word semantic verdict (RV4209): folded once at the settle
  // from the terminal's own metas, so it scopes exactly like them.
  semanticTerminalVerdict: 'terminal',
  // Terminal like the meta beside it (RV3601): the verdict describes
  // the document THIS terminal judged, never a fold across segments.
  claimContradictions: 'terminal',
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
  // Cumulative like every other figure the journal fold produces: the
  // fold reads the WHOLE journal, so an approximate slice in any prior
  // segment still raises the flag in this one.
  'cost.usageApprox': 'cumulative',
  'cost.abandoned.usd': 'cumulative',
  'cost.abandoned.usageApprox': 'cumulative',
  'cost.orchestrator.spentUsd': 'cumulative',
  // A ratio of two cumulative figures, which is why it is not a
  // segment's share of anything.
  'cost.orchestrator.share': 'cumulative',
  // The outcome's cost IS the journal fold over the resumed segment's
  // snapshot, which holds every prior segment, so these three cover the
  // logical run exactly like the money above them (RV2801). Declared
  // 'segment' since RV2510 and folded cumulatively the whole time: the
  // taxonomy was right, three of its members were on the wrong side.
  'cost.orchestrator.wakes': 'cumulative',
  'cost.orchestrator.forcedFinish': 'cumulative',
  'cost.orchestrator.reserveUsedUsd': 'cumulative',
  transportRetries: 'segment',
  schemaRejectedFinishExchanges: 'segment',
  schemaRecoveredFinishExchanges: 'segment',
  // The nested half of the gate (RV2801): the type above admits paths
  // and can demand none, so the table is held here to every counted
  // leaf under `cost`. The index signature keeps the outcome's own
  // fields admissible; without it this would reject them as excess.
} satisfies Record<CostScopePath, TelemetryScope> & Record<string, TelemetryScope>);

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
  /**
   * The two time conventions of a resumed run (RV4409, the seventh
   * comparison experiment's post-mortem measured them by external
   * script): `activeMs` sums each segment's own append window (its
   * first to its last appended entry), `calendarMs` spans the whole
   * journal, and `gapMs` is their difference, the operator time
   * between segments. Derived from the `startedAt` stamps the entries
   * already carry; absent when the journal carries none (absence
   * means NOT RECORDED, RV1209).
   */
  activeMs?: number;
  calendarMs?: number;
  gapMs?: number;
  /**
   * Per segment, in journal order (RV4409): the settled status, the
   * appended entries, the segment's own append window when the stamps
   * exist, and `replayed: true` on a pure-replay segment (nothing
   * appended but its settle), so a resumed run's walls read as the
   * original segments' work instead of 0.0 s.
   */
  perSegment?: Array<{
    status: RunStatus;
    entries: number;
    activeMs?: number;
    replayed?: true;
  }>;
  /**
   * Provider wire decisions across the WHOLE journal (RV4409): the
   * logical run's paid wire count, the invoice's cardinality. A
   * resumed segment re-reads its prefix without re-paying it, so this
   * figure and a segment's own adapter fetches are DIFFERENT counters
   * with different names; the seventh comparison experiment
   * reconciled "16 versus 109" by hand for exactly this reason.
   */
  logicalWireRequests?: number;
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
  const segmentWindows: Array<{ firstMs?: number; lastMs?: number }> = [];
  let sinceLastSettle = 0;
  let window: { firstMs?: number; lastMs?: number } = {};
  let logicalWireRequests = 0;
  const stampOf = (entry: JournalEntry): number | undefined => {
    const raw = (entry as { startedAt?: unknown }).startedAt;
    if (typeof raw !== 'string') {
      return undefined;
    }
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : undefined;
  };
  for (const entry of entries) {
    sinceLastSettle += 1;
    const ms = stampOf(entry);
    if (ms !== undefined) {
      window.firstMs ??= ms;
      window.lastMs = ms;
    }
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as { decisionType?: unknown; runStatus?: unknown } | undefined;
    if (value?.decisionType === 'provider-call') {
      // The logical wire count (RV4409): one decision per billable
      // provider call, replay-deduped by the journal itself.
      logicalWireRequests += 1;
    }
    if (
      value?.decisionType !== RUN_SETTLE_DECISION_TYPE ||
      typeof value.runStatus !== 'string' ||
      !RUN_STATUSES.has(value.runStatus)
    ) {
      continue;
    }
    statuses.push(value.runStatus as RunStatus);
    entriesPerSegment.push(sinceLastSettle);
    segmentWindows.push(window);
    sinceLastSettle = 0;
    window = {};
  }
  const perSegment = statuses.map((status, index) => {
    const count = entriesPerSegment[index] ?? 0;
    const seg = segmentWindows[index] ?? {};
    const activeMs =
      seg.firstMs !== undefined && seg.lastMs !== undefined ? seg.lastMs - seg.firstMs : undefined;
    return {
      status,
      entries: count,
      ...(activeMs === undefined ? {} : { activeMs }),
      // A pure-replay resume appends nothing but its settle: the
      // segment did no new paid work, and its wall belongs to the
      // original segments, not to a 0.0 s rerun.
      ...(count <= 1 ? { replayed: true as const } : {}),
    };
  });
  const activeMs = perSegment.reduce<number | undefined>(
    (sum, seg) => (seg.activeMs === undefined ? sum : (sum ?? 0) + seg.activeMs),
    undefined,
  );
  const firstStamp = entries.map(stampOf).find((ms) => ms !== undefined);
  const lastStamp = [...entries]
    .reverse()
    .map(stampOf)
    .find((ms) => ms !== undefined);
  const calendarMs =
    firstStamp !== undefined && lastStamp !== undefined ? lastStamp - firstStamp : undefined;
  return {
    segments: statuses.length,
    statuses,
    entriesPerSegment,
    entries: entries.length,
    entriesAfterLastSettle: sinceLastSettle,
    ...(activeMs === undefined ? {} : { activeMs }),
    ...(calendarMs === undefined ? {} : { calendarMs }),
    ...(activeMs !== undefined && calendarMs !== undefined
      ? { gapMs: Math.max(0, calendarMs - activeMs) }
      : {}),
    ...(statuses.length === 0 ? {} : { perSegment }),
    logicalWireRequests,
  };
}

/** One child of one orchestration, as the journal holds it (RV2702). */
export interface JournaledChild {
  /**
   * The dispatch seq: the SAME number the orchestrator's own turns used
   * as the child's handle, so a reader can find it in the transcript
   * without a second identifier. Handles are journal-derived and stable
   * across resume (a replayed spawn reports its original dispatch seq),
   * which is what makes this a name and not an index.
   */
  handle: number;
  /** The profile the child ran under, when the terminal recorded it. */
  agentType?: string;
  /**
   * The status the journal recorded, absent when no terminal followed:
   * the child was still in flight when the journal ends. This is the
   * ENTRY status vocabulary, which is where the run's own dispatch
   * records live.
   */
  status?: EntryStatus;
  /** The RV806 evidence verdict, present under a declared contract. */
  evidence?: { recordedEntries: number; minEntries: number; met: boolean };
  /** The RV3002 durable tool-budget subset, when the terminal journaled it. */
  toolBudget?: { used: number; cap?: number };
  /**
   * Present and true when the orchestration ABANDONED this child's
   * branch (RV2804): the work happened and the provider billed it, and
   * the run threw the result away. The money layer has separated the two
   * since RV1904 (`grossUsd` keeps abandoned spend, `totalUsd` does
   * not), and this roster presented discarded children exactly like kept
   * ones, so a post-mortem counting "four children settled ok" counted
   * branches the orchestrator had discarded.
   *
   * Absent means NOT ABANDONED, which is decidable here: the fold reads
   * the same first-wins abandon projection the replayer uses, over the
   * same journal, and `handle` is the very seq an abandon entry targets.
   */
  abandoned?: true;
}

/** One orchestration's children, folded from its journal (RV2702). */
export interface JournaledChildRoster {
  /** The scope the children dispatched under, which identifies the orchestration. */
  childScope: string;
  /** Spawn admissions the controller ADMITTED. */
  admitted: number;
  /** Spawn admissions it refused: no child ever ran, and none is listed below. */
  rejected: number;
  /** Every admitted child the journal holds a dispatch for, in dispatch order. */
  children: JournaledChild[];
}

/**
 * Every orchestration's children, folded from a run's journal (RV2702).
 *
 * `childrenAtFailure` (RV2602) answers this for a LIVE consumer, and it
 * dies with the process that held it: the settle persists the
 * completion lift and nothing else, so a post-mortem over a journal,
 * which is all a paid run leaves behind, had no way to ask what the
 * children produced. Every ingredient was already written down. This
 * is the fold.
 *
 * It reads what resume reads. A `spawn-admission` decision names every
 * child the controller judged, with its ordinal, its profile, its
 * verdict, and the scope its dispatch pins to; the dispatch and
 * terminal `agent` entries under that scope are the child itself, and
 * the RV806 evidence verdict rides the terminal. Nothing is
 * re-derived and no validator runs again, so a journal written by any
 * prior version reads exactly as well as today's, which is the point:
 * the runs worth a post-mortem are the ones already in the archive.
 *
 * Two things it deliberately does NOT claim. It is not the live
 * roster: this reading happens after the RV1903 exit barrier settled
 * the stragglers, so a child the live field would have called
 * unsettled usually has a terminal here, and `status` is absent only
 * where the journal truly ends mid-flight. And it names children by
 * their dispatch seq rather than by nodeId, because the seq is the
 * handle the orchestrator's own turns used and the one a reader can
 * follow into the transcript.
 */
export function childRostersFromJournal(entries: readonly JournalEntry[]): JournaledChildRoster[] {
  const rosters = new Map<string, JournaledChildRoster>();
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);
  // The same first-wins projection the replayer disposes by (DEF-4), so
  // a discarded branch reads here exactly as it reads there, subtree
  // coverage included (RV2804).
  const abandoned = buildAbandonFold(ordered);
  // Indexed once, walked with a cursor per scope: a post-mortem runs
  // over the whole journal of a long run, and scanning it again per
  // admission would make the fold quadratic in the number of children,
  // which is exactly the axis a big run grows along.
  const dispatchesByScope = new Map<string, JournalEntry[]>();
  const terminalsByScopeKey = new Map<string, JournalEntry[]>();
  for (const entry of ordered) {
    if (entry.kind !== 'agent') {
      continue;
    }
    if (entry.status === 'running') {
      const rows = dispatchesByScope.get(entry.scope);
      if (rows === undefined) {
        dispatchesByScope.set(entry.scope, [entry]);
      } else {
        rows.push(entry);
      }
      continue;
    }
    const key = JSON.stringify([entry.scope, entry.key]);
    const rows = terminalsByScopeKey.get(key);
    if (rows === undefined) {
      terminalsByScopeKey.set(key, [entry]);
    } else {
      rows.push(entry);
    }
  }
  const cursors = new Map<string, number>();
  for (const entry of ordered) {
    if (entry.kind !== 'decision') {
      continue;
    }
    const value = entry.value as
      | { decisionType?: unknown; origin?: unknown; childScope?: unknown; decision?: unknown }
      | undefined;
    if (
      value?.decisionType !== SPAWN_ADMISSION_DECISION_TYPE ||
      (value.origin !== 'spawn_agent' && value.origin !== 'parallel_agents')
    ) {
      continue;
    }
    const childScope = typeof value.childScope === 'string' ? value.childScope : entry.scope;
    let roster = rosters.get(childScope);
    if (roster === undefined) {
      roster = { childScope, admitted: 0, rejected: 0, children: [] };
      rosters.set(childScope, roster);
    }
    const verdict = (value.decision as { verdict?: { kind?: unknown } } | undefined)?.verdict?.kind;
    if (verdict !== 'admit') {
      // A refused admission never dispatched anything, so it owns no
      // entry below and must not consume one.
      roster.rejected += 1;
      continue;
    }
    roster.admitted += 1;
    // The dispatch this admission paid for: the next unclaimed running
    // agent row under the pinned child scope, since the engine
    // journals the decision immediately before the dispatch it
    // authorises. A decision whose dispatch never reached the journal
    // (a crash in between) takes the NEXT child's row, which is why
    // this reports counts and statuses rather than pretending to bind
    // each admission to a named child: `admitted` still exceeds
    // `children.length` by exactly the dispatches that never landed,
    // which is the fact a reader needs.
    const rows = dispatchesByScope.get(childScope) ?? [];
    let cursor = cursors.get(childScope) ?? 0;
    while (cursor < rows.length && (rows[cursor]?.seq ?? 0) <= entry.seq) {
      cursor += 1;
    }
    const dispatch = rows[cursor];
    cursors.set(childScope, cursor + 1);
    if (dispatch === undefined) {
      continue;
    }
    const terminal = terminalsByScopeKey
      .get(JSON.stringify([childScope, dispatch.key]))
      ?.find((candidate) => candidate.seq > dispatch.seq);
    roster.children.push({
      handle: dispatch.seq,
      ...(abandoned.isAbandoned(dispatch.seq) ? { abandoned: true as const } : {}),
      ...(terminal?.costAttribution?.agentType === undefined
        ? {}
        : { agentType: terminal.costAttribution.agentType }),
      ...(terminal === undefined ? {} : { status: terminal.status }),
      ...(terminal?.evidence === undefined ? {} : { evidence: { ...terminal.evidence } }),
      ...(terminal?.toolBudget === undefined ? {} : { toolBudget: { ...terminal.toolBudget } }),
    });
  }
  return [...rosters.values()];
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
