/**
 * Suspension, ref-entries, the first-closing-wins fold, and the
 * ResolutionArbiter (M2-T07, DEF-4). No CAS and no entry mutation: both
 * resolution and abandon are appends of new entries plus a pure
 * deterministic fold; JournalStore stays exactly five methods.
 *
 * Owning spec: docs/03-journal-spec.md, sections "Suspension and
 * resolutions (DEF-4)" and "Abandon, derived skipped" (9.1).
 */
import { JournalOrderViolation } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type {
  AbandonPayload,
  JournalEntry,
  ResolutionBy,
  ResolutionPayload,
} from '../l0/entries.js';
import { Validator } from '../vendor/json-schema/index.js';
import { agentScope } from './scope.js';
import type { AbandonFold } from './disposition.js';

export type ResolutionAttempt = {
  by: ResolutionBy;
  value: Json;
  decisionRef?: number;
};

export type AbandonAttempt = {
  target: number;
  authorizedBy: number;
  nodeId?: string;
  reason: string;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
};

export type ResolutionOutcome =
  | { applied: true; seq: number }
  | {
      applied: false;
      seq: number;
      supersededBy: number;
      reason: 'already_resolved' | 'target_abandoned';
    };

export type SuspensionState =
  | { state: 'suspended'; deadlineAt?: string }
  | { state: 'resolved'; by: number; value: Json }
  | { state: 'abandoned'; by: number };

/** Fold classification of one ref-entry; NEVER persisted (docs/03, section 8.4). */
export type RefEntryClassification =
  | { classification: 'applied' }
  | {
      classification: 'noop';
      supersededBy: number;
      reason: 'already_resolved' | 'target_abandoned';
    }
  | { classification: 'invalid'; detail: string };

interface TargetState {
  entry: JournalEntry;
  closedBy?: number;
  closedKind?: 'resolution' | 'abandon';
  value?: Json;
}

/**
 * The first-closing-wins fold over a loaded journal: one pass by seq,
 * bit-identical on every store returning the same entries. Resolution
 * values are validated at consumption against the schema pinned INSIDE
 * the suspended entry payload (canonical bare JSON Schema); a
 * schema-invalid offline resolution classifies invalid and does NOT close
 * the target. Abandon coverage is the target seq plus the transitive
 * child scope-prefix; the AbandonFold consumed by the replay predicate is
 * a projection of THIS fold (docs/03, section 6.2: not a separate pass).
 */
export class ResolutionFold {
  private readonly targets = new Map<number, TargetState>();
  private readonly bySeq = new Map<number, JournalEntry>();
  private readonly classifications = new Map<number, RefEntryClassification>();
  private readonly coveredSeqs = new Set<number>();
  private readonly coveredPrefixes: string[] = [];

  constructor(entries: readonly JournalEntry[]) {
    for (const entry of entries) {
      this.bySeq.set(entry.seq, entry);
      if (entry.status === 'suspended') {
        this.targets.set(entry.seq, { entry });
      }
    }
    for (const entry of entries) {
      if (entry.kind === 'resolution') {
        this.classifications.set(entry.seq, this.applyResolution(entry));
      } else if (entry.kind === 'abandon') {
        this.classifications.set(entry.seq, this.applyAbandon(entry));
      }
    }
  }

  private isCoveredEntry(entry: JournalEntry): boolean {
    if (this.coveredSeqs.has(entry.seq)) {
      return true;
    }
    return this.coveredPrefixes.some(
      (prefix) => entry.scope === prefix || entry.scope.startsWith(`${prefix}/`),
    );
  }

