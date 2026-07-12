/**
 * Lineage: LogicalTaskId, approach signatures, and the counter folds
 * (M7-T02, DEF-3).
 *
 * Public contract: https://docs.rulvar.com/guide/journal and
 * https://docs.rulvar.com/guide/adaptive-orchestration.
 *
 * The LTID answers "is this the same logical task across rebirths".
 * NodeId remains plan-node identity; the content key remains the identity
 * of the paid call. The LTID is a ULID minted by the ENGINE (never the
 * model) exactly inside the decision entry that authorizes the spawn, and
 * it NEVER enters any content key: lineage lives exclusively in
 * decision-entry payloads, so never-pay-twice (I1) is untouched.
 *
 * Everything here is a pure fold over journal entries: verdicts embedded
 * in decision entries are READ on replay, never recomputed; a fold
 * recomputation over the same prefix serves only as an integrity assert.
 */
import { createHash } from 'node:crypto';
import { ConfigError } from '../l0/errors.js';
import type { EntryRef, JournalEntry } from '../l0/entries.js';
import { jcsSerialize } from '../l0/jcs.js';
import { EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH } from '../l0/schema.js';
import type { IsolationSpec } from '../l0/spi/isolation.js';
import { classifyAgentError } from './disposition.js';
import { agentErrorFromWire } from '../l0/errors.js';

/** Logical-task identity across rebirths (DEF-3); engine-minted ULID. */
export type LogicalTaskId = string;

/** The closed relation vocabulary of the minting and inheritance table. */
export type LineageRelation =
  'first' | 'respawn' | 'rung-retry' | 'decompose-child' | 'unpark-restart';

/** approachSig/approachSigCoarse derivation version. */
export const LINEAGE_SIG_VERSION = 1 as const;

/** Deterministic LTIDs canonized onto legacy journals. */
export const LEGACY_LTID_PREFIX = 'legacy:';

/** The computed lineage record of one spawn-authorizing decision entry. */
export interface LineageRef {
  logicalTaskId: LogicalTaskId;
  relation: LineageRelation;
  /** 0-based, journal order among the LTID's attempts, never wall clock. */
  attemptOrdinal: number;
  /** Seq of the causing entry; mandatory for every relation except 'first'. */
  causeRef?: EntryRef;
  /** Decomposition chain of parent LTIDs, length <= maxDepth. */
  ancestry: LogicalTaskId[];
  approachSig: string;
  approachSigCoarse: string;
  sigVersion: typeof LINEAGE_SIG_VERSION;
}

/**
 * The value-part lineage block embedded in decision entries: the computed
 * LineageRef plus the normalized tag (the request part
 * holds the RAW proposal; the value part holds what was COMPUTED and is
 * reused byte-exact on replay).
 */
export interface SpawnLineage extends LineageRef {
  approachTag: string;
}

/** Attempt outcome classes entering LineageStats. */
export type AttemptOutcomeClass =
  | 'ok'
  | 'escalated'
  | 'task-error'
  | 'transient-error'
  | 'no-progress'
  | 'verify-failed'
  | 'limit'
  | 'abandoned';

/**
 * The pure lineage fold rendered in plan_view and WakeDigest, always
 * pinned to a snapshot (`uptoSeq`), never a live read inside a turn.
 * `approaches` groups settled history by approachSig; a group whose
 * attempts have not settled yet is omitted (there is no outcome to learn
 * from), while `attemptsUsed` still counts every authorized attempt.
 */
export interface LineageStats {
  attemptsUsed: number;
  escalationsUsed: number;
  stallStreak: number;
  approaches: Array<{
    approachSig: string;
    approachTag: string;
    attempts: number;
    lastOutcome: AttemptOutcomeClass;
  }>;
}

/** The spawn-options lineage block (ctx.agent, ctx.workflow, spawn_agent, add_task). */
export interface SpawnLineageOpt {
  continues: LogicalTaskId;
  /** Default 'respawn'. */
  relation?: Exclude<LineageRelation, 'first'>;
  /** Seq of the journal entry that caused the rebirth; mandatory. */
  causeRef: EntryRef;
}

