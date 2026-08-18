/**
 * awaitExternal and resolveExternal (M2-T08): journaled external inputs
 * over the DEF-4 machinery. awaitExternal writes a suspended entry (NO
 * deadline in v1); a run whose in-flight work is all blocked on
 * suspensions settles with outcome 'suspended' and pending[];
 * resolveExternal validates against the pinned schema BEFORE append on
 * the live path and settles the waiting promise in place without replay.
 *
 * Full contract: https://docs.rulvar.com/guide/durability
 */
import { ConfigError, InvalidResolutionError, type Issue } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { JournalEntry } from '../l0/entries.js';
import type { JsonSchema } from '../l0/messages.js';
import {
  canonicalizeSchema,
  projectToJsonSchema,
  validateSchemaSpec,
  type SchemaSpec,
} from '../l0/schema.js';
import { deriveContentKey } from '../journal/identity.js';
import { setLongTimeout, type LongTimer } from '../l0/long-timer.js';
import type { ResolutionBy } from '../l0/entries.js';
import type { WorkflowEventBody } from '../l0/events.js';
import type { Replayer } from '../journal/replayer.js';
import type { ResolutionOutcome } from '../journal/resolution.js';
import type { PendingExternal } from './run-handle.js';

interface Waiter {
  kind: 'external' | 'approval' | 'decision';
  key: string;
  scope: string;
  entryRef: number;
  prompt?: string;
  schemaSpec?: SchemaSpec;
  resolve: (value: Json) => void;
  /**
   * The armed approval deadline (RV1107). Cancelled when a resolution
   * applies; deliberately NOT cancelled by close(): the deadline is a
   * durable property of the suspension, so a run parked 'suspended' in
   * a live process still denies at its deadline, the append landing
   * through the fold without waking anything. Cross-process races are
   * settled by the first-closing-wins arbiter.
   */
  timer?: LongTimer;
}

/**
 * The rejection carrier of an aborted flavor B decision wait (v1.35.0
 * review P1): the parked `awaitDecision` observes the branch/run
 * AbortSignal, releases its held activity, removes its waiter, and
 * rejects with this class so cancel, host abort, the run deadline, and
 * failed sibling aborts all settle the run in bounded time.
 * Deliberately not a RulvarError: the abort is cancellation intent, not
 * a registry failure class; the suspension entry stays OPEN, so a later
 * resume parks the decision again and the durable deadline still applies.
 */
export class EscalationDecisionAbortedError extends Error {
  readonly entryRef: number;

  constructor(message: string, entryRef: number) {
    super(message);
    this.name = 'EscalationDecisionAbortedError';
    this.entryRef = entryRef;
  }
}

/** The resolution value shape of a tool-approval suspension (M3-T03). */
export interface ApprovalDecision {
  decision: 'allow' | 'deny';
  reason?: string;
  /**
   * The allow's declared expiry (RV4008), carried verbatim from the
   * resolution value: the consumption recheck denies a granted allow
   * whose expiry has passed, exactly like a revocation. Pending
   * approvals already had `deadlineAt`; this bounds the GRANT.
   */
  expiresAt?: string;
  /**
   * The approval suspension's entry seq (RV4008): the address the
   * consumption recheck reads revocations against. Present on every
   * decision this registry hands out; absent only through older
   * callers of toApprovalDecision.
   */
  entryRef?: number;
}

/**
 * Normalizes a resolution value into an ApprovalDecision. Anything that
 * is not an explicit allow is a deny: an approval never fails open.
 */
export function toApprovalDecision(value: Json, entryRef?: number): ApprovalDecision {
  const record = (value ?? {}) as { decision?: unknown; reason?: unknown; expiresAt?: unknown };
  const decision = record.decision === 'allow' ? 'allow' : 'deny';
  return {
    decision,
    ...(typeof record.reason === 'string' ? { reason: record.reason } : {}),
    ...(typeof record.expiresAt === 'string' ? { expiresAt: record.expiresAt } : {}),
    ...(entryRef === undefined ? {} : { entryRef }),
  };
}

