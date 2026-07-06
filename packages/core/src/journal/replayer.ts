/**
 * The journal kernel write path (M1-T04): two-phase entries, ordinal
 * assignment, the per-run serialized append queue with the JSON
 * serializability check, and the budget-ledger fold. Scoped
 * forward-matching and the replay predicate land with resume in M2
 * (docs/03, sections "Scoped forward-matching" and "Replay predicate");
 * in M1 every lookup is live.
 *
 * Owning spec: docs/03-journal-spec.md, sections "JournalEntry form",
 * "Two-phase entries, dispatch, and the budget ledger"; component sketch
 * in docs/02-architecture.md, section "Journal Kernel".
 */
import { ConfigError } from '../l0/errors.js';
import type { WireError } from '../l0/errors.js';
import {
  CURRENT_HASH_VERSION,
  type EntryKind,
  type EntryStatus,
  type JournalEntry,
} from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import type { JournalStore } from '../l0/spi/store.js';
import { toJournalValue } from './serializable.js';

export type ReplayMode = 'scoped' | 'cache' | 'never';

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
  transcriptRef?: string;
  checkpointRef?: string;
  site?: string;
}

/**
 * Per-run journal kernel front end. Everything is per instance: no module
 * state anywhere (docs/02, section "Dependency rules").
 */
export class Replayer {
  private readonly runId: string;
  private readonly store: JournalStore;
  private readonly now: () => number;
  private readonly priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
  private readonly entries: JournalEntry[] = [];
  private readonly ordinals = new Map<string, number>();
  private queue: Promise<unknown> = Promise.resolve();
  private seq = 0;

  constructor(options: {
    runId: string;
    store: JournalStore;
    now?: () => number;
    priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined;
  }) {
    this.runId = options.runId;
    this.store = options.store;
    this.now = options.now ?? Date.now;
    if (options.priceUsd !== undefined) {
      this.priceUsd = options.priceUsd;
    }
  }

  /**
   * Scoped forward-matching lands with resume in M2; a fresh M1 run has no
   * prior journal, so every lookup is live by construction.
   */
  lookup(_scope: string, _key: string, _ordinal: number, _mode: ReplayMode): JournalEntry | 'live' {
    return 'live';
  }

  /** Single-phase fact entries: rand, decisions, termination facts. */
  appendSinglePhase(input: SinglePhaseAppend): Promise<JournalEntry> {
    const value =
      input.value === undefined
        ? undefined
        : toJournalValue(input.value, input.site ?? `${input.kind} value`);
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

  /** Two-phase dispatch: the running entry (kinds agent, step, child). */
  appendRunning(input: BaseAppend): Promise<JournalEntry> {
    return this.enqueue(() => {
      const entry = this.mint(input.scope, input.key, input.kind, 'running');
      entry.spanId = input.spanId;
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
      if (patch.transcriptRef !== undefined) {
        entry.transcriptRef = patch.transcriptRef;
      }
      if (patch.checkpointRef !== undefined) {
        entry.checkpointRef = patch.checkpointRef;
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
   * The budget ledger fold (docs/03, section "Budget ledger fold on
   * resume"): usage sums over terminal entries exactly once; agentsSpawned
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
    for (const entry of this.entries) {
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
      usd += this.priceUsd?.(entry.servedBy, entry.usage) ?? 0;
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

  private mint(scope: string, key: string, kind: EntryKind, status: EntryStatus): JournalEntry {
    const ordinalKey = `${scope} ${CURRENT_HASH_VERSION} ${key}`;
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
    await this.store.append(this.runId, entry);
    this.entries.push(entry);
    return entry;
  }

  private enqueue<T>(operation: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