/** Lineage limits, monotonically consumed and never replenished (DEF-3). */
export interface EscalationLimits {
  /** Default 2; the old name maxEscalationsPerNode is rejected (XF-10). */
  maxEscalationsPerLogicalTask: number;
  /** Default 8. */
  maxAttemptsPerLogicalTask: number;
}

export const DEFAULT_ESCALATION_LIMITS: EscalationLimits = {
  maxEscalationsPerLogicalTask: 2,
  maxAttemptsPerLogicalTask: 8,
};

/**
 * Validates a lineage-limits config record. The pre-rename knob name is
 * rejected with a migration hint (XF-10): silently honoring it would
 * change semantics (per logical task, not per node).
 */
export function validateEscalationLimits(
  raw?: Partial<EscalationLimits> | Record<string, unknown>,
): EscalationLimits {
  if (raw !== undefined && 'maxEscalationsPerNode' in raw) {
    throw new ConfigError(
      "config knob 'maxEscalationsPerNode' was renamed: escalations are counted per logical " +
        "task across respawns via the lineage chain; use 'maxEscalationsPerLogicalTask' " +
        '(XF-10; docs/07, section 6.5)',
    );
  }
  const limits: EscalationLimits = { ...DEFAULT_ESCALATION_LIMITS };
  if (raw?.maxEscalationsPerLogicalTask !== undefined) {
    limits.maxEscalationsPerLogicalTask = requireCount(
      raw.maxEscalationsPerLogicalTask,
      'maxEscalationsPerLogicalTask',
    );
  }
  if (raw?.maxAttemptsPerLogicalTask !== undefined) {
    limits.maxAttemptsPerLogicalTask = requireCount(
      raw.maxAttemptsPerLogicalTask,
      'maxAttemptsPerLogicalTask',
    );
  }
  return limits;
}

function requireCount(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ConfigError(`${name} must be a non-negative integer, got ${String(value)}`);
  }
  return value;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Approach-tag normalization: NFC, lowercase, runs of
 * non-alphanumerics collapse into a hyphen, truncate to 32 characters; an
 * empty value canonicalizes to 'default'. Prompt prose never enters any
 * signature: rephrasings collide by construction, not by heuristic.
 */
export function normalizeApproachTag(raw?: string): string {
  const collapsed = (raw ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32);
  return collapsed === '' ? 'default' : collapsed;
}

/** The isolation string entering approachSigCoarse. */
export function canonicalIsolationTag(spec: IsolationSpec | undefined): string {
  if (spec === undefined) {
    return 'none';
  }
  return typeof spec === 'string' ? spec : spec.kind;
}

/** The identity inputs of the coarse signature (prompt prose excluded). */
export interface ApproachSignatureInputs {
  agentType: string;
  toolsetHash: string;
  schemaHash: string;
  isolation: string;
}

/**
 * approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash,
 * schemaHash, isolation })). Feeds the stall detector and the oscillation
 * guard, which keys ACROSS LTID boundaries.
 */
export function approachSigCoarse(inputs: ApproachSignatureInputs): string {
  return sha256Hex(
    jcsSerialize({
      sigVersion: LINEAGE_SIG_VERSION,
      agentType: inputs.agentType,
      toolsetHash: inputs.toolsetHash,
      schemaHash: inputs.schemaHash,
      isolation: inputs.isolation,
    }),
  );
}

/** approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons. */
export function approachSigOf(coarse: string, tag?: string): string {
  return sha256Hex(
    jcsSerialize({
      sigVersion: LINEAGE_SIG_VERSION,
      coarse,
      approachTag: normalizeApproachTag(tag),
    }),
  );
}

