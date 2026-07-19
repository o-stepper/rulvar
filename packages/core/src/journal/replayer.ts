/**
 * The journal kernel write path (M1-T04): two-phase entries, ordinal
 * assignment, the per-run serialized append queue with the JSON
 * serializability check, and the budget-ledger fold. Scoped
 * forward-matching and the replay predicate land with resume in M2;
 * in M1 every lookup is live.
 *
 * Full contract: https://docs.rulvar.com/guide/journal; architecture
 * overview: https://docs.rulvar.com/guide/architecture.
 */
import { ConfigError, JournalMissError } from '../l0/errors.js';
import { realNow } from '../l0/real-clock.js';
import type { WireError } from '../l0/errors.js';
import {
  CURRENT_HASH_VERSION,
  priceEntryUsage,
  type CostAttributionFacts,
  type EntryKind,
  type EntryStatus,
  type JournalEntry,
  type UsageSlice,
} from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { JournalStore, Lease } from '../l0/spi/store.js';
import { toJournalValue } from './serializable.js';
import { validateEntryShape } from './kinds.js';
import {
  ResolutionArbiter,
  ResolutionFold,
  type AbandonAttempt,
  type ResolutionAttempt,
  type ResolutionOutcome,
  type SuspensionState,
} from './resolution.js';
import type { AbandonPayload, ResolutionPayload } from '../l0/entries.js';
import {
  JournalMatcher,
  type JournalOperation,
  type KeyRing,
  type MatchResult,
  type OperationDisposition,
  type ResumeReport,
} from './matching.js';
import type { IdentityInput } from './identity.js';

export type ReplayMode = 'scoped' | 'cache' | 'never';

/**
 * The ordinal-space map key: one composite per (scope, hashVersion, key).
 * `U+0000` separators built from escape sequences (never literal control
 * bytes in source), because scopes and keys are free-form strings and a
 * printable separator could alias two different pairs. Prior seeding and
 * mint() MUST both go through this helper: v1.22.0 shipped with two
 * hand-built variants whose separators differed (an invisible literal
 * NUL against a space), so resume seeding filled a bucket mint() never
 * read and every identical live operation after a resume re-minted
 * ordinal 0, duplicating the identity triple (v1.22.0 review P1-1).
 */
function ordinalMapKey(scope: string, hashVersion: number, key: string): string {
  return `${scope}\u0000${String(hashVersion)}\u0000${key}`;
}

/** Large-value soft warn threshold (committed for M2). */
export const LARGE_VALUE_WARN_BYTES = 262_144;

export interface Ledger {
  usage: Usage;
  usd: number;
  agentsSpawned: number;
}

/** Fields common to every append through the kernel. */
interface BaseAppend {
  scope: string;
  key: string;
  kind: EntryKind;
  spanId: string;
  /** Call-site label used in NonSerializableValueError messages. */
  site?: string;
}

export interface SinglePhaseAppend extends BaseAppend {
  status: 'ok';
  value?: unknown;
  usage?: Usage;
  servedBy?: ModelRef;
}

export interface SuspendedAppend extends BaseAppend {
  deadlineAt?: string;
  value?: unknown;
}

export interface TerminalPatch {
  status: Exclude<EntryStatus, 'running' | 'suspended'>;
  value?: unknown;
  error?: WireError;
  usage?: Usage;
  usageApprox?: boolean;
  servedBy?: ModelRef;
  /** Set only when the call spanned several serving models; see JournalEntry. */
  usageByModel?: UsageSlice[];
  /** Attribution facts behind the CostReport breakdowns; see JournalEntry. */
  costAttribution?: CostAttributionFacts;
  /** The serving adapter's usage-semantics version; see JournalEntry. */
  usageSemantics?: string;
  transcriptRef?: string;
  checkpointRef?: string;
  /** Terminal agent entries: Artifact list. */
  artifacts?: unknown;
  /** Terminal escalated entries: the validated EscalationReport. */
  escalation?: unknown;
  /**
   * Engine-decided terminal abort classes (the no-progress abort) stamp
   * memoizeOutcome on the TERMINAL entry so the frozen memoize rules
   * replay them on every resume; the running entry keeps the user's
   * policy verbatim (M3 amendment).
   */
  memoizeOutcome?: boolean;
  site?: string;
}

/**
 * Per-run journal kernel front end. Everything is per instance: no module
 * state anywhere.
 */