/** One recorded approval revocation's outcome (RV4008). */
export interface ApprovalRevocationOutcome {
  /**
   * 'denied-pending': the approval was still open and is now denied
   * through the ordinary first-closing-wins arbitration.
   * 'revoked-allow': a recorded allow now carries a journaled
   * revocation that beats it at the consumption recheck.
   * 'already-revoked': a prior revocation already stands.
   * 'already-closed': the approval was denied or abandoned; there is
   * nothing to revoke.
   */
  state: 'denied-pending' | 'revoked-allow' | 'already-revoked' | 'already-closed';
  entryRef: number;
}

/**
 * Classifies a kind-'approval' suspension entry for the detached
 * resolver (RV1203): both suspension flavors share the journal kind,
 * and the flavor decides which payload validates (the plain
 * ApprovalDecision against the EscalationDecision). An escalation is
 * recognized by its structural invariant, true by construction since
 * flavor B shipped: awaitDecision requires a deadline and the escalate
 * tool is the single hardcoded caller, so an escalation entry always
 * carries deadlineAt AND toolName 'escalate'. The one entry that
 * shape cannot distinguish, an ordinary tool literally named
 * 'escalate' that opted into the v1.143.0 approval deadline, names
 * itself: every approval suspension written since v1.144.0 journals an
 * explicit `flavor: 'approval'` in its payload. Presence of the
 * deadline ALONE must never pick the validator again: that is the
 * regression that made every timed tool approval detached-unresolvable
 * (the sixteenth experiment, judge repro R2).
 */
function detachedApprovalFlavor(entry: JournalEntry): 'approval' | 'decision' {
  const value = entry.value as { toolName?: unknown; flavor?: unknown } | null | undefined;
  if (value?.flavor === 'approval') {
    return 'approval';
  }
  return entry.deadlineAt !== undefined && value?.toolName === 'escalate' ? 'decision' : 'approval';
}

/**
 * The payload arms of every resolution surface (throws, journals
 * nothing): the plain ApprovalDecision, the flavor B EscalationDecision,
 * and the pinned schema. ONE implementation on purpose: the live waiter
 * path, the engine's detached path, and every offline authority validate
 * the same bytes the same way.
 */
async function validatePayloadArms(
  kind: 'external' | 'approval' | 'decision',
  key: string,
  value: Json,
  schemaSpec?: SchemaSpec,
): Promise<void> {
  if (kind === 'approval') {
    const decision = (value as { decision?: unknown } | null)?.decision;
    if (decision !== 'allow' && decision !== 'deny') {
      throw new InvalidResolutionError(
        `approval '${key}' resolves with { decision: 'allow' | 'deny', reason?, expiresAt? }`,
      );
    }
    // The bounded grant (RV4008): a malformed expiry must not arm a
    // recheck that can never fire.
    const expiresAt = (value as { expiresAt?: unknown } | null)?.expiresAt;
    if (
      expiresAt !== undefined &&
      (typeof expiresAt !== 'string' || Number.isNaN(Date.parse(expiresAt)))
    ) {
      throw new InvalidResolutionError(
        `approval '${key}' expiresAt must be an ISO 8601 date string; got ` +
          JSON.stringify(expiresAt),
      );
    }
  }
  if (kind === 'decision') {
    const decisionKind = (value as { kind?: unknown } | null)?.kind;
    if (
      decisionKind !== 'retry' &&
      decisionKind !== 'decompose' &&
      decisionKind !== 'cancel' &&
      decisionKind !== 'accept'
    ) {
      throw new InvalidResolutionError(
        `escalation '${key}' resolves with an EscalationDecision ` +
          "({ kind: 'retry' | 'decompose' | 'cancel' | 'accept', ... })",
      );
    }
  }
  if (schemaSpec !== undefined) {
    const validation = await validateSchemaSpec(schemaSpec, value);
    if (!validation.valid) {
      throw new InvalidResolutionError(
        `resolution for '${key}' does not validate against the pinned schema: ` +
          validation.issues.map((issue: Issue) => issue.message).join('; '),
        { data: { issues: validation.issues.map((issue) => issue.message) } },
      );
    }
  }
}