/**
 * The deterministic signature inputs assigned to legacy spawns (journals
 * written before lineage existed) and to attempts whose producers did not
 * record signature inputs: stable constants, never wall-clock, so replay
 * canonizes identically on every engine.
 */
export const LEGACY_SIGNATURE_INPUTS: ApproachSignatureInputs = {
  agentType: 'legacy',
  toolsetHash: EMPTY_TOOLSET_HASH,
  schemaHash: EMPTY_SCHEMA_HASH,
  isolation: 'none',
};

/** Classifies one settled root terminal into its attempt outcome class. */
export function classifyAttemptOutcome(terminal: JournalEntry): AttemptOutcomeClass {
  switch (terminal.status) {
    case 'ok':
      return 'ok';
    case 'escalated':
      return 'escalated';
    case 'limit': {
      const abortClass = (terminal.error?.data as { abortClass?: string } | undefined)?.abortClass;
      return abortClass === 'no-progress' ? 'no-progress' : 'limit';
    }
    case 'cancelled':
      // The caller severed the attempt; under DEF-5 the severing record is
      // an abandon entry, and a bare mode (c) cancel classifies the same.
      return 'abandoned';
    case 'error': {
      const wire = terminal.error;
      if (wire === undefined) {
        return 'task-error';
      }
      if (wire.code === 'agent') {
        return classifyAgentError(agentErrorFromWire(wire)) === 'task'
          ? 'task-error'
          : 'transient-error';
      }
      // Non-agent wire errors (steps, sandbox, environment) classify by
      // retryability: transient and environment classes are skipped by
      // the stall streak either way.
      return wire.retryable ? 'transient-error' : 'task-error';
    }
    default:
      return 'task-error';
  }
}

/** Outcome classes that lengthen the stall streak. */
const STALLING_OUTCOMES: ReadonlySet<AttemptOutcomeClass> = new Set([
  'task-error',
  'no-progress',
  'verify-failed',
  'limit',
]);

interface AttemptRecord {
  logicalTaskId: LogicalTaskId;
  relation: LineageRelation;
  approachSig: string;
  approachSigCoarse: string;
  approachTag: string;
  /** Seq of the authorizing decision entry; absent on legacy attempts. */
  decisionSeq?: number;
  /** The (scope, key) slot the attempt's dispatches bind to. */
  childScope?: string;
  boundKey?: string;
  lastRootSeq?: number;
  outcome?: AttemptOutcomeClass;
  outcomeSeq?: number;
  /** The fold anchor: decisionSeq, else the first bound root seq. */
  anchorSeq: number;
}

interface EscalationDebitEvent {
  seq: number;
}

/** The reader-side shape of an embedded admission inside decision payloads. */
interface EmbeddedAdmissionLike {
  childScope: string;
  lineage: SpawnLineage;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Reads the computed SpawnLineage block of a decision payload, tolerating
 * pre-DEF-3 producers (M6 journals): a verdict lineage block without
 * signatures canonizes onto the deterministic legacy signature constants,
 * so folds over old journals stay byte-stable.
 */
function readSpawnLineage(decision: Record<string, unknown> | undefined): SpawnLineage | undefined {
  if (decision === undefined) {
    return undefined;
  }
  const full = asRecord(decision.lineage);
  if (full !== undefined && typeof full.approachSig === 'string') {
    return full as unknown as SpawnLineage;
  }
  const verdict = asRecord(decision.verdict);
  const verdictLineage = asRecord(verdict?.lineage);
  const ltid =
    verdictLineage === undefined ? undefined : readString(verdictLineage, 'logicalTaskId');
  if (ltid === undefined) {
    return undefined;
  }
  const coarse = approachSigCoarse(LEGACY_SIGNATURE_INPUTS);
  return {
    logicalTaskId: ltid,
    relation: verdictLineage?.isNew === false ? 'respawn' : 'first',
    attemptOrdinal: 0,
    ancestry: [],
    approachSig: approachSigOf(coarse),
    approachSigCoarse: coarse,
    sigVersion: LINEAGE_SIG_VERSION,
    approachTag: 'default',
  };
}

/**
 * The incremental lineage fold: attempts, escalation debits, stall
 * streaks, single-live-attempt, and legacy canonization, computed from
 * journal entries only. `absorb` is idempotent by seq cursor; every read
 * accepts an optional `uptoSeq` pin so renders stay snapshot-stable.
 */
export class LineageIndex {
  private readonly attemptsByLtid = new Map<LogicalTaskId, AttemptRecord[]>();
  private readonly escalationsByLtid = new Map<LogicalTaskId, EscalationDebitEvent[]>();
  /** Registration-order attempt queues per child (scope, key) slot. */
  private readonly queueByScope = new Map<string, AttemptRecord[]>();
  private readonly recordByRootSeq = new Map<number, AttemptRecord>();
  /** First-closing-wins projection over resolution targets (DEF-4). */
  private readonly closedTargets = new Set<number>();
  /** Live admits journaled a moment later (single-live-attempt window). */
  private readonly pendingAdmits = new Map<LogicalTaskId, number>();
  private cursor = -1;