export class Replayer {
  private readonly runId: string;
  private readonly store: JournalStore;
  private readonly lease?: Lease;
  private readonly now: () => number;
  private readonly priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
  private readonly onWarn?: (msg: string) => void;
  private readonly largeValueWarnBytes: number;
  private readonly entries: JournalEntry[] = [];
  private readonly ordinals = new Map<string, number>();
  private readonly matcher: JournalMatcher;
  private readonly foldInternal: ResolutionFold;
  private readonly arbiter: ResolutionArbiter;
  private readonly strict: boolean;
  private readonly invalidated = new Set<number>();
  private queue: Promise<unknown> = Promise.resolve();
  private seq = 0;

  constructor(options: {
    runId: string;
    store: JournalStore;
    now?: () => number;
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
    /** Receives large-value soft warnings (never an error). */
    onWarn?: (msg: string) => void;
    largeValueWarnBytes?: number;
    /** The loaded, normalized prior journal (resume). */
    priorEntries?: readonly JournalEntry[];
    keyRing?: KeyRing;
    disposition?: (op: JournalOperation) => OperationDisposition;
    /** Replay-strict: any live-class match throws JournalMissError. */
    strict?: boolean;
    /**
     * Queue mode: every append carries this lease so a stale holder's
     * writes are rejected by the fencing epoch (M8 entry amendment).
     * Absent means the single-writer precondition
     * is asserted instead of fenced (the embedded default).
     */
    lease?: Lease;
  }) {
    this.runId = options.runId;
    this.store = options.store;
    if (options.lease !== undefined) {
      this.lease = options.lease;
    }
    this.now = options.now ?? realNow;
    if (options.priceUsd !== undefined) {
      this.priceUsd = options.priceUsd;
    }
    if (options.onWarn !== undefined) {
      this.onWarn = options.onWarn;
    }
    this.largeValueWarnBytes = options.largeValueWarnBytes ?? LARGE_VALUE_WARN_BYTES;
    this.strict = options.strict ?? false;

    const priors = options.priorEntries ?? [];
    const matcherOptions: ConstructorParameters<typeof JournalMatcher>[1] = {};
    if (options.keyRing !== undefined) {
      matcherOptions.keyRing = options.keyRing;
    }
    if (options.disposition !== undefined) {
      matcherOptions.disposition = options.disposition;
    }
    this.matcher = new JournalMatcher(priors, matcherOptions);
    this.foldInternal = new ResolutionFold(priors);
    this.arbiter = new ResolutionArbiter(this.foldInternal, {
      appendRefEntry: (input) => this.appendRefEntry(input),
    });
    for (const entry of priors) {
      this.entries.push(entry);
      if (entry.seq >= this.seq) {
        this.seq = entry.seq + 1;
      }
      // Ordinal spaces continue per (scope, hashVersion, key); new appends
      // are always CURRENT_HASH_VERSION.
      if (
        entry.ref === undefined &&
        entry.kind !== 'resolution' &&
        entry.kind !== 'abandon' &&
        entry.hashVersion === CURRENT_HASH_VERSION
      ) {
        const ordinalKey = ordinalMapKey(entry.scope, entry.hashVersion, entry.key);
        // The stored value is the NEXT ordinal to mint: max over the
        // priors of (ordinal + 1), independent of prior order.
        const current = this.ordinals.get(ordinalKey) ?? 0;
        if (entry.ordinal + 1 > current) {
          this.ordinals.set(ordinalKey, entry.ordinal + 1);
        }
      }
    }
  }

  /**
   * Forward-matches one live call against the prior journal. Fresh
   * runs always miss; the M2-T06 predicate is injected
   * through setDisposition once folds are built.
   */
  match(scope: string, identity: IdentityInput, mode: ReplayMode): MatchResult {
    const result = this.matcher.match(scope, identity, mode);
    if (
      this.strict &&
      (result.kind === 'live' || result.kind === 'rerun' || result.kind === 'rerun-dangling')
    ) {
      // Replay-strict: zero live calls or a loud failure at the exact miss.
      throw new JournalMissError(
        `replay-strict miss: a '${identity.kind}' call in scope '${scope || '(root)'}' ` +
          `would go live (${result.kind})`,
        { data: { scope, kind: identity.kind, miss: result.kind } },
      );
    }
    return result;
  }

  setDisposition(disposition: (op: JournalOperation) => OperationDisposition): void {
    this.matcher.setDisposition(disposition);
  }

