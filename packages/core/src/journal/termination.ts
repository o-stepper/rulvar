/**
 * TerminationAccount and the termination lemma (M7-T03, DEF-2).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section 11;
 * docs/06-execution-spec.md, Appendix A defaults; XF-07/XF-09 cap fields.
 *
 * One construction is committed: a single per-run account with an
 * exclusively DEBIT-ONLY API and a limits vector frozen at start in the
 * `termination.init` entry, plus the variant function Phi. No credit
 * operation exists anywhere by construction; no journal entry kind
 * carries credit; B0 is immutable after start and no API, including
 * HITL, can top it up. Every debit is atomic with the append of its
 * carrying decision entry and embeds the balance-after; an underflow
 * writes `termination.denied` strictly BEFORE the typed error surfaces.
 *
 * Replay and resume read the limits ONLY from `termination.init` (live
 * config is ignored; a mismatch emits `termination:config-drift`), and
 * replay-strict recomputes the whole debit fold from init, asserting the
 * embedded balances entry by entry: a divergence is a journal-integrity
 * error at exactly the diverging entry.
 */
import { createHash } from 'node:crypto';
import { ConfigError, PlanInvariantError } from '../l0/errors.js';
import type { EntryRef, JournalEntry } from '../l0/entries.js';
import { jcsSerialize } from '../l0/jcs.js';
import type { Json } from '../l0/json.js';
import type { LogicalTaskId } from './lineage.js';

/** The frozen limits vector written into termination.init (docs/07, 11.2). */
export interface TerminationLimits {
  /** V0, default 32; absolute and non-replenishable. */
  maxRevisionsPerRun: number;
  /** S0, default 128; debited on every admitted spawn of any origin. */
  maxTotalSpawns: number;
  /** E0, default 2, per lineage; the old name is rejected (XF-10). */
  maxEscalationsPerLogicalTask: number;
  /** D0, default 1, ceiling 4; static per-branch limit. */
  maxDepth: number;
  /** Maximum declared ladder length per the profile-registry snapshot. */
  kMax: number;
  /** B0; immutable after start, no API including HITL can top up. */
  runBudgetUsdCeiling: number;
  /** From the orchestrator budget (DEF-7; XF-09). */
  orchestratorCapUsd: number;
  /** From the orchestrator budget (DEF-7; XF-09). */
  finalizeReserveUsd: number;
}

/** Appendix A committed defaults for the countable resources. */
export const DEFAULT_MAX_REVISIONS_PER_RUN = 32;
export const DEFAULT_MAX_TOTAL_SPAWNS = 128;

/** The countable resource vocabulary (docs/07, 11.5). */
export type TerminationResource =
  'revisionUnits' | 'spawnUnits' | 'escalationUnits' | 'rungs' | 'depth';

export interface LineageCounters {
  escalationUnitsRemaining: number;
  rungsRemaining: number;
}

export interface TerminationAccountSnapshot {
  revisionUnitsRemaining: number;
  spawnUnitsRemaining: number;
  perLineage: Record<LogicalTaskId, LineageCounters>;
  /** The variant function, a pure fold over the journal (docs/07, 11.4). */
  phi: number;
}

export type DebitResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; deniedEntryRef: EntryRef; resource: TerminationResource };

/** The value payload of a termination.init entry (docs/07, 11.6). */
export interface TerminationInitValue {
  limits: TerminationLimits;
  profileRegistrySnapshotHash: string;
  phiInitial: number;
}

