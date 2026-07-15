/**
 * Scoped forward-matching (M2-T03): per-scope cursors with insertion
 * stability (a miss neither advances the cursor nor extinguishes future
 * hits; inserting one call costs exactly one live call; no global
 * prefix-flip), per-call replay modes scoped/cache/never, and the orphan
 * report. Ref-entries (resolution/abandon) are excluded from cursors and
 * found by fold over ref.
 *
 * The interim disposition here is the round-1 rule (ok replays; error,
 * limit, cancelled, and dangling running rerun); the full DEF-1 table
 * with the three amendments plugs in through the `disposition` hook in
 * M2-T05/T06. Multi-version keying plugs in through the KeyRing.
 */
import type { IdentityInput } from './identity.js';
import { deriveContentKey } from './identity.js';
import { CURRENT_HASH_VERSION, type JournalEntry } from '../l0/entries.js';

/** Kinds excluded from forward-matching cursors. */
const REF_ENTRY_KINDS = new Set(['resolution', 'abandon']);

/** One logical journaled operation: its dispatch entry plus its terminal, when present. */
export interface JournalOperation {
  running: JournalEntry;
  terminal?: JournalEntry;
}

/**
 * Versioned key derivation for matching: the live call is compared
 * against every unconsumed entry with the key computed UNDER THAT ENTRY'S
 * VERSION; 'incomparable' is a guaranteed non-match.
 * M2-T05 supplies the real registry; the default ring knows only
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
  /**
   * Effect roots that genuinely need recovery under the entry-type
   * pairing rules: dangling dispatches (status 'running' with no
   * terminal) and suspensions with no resolution, neither consumed by a
   * live call nor covered by abandon. Complete operations are NEVER
   * listed: settled roots, single-entry kinds (decisions, facts, plan
   * and termination entries), and resolved suspensions are whole by
   * construction. A call deleted from the code is silently skipped and
   * never re-paid; it appears here only while its effect is dangling.
   */
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
  /** Suspension seqs holding at least one resolution ref-entry. */
  private readonly resolvedRefs = new Set<number>();
  private readonly keyRing: KeyRing;
  private disposition: (op: JournalOperation) => OperationDisposition;
  private aliasDisposition?: (op: JournalOperation) => OperationDisposition;
  /** Scope-prefix aliases (DEF-5): donor prefix -> target prefix. */
  private readonly aliases: Array<{ donorPrefix: string; targetPrefix: string }> = [];
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
        if (entry.kind === 'resolution' && entry.ref !== undefined) {
          this.resolvedRefs.add(entry.ref);
        }
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

  /**
   * The disposition applied to alias-sourced candidates (DEF-5): the
   * skipped overlay from abandon is bypassed ONLY through the
   * alias, so entries regain their pre-abandon terminal status for
   * matching in the NEW scope; the standalone old scope stays skipped.
   */
  setAliasDisposition(disposition: (op: JournalOperation) => OperationDisposition): void {
    this.aliasDisposition = disposition;
  }

  /**
   * Registers a scope-prefix rewrite (node.link, DEF-5): donorPrefix maps
   * to targetPrefix for forward-matching purposes; the per-scope cursors
   * work unchanged at every nested level, so partial subtree reuse falls
   * out for free at any depth.
   */
  registerAlias(donorPrefix: string, targetPrefix: string): void {
    if (
      this.aliases.some(
        (alias) => alias.donorPrefix === donorPrefix && alias.targetPrefix === targetPrefix,
      )
    ) {
      return;
    }
    this.aliases.push({ donorPrefix, targetPrefix });
  }

  /** Candidates for one scope: native ops plus alias-mapped donor ops. */
  private candidatesOf(scope: string): Array<{ op: JournalOperation; viaAlias: boolean }> {
    const native = (this.byScope.get(scope) ?? []).map((op) => ({ op, viaAlias: false }));
    const aliased: Array<{ op: JournalOperation; viaAlias: boolean }> = [];
    for (const alias of this.aliases) {
      let donorScope: string | undefined;
      if (scope === alias.targetPrefix) {
        donorScope = alias.donorPrefix;
      } else if (scope.startsWith(`${alias.targetPrefix}/`)) {
        donorScope = alias.donorPrefix + scope.slice(alias.targetPrefix.length);
      }
      if (donorScope === undefined) {
        continue;
      }
      for (const op of this.byScope.get(donorScope) ?? []) {
        aliased.push({ op, viaAlias: true });
      }
    }
    if (aliased.length === 0) {
      return native;
    }
    // Journal order across both sources (donor entries are older).
    return [...native, ...aliased].sort((a, b) => a.op.running.seq - b.op.running.seq);
  }

  private keyOf(identity: IdentityInput, hashVersion: number): DerivedKey {
    // Keys are memoized per (call, version): matching a mixed-version
    // journal costs one cheap hash per version present.
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
   * construction.
   */
  match(scope: string, identity: IdentityInput, mode: 'scoped' | 'cache' | 'never'): MatchResult {
    if (mode === 'never') {
      this.missesInternal += 1;
      return { kind: 'live' };
    }
    const candidates =
      mode === 'cache' ? this.all.map((op) => ({ op, viaAlias: false })) : this.candidatesOf(scope);
    for (const { op, viaAlias } of candidates) {
      if (this.consumed.has(op.running.seq)) {
        continue;
      }
      const derived = this.keyOf(identity, op.running.hashVersion);
      if (derived === 'incomparable' || derived.key !== op.running.key) {
        continue;
      }
      const dispositionOf =
        viaAlias && this.aliasDisposition !== undefined ? this.aliasDisposition : this.disposition;
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
          if (dispositionOf({ running: op.running }) === 'skip') {
            // Abandon is stronger than any status, including a hanging
            // running entry: covered dispatches derive skipped instead of
            // redispatching (DEF-1).
            this.skippedInternal += 1;
            return { kind: 'skip', running: op.running };
          }
          // Dangling two-phase dispatch: redispatch, at-least-once.
          // Through an alias this IS the graft
          // frontier: the donor's interrupted turn repays live, bounded
          // by one turn.
          this.rerunsInternal += 1;
          return { kind: 'rerun-dangling', running: op.running };
        }
        // Single-phase kinds (rand, decisions, facts) are complete in one
        // entry: the entry is its own terminal.
        const single = dispositionOf({ running: op.running, terminal: op.running });
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
      const disposition = dispositionOf(op);
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
      // The pairing rules, per entry shape: an operation with a terminal
      // is whole; a single-entry kind is its own terminal; a suspension
      // pairs with any resolution ref (validity problems surface in
      // invalidResolutions, not here). Only a dangling dispatch or an
      // unresolved suspension that no live call consumed needs recovery.
      orphaned: this.all
        .filter((op) => {
          if (this.consumed.has(op.running.seq) || op.terminal !== undefined) {
            return false;
          }
          if (op.running.status === 'running') {
            return true;
          }
          if (op.running.status === 'suspended') {
            return !this.resolvedRefs.has(op.running.seq);
          }
          return false;
        })
        .map((op) => op.running.seq),
    };
  }
}