  /** Registers a live admit strictly before its decision entry lands. */
  noteAdmitted(logicalTaskId: LogicalTaskId): void {
    this.pendingAdmits.set(logicalTaskId, (this.pendingAdmits.get(logicalTaskId) ?? 0) + 1);
  }

  /** Absorbs new entries (seq beyond the cursor); earlier ones are no-ops. */
  absorb(entries: readonly JournalEntry[]): void {
    for (const entry of entries) {
      if (entry.seq <= this.cursor) {
        continue;
      }
      this.cursor = entry.seq;
      this.absorbEntry(entry);
    }
  }

  private absorbEntry(entry: JournalEntry): void {
    if (entry.kind === 'decision') {
      this.absorbDecision(entry);
      return;
    }
    if (entry.kind === 'plan.revision') {
      for (const admission of this.readEmbeddedAdmissions(entry)) {
        this.registerAttempt(entry.seq, admission.lineage, admission.childScope);
      }
      return;
    }
    if (entry.kind === 'resolution' && entry.ref !== undefined) {
      this.absorbResolution(entry);
      return;
    }
    if (entry.kind === 'abandon') {
      this.absorbAbandon(entry);
      return;
    }
    if (entry.kind === 'agent' || entry.kind === 'child') {
      this.absorbSpawnEntry(entry);
    }
  }

  private absorbDecision(entry: JournalEntry): void {
    const value = asRecord(entry.value);
    if (value === undefined) {
      return;
    }
    const decisionType = readString(value, 'decisionType');
    if (decisionType === 'spawn-admission') {
      if (value.reject !== undefined) {
        // A journaled lineage rejection authorizes nothing.
        return;
      }
      const decision = asRecord(value.decision);
      if (decision !== undefined) {
        const verdict = asRecord(decision.verdict);
        if (verdict === undefined || verdict.kind === 'reject') {
          return;
        }
        const lineage = readSpawnLineage(decision);
        if (lineage !== undefined) {
          this.registerAttempt(entry.seq, lineage, readString(value, 'childScope'));
        }
        return;
      }
      // The ctx.agent producer embeds the computed block at the top level
      // (no structural verdict rides a bare lineage declaration).
      const direct = asRecord(value.lineage);
      if (direct !== undefined && typeof direct.approachSig === 'string') {
        this.registerAttempt(
          entry.seq,
          direct as unknown as SpawnLineage,
          readString(value, 'childScope'),
        );
      }
      return;
    }
    if (decisionType === 'ladder-verdict') {
      // M7-T10 producer contract: a verdict that authorizes the next rung
      // attempt embeds its lineage and child slot; a verify-failed verdict
      // overrides the judged attempt's outcome class.
      const trigger = readString(value, 'trigger');
      const attemptRef = value.attemptRef;
      if (trigger === 'verify-failed' && typeof attemptRef === 'number') {
        const record = this.recordByRootSeq.get(attemptRef);
        if (record !== undefined) {
          record.outcome = 'verify-failed';
          record.outcomeSeq = entry.seq;
        }
      }
      const nextAttempt = asRecord(value.nextAttempt);
      const lineage = asRecord(nextAttempt?.lineage);
      if (nextAttempt !== undefined && lineage !== undefined) {
        this.registerAttempt(
          entry.seq,
          lineage as unknown as SpawnLineage,
          readString(nextAttempt, 'childScope'),
        );
      }
      return;
    }
    if (decisionType === 'escalation-decision') {
      // M7-T11 producer contract: one authoritative decision entry; the
      // class-level variant carries an array of per-lineage debits.
      if (value.countsAgainstLimit !== true) {
        return;
      }
      const single = readString(value, 'logicalTaskId');
      if (single !== undefined) {
        this.recordEscalation(single, entry.seq);
      }
      const debits = Array.isArray(value.debits) ? value.debits : [];
      for (const raw of debits) {
        const debit = asRecord(raw);
        const ltid = debit === undefined ? undefined : readString(debit, 'logicalTaskId');
        if (ltid !== undefined) {
          this.recordEscalation(ltid, entry.seq);
        }
      }
      // Embedded decomposition admissions register child attempts.
      for (const admission of this.readEmbeddedAdmissions(entry)) {
        this.registerAttempt(entry.seq, admission.lineage, admission.childScope);
      }
    }
  }

