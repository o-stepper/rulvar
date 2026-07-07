/**
 * Scoped forward-matching (M2-T03): per-scope cursors with insertion
 * stability (a miss neither advances the cursor nor extinguishes future
 * hits; inserting one call costs exactly one live call; no global
 * prefix-flip), per-call replay modes scoped/cache/never, and the orphan
 * report. Ref-entries (resolution/abandon) are excluded from cursors and
 * found by fold over ref (docs/03, sections 7 and 8.2).
 *
 * The interim disposition here is the round-1 rule (ok replays; error,
 * limit, cancelled, and dangling running rerun); the full DEF-1 table
 * with the three amendments plugs in through the `disposition` hook in
 * M2-T05/T06. Multi-version keying plugs in through the KeyRing.
 */
import type { IdentityInput } from './identity.js';
import { deriveContentKey } from './identity.js';
import { CURRENT_HASH_VERSION, type JournalEntry } from '../l0/entries.js';

/** Kinds excluded from forward-matching cursors (docs/03, section 8.2). */
const REF_ENTRY_KINDS = new Set(['resolution', 'abandon']);

/** One logical journaled operation: its dispatch entry plus its terminal, when present. */
export interface JournalOperation {
  running: JournalEntry;
  terminal?: JournalEntry;
}

/**
 * Versioned key derivation for matching: the live call is compared
 * against every unconsumed entry with the key computed UNDER THAT ENTRY'S
 * VERSION; 'incomparable' is a guaranteed non-match (docs/03, section
 * 4.4). M2-T05 supplies the real registry; the default ring knows only
 * the current version.
 */
/** A derived key, or the guaranteed non-match marker. */
export type DerivedKey = { key: string } | 'incomparable';

export interface KeyRing {
  keyFor(identity: IdentityInput, hashVersion: number): DerivedKey;
}

export function currentOnlyKeyRing(): KeyRing {
  return {
    keyFor(identity: IdentityInput, hashVersion: number): DerivedKey {
      return hashVersion === CURRENT_HASH_VERSION
        ? { key: deriveContentKey(identity) }
        : 'incomparable';
    },
  };
}

export type OperationDisposition = 'replay' | 'rerun' | 'skip';

/** The round-1 interim disposition; replaced by replayDisposition (M2-T06). */
export function roundOneDisposition(op: JournalOperation): OperationDisposition {
  const status = op.terminal?.status ?? op.running.status;
  return status === 'ok' ? 'replay' : 'rerun';
}

export type MatchResult =
  | { kind: 'replay'; running: JournalEntry; terminal: JournalEntry }
  | { kind: 'skip'; running: JournalEntry; terminal?: JournalEntry }
  | {
      /** A dangling running entry: redispatch live; the terminal reuses running.seq. */
      kind: 'rerun-dangling';
      running: JournalEntry;
    }
  | {
      /** A terminal non-replayable entry: rerun live as a fresh operation. */
      kind: 'rerun';
      running: JournalEntry;
    }
  | { kind: 'live' };

export interface ResumeReport {
  hits: number;
  misses: number;
  skipped: number;
  reruns: number;
  /** Journaled operations never consumed by any live call (deleted calls). */
  orphaned: number[];
}

/**
 * The matching engine over a loaded journal. Consumption is per logical
 * operation (running/terminal pairs count once); candidates are consumed
 * in journal order, first unconsumed match wins (this also resolves
 * cross-version double matches deterministically).
 */
export class JournalMatcher {
  private readonly byScope = new Map<string, JournalOperation[]>();
  private readonly all: JournalOperation[] = [];
  private readonly consumed = new Set<number>();
  private readonly keyRing: KeyRing;
  private disposition: (op: JournalOperation) => OperationDisposition;
  private readonly keyCache = new Map<IdentityInput, Map<number, DerivedKey>>();
  private hitsInternal = 0;
  private missesInternal = 0;
  private skippedInternal = 0;
  private rerunsInternal = 0;