/** The value payload of a termination.denied entry (docs/07, 11.6). */
export interface TerminationDeniedValue {
  resource: TerminationResource;
  logicalTaskId?: LogicalTaskId;
  /** Seq of the calling tool-call or EscalationReport entry. */
  requestedByRef?: EntryRef;
  reasonCode: string;
  snapshotAfter: TerminationAccountSnapshot;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Reads the declared ladder length of one agent profile. The LadderSpec
 * surface ships with M7-T10; the reader is defensive so the snapshot is
 * total over every registry shape (an undeclared ladder has length 1:
 * the single implicit rung).
 */
export function ladderLengthOf(profile: unknown): number {
  const ladder = (profile as { ladder?: { rungs?: unknown[] } } | undefined)?.ladder;
  if (ladder === undefined || !Array.isArray(ladder.rungs) || ladder.rungs.length === 0) {
    return 1;
  }
  return ladder.rungs.length;
}

/** kMax: the maximum declared ladder length across the registry snapshot. */
export function kMaxOf(profiles: Record<string, unknown> | undefined): number {
  let kMax = 1;
  for (const profile of Object.values(profiles ?? {})) {
    kMax = Math.max(kMax, ladderLengthOf(profile));
  }
  return kMax;
}

/**
 * The deterministic profile-registry snapshot hash frozen inside
 * termination.init: profile names mapped to their declared ladder
 * lengths, canonical JSON, sha256 (docs/07, 11.6).
 */
export function profileRegistrySnapshotHash(profiles: Record<string, unknown> | undefined): string {
  const projection: Record<string, number> = {};
  for (const [name, profile] of Object.entries(profiles ?? {})) {
    projection[name] = ladderLengthOf(profile);
  }
  return sha256Hex(jcsSerialize(projection));
}

/**
 * Validates a raw limits record into the frozen vector. The pre-rename
 * escalation knob is rejected with a migration hint (XF-10); counters
 * must be non-negative integers; kMax at least 1.
 */
export function validateTerminationLimits(
  raw: Partial<TerminationLimits> | Record<string, unknown>,
): TerminationLimits {
  if ('maxEscalationsPerNode' in raw) {
    throw new ConfigError(
      "config knob 'maxEscalationsPerNode' was renamed: escalations are counted per logical " +
        "task across respawns via the lineage chain; use 'maxEscalationsPerLogicalTask' " +
        '(XF-10; docs/07, section 6.5)',
    );
  }
  const record = raw as Record<string, unknown>;
  const count = (name: string, fallback?: number): number => {
    const value = record[name] ?? fallback;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new ConfigError(`${name} must be a non-negative integer, got ${JSON.stringify(value)}`);
    }
    return value;
  };
  const usd = (name: string, fallback?: number): number => {
    const value = record[name] ?? fallback;
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw new ConfigError(`${name} must be a non-negative number, got ${JSON.stringify(value)}`);
    }
    return value;
  };
  const kMax = count('kMax', 1);
  if (kMax < 1) {
    throw new ConfigError('kMax must be at least 1 (the single implicit rung)');
  }
  return {
    maxRevisionsPerRun: count('maxRevisionsPerRun', DEFAULT_MAX_REVISIONS_PER_RUN),
    maxTotalSpawns: count('maxTotalSpawns', DEFAULT_MAX_TOTAL_SPAWNS),
    maxEscalationsPerLogicalTask: count('maxEscalationsPerLogicalTask', 2),
    maxDepth: count('maxDepth', 1),
    kMax,
    runBudgetUsdCeiling: usd('runBudgetUsdCeiling'),
    orchestratorCapUsd: usd('orchestratorCapUsd'),
    finalizeReserveUsd: usd('finalizeReserveUsd'),
  };
}

/** C = E0 + kMax: the per-spawn weight of the variant function. */
export function lineageWeightOf(limits: TerminationLimits): number {
  return limits.maxEscalationsPerLogicalTask + limits.kMax;
}

/** Phi0 = V0 + C * S0, finite and fixed in termination.init (docs/07, 11.4). */
export function phiInitialOf(limits: TerminationLimits): number {
  return limits.maxRevisionsPerRun + lineageWeightOf(limits) * limits.maxTotalSpawns;
}

/** Builds the termination.init value payload (docs/07, 11.6). */
export function buildTerminationInitValue(
  limits: TerminationLimits,
  registrySnapshotHash: string,
): TerminationInitValue {
  return {
    limits,
    profileRegistrySnapshotHash: registrySnapshotHash,
    phiInitial: phiInitialOf(limits),
  };
}

/** Reads a termination.init entry's payload; undefined when malformed. */
export function readTerminationInit(entry: JournalEntry): TerminationInitValue | undefined {
  if (entry.kind !== 'termination.init') {
    return undefined;
  }
  const value = entry.value as Partial<TerminationInitValue> | undefined;
  if (value === undefined || typeof value.phiInitial !== 'number' || value.limits === undefined) {
    return undefined;
  }
  return value as TerminationInitValue;
}