  private readEmbeddedAdmissions(entry: JournalEntry): EmbeddedAdmissionLike[] {
    const value = asRecord(entry.value);
    const admissions = value === undefined ? undefined : value.admissions;
    if (!Array.isArray(admissions)) {
      return [];
    }
    const out: EmbeddedAdmissionLike[] = [];
    for (const raw of admissions) {
      const record = asRecord(raw);
      if (record === undefined) {
        continue;
      }
      const decision = asRecord(record.decision) ?? record;
      const verdict = asRecord(decision.verdict);
      if (verdict === undefined || verdict.kind === 'reject') {
        continue;
      }
      const lineage = readSpawnLineage(decision);
      if (lineage === undefined) {
        continue;
      }
      const nodeId = readString(record, 'nodeId');
      const childScope =
        readString(record, 'childScope') ??
        (nodeId === undefined ? undefined : `${entry.scope}/${nodeId}`);
      if (childScope === undefined) {
        continue;
      }
      out.push({ childScope, lineage });
    }
    return out;
  }

  private registerAttempt(
    decisionSeq: number,
    lineage: SpawnLineage,
    childScope: string | undefined,
  ): void {
    const record: AttemptRecord = {
      logicalTaskId: lineage.logicalTaskId,
      relation: lineage.relation,
      approachSig: lineage.approachSig,
      approachSigCoarse: lineage.approachSigCoarse,
      approachTag: lineage.approachTag,
      decisionSeq,
      anchorSeq: decisionSeq,
    };
    if (childScope !== undefined) {
      record.childScope = childScope;
      const queue = this.queueByScope.get(childScope) ?? [];
      queue.push(record);
      this.queueByScope.set(childScope, queue);
    }
    const attempts = this.attemptsByLtid.get(lineage.logicalTaskId) ?? [];
    attempts.push(record);
    this.attemptsByLtid.set(lineage.logicalTaskId, attempts);
    const pending = this.pendingAdmits.get(lineage.logicalTaskId);
    if (pending !== undefined) {
      if (pending <= 1) {
        this.pendingAdmits.delete(lineage.logicalTaskId);
      } else {
        this.pendingAdmits.set(lineage.logicalTaskId, pending - 1);
      }
    }
  }