  /**
   * The disposition for alias-sourced candidates (DEF-5):
   * bypasses the abandon overlay so donor entries regain their
   * pre-abandon terminal status when matched through the alias.
   */
  setAliasDisposition(disposition: (op: JournalOperation) => OperationDisposition): void {
    this.matcher.setAliasDisposition(disposition);
  }

  /**
   * Registers a node.link scope-prefix rewrite (DEF-5):
   * donorPrefix forward-matches into targetPrefix at every nested level.
   * Idempotent; the alias map is rebuilt by fold on resume.
   */
  registerAlias(donorPrefix: string, targetPrefix: string): void {
    this.matcher.registerAlias(donorPrefix, targetPrefix);
  }

  /**
   * invalidate/retry: explicit unpinning of a
   * memoized failure; the invalidated entry reruns on this resume. The
   * safety boundary is an open question.
   */
  invalidate(seq: number): void {
    this.invalidated.add(seq);
  }

  get invalidatedSeqs(): ReadonlySet<number> {
    return this.invalidated;
  }

  resumeReport(): ResumeReport {
    // Entries never consumed by any live call split by the abandon fold:
    // covered operations are derived skipped, never orphaned
    // (abandon-then-crash-then-resume).
    const report = this.matcher.report();
    const abandonFold = this.foldInternal.abandonFold;
    const orphaned: number[] = [];
    let coveredSkipped = 0;
    for (const seq of report.orphaned) {
      if (abandonFold.isAbandoned(seq)) {
        coveredSkipped += 1;
      } else {
        orphaned.push(seq);
      }
    }
    return { ...report, skipped: report.skipped + coveredSkipped, orphaned };
  }

  /** The DEF-4 fold over this run's journal (prior plus live appends). */
  get fold(): ResolutionFold {
    return this.foldInternal;
  }

  /** Ref-entry append used by the ResolutionArbiter; O2-checked by shape validation. */
  appendRefEntry(input: {
    kind: 'resolution' | 'abandon';
    ref: number;
    scope: string;
    spanId: string;
    resolution?: ResolutionPayload;
    abandon?: AbandonPayload;
  }): Promise<JournalEntry> {
    return this.enqueue(() => {
      const entry: JournalEntry = {
        hashVersion: CURRENT_HASH_VERSION,
        seq: this.seq,
        ref: input.ref,
        // The scope duplicates the target's scope for telemetry only;
        // ref-entries never enter cursors.
        scope: input.scope,
        key: '',
        ordinal: 0,
        kind: input.kind,
        status: 'ok',
        spanId: input.spanId,
        startedAt: new Date(this.now()).toISOString(),
        ...(input.resolution === undefined ? {} : { resolution: input.resolution }),
        ...(input.abandon === undefined ? {} : { abandon: input.abandon }),
      };
      this.seq += 1;
      return this.persist(entry);
    });
  }

  /**
   * Submits a resolution attempt through the per-target FIFO arbiter.
   * Losing attempts are journaled noops.
   */
  resolveSuspended(target: number, attempt: ResolutionAttempt): Promise<ResolutionOutcome> {
    const targetEntry = this.entries.find((entry) => entry.seq === target);
    if (targetEntry === undefined || targetEntry.status !== 'suspended') {
      throw new ConfigError(`resolveSuspended: seq ${target} is not a suspended entry`);
    }
    return this.arbiter.submitResolution(target, targetEntry.scope, targetEntry.spanId, attempt);
  }

  abandonBranch(attempt: AbandonAttempt): Promise<ResolutionOutcome> {
    const targetEntry = this.entries.find((entry) => entry.seq === attempt.target);
    if (targetEntry === undefined) {
      throw new ConfigError(`abandonBranch: seq ${attempt.target} does not exist`);
    }
    return this.arbiter.submitAbandon(targetEntry.scope, targetEntry.spanId, attempt);
  }

  /** Pure fold view, snapshot-pinned. */
  suspensionState(target: number): SuspensionState {
    return this.foldInternal.suspensionState(target);
  }

  /**
   * Value size policy:
   * there is NO automatic offload in v1; oversized values warn and
   * proceed. Large artifacts belong in TranscriptStore by reference.
   */
  private warnIfLarge(value: unknown, site: string): void {
    if (value === undefined || this.onWarn === undefined) {
      return;
    }
    const bytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (bytes > this.largeValueWarnBytes) {
      this.onWarn(
        `journal value at ${site} is ${bytes} bytes (soft threshold ` +
          `${this.largeValueWarnBytes}); large artifacts belong in TranscriptStore by reference`,
      );
    }
  }