/**
 * Config-drift detection at resume (docs/07, 11.2): the journaled vector
 * always wins; every differing field is reported for the
 * `termination:config-drift` event. Dynamic budget top-up via restart is
 * excluded by construction.
 */
export function terminationConfigDrift(
  frozen: TerminationLimits,
  live: Partial<TerminationLimits>,
): Array<{ field: keyof TerminationLimits; frozenValue: Json; liveValue: Json }> {
  const drift: Array<{ field: keyof TerminationLimits; frozenValue: Json; liveValue: Json }> = [];
  for (const field of Object.keys(frozen) as Array<keyof TerminationLimits>) {
    const liveValue = live[field];
    if (liveValue !== undefined && liveValue !== frozen[field]) {
      drift.push({ field, frozenValue: frozen[field], liveValue });
    }
  }
  return drift;
}

/** Injected appender for termination.denied entries (engine-owned I/O). */
export type TerminationDeniedWriter = (denied: TerminationDeniedValue) => Promise<EntryRef>;

interface LineageState {
  escalationUnitsRemaining: number;
  rungsRemaining: number;
  /** Strictly monotone per lineage; no demotions in v1 (docs/07, 11.3c). */
  rungIndex: number;
}

/**
 * The single per-run TerminationAccount (docs/07, 11.5): debit ONLY. No
 * credit operation exists by construction; reclaim never replenishes
 * anything (DEF-5 interaction, docs/07 7.3). Live: the engine debits the
 * in-memory account, writes the carrying entry with the balance-after,
 * then applies effects. Resume state is rebuilt by TerminationFold from
 * the journal, never from live config.
 */
export class TerminationAccount {
  readonly limits: TerminationLimits;
  private revisionUnits: number;
  private spawnUnits: number;
  private readonly lineages = new Map<LogicalTaskId, LineageState>();
  private readonly deniedWriter?: TerminationDeniedWriter;

  constructor(options: { limits: TerminationLimits; deniedWriter?: TerminationDeniedWriter }) {
    this.limits = options.limits;
    this.revisionUnits = options.limits.maxRevisionsPerRun;
    this.spawnUnits = options.limits.maxTotalSpawns;
    if (options.deniedWriter !== undefined) {
      this.deniedWriter = options.deniedWriter;
    }
  }

  snapshot(): TerminationAccountSnapshot {
    const perLineage: Record<LogicalTaskId, LineageCounters> = {};
    for (const [ltid, state] of this.lineages) {
      perLineage[ltid] = {
        escalationUnitsRemaining: state.escalationUnitsRemaining,
        rungsRemaining: state.rungsRemaining,
      };
    }
    return {
      revisionUnitsRemaining: this.revisionUnits,
      spawnUnitsRemaining: this.spawnUnits,
      perLineage,
      phi: this.phi(),
    };
  }

  /** Phi = V + C * S + sum over live lineages (E + R) (docs/07, 11.4). */
  phi(): number {
    let phi = this.revisionUnits + lineageWeightOf(this.limits) * this.spawnUnits;
    for (const state of this.lineages.values()) {
      phi += state.escalationUnitsRemaining + state.rungsRemaining;
    }
    return phi;
  }

  /** The current rung index of a lineage (0 before any raise). */
  rungIndexOf(logicalTaskId: LogicalTaskId): number {
    return this.lineages.get(logicalTaskId)?.rungIndex ?? 0;
  }

  /** True when a spawn-unit debit would underflow (pre-reserve check). */
  get spawnUnitsExhausted(): boolean {
    return this.spawnUnits <= 0;
  }

  get revisionUnitsRemaining(): number {
    return this.revisionUnits;
  }