/**
 * The detached resolution validator (RV1408): classifies the target
 * entry exactly as the engine's own detached path does (a kind-'approval'
 * entry by its RV1203 flavor, an external by its kind), then applies the
 * shared payload arms and the pinned schema. Exported for offline
 * authorities (the CLI server's lease-guarded append is the first): an
 * escalation must resolve with its OWN EscalationDecision payload
 * offline exactly as detached-live, and a lookalike validator that
 * demanded the plain ApprovalDecision from every approval-kind entry
 * both refused legitimate escalation decisions and waved wrong-shaped
 * ones into the journal. Throws InvalidResolutionError; journals
 * nothing.
 */
export async function validateDetachedResolution(
  target: JournalEntry,
  key: string,
  value: Json,
): Promise<void> {
  await validatePayloadArms(
    target.kind === 'approval' ? detachedApprovalFlavor(target) : 'external',
    key,
    value,
    (target.value as { schema?: unknown } | undefined)?.schema as SchemaSpec | undefined,
  );
}

/**
 * Per-run registry of open external suspensions plus the run's activity
 * counter: when every in-flight branch is blocked on suspensions
 * (activity zero, waiters open), the run quiesces into outcome
 * 'suspended'.
 */
export class ExternalRegistry {
  private readonly replayer: Replayer;
  private readonly waiters = new Map<number, Waiter>();
  private readonly keysByScope = new Set<string>();
  private activity = 0;
  private closedFlag = false;
  private quiesceListener?: (pending: PendingExternal[]) => void;
  private quiesceScheduled = false;

  private readonly emitEvent?: (body: WorkflowEventBody) => void;

  private readonly now: () => number;

  constructor(
    replayer: Replayer,
    emitEvent?: (body: WorkflowEventBody) => void,
    now: () => number = Date.now,
  ) {
    this.replayer = replayer;
    this.emitEvent = emitEvent;
    this.now = now;
  }

  /**
   * Live resolution telemetry: applied when the attempt won the
   * first-closing-wins fold, superseded when it lost. Emitted for live
   * attempts only; folds of prior entries at resume re-emit nothing.
   */
  private emitResolutionOutcome(
    targetRef: number,
    by: ResolutionBy,
    outcome: ResolutionOutcome,
  ): void {
    if (this.emitEvent === undefined) {
      return;
    }
    if (outcome.applied) {
      this.emitEvent({ type: 'resolution:applied', targetRef, entryRef: outcome.seq, by });
    } else {
      this.emitEvent({
        type: 'resolution:superseded',
        targetRef,
        entryRef: outcome.seq,
        supersededBy: outcome.supersededBy,
        reason: outcome.reason,
      });
    }
  }

  /** Wraps every non-suspension async operation (agents, steps). */
  enter(): () => void {
    this.activity += 1;
    let done = false;
    return () => {
      if (!done) {
        done = true;
        this.activity -= 1;
        this.scheduleQuiesceCheck();
      }
    };
  }

  /**
   * An agent parking on a mid-turn approval is BLOCKED, not active: its
   * held activity is released so the run can settle 'suspended', and
   * re-taken when the resolution lands (M3-T03).
   */
  private suspendActivity(): () => void {
    this.activity -= 1;
    this.scheduleQuiesceCheck();
    let resumed = false;
    return () => {
      if (!resumed) {
        resumed = true;
        this.activity += 1;
      }
    };
  }

  onQuiesce(listener: (pending: PendingExternal[]) => void): void {
    this.quiesceListener = listener;
  }

  pending(): PendingExternal[] {
    return [...this.waiters.values()].map((waiter) => ({
      key: waiter.key,
      scope: waiter.scope,
      entryRef: waiter.entryRef,
      ...(waiter.prompt === undefined ? {} : { prompt: waiter.prompt }),
    }));
  }

  /** The synthesized resolveExternal key of an approval suspension. */
  static approvalKey(entryRef: number): string {
    return `approval:${entryRef}`;
  }