  private applyResolution(entry: JournalEntry): RefEntryClassification {
    if (entry.ref === undefined || entry.ref >= entry.seq) {
      throw new JournalOrderViolation(
        `resolution entry ${entry.seq} violates rule O2 (backward references only)`,
      );
    }
    const target = this.bySeq.get(entry.ref);
    if (target === undefined) {
      throw new JournalOrderViolation(
        `resolution entry ${entry.seq} references nonexistent seq ${entry.ref}`,
      );
    }
    const state = this.targets.get(entry.ref);
    if (state === undefined) {
      return { classification: 'invalid', detail: 'target is not a suspended entry' };
    }
    if (this.isCoveredEntry(state.entry)) {
      return {
        classification: 'noop',
        supersededBy: state.closedBy ?? entry.seq,
        reason: 'target_abandoned',
      };
    }
    if (state.closedBy !== undefined) {
      return {
        classification: 'noop',
        supersededBy: state.closedBy,
        reason: state.closedKind === 'abandon' ? 'target_abandoned' : 'already_resolved',
      };
    }
    const payload = entry.resolution;
    if (payload === undefined) {
      return { classification: 'invalid', detail: 'missing resolution payload' };
    }
    const schema = (state.entry.value as { schema?: Record<string, unknown> } | undefined)?.schema;
    if (schema !== undefined) {
      const result = new Validator(schema, '2020-12', false).validate(payload.value);
      if (!result.valid) {
        // Round-1 behavior preserved: the entry stays suspended; a typed
        // error surfaces in the resume report (docs/03, section 8.4).
        return {
          classification: 'invalid',
          detail: result.errors[0]?.error ?? 'resolution value does not validate',
        };
      }
    }
    state.closedBy = entry.seq;
    state.closedKind = 'resolution';
    state.value = payload.value;
    return { classification: 'applied' };
  }

  private applyAbandon(entry: JournalEntry): RefEntryClassification {
    if (entry.ref === undefined || entry.ref >= entry.seq) {
      throw new JournalOrderViolation(
        `abandon entry ${entry.seq} violates rule O2 (backward references only)`,
      );
    }
    const target = this.bySeq.get(entry.ref);
    if (target === undefined) {
      throw new JournalOrderViolation(
        `abandon entry ${entry.seq} references nonexistent seq ${entry.ref}`,
      );
    }
    if (this.isCoveredEntry(target)) {
      return { classification: 'noop', supersededBy: entry.seq, reason: 'target_abandoned' };
    }
    const suspendedTarget = this.targets.get(target.seq);
    if (suspendedTarget?.closedBy !== undefined) {
      // First-closing-wins per target: a suspended target already closed
      // by a resolution cannot be re-closed; the late abandon folds to
      // noop (docs/09, section 6.4: abandon-vs-resolution-race).
      return {
        classification: 'noop',
        supersededBy: suspendedTarget.closedBy,
        reason: 'already_resolved',
      };
    }
    this.coveredSeqs.add(target.seq);
    this.coveredPrefixes.push(agentScope(target.scope, target.seq));
    // A covering abandon closes any suspended entries under it.
    for (const state of this.targets.values()) {
      if (state.closedBy === undefined && this.isCoveredEntry(state.entry)) {
        state.closedBy = entry.seq;
        state.closedKind = 'abandon';
      }
    }
    return { classification: 'applied' };
  }

  /** Registers a live-appended suspended entry with the fold. */
  registerSuspended(entry: JournalEntry): void {
    this.bySeq.set(entry.seq, entry);
    this.targets.set(entry.seq, { entry });
  }

  /** Registers a live-appended ref-entry, returning its classification. */
  registerRefEntry(entry: JournalEntry): RefEntryClassification {
    this.bySeq.set(entry.seq, entry);
    const classification =
      entry.kind === 'resolution' ? this.applyResolution(entry) : this.applyAbandon(entry);
    this.classifications.set(entry.seq, classification);
    return classification;
  }

  /** Registers any other live-appended entry (abandon coverage needs scopes). */
  registerEntry(entry: JournalEntry): void {
    this.bySeq.set(entry.seq, entry);
  }

  suspensionState(target: number): SuspensionState {
    const state = this.targets.get(target);
    if (state === undefined || state.closedBy === undefined) {
      const deadlineAt = state?.entry.deadlineAt;
      return { state: 'suspended', ...(deadlineAt === undefined ? {} : { deadlineAt }) };
    }
    if (state.closedKind === 'abandon') {
      return { state: 'abandoned', by: state.closedBy };
    }
    return { state: 'resolved', by: state.closedBy, value: state.value ?? null };
  }

  classificationOf(seq: number): RefEntryClassification | undefined {
    return this.classifications.get(seq);
  }

  /** Invalid offline resolutions surfaced in the resume report. */
  invalidResolutions(): Array<{ seq: number; detail: string }> {
    const invalid: Array<{ seq: number; detail: string }> = [];
    for (const [seq, classification] of this.classifications) {
      if (classification.classification === 'invalid') {
        invalid.push({ seq, detail: classification.detail });
      }
    }
    return invalid;
  }