  /**
   * The spawn-admission debit (docs/07, 11.3b): minus one spawnUnit for
   * an admitted spawn of ANY origin; a NEW lineage receives E0 escalation
   * units and (K_l - 1) rung transitions in the same atomic step, so the
   * lemma's per-spawn decrease is C - (E0 + K_l - 1) = kMax - K_l + 1,
   * at least 1. Synchronous: the caller embeds spawnUnitsAfter in the
   * decision entry it appends next.
   */
  debitSpawn(lineage?: {
    logicalTaskId: LogicalTaskId;
    isNew: boolean;
    ladderLength?: number;
  }): { ok: true; spawnUnitsAfter: number } | { ok: false; resource: 'spawnUnits' } {
    if (this.spawnUnits <= 0) {
      return { ok: false, resource: 'spawnUnits' };
    }
    if (lineage !== undefined) {
      const ladderLength = lineage.ladderLength ?? 1;
      if (ladderLength > this.limits.kMax) {
        throw new ConfigError(
          `ladder length ${String(ladderLength)} exceeds the frozen kMax ` +
            `${String(this.limits.kMax)}; admit() must reject with ladder_exceeds_frozen ` +
            'before debiting (docs/07, 11.8)',
        );
      }
      if (lineage.isNew && !this.lineages.has(lineage.logicalTaskId)) {
        this.lineages.set(lineage.logicalTaskId, {
          escalationUnitsRemaining: this.limits.maxEscalationsPerLogicalTask,
          rungsRemaining: ladderLength - 1,
          rungIndex: 0,
        });
      }
    }
    this.spawnUnits -= 1;
    return { ok: true, spawnUnitsAfter: this.spawnUnits };
  }

  /**
   * The plan_revise debit (docs/07, 11.3a and 11.7): minus one
   * revisionUnit on EVERY journaled plan.revision, regardless of the op
   * count, guard verdicts, or the auto-rebase outcome; conflict spam is
   * never a free retry.
   */
  debitRevision():
    { ok: true; revisionUnitsAfter: number } | { ok: false; resource: 'revisionUnits' } {
    if (this.revisionUnits <= 0) {
      return { ok: false, resource: 'revisionUnits' };
    }
    this.revisionUnits -= 1;
    return { ok: true, revisionUnitsAfter: this.revisionUnits };
  }

  /**
   * The escalation debit (docs/07, 11.3d): minus one escalationUnit of
   * the affected lineage, including EACH lineage of a class-level
   * decision and timeout defaultDecisions. Conditioned on the
   * countsAgainstLimit flag embedded in the decision entry by the caller.
   */
  debitEscalation(
    logicalTaskId: LogicalTaskId,
  ): { ok: true; escalationUnitsAfter: number } | { ok: false; resource: 'escalationUnits' } {
    const state = this.requireLineage(logicalTaskId);
    if (state.escalationUnitsRemaining <= 0) {
      return { ok: false, resource: 'escalationUnits' };
    }
    state.escalationUnitsRemaining -= 1;
    return { ok: true, escalationUnitsAfter: state.escalationUnitsRemaining };
  }

  /**
   * The ladder-raise debit (docs/07, 11.3c): minus one rung of the
   * lineage; rungIndex is strictly monotone, there are no demotions and
   * no runtime startTier promotion in v1.
   */
  debitRung(
    logicalTaskId: LogicalTaskId,
  ):
    | { ok: true; rungIndexAfter: number; rungsRemainingAfter: number }
    | { ok: false; resource: 'rungs' } {
    const state = this.requireLineage(logicalTaskId);
    if (state.rungsRemaining <= 0) {
      return { ok: false, resource: 'rungs' };
    }
    state.rungsRemaining -= 1;
    state.rungIndex += 1;
    return {
      ok: true,
      rungIndexAfter: state.rungIndex,
      rungsRemainingAfter: state.rungsRemaining,
    };
  }

  /**
   * The docs/07 11.5 debit surface: attempts the named resource and, on
   * underflow, writes `termination.denied` strictly BEFORE resolving with
   * the typed failure (the caller surfaces the error only after this
   * settles). Requires a deniedWriter; pure-fold contexts use the
   * synchronous per-resource methods instead.
   */
  async debit(
    resource: Exclude<TerminationResource, 'depth'>,
    lineage?: LogicalTaskId,
    context?: { requestedByRef?: EntryRef; reasonCode?: string },
  ): Promise<DebitResult> {
    const attempt = this.tryDebit(resource, lineage);
    if (attempt.ok) {
      return attempt;
    }
    if (this.deniedWriter === undefined) {
      throw new ConfigError(
        `termination debit of ${resource} underflowed and no deniedWriter is bound; ` +
          'the denied entry MUST precede the surfaced error (docs/07, 11.3)',
      );
    }
    const deniedEntryRef = await this.deniedWriter({
      resource,
      ...(lineage === undefined ? {} : { logicalTaskId: lineage }),
      ...(context?.requestedByRef === undefined ? {} : { requestedByRef: context.requestedByRef }),
      reasonCode: context?.reasonCode ?? exhaustionCodeOf(resource),
      snapshotAfter: this.snapshot(),
    });
    return { ok: false, deniedEntryRef, resource };
  }