  /**
   * The resolveExternal key a journaled suspension answers to: externals
   * carry the workflow-chosen key in the payload; approvals and Flavor B
   * decisions synthesize `approval:<seq>`. Undefined for anything that
   * is not a suspended entry.
   */
  static suspensionKeyOf(entry: JournalEntry): string | undefined {
    if (entry.status !== 'suspended') {
      return undefined;
    }
    if (entry.kind === 'external') {
      const key = (entry.value as { key?: unknown } | undefined)?.key;
      return typeof key === 'string' ? key : undefined;
    }
    if (entry.kind === 'approval') {
      return ExternalRegistry.approvalKey(entry.seq);
    }
    return undefined;
  }

  /**
   * Settling the run closes this execution segment permanently: every
   * parked waiter is detached, so a resolution arriving after
   * handle.result settled appends durably through the fold and wakes
   * NOTHING; exactly one subsequent engine.resume owns the continuation.
   * Idempotent. (Suspension ownership rule; v1.10 deep E2E review.)
   */
  close(): void {
    this.closedFlag = true;
    this.waiters.clear();
  }

  get closed(): boolean {
    return this.closedFlag;
  }

  private scheduleQuiesceCheck(): void {
    if (this.quiesceScheduled) {
      return;
    }
    this.quiesceScheduled = true;
    // Two macrotask hops let same-tick resolutions win before the run
    // settles suspended.
    setImmediate(() => {
      setImmediate(() => {
        this.quiesceScheduled = false;
        if (this.activity === 0 && this.waiters.size > 0) {
          this.quiesceListener?.(this.pending());
        }
      });
    });
  }

  /**
   * ctx.awaitExternal: journal (or re-match) the suspended entry and park
   * until a resolution wins the first-closing-wins fold.
   */
  async awaitExternal(
    scope: string,
    spanId: string,
    key: string,
    options?: { schema?: SchemaSpec; prompt?: string },
  ): Promise<Json> {
    const scopeKey = `${scope}\u0000${key}`;
    if (this.keysByScope.has(scopeKey)) {
      throw new ConfigError(`duplicate awaitExternal key '${key}' in scope '${scope}'`);
    }
    this.keysByScope.add(scopeKey);

    const identity = { kind: 'external', key } as const;
    let entry: JournalEntry;
    const matched = this.replayer.match(scope, identity, 'scoped');
    if (matched.kind === 'skip' && matched.running.status === 'suspended') {
      // The suspended entry exists from a prior attempt; the fold decides
      // whether it is already closed.
      entry = matched.running;
      const state = this.replayer.suspensionState(entry.seq);
      if (state.state === 'resolved') {
        return state.value;
      }
      if (state.state === 'abandoned') {
        // An abandoned suspension never resolves; the branch itself is
        // skipped at the spawn level.
        return new Promise<Json>(() => undefined);
      }
    } else {
      const payload: Record<string, Json> = { key };
      if (options?.prompt !== undefined) {
        payload.prompt = options.prompt;
      }
      let canonicalSchema: JsonSchema | undefined;
      if (options?.schema !== undefined) {
        canonicalSchema = canonicalizeSchema(projectToJsonSchema(options.schema));
        payload.schema = canonicalSchema as Json;
      }
      entry = await this.replayer.appendSuspended({
        scope,
        key: deriveContentKey(identity),
        kind: 'external',
        spanId,
        value: payload,
      });
    }

    return new Promise<Json>((resolve) => {
      const waiter: Waiter = {
        kind: 'external',
        key,
        scope,
        entryRef: entry.seq,
        resolve,
        ...(options?.prompt === undefined ? {} : { prompt: options.prompt }),
        ...(options?.schema === undefined ? {} : { schemaSpec: options.schema }),
      };
      this.waiters.set(entry.seq, waiter);
      this.scheduleQuiesceCheck();
    });
  }