  constructor(
    entries: readonly JournalEntry[],
    options?: {
      keyRing?: KeyRing;
      disposition?: (op: JournalOperation) => OperationDisposition;
    },
  ) {
    this.keyRing = options?.keyRing ?? currentOnlyKeyRing();
    this.disposition = options?.disposition ?? roundOneDisposition;

    const terminalsByRef = new Map<number, JournalEntry>();
    for (const entry of entries) {
      if (REF_ENTRY_KINDS.has(entry.kind)) {
        continue;
      }
      if (entry.ref !== undefined) {
        terminalsByRef.set(entry.ref, entry);
      }
    }
    for (const entry of entries) {
      if (REF_ENTRY_KINDS.has(entry.kind) || entry.ref !== undefined) {
        continue;
      }
      const op: JournalOperation = { running: entry };
      const terminal = terminalsByRef.get(entry.seq);
      if (terminal !== undefined) {
        op.terminal = terminal;
      }
      this.all.push(op);
      const list = this.byScope.get(entry.scope) ?? [];
      list.push(op);
      this.byScope.set(entry.scope, list);
    }
  }

  /** M2-T06 swaps in the full DEF-1 predicate after folds are built. */
  setDisposition(disposition: (op: JournalOperation) => OperationDisposition): void {
    this.disposition = disposition;
  }

  private keyOf(identity: IdentityInput, hashVersion: number): DerivedKey {
    // Keys are memoized per (call, version): matching a mixed-version
    // journal costs one cheap hash per version present (docs/03, 1.5).
    let perVersion = this.keyCache.get(identity);
    if (perVersion === undefined) {
      perVersion = new Map();
      this.keyCache.set(identity, perVersion);
    }
    const cached = perVersion.get(hashVersion);
    if (cached !== undefined) {
      return cached;
    }
    const key = this.keyRing.keyFor(identity, hashVersion);
    perVersion.set(hashVersion, key);
    return key;
  }

  /**
   * Forward-matches one live call. A miss does not advance any cursor and
   * does not extinguish future hits: the scan always starts at the scope
   * head and skips consumed operations, so insertion stability holds by
   * construction (docs/03, section 7.1).
   */
  match(scope: string, identity: IdentityInput, mode: 'scoped' | 'cache' | 'never'): MatchResult {
    if (mode === 'never') {
      this.missesInternal += 1;
      return { kind: 'live' };
    }
    const candidates = mode === 'cache' ? this.all : (this.byScope.get(scope) ?? []);
    for (const op of candidates) {
      if (this.consumed.has(op.running.seq)) {
        continue;
      }
      const derived = this.keyOf(identity, op.running.hashVersion);
      if (derived === 'incomparable' || derived.key !== op.running.key) {
        continue;
      }
      this.consumed.add(op.running.seq);
      if (op.terminal === undefined) {
        if (op.running.status === 'suspended') {
          // Suspended entries are outside the disposition table; the
          // DEF-4 fold consumes them (M2-T07). Treated as replayable
          // operations by the external/approval paths.
          this.hitsInternal += 1;
          return { kind: 'skip', running: op.running };
        }
        if (op.running.status === 'running') {
          // Dangling two-phase dispatch: redispatch, at-least-once
          // (docs/03, section 13.1).
          this.rerunsInternal += 1;
          return { kind: 'rerun-dangling', running: op.running };
        }
        // Single-phase kinds (rand, decisions, facts) are complete in one
        // entry: the entry is its own terminal.
        const single = this.disposition({ running: op.running, terminal: op.running });
        if (single === 'replay') {
          this.hitsInternal += 1;
          return { kind: 'replay', running: op.running, terminal: op.running };
        }
        if (single === 'skip') {
          this.skippedInternal += 1;
          return { kind: 'skip', running: op.running, terminal: op.running };
        }
        this.rerunsInternal += 1;
        return { kind: 'rerun', running: op.running };
      }
      const disposition = this.disposition(op);
      if (disposition === 'replay') {
        this.hitsInternal += 1;
        return { kind: 'replay', running: op.running, terminal: op.terminal };
      }
      if (disposition === 'skip') {
        this.skippedInternal += 1;
        return { kind: 'skip', running: op.running, terminal: op.terminal };
      }
      this.rerunsInternal += 1;
      return { kind: 'rerun', running: op.running };
    }
    this.missesInternal += 1;
    return { kind: 'live' };
  }

  /** Marks an operation consumed without matching (fold-driven paths). */
  consume(runningSeq: number): void {
    this.consumed.add(runningSeq);
  }

  report(): ResumeReport {
    return {
      hits: this.hitsInternal,
      misses: this.missesInternal,
      skipped: this.skippedInternal,
      reruns: this.rerunsInternal,
      orphaned: this.all
        .filter((op) => !this.consumed.has(op.running.seq))
        .map((op) => op.running.seq),
    };
  }
}