  private tryDebit(
    resource: Exclude<TerminationResource, 'depth'>,
    lineage?: LogicalTaskId,
  ): { ok: true; balanceAfter: number } | { ok: false } {
    switch (resource) {
      case 'revisionUnits': {
        const result = this.debitRevision();
        return result.ok ? { ok: true, balanceAfter: result.revisionUnitsAfter } : { ok: false };
      }
      case 'spawnUnits': {
        const result = this.debitSpawn();
        return result.ok ? { ok: true, balanceAfter: result.spawnUnitsAfter } : { ok: false };
      }
      case 'escalationUnits': {
        const result = this.debitEscalation(this.requireLineageId(lineage, resource));
        return result.ok ? { ok: true, balanceAfter: result.escalationUnitsAfter } : { ok: false };
      }
      case 'rungs': {
        const result = this.debitRung(this.requireLineageId(lineage, resource));
        return result.ok ? { ok: true, balanceAfter: result.rungsRemainingAfter } : { ok: false };
      }
    }
  }

  /**
   * Restores one lineage's counters from journaled balances (fold use
   * only): never a credit path, the fold consumes recorded balances.
   */
  restoreLineage(
    logicalTaskId: LogicalTaskId,
    state: LineageCounters & { rungIndex?: number },
  ): void {
    this.lineages.set(logicalTaskId, {
      escalationUnitsRemaining: state.escalationUnitsRemaining,
      rungsRemaining: state.rungsRemaining,
      rungIndex: state.rungIndex ?? 0,
    });
  }

  /** Fold use only: restores the run counters from journaled balances. */
  restoreCounters(state: { revisionUnitsRemaining?: number; spawnUnitsRemaining?: number }): void {
    if (state.revisionUnitsRemaining !== undefined) {
      this.revisionUnits = state.revisionUnitsRemaining;
    }
    if (state.spawnUnitsRemaining !== undefined) {
      this.spawnUnits = state.spawnUnitsRemaining;
    }
  }

  private requireLineage(logicalTaskId: LogicalTaskId): LineageState {
    const state = this.lineages.get(logicalTaskId);
    if (state !== undefined) {
      return state;
    }
    // A lineage the account has never seen gets its frozen allocation on
    // first touch: E0 escalation units and zero extra rungs (the single
    // implicit rung). This covers lineages admitted before the account
    // was bound; the allocation itself is not a credit (it happens at
    // most once per lineage and is part of the frozen vector).
    const fresh: LineageState = {
      escalationUnitsRemaining: this.limits.maxEscalationsPerLogicalTask,
      rungsRemaining: 0,
      rungIndex: 0,
    };
    this.lineages.set(logicalTaskId, fresh);
    return fresh;
  }

  private requireLineageId(
    lineage: LogicalTaskId | undefined,
    resource: TerminationResource,
  ): LogicalTaskId {
    if (lineage === undefined) {
      throw new ConfigError(`a ${resource} debit requires the affected logicalTaskId`);
    }
    return lineage;
  }
}