  /** The AbandonFold projection consumed by the replay predicate. */
  get abandonFold(): AbandonFold {
    return {
      isAbandoned: (ref: number) => {
        const entry = this.bySeq.get(ref);
        if (entry === undefined) {
          return false;
        }
        return this.isCoveredEntry(entry);
      },
    };
  }

  /** Open suspended entries (for pending[] and re-arming at resume). */
  openSuspensions(): JournalEntry[] {
    return [...this.targets.values()]
      .filter((state) => state.closedBy === undefined && !this.isCoveredEntry(state.entry))
      .map((state) => state.entry);
  }
}

/** The append surface the arbiter drives (implemented by the Replayer). */
export interface RefEntryAppender {
  appendRefEntry(input: {
    kind: 'resolution' | 'abandon';
    ref: number;
    scope: string;
    spanId: string;
    resolution?: ResolutionPayload;
    abandon?: AbandonPayload;
  }): Promise<JournalEntry>;
}

/**
 * Per-run, per-target FIFO serializer of resolution/abandon attempts
 * (docs/03, section 8.5): classification against the in-memory fold ->
 * durable append -> settle exactly once; losing attempts are ALSO
 * appended and become journaled noops by fold classification. Winner
 * effects run strictly after the critical section (the caller's job).
 * Cross-process protection remains the LeasableStore fencing epoch.
 */
export class ResolutionArbiter {
  private readonly fold: ResolutionFold;
  private readonly appender: RefEntryAppender;
  private readonly queues = new Map<number, Promise<unknown>>();

  constructor(fold: ResolutionFold, appender: RefEntryAppender) {
    this.fold = fold;
    this.appender = appender;
  }

  private enqueue<T>(target: number, section: () => Promise<T>): Promise<T> {
    const tail = this.queues.get(target) ?? Promise.resolve();
    const next = tail.then(section);
    this.queues.set(
      target,
      next.catch(() => undefined),
    );
    return next;
  }

  submitResolution(
    target: number,
    targetScope: string,
    spanId: string,
    attempt: ResolutionAttempt,
  ): Promise<ResolutionOutcome> {
    return this.enqueue(target, async () => {
      const payload: ResolutionPayload = {
        target,
        by: attempt.by,
        value: attempt.value,
        ...(attempt.decisionRef === undefined ? {} : { decisionRef: attempt.decisionRef }),
      };
      const entry = await this.appender.appendRefEntry({
        kind: 'resolution',
        ref: target,
        scope: targetScope,
        spanId,
        resolution: payload,
      });
      const classification = this.fold.registerRefEntry(entry);
      if (classification.classification === 'applied') {
        return { applied: true, seq: entry.seq };
      }
      if (classification.classification === 'noop') {
        return {
          applied: false,
          seq: entry.seq,
          supersededBy: classification.supersededBy,
          reason: classification.reason,
        };
      }
      // A live attempt is validated BEFORE append (docs/03, section 8.7),
      // so an invalid classification here means an offline-authored
      // journal; surface it as a noop against the target itself.
      return {
        applied: false,
        seq: entry.seq,
        supersededBy: target,
        reason: 'already_resolved',
      };
    });
  }

  submitAbandon(
    targetScope: string,
    spanId: string,
    attempt: AbandonAttempt,
  ): Promise<ResolutionOutcome> {
    return this.enqueue(attempt.target, async () => {
      const payload: AbandonPayload = {
        target: attempt.target,
        authorizedBy: attempt.authorizedBy,
        reason: attempt.reason,
        ...(attempt.nodeId === undefined ? {} : { nodeId: attempt.nodeId }),
        retainCheckpoint: attempt.retainCheckpoint ?? true,
        retainWorktree: attempt.retainWorktree ?? false,
      };
      const entry = await this.appender.appendRefEntry({
        kind: 'abandon',
        ref: attempt.target,
        scope: targetScope,
        spanId,
        abandon: payload,
      });
      const classification = this.fold.registerRefEntry(entry);
      if (classification.classification === 'applied') {
        return { applied: true, seq: entry.seq };
      }
      if (classification.classification === 'noop') {
        return {
          applied: false,
          seq: entry.seq,
          supersededBy: classification.supersededBy,
          reason: classification.reason,
        };
      }
      return {
        applied: false,
        seq: entry.seq,
        supersededBy: attempt.target,
        reason: 'target_abandoned',
      };
    });
  }
}