  /** Single-phase fact entries: rand, decisions, termination facts. */
  appendSinglePhase(input: SinglePhaseAppend): Promise<JournalEntry> {
    const value =
      input.value === undefined
        ? undefined
        : toJournalValue(input.value, input.site ?? `${input.kind} value`);
    this.warnIfLarge(value, input.site ?? `${input.kind} value`);
    return this.enqueue(() => {
      const entry = this.mint(input.scope, input.key, input.kind, 'ok');
      if (value !== undefined) {
        entry.value = value;
      }
      if (input.usage !== undefined) {
        entry.usage = input.usage;
      }
      if (input.servedBy !== undefined) {
        entry.servedBy = input.servedBy;
      }
      entry.spanId = input.spanId;
      entry.endedAt = entry.startedAt;
      return this.persist(entry);
    });
  }

  /**
   * Two-phase dispatch: the running entry (kinds agent, step, child).
   * `value` is legal on child dispatches only: the child payload
   * `{ workflow, childScope }` lets the abandon fold compute the child's
   * transitive scope coverage (M6-T06). Values
   * never enter identity.
   */
  appendRunning(
    input: BaseAppend & { memoizeOutcome?: boolean; value?: unknown },
  ): Promise<JournalEntry> {
    const value =
      input.value === undefined
        ? undefined
        : toJournalValue(input.value, input.site ?? `${input.kind} dispatch payload`);
    return this.enqueue(() => {
      const entry = this.mint(input.scope, input.key, input.kind, 'running');
      entry.spanId = input.spanId;
      if (value !== undefined) {
        entry.value = value;
      }
      if (input.memoizeOutcome !== undefined) {
        entry.memoizeOutcome = input.memoizeOutcome;
      }
      return this.persist(entry);
    });
  }

  /**
   * Two-phase completion: a terminal entry referencing the running entry
   * by ref. Scope, key, ordinal, kind, and hashVersion are inherited from
   * the running entry (running/terminal pairs are always single-version;
   * the pair shares one ordinal because it is one logical operation).
   */
  appendTerminal(runningSeq: number, patch: TerminalPatch): Promise<JournalEntry> {
    const value =
      patch.value === undefined
        ? undefined
        : toJournalValue(patch.value, patch.site ?? 'terminal value');
    this.warnIfLarge(value, patch.site ?? 'terminal value');
    return this.enqueue(() => {
      const running = this.entries.find((e) => e.seq === runningSeq);
      if (running === undefined || running.status !== 'running') {
        throw new ConfigError(
          `appendTerminal: seq ${runningSeq} is not a running entry of run ${this.runId}`,
        );
      }
      const entry: JournalEntry = {
        hashVersion: running.hashVersion,
        seq: this.seq,
        ref: running.seq,
        scope: running.scope,
        key: running.key,
        ordinal: running.ordinal,
        kind: running.kind,
        status: patch.status,
        spanId: running.spanId,
        startedAt: running.startedAt,
        endedAt: new Date(this.now()).toISOString(),
      };
      this.seq += 1;
      if (value !== undefined) {
        entry.value = value;
      }
      if (patch.error !== undefined) {
        entry.error = patch.error;
      }
      if (patch.usage !== undefined) {
        entry.usage = patch.usage;
      }
      if (patch.usageApprox !== undefined) {
        entry.usageApprox = patch.usageApprox;
      }
      if (patch.servedBy !== undefined) {
        entry.servedBy = patch.servedBy;
      }
      if (patch.usageByModel !== undefined) {
        entry.usageByModel = patch.usageByModel;
      }
      if (patch.costAttribution !== undefined) {
        entry.costAttribution = patch.costAttribution;
      }
      if (patch.usageSemantics !== undefined) {
        entry.usageSemantics = patch.usageSemantics;
      }
      if (patch.transcriptRef !== undefined) {
        entry.transcriptRef = patch.transcriptRef;
      }
      if (patch.checkpointRef !== undefined) {
        entry.checkpointRef = patch.checkpointRef;
      }
      if (patch.artifacts !== undefined) {
        entry.artifacts = toJournalValue(patch.artifacts, 'terminal artifacts');
      }
      if (patch.escalation !== undefined) {
        entry.escalation = toJournalValue(patch.escalation, 'escalation report');
      }
      if (patch.memoizeOutcome !== undefined) {
        entry.memoizeOutcome = patch.memoizeOutcome;
      }
      return this.persist(entry);
    });
  }