/** The typed error code surfaced after a denied debit (docs/07, 11.3). */
export function exhaustionCodeOf(resource: TerminationResource): string {
  switch (resource) {
    case 'revisionUnits':
      return 'revision_budget_exhausted';
    case 'spawnUnits':
      return 'termination_exhausted';
    case 'escalationUnits':
      return 'escalation_budget_exhausted';
    case 'rungs':
      return 'ladder_exhausted';
    case 'depth':
      return 'depth';
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * The replay fold (docs/07, 11.6): rebuilds the account from
 * termination.init and the debiting decision entries, asserting every
 * embedded balance-after against the recomputation. A divergence raises
 * the typed journal-integrity error at exactly the diverging entry;
 * denials are re-issued from termination.denied with zero live calls.
 */
export function foldTermination(entries: readonly JournalEntry[]):
  | {
      account: TerminationAccount;
      initRef: EntryRef;
      init: TerminationInitValue;
      denials: Array<{ seq: EntryRef; value: TerminationDeniedValue }>;
    }
  | undefined {
  const initEntry = entries.find((entry) => entry.kind === 'termination.init');
  if (initEntry === undefined) {
    return undefined;
  }
  const init = readTerminationInit(initEntry);
  if (init === undefined) {
    throw new PlanInvariantError(
      `termination.init at seq ${String(initEntry.seq)} carries a malformed limits payload`,
      { data: { entryRef: initEntry.seq } },
    );
  }
  const account = new TerminationAccount({ limits: validateTerminationLimits(init.limits) });
  const denials: Array<{ seq: EntryRef; value: TerminationDeniedValue }> = [];
  /** First-closing-wins over resolution targets (DEF-4): losers never debit. */
  const closedTargets = new Set<number>();
  const assertBalance = (
    entry: JournalEntry,
    what: string,
    embedded: unknown,
    recomputed: number,
  ): void => {
    if (typeof embedded === 'number' && embedded !== recomputed) {
      throw new PlanInvariantError(
        `termination fold divergence at seq ${String(entry.seq)}: ${what} recomputes to ` +
          `${String(recomputed)} but the entry embeds ${String(embedded)} ` +
          '(docs/07, 11.6: the debit fold is authoritative)',
        { data: { entryRef: entry.seq, what, embedded: embedded, recomputed } },
      );
    }
  };
  for (const entry of entries) {
    if (entry.seq <= initEntry.seq) {
      continue;
    }
    if (entry.kind === 'termination.denied') {
      const value = entry.value as unknown as TerminationDeniedValue;
      denials.push({ seq: entry.seq, value });
      continue;
    }
    if (entry.kind === 'resolution' && entry.ref !== undefined) {
      // A timeout defaultDecision is a resolution with by 'timeout' and
      // debits the affected lineage exactly once under first-closing-wins
      // (docs/07, 11.3d and 11.7); class_decision resolutions never debit
      // here, their class decision carries the array (XF-06).
      if (closedTargets.has(entry.ref)) {
        continue;
      }
      closedTargets.add(entry.ref);
      const payload = entry.resolution;
      if (
        payload?.countsAgainstLimit === true &&
        payload.by !== 'class_decision' &&
        payload.logicalTaskId !== undefined
      ) {
        const result = account.debitEscalation(payload.logicalTaskId);
        if (!result.ok) {
          throw new PlanInvariantError(
            `termination fold divergence at seq ${String(entry.seq)}: a counting resolution ` +
              `for ${payload.logicalTaskId} was journaled after its units reached zero`,
            { data: { entryRef: entry.seq } },
          );
        }
      }
      continue;
    }
    if (entry.kind === 'plan.revision') {
      const value = asRecord(entry.value);
      const result = account.debitRevision();
      if (!result.ok) {
        throw new PlanInvariantError(
          `termination fold divergence at seq ${String(entry.seq)}: a plan.revision was ` +
            'journaled after revisionUnits reached zero',
          { data: { entryRef: entry.seq } },
        );
      }
      assertBalance(
        entry,
        'revisionUnitsAfter',
        value?.revisionUnitsAfter,
        result.revisionUnitsAfter,
      );
      for (const admission of readAdmissions(entry)) {
        applySpawnDebit(account, entry, admission, assertBalance);
      }
      continue;
    }
    if (entry.kind === 'decision') {
      const value = asRecord(entry.value);
      const decisionType = value === undefined ? undefined : value.decisionType;
      if (decisionType === 'spawn-admission') {
        const admission = readSpawnAdmission(value ?? {});
        if (admission !== undefined) {
          applySpawnDebit(account, entry, admission, assertBalance);
        }
        continue;
      }
      if (decisionType === 'escalation-decision' && value?.countsAgainstLimit === true) {
        const debits: Array<Record<string, unknown>> = [];
        if (typeof value.logicalTaskId === 'string') {
          debits.push(value);
        }
        if (Array.isArray(value.debits)) {
          for (const raw of value.debits) {
            const debit = asRecord(raw);
            if (debit !== undefined && typeof debit.logicalTaskId === 'string') {
              debits.push(debit);
            }
          }
        }
        for (const debit of debits) {
          const result = account.debitEscalation(debit.logicalTaskId as string);
          if (!result.ok) {
            throw new PlanInvariantError(
              `termination fold divergence at seq ${String(entry.seq)}: an escalation debit ` +
                `for ${String(debit.logicalTaskId)} was journaled after its units reached zero`,
              { data: { entryRef: entry.seq } },
            );
          }
          assertBalance(
            entry,
            'escalationUnitsAfter',
            debit.escalationUnitsAfter,
            result.escalationUnitsAfter,
          );
        }
        // Embedded decomposition admissions debit spawn units too.
        for (const admission of readAdmissions(entry)) {
          applySpawnDebit(account, entry, admission, assertBalance);
        }
        continue;
      }
      if (decisionType === 'ladder-verdict' && value?.raisesRung === true) {
        const ltid = typeof value.logicalTaskId === 'string' ? value.logicalTaskId : undefined;
        if (ltid === undefined) {
          continue;
        }
        const result = account.debitRung(ltid);
        if (!result.ok) {
          throw new PlanInvariantError(
            `termination fold divergence at seq ${String(entry.seq)}: a rung raise for ` +
              `${ltid} was journaled after its rungs reached zero`,
            { data: { entryRef: entry.seq } },
          );
        }
        assertBalance(entry, 'rungIndexAfter', value.rungIndexAfter, result.rungIndexAfter);
        assertBalance(
          entry,
          'rungsRemainingAfter',
          value.rungsRemainingAfter,
          result.rungsRemainingAfter,
        );
      }
    }
  }
  return { account, initRef: initEntry.seq, init, denials };
}

interface FoldAdmission {
  logicalTaskId?: string;
  isNew: boolean;
  ladderLength?: number;
  spawnUnitsAfter?: unknown;
}

function readSpawnAdmission(value: Record<string, unknown>): FoldAdmission | undefined {
  const decision = asRecord(value.decision);
  const verdict = asRecord(decision?.verdict);
  if (verdict !== undefined) {
    if (verdict.kind === 'reject') {
      return undefined;
    }
    const lineage = asRecord(verdict.lineage);
    return {
      ...(typeof lineage?.logicalTaskId === 'string'
        ? { logicalTaskId: lineage.logicalTaskId }
        : {}),
      isNew: lineage?.isNew === true,
      ...(typeof decision?.ladderLength === 'number'
        ? { ladderLength: decision.ladderLength }
        : {}),
      spawnUnitsAfter: verdict.spawnUnitsAfter,
    };
  }
  // The bare ctx.agent lineage declaration carries no structural verdict
  // and debits nothing: it is not an ADMITTED spawn under a termination
  // account (PlanRunner spawns always ride full admissions).
  return undefined;
}

function readAdmissions(entry: JournalEntry): FoldAdmission[] {
  const value = asRecord(entry.value);
  const admissions = value === undefined ? undefined : value.admissions;
  if (!Array.isArray(admissions)) {
    return [];
  }
  const out: FoldAdmission[] = [];
  for (const raw of admissions) {
    const record = asRecord(raw);
    if (record === undefined) {
      continue;
    }
    const read = readSpawnAdmission(record);
    if (read !== undefined) {
      out.push(read);
    }
  }
  return out;
}

function applySpawnDebit(
  account: TerminationAccount,
  entry: JournalEntry,
  admission: FoldAdmission,
  assertBalance: (entry: JournalEntry, what: string, embedded: unknown, recomputed: number) => void,
): void {
  const result = account.debitSpawn(
    admission.logicalTaskId === undefined
      ? undefined
      : {
          logicalTaskId: admission.logicalTaskId,
          isNew: admission.isNew,
          ...(admission.ladderLength === undefined ? {} : { ladderLength: admission.ladderLength }),
        },
  );
  if (!result.ok) {
    throw new PlanInvariantError(
      `termination fold divergence at seq ${String(entry.seq)}: an admitted spawn was ` +
        'journaled after spawnUnits reached zero',
      { data: { entryRef: entry.seq } },
    );
  }
  assertBalance(entry, 'spawnUnitsAfter', admission.spawnUnitsAfter, result.spawnUnitsAfter);
}