  /**
   * Tool-approval suspension (M3-T03): journals (or
   * re-matches) the suspended approval entry keyed by (toolName, input)
   * in the agent's child scope and parks until a resolution closes it.
   * The ask verdict is journaled together with the turn checkpoint; on
   * resume an already-resolved entry applies its decision immediately and
   * is never re-suspended.
   */
  async awaitApproval(options: {
    scope: string;
    spanId: string;
    toolName: string;
    input: Json;
    risk?: string;
    /**
     * The opt-in approval deadline (RV1107), journaled ON the
     * suspension entry so it survives resume; the armed timer always
     * reads the ENTRY's deadline, never the caller's config, so a
     * config change can never move an already-journaled deadline.
     */
    deadlineAt?: string;
    /** Called with the suspended entry once it is open (live or re-parked). */
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<ApprovalDecision> {
    const identity = {
      kind: 'approval',
      toolName: options.toolName,
      input: options.input,
    } as const;
    let entry: JournalEntry;
    let replayed = false;
    const matched = this.replayer.match(options.scope, identity, 'scoped');
    if (matched.kind === 'skip' && matched.running.status === 'suspended') {
      entry = matched.running;
      replayed = true;
      const state = this.replayer.suspensionState(entry.seq);
      if (state.state === 'resolved') {
        return toApprovalDecision(state.value, entry.seq);
      }
      if (state.state === 'abandoned') {
        // The branch is being killed by a journaled abandon; the approval
        // never resolves.
        this.suspendActivity();
        return new Promise<ApprovalDecision>(() => undefined);
      }
    } else {
      const payload: Record<string, Json> = {
        toolName: options.toolName,
        input: options.input,
        // The explicit flavor (RV1203): both suspension flavors share
        // kind 'approval', and the detached resolver must never guess
        // the payload type from the deadline again, so every new entry
        // names its own flavor. Legacy entries classify by the
        // pre-RV1107 invariant instead (see detachedApprovalFlavor).
        flavor: 'approval',
      };
      if (options.risk !== undefined) {
        payload.risk = options.risk;
      }
      entry = await this.replayer.appendSuspended({
        scope: options.scope,
        key: deriveContentKey(identity),
        kind: 'approval',
        spanId: options.spanId,
        value: payload,
        ...(options.deadlineAt === undefined ? {} : { deadlineAt: options.deadlineAt }),
      });
    }

    this.requireParsableDeadline(entry, 'approval');

    return new Promise<ApprovalDecision>((resolve) => {
      const resumeActivity = this.suspendActivity();
      const waiter: Waiter = {
        kind: 'approval',
        key: ExternalRegistry.approvalKey(entry.seq),
        scope: options.scope,
        entryRef: entry.seq,
        prompt: `approve tool '${options.toolName}'`,
        resolve: (value) => {
          resumeActivity();
          resolve(toApprovalDecision(value, entry.seq));
        },
      };
      // The journaled deadline arms here, live or re-parked alike: the
      // timer re-arms FROM THE ENTRY on resume, sliced against the Node
      // timer ceiling, and the timeout is a deny THROUGH the arbiter,
      // so a racing live decision and the timeout never both apply
      // (RV1107; the flavor B machinery, one suspension kind over).
      if (entry.deadlineAt !== undefined) {
        // requireParsableDeadline validated the parse before parking.
        const dueAt = Date.parse(entry.deadlineAt);
        waiter.timer = setLongTimeout(
          () => {
            void this.submitResolution(entry.seq, {
              by: 'timeout',
              value: {
                decision: 'deny',
                reason: `the approval deadline ${entry.deadlineAt ?? ''} crossed; denied by timeout`,
              },
            }).catch(() => undefined);
          },
          dueAt,
          this.now,
        );
      }
      this.waiters.set(entry.seq, waiter);
      // Notified AFTER registration so a listener may resolve
      // synchronously from the approval:pending event.
      options.onPending?.(entry, replayed);
      this.scheduleQuiesceCheck();
    });
  }

  /**
   * Flavor B escalation suspension (M3-T07): the
   * escalate tool suspends the agent on the SAME machinery as approvals
   * (kind 'approval', toolName 'escalate') with a journaled deadlineAt so
   * deadlines survive resume; the resolution VALUE is the raw
   * EscalationDecision. A timeout is expressed as a resolution by
   * 'timeout' through the arbiter; first-closing-wins guarantees the
   * defaultDecision and a racing live decision never both apply.
   */
  async awaitDecision(options: {
    scope: string;
    spanId: string;
    toolName: string;
    input: Json;
    deadlineAt: string;
    /**
     * The branch/run signal: an abort while parked releases the held
     * activity, removes the waiter, and rejects with
     * EscalationDecisionAbortedError (v1.35.0 review P1). The suspension
     * entry stays open for resume.
     */
    signal?: AbortSignal;
    onPending?: (entry: JournalEntry, replayed: boolean) => void;
  }): Promise<{ value: Json; entryRef: number }> {
    const identity = {
      kind: 'approval',
      toolName: options.toolName,
      input: options.input,
    } as const;
    let entry: JournalEntry;
    let replayed = false;
    const matched = this.replayer.match(options.scope, identity, 'scoped');
    if (matched.kind === 'skip' && matched.running.status === 'suspended') {
      entry = matched.running;
      replayed = true;
      const state = this.replayer.suspensionState(entry.seq);
      if (state.state === 'resolved') {
        // Not re-suspended: the closing resolution replays (DEF-1).
        return { value: state.value, entryRef: entry.seq };
      }
      if (state.state === 'abandoned') {
        return new Promise<never>(() => undefined);
      }
    } else {
      entry = await this.replayer.appendSuspended({
        scope: options.scope,
        key: deriveContentKey(identity),
        kind: 'approval',
        spanId: options.spanId,
        // No flavor marker here, deliberately (RV1203): the escalation
        // shape IS its identity (a required deadline plus the hardcoded
        // toolName 'escalate'), an explicit marker would add no
        // classification power, and the M7/M9 gating cassettes freeze
        // these exact payload bytes.
        value: { toolName: options.toolName, input: options.input },
        deadlineAt: options.deadlineAt,
      });
    }
    this.requireParsableDeadline(entry, 'escalation');
    return new Promise<{ value: Json; entryRef: number }>((resolve, reject) => {
      const signal = options.signal;
      const abortError = (): EscalationDecisionAbortedError => {
        const reason = signal?.reason as unknown;
        const detail =
          reason instanceof Error
            ? reason.message
            : typeof reason === 'string'
              ? reason
              : 'aborted';
        return new EscalationDecisionAbortedError(
          `flavor B escalation decision wait aborted (entry ${String(entry.seq)}): ${detail}`,
          entry.seq,
        );
      };
      if (signal?.aborted === true) {
        // Pre-aborted: never park. The suspension entry stays open, so
        // a resume parks the decision again under its journaled deadline.
        reject(abortError());
        return;
      }
      // A flavor B park HOLDS activity: the armed deadline timer makes
      // the run self-resolving, so it must not settle 'suspended' under
      // the decision (long-deadline wake semantics are the PlanRunner's,
      // M7). Approvals differ: they park with activity released.
      const exitActivity = this.enter();
      let settled = false;
      let detachAbort: (() => void) | undefined;
      /** Exactly one terminal: activity exits once, the listener detaches once. */
      const settle = (): boolean => {
        if (settled) {
          return false;
        }
        settled = true;
        exitActivity();
        detachAbort?.();
        return true;
      };
      const onAbort = (): void => {
        if (!settle()) {
          return;
        }
        this.waiters.delete(entry.seq);
        // A closed registry suppresses the wake exactly like a late
        // resolution: the closed segment must never execute again.
        if (!this.closedFlag) {
          reject(abortError());
        }
      };
      const waiter: Waiter = {
        kind: 'decision',
        key: ExternalRegistry.approvalKey(entry.seq),
        scope: options.scope,
        entryRef: entry.seq,
        prompt: `decide escalation of '${options.toolName}'`,
        resolve: (value) => {
          if (!settle()) {
            return;
          }
          resolve({ value, entryRef: entry.seq });
        },
      };
      this.waiters.set(entry.seq, waiter);
      if (signal !== undefined) {
        signal.addEventListener('abort', onAbort, { once: true });
        detachAbort = (): void => {
          signal.removeEventListener('abort', onAbort);
        };
      }
      options.onPending?.(entry, replayed);
    });
  }

  /**
   * A journaled deadline that does not parse is corruption: the old
   * `Date.parse(...) || now` fallback silently turned a mangled byte
   * into an immediate timeout (an instant deny for an approval, an
   * instant default decision for an escalation), so both flavors
   * refuse typed BEFORE parking or arming anything (RV1204). Fresh
   * appends always carry the ISO the engine itself computed; the
   * corrupt vector is a replayed entry served by a store.
   */
  private requireParsableDeadline(entry: JournalEntry, what: string): void {
    if (entry.deadlineAt !== undefined && Number.isNaN(Date.parse(entry.deadlineAt))) {
      throw new ConfigError(
        `${what} deadline ${JSON.stringify(entry.deadlineAt)} on suspended entry ` +
          `${String(entry.seq)} does not parse as a date; the journal bytes are corrupt`,
      );
    }
  }

  /**
   * Submits a resolution attempt for a parked suspension and, when it
   * wins the first-closing-wins fold, settles the in-process waiter with
   * the value (timers and engine-side deciders use this; operator
   * resolutions ride resolveExternal).
   */
  async submitResolution(
    entryRef: number,
    attempt: Parameters<Replayer['resolveSuspended']>[1],
  ): Promise<ResolutionOutcome> {
    const outcome = await this.replayer.resolveSuspended(entryRef, attempt);
    this.emitResolutionOutcome(entryRef, attempt.by, outcome);
    if (outcome.applied) {
      const waiter = this.waiters.get(entryRef);
      if (waiter !== undefined) {
        // An applied resolution retires the deadline; cancelling the
        // firing timer itself is a no-op (RV1107).
        waiter.timer?.cancel();
        this.waiters.delete(entryRef);
        // A settle that closed the registry while this attempt was in
        // flight keeps the durable append and suppresses the wake: the
        // closed segment must never execute again.
        if (!this.closedFlag) {
          waiter.resolve(attempt.value);
          return { ...outcome, woke: true };
        }
      }
    }
    return outcome;
  }

  /**
   * RunHandle.resolveExternal: the live path validates BEFORE append and
   * throws InvalidResolutionError without journaling; a winning attempt
   * settles the waiting promise in place. Without an open waiter the
   * attempt goes through the journal fold instead: a repeated resolution
   * is the documented journaled no-op ('already_resolved'), and once the
   * segment settled the resolution appends durably WITHOUT waking the
   * closed body (exactly one engine.resume owns the continuation).
   */
  async resolveExternal(key: string, value: Json): Promise<ResolutionOutcome> {
    const waiter = [...this.waiters.values()].find((candidate) => candidate.key === key);
    if (waiter === undefined) {
      return this.resolveDetached(key, value);
    }
    await this.validatePayload(waiter.kind, key, value, waiter.schemaSpec);
    const outcome = await this.replayer.resolveSuspended(waiter.entryRef, {
      by: 'external',
      value,
    });
    this.emitResolutionOutcome(waiter.entryRef, 'external', outcome);
    if (outcome.applied) {
      // The live decision won: the deadline timer must never journal a
      // losing timeout attempt afterwards (RV1107).
      waiter.timer?.cancel();
      this.waiters.delete(waiter.entryRef);
      // The wake guard: a settle that closed the registry while this
      // attempt was in flight keeps the durable append and never
      // continues the closed body.
      if (!this.closedFlag) {
        waiter.resolve(value);
        return { ...outcome, woke: true };
      }
    }
    return outcome;
  }

  /** The shared live-path payload validation (throws, journals nothing). */
  private async validatePayload(
    kind: Waiter['kind'],
    key: string,
    value: Json,
    schemaSpec?: SchemaSpec,
  ): Promise<void> {
    await validatePayloadArms(kind, key, value, schemaSpec);
  }

  /**
   * Resolution without a live waiter, over the journal fold. Three cases:
   * a key no suspension ever carried throws InvalidResolutionError; a key
   * whose suspensions are all closed submits through the arbiter and
   * returns the journaled no-op ('already_resolved' or
   * 'target_abandoned', durability.md contract); an OPEN suspension is
   * resolvable this way only once the segment settled (closed registry),
   * with the exact live-path validation and no wake.
   */
  /**
   * Revokes a tool approval (RV4008). A still-open approval is denied
   * through the ordinary first-closing-wins arbitration (a race with
   * a live allow stays deterministic by the journal). A RECORDED
   * allow cannot be unwritten (history is immutable): the revocation
   * appends an `approval_revoked` decision that beats the allow at
   * the consumption recheck, so an allow granted, crashed over, and
   * revoked never dispatches its tool on resume. A denied or
   * abandoned approval has nothing to revoke.
   */
  async revokeApproval(
    key: string,
    options: { principal: string; reason: string },
  ): Promise<ApprovalRevocationOutcome> {
    if (typeof options.principal !== 'string' || options.principal.length === 0) {
      throw new InvalidResolutionError('revokeApproval principal must be a non empty string');
    }
    if (typeof options.reason !== 'string' || options.reason.length === 0) {
      throw new InvalidResolutionError('revokeApproval reason must be a non empty string');
    }
    const candidates = this.replayer
      .snapshot()
      .filter(
        (entry) => ExternalRegistry.suspensionKeyOf(entry) === key && entry.kind === 'approval',
      );
    const target = candidates[candidates.length - 1];
    if (target === undefined) {
      throw new InvalidResolutionError(`no approval suspension with key '${key}' in this run`);
    }
    const state = this.replayer.suspensionState(target.seq);
    if (state.state === 'suspended') {
      await this.resolveExternal(key, {
        decision: 'deny',
        reason: `revoked by ${options.principal}: ${options.reason}`,
      });
      return { state: 'denied-pending', entryRef: target.seq };
    }
    if (
      state.state === 'resolved' &&
      (state.value as { decision?: unknown } | null)?.decision === 'allow'
    ) {
      const existing = this.replayer
        .snapshot()
        .some(
          (entry) =>
            entry.kind === 'decision' &&
            (entry.value as { decisionType?: unknown; targetRef?: unknown } | undefined)
              ?.decisionType === 'approval_revoked' &&
            (entry.value as { targetRef?: unknown }).targetRef === target.seq,
        );
      if (existing) {
        return { state: 'already-revoked', entryRef: target.seq };
      }
      await this.replayer.appendSinglePhase({
        scope: target.scope,
        key: `approval-revoked:${String(target.seq)}`,
        kind: 'decision',
        status: 'ok',
        spanId: target.spanId ?? '',
        site: 'approval-revocation',
        value: {
          decisionType: 'approval_revoked',
          targetRef: target.seq,
          principal: options.principal,
          reason: options.reason,
        },
      });
      return { state: 'revoked-allow', entryRef: target.seq };
    }
    return { state: 'already-closed', entryRef: target.seq };
  }

  private async resolveDetached(key: string, value: Json): Promise<ResolutionOutcome> {
    const candidates = this.replayer
      .snapshot()
      .filter((entry) => ExternalRegistry.suspensionKeyOf(entry) === key);
    const open = candidates.find(
      (entry) => this.replayer.suspensionState(entry.seq).state === 'suspended',
    );
    if (open === undefined && candidates.length === 0) {
      throw new InvalidResolutionError(
        `no open awaitExternal suspension with key '${key}' in this run`,
      );
    }
    if (open !== undefined && !this.closedFlag) {
      // A live segment resolves open suspensions through their waiters;
      // an open entry without one is the pre-registration instant of
      // awaitExternal. Historical behavior preserved.
      throw new InvalidResolutionError(
        `no open awaitExternal suspension with key '${key}' in this run`,
      );
    }
    const target = open ?? candidates[candidates.length - 1];
    await validateDetachedResolution(target, key, value);
    const outcome = await this.replayer.resolveSuspended(target.seq, {
      by: 'external',
      value,
    });
    this.emitResolutionOutcome(target.seq, 'external', outcome);
    return outcome;
  }
}