  /** Suspended kinds (external, approval): appended once, closed by ref-entries (M2). */
  appendSuspended(input: SuspendedAppend): Promise<JournalEntry> {
    const value =
      input.value === undefined
        ? undefined
        : toJournalValue(input.value, input.site ?? `${input.kind} payload`);
    return this.enqueue(() => {
      const entry = this.mint(input.scope, input.key, input.kind, 'suspended');
      entry.spanId = input.spanId;
      if (value !== undefined) {
        entry.value = value;
      }
      if (input.deadlineAt !== undefined) {
        entry.deadlineAt = input.deadlineAt;
      }
      return this.persist(entry);
    });
  }

  /**
   * The budget ledger fold: usage sums over terminal entries exactly once; agentsSpawned
   * counts agent dispatches.
   */
  ledger(): Ledger {
    const usage: Usage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    };
    let reasoning = 0;
    let usd = 0;
    let agentsSpawned = 0;
    const abandonFold = this.foldInternal.abandonFold;
    for (const entry of this.entries) {
      if (
        entry.kind !== 'resolution' &&
        entry.kind !== 'abandon' &&
        abandonFold.isAbandoned(entry.ref ?? entry.seq)
      ) {
        // Derived-skipped operations contribute a zero increment
        // (DEF-1: zero spend inside an abandoned
        // subtree).
        continue;
      }
      if (entry.kind === 'agent' && entry.status === 'running') {
        agentsSpawned += 1;
      }
      if (entry.status === 'running' || entry.usage === undefined) {
        continue;
      }
      usage.inputTokens += entry.usage.inputTokens;
      usage.outputTokens += entry.usage.outputTokens;
      usage.cacheReadTokens += entry.usage.cacheReadTokens;
      usage.cacheWriteTokens += entry.usage.cacheWriteTokens;
      reasoning += entry.usage.reasoningTokens ?? 0;
      // Each serving model's slice priced at its own rate; an entry with
      // no split prices its whole usage at servedBy, as before.
      if (this.priceUsd !== undefined) {
        usd += priceEntryUsage(entry, this.priceUsd).usd;
      }
    }
    if (reasoning > 0) {
      usage.reasoningTokens = reasoning;
    }
    return { usage, usd, agentsSpawned };
  }

  /** Read-only view of the appended entries, in per-run total order. */
  snapshot(): readonly JournalEntry[] {
    return this.entries;
  }

  /**
   * Resolves when every append enqueued so far has persisted. Deterministic
   * shims journal fire-and-forget; the engine awaits this before settling a
   * run.
   */
  async flush(): Promise<void> {
    await this.queue;
  }

  private mint(scope: string, key: string, kind: EntryKind, status: EntryStatus): JournalEntry {
    const ordinalKey = ordinalMapKey(scope, CURRENT_HASH_VERSION, key);
    const ordinal = this.ordinals.get(ordinalKey) ?? 0;
    this.ordinals.set(ordinalKey, ordinal + 1);
    const entry: JournalEntry = {
      hashVersion: CURRENT_HASH_VERSION,
      seq: this.seq,
      scope,
      key,
      ordinal,
      kind,
      status,
      spanId: '',
      startedAt: new Date(this.now()).toISOString(),
    };
    this.seq += 1;
    return entry;
  }

  private async persist(entry: JournalEntry): Promise<JournalEntry> {
    const shapeIssues = validateEntryShape(entry);
    if (shapeIssues.length > 0) {
      throw new ConfigError(
        `journal entry shape violation (kind '${entry.kind}'): ` +
          shapeIssues.map((i) => i.message).join('; '),
      );
    }
    // The single append site: queue-mode fencing rides here: a stale
    // lease makes the store reject and nothing becomes
    // visible.
    await this.store.append(this.runId, entry, this.lease);
    this.entries.push(entry);
    if (entry.status === 'suspended') {
      this.foldInternal.registerSuspended(entry);
    } else if (entry.kind !== 'resolution' && entry.kind !== 'abandon') {
      this.foldInternal.registerEntry(entry);
    }
    return entry;
  }

  private enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