  private absorbResolution(entry: JournalEntry): void {
    const target = entry.ref as number;
    if (this.closedTargets.has(target)) {
      // First-closing-wins: losing attempts classify noop and never enter
      // the counters.
      return;
    }
    this.closedTargets.add(target);
    const payload = entry.resolution;
    if (payload === undefined || payload.countsAgainstLimit !== true) {
      return;
    }
    if (payload.by === 'class_decision') {
      // The class-level decision entry carries the debit array; counting
      // its per-target resolutions too would double-debit (XF-06).
      return;
    }
    if (payload.logicalTaskId !== undefined) {
      this.recordEscalation(payload.logicalTaskId, entry.seq);
    }
  }

  private absorbAbandon(entry: JournalEntry): void {
    const payload = entry.abandon;
    if (payload === undefined) {
      return;
    }
    const record = this.recordByRootSeq.get(payload.target);
    if (record !== undefined) {
      if (record.outcome === undefined) {
        record.outcome = 'abandoned';
        record.outcomeSeq = entry.seq;
      }
      return;
    }
    if (payload.logicalTaskId !== undefined) {
      const live = this.attemptsByLtid
        .get(payload.logicalTaskId)
        ?.find((attempt) => attempt.outcome === undefined);
      if (live !== undefined) {
        live.outcome = 'abandoned';
        live.outcomeSeq = entry.seq;
      }
    }
  }

  private absorbSpawnEntry(entry: JournalEntry): void {
    if (entry.ref !== undefined) {
      // Terminal phase: classify the attempt bound to the dispatch entry.
      const record = this.recordByRootSeq.get(entry.ref);
      if (record !== undefined) {
        record.outcome = classifyAttemptOutcome(entry);
        record.outcomeSeq = entry.seq;
      }
      return;
    }
    const slotScope =
      entry.kind === 'child'
        ? (readString(asRecord(entry.value) ?? {}, 'childScope') ?? entry.scope)
        : entry.scope;
    const record = this.bindRoot(slotScope, entry);
    if (entry.status !== 'running') {
      // Single-phase roots (a reuse_full child root is written terminal
      // ok, DEF-5) classify immediately.
      record.outcome = classifyAttemptOutcome(entry);
      record.outcomeSeq = entry.seq;
    }
  }

  /**
   * Binds one dispatch entry to its attempt: the earliest registered
   * attempt of the slot still waiting for its first dispatch; else the
   * attempt whose bound key matches (an at-least-once redispatch of the
   * same slot after cancelled/error/limit); else a legacy attempt is
   * canonized with the deterministic 'legacy:' + contentHash LTID
   * (random ULIDs on replay are forbidden).
   */
  private bindRoot(slotScope: string, entry: JournalEntry): AttemptRecord {
    const queue = this.queueByScope.get(slotScope) ?? [];
    let record = queue.find((candidate) => candidate.lastRootSeq === undefined);
    if (record === undefined) {
      record = queue.find(
        (candidate) => candidate.boundKey === entry.key && candidate.outcome !== 'ok',
      );
    }
    if (record === undefined) {
      const ltid = `${LEGACY_LTID_PREFIX}${entry.key}`;
      const coarse = approachSigCoarse(LEGACY_SIGNATURE_INPUTS);
      record = {
        logicalTaskId: ltid,
        relation: 'first',
        approachSig: approachSigOf(coarse),
        approachSigCoarse: coarse,
        approachTag: 'default',
        anchorSeq: entry.seq,
      };
      const attempts = this.attemptsByLtid.get(ltid) ?? [];
      attempts.push(record);
      this.attemptsByLtid.set(ltid, attempts);
      queue.push(record);
      this.queueByScope.set(slotScope, queue);
    }
    record.boundKey = entry.key;
    record.lastRootSeq = entry.seq;
    if (record.outcome !== undefined && entry.status === 'running') {
      // A redispatch supersedes the previous root's outcome.
      delete record.outcome;
      delete record.outcomeSeq;
    }
    this.recordByRootSeq.set(entry.seq, record);
    return record;
  }

  private recordEscalation(logicalTaskId: LogicalTaskId, seq: number): void {
    const events = this.escalationsByLtid.get(logicalTaskId) ?? [];
    events.push({ seq });
    this.escalationsByLtid.set(logicalTaskId, events);
  }

  private attemptsOf(logicalTaskId: LogicalTaskId, uptoSeq: number): AttemptRecord[] {
    return (this.attemptsByLtid.get(logicalTaskId) ?? []).filter(
      (attempt) => attempt.anchorSeq <= uptoSeq,
    );
  }

  attemptsUsed(logicalTaskId: LogicalTaskId, uptoSeq: number = Number.POSITIVE_INFINITY): number {
    return this.attemptsOf(logicalTaskId, uptoSeq).length;
  }

  escalationsUsed(
    logicalTaskId: LogicalTaskId,
    uptoSeq: number = Number.POSITIVE_INFINITY,
  ): number {
    return (this.escalationsByLtid.get(logicalTaskId) ?? []).filter((event) => event.seq <= uptoSeq)
      .length;
  }

  /**
   * True while the LTID has an unsettled attempt (admitted, dispatched, or
   * redispatched without a terminal), including admits whose decision
   * entries have not landed yet. Backs the single-live-attempt invariant:
   * a competing admit gets `lineage_busy`.
   */
  hasLiveAttempt(logicalTaskId: LogicalTaskId): boolean {
    if ((this.pendingAdmits.get(logicalTaskId) ?? 0) > 0) {
      return true;
    }
    return (this.attemptsByLtid.get(logicalTaskId) ?? []).some(
      (attempt) => attempt.outcome === undefined,
    );
  }

  /** The stall streak (pinnable to a snapshot seq). */
  stallStreak(logicalTaskId: LogicalTaskId, uptoSeq: number = Number.POSITIVE_INFINITY): number {
    let streak = 0;
    for (const attempt of this.attemptsOf(logicalTaskId, uptoSeq)) {
      const outcome =
        attempt.outcomeSeq !== undefined && attempt.outcomeSeq <= uptoSeq
          ? attempt.outcome
          : undefined;
      if (outcome === undefined) {
        // Unsettled, transient, environment, escalated, and abandoned
        // attempts neither lengthen nor break the suffix.
        continue;
      }
      if (outcome === 'ok') {
        streak = 0;
        continue;
      }
      if (STALLING_OUTCOMES.has(outcome)) {
        streak += 1;
      }
    }
    return streak;
  }

  /** The pinned LineageStats render. */
  statsOf(logicalTaskId: LogicalTaskId, uptoSeq: number = Number.POSITIVE_INFINITY): LineageStats {
    const attempts = this.attemptsOf(logicalTaskId, uptoSeq);
    const groups = new Map<
      string,
      { approachTag: string; attempts: number; lastOutcome?: AttemptOutcomeClass }
    >();
    for (const attempt of attempts) {
      const group = groups.get(attempt.approachSig) ?? {
        approachTag: attempt.approachTag,
        attempts: 0,
      };
      group.attempts += 1;
      if (attempt.outcomeSeq !== undefined && attempt.outcomeSeq <= uptoSeq) {
        group.lastOutcome = attempt.outcome;
      }
      groups.set(attempt.approachSig, group);
    }
    const approaches: LineageStats['approaches'] = [];
    for (const [approachSig, group] of groups) {
      if (group.lastOutcome === undefined) {
        continue;
      }
      approaches.push({
        approachSig,
        approachTag: group.approachTag,
        attempts: group.attempts,
        lastOutcome: group.lastOutcome,
      });
    }
    return {
      attemptsUsed: attempts.length,
      escalationsUsed: this.escalationsUsed(logicalTaskId, uptoSeq),
      stallStreak: this.stallStreak(logicalTaskId, uptoSeq),
      approaches,
    };
  }

  /** Every LTID the fold has seen (diagnostics and renders). */
  knownLogicalTaskIds(): LogicalTaskId[] {
    return [...this.attemptsByLtid.keys()];
  }
}
