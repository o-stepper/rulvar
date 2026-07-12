/**
 * The canonical replay predicate (M2-T06, DEF-1): one pure function,
 * centralized in the Journal Kernel; no layer above may override or
 * duplicate it. Step 1 folds effective status through the AbandonFold
 * (covered entries derive skipped over ANY terminal status, payload
 * addressable); step 2 applies the per-status table of the ENTRY'S OWN
 * hashVersion profile, carrying the three kernel amendments:
 * memoizeOutcome on task-class failures, abandon-derived skipped, and
 * escalated-replays-as-ok (https://docs.rulvar.com/guide/journal).
 */
import { agentErrorFromWire, type AgentError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { agentScope } from './scope.js';
import type { JournalOperation, OperationDisposition } from './matching.js';
import { deriverV2, type DeriverRegistry, type DispositionRule } from './keyderiver.js';

export type ReplayDisposition = OperationDisposition;

export interface AbandonFold {
  /** Projection of the DEF-4 first-wins fold over kind 'abandon' entries. */
  isAbandoned(ref: number): boolean;
}

export type ErrorClass = 'transport' | 'task';

/**
 * task-class: schema-mismatch, terminal, non-retryable tool. transport,
 * rate-limit, and budget are never memoized.
 */
export function classifyAgentError(e: AgentError): ErrorClass {
  if (e.kind === 'schema-mismatch' || e.kind === 'terminal') {
    return 'task';
  }
  if (e.kind === 'tool' && !e.retryable) {
    return 'task';
  }
  return 'transport';
}

/**
 * The child scope-prefix an abandon over `target` covers transitively.
 * Agent spawns nest under agent:<seq>; a child
 * workflow's subtree runs under the wf:<name>:<ordinal> scope recorded in
 * its dispatch payload (M6-T06). A child entry without the payload
 * (foreign journals) degrades to the agent:<seq> convention, which covers
 * nothing real and keeps the fold total.
 */
export function childCoveragePrefix(target: JournalEntry): string {
  if (target.kind === 'child') {
    const payload = target.value as { childScope?: unknown } | undefined;
    if (payload !== undefined && typeof payload.childScope === 'string') {
      return payload.childScope;
    }
  }
  return agentScope(target.scope, target.seq);
}

/**
 * Builds the AbandonFold in ONE pass at load, in append order, pinned for
 * the entire resume (DEF-1 ordering rule 4). Coverage is the target seq
 * itself plus, transitively, every entry under the target's child
 * scope-prefix. Repeated abandons over an
 * already-covered target fold to noop.
 */
export function buildAbandonFold(entries: readonly JournalEntry[]): AbandonFold {
  const bySeq = new Map<number, JournalEntry>();
  for (const entry of entries) {
    bySeq.set(entry.seq, entry);
  }
  const coveredSeqs = new Set<number>();
  const coveredPrefixes: string[] = [];

  const isCovered = (entry: JournalEntry): boolean => {
    if (coveredSeqs.has(entry.seq)) {
      return true;
    }
    return coveredPrefixes.some(
      (prefix) => entry.scope === prefix || entry.scope.startsWith(`${prefix}/`),
    );
  };

  for (const entry of entries) {
    if (entry.kind !== 'abandon' || entry.ref === undefined) {
      continue;
    }
    const target = bySeq.get(entry.ref);
    if (target === undefined) {
      continue;
    }
    if (isCovered(target)) {
      // First-wins: an abandon inside an already-abandoned subtree or
      // over an already-covered target is a journaled noop.
      continue;
    }
    coveredSeqs.add(target.seq);
    // The child scope-prefix of the target: the scope its children run
    // under (agent:<seq> for agent spawns, the recorded wf: scope for
    // child workflows; M6-T06).
    coveredPrefixes.push(childCoveragePrefix(target));
  }

  return {
    isAbandoned(ref: number): boolean {
      const entry = bySeq.get(ref);
      if (entry === undefined) {
        return false;
      }
      return isCovered(entry);
    },
  };
}

function applyRule(rule: DispositionRule | undefined, op: JournalOperation): ReplayDisposition {
  const terminal = op.terminal ?? op.running;
  switch (rule) {
    case 'replay':
      return 'replay';
    case 'memoize-limit': {
      // limit is always task-class: the model ran to its cap, the work is
      // paid; memoizeOutcome is read from the ENTRY, never current code.
      // The terminal stamp wins: engine-decided abort classes (the
      // no-progress abort, M3-T08) fix the flag on the terminal at abort
      // time, and MUST replay regardless of the user's dispatch-time
      // policy (M3 amendment).
      const memoize = terminal.memoizeOutcome ?? op.running.memoizeOutcome ?? false;
      return memoize ? 'replay' : 'rerun';
    }
    case 'memoize-task-error': {
      const memoize = terminal.memoizeOutcome ?? op.running.memoizeOutcome ?? false;
      if (!memoize || terminal.error === undefined) {
        return 'rerun';
      }
      return classifyAgentError(agentErrorFromWireSafe(terminal)) === 'task' ? 'replay' : 'rerun';
    }
    case 'rerun':
    case undefined:
    default:
      return 'rerun';
  }
}

function agentErrorFromWireSafe(terminal: JournalEntry): AgentError {
  if (terminal.error === undefined) {
    return { kind: 'terminal', retryable: false };
  }
  if (terminal.error.code === 'agent') {
    return agentErrorFromWire(terminal.error);
  }
  // Non-agent wire errors (step failures) classify by retryability.
  return {
    kind: terminal.error.retryable ? 'transport' : 'terminal',
    retryable: terminal.error.retryable,
  };
}

/**
 * The single canonical predicate, dispatched on the entry's own
 * hashVersion (compatibility lemma: on the v1 domain the tables
 * coincide). Suspended entries are outside the table (the DEF-4 fold
 * consumes them); the alias column (DEF-5) activates with node.link
 * producers in M7: a skipped entry WITHOUT an incoming alias is always
 * skipped.
 */
export function replayDisposition(
  entry: JournalEntry,
  fold: AbandonFold,
  options?: {
    registry?: DeriverRegistry;
    terminal?: JournalEntry;
    invalidated?: ReadonlySet<number>;
  },
): ReplayDisposition {
  const op: JournalOperation = { running: entry, terminal: options?.terminal ?? entry };
  // Step 1: the effective-status fold. Abandon is stronger than any
  // terminal status, including ok and escalated.
  if (fold.isAbandoned(entry.seq)) {
    return 'skip';
  }
  if (options?.invalidated?.has(entry.seq) === true) {
    // invalidate/retry: explicit unpinning of a memoized failure; the
    // next resume reruns it (the safety boundary stays an open question).
    return 'rerun';
  }
  const deriver = options?.registry?.get(entry.hashVersion) ?? deriverV2;
  const status = (options?.terminal ?? entry).status as
    'ok' | 'escalated' | 'limit' | 'error' | 'cancelled' | 'running';
  return applyRule(deriver.dispositionTable[status], op);
}

/**
 * Adapts the predicate to the matcher's disposition hook: two-phase
 * operations dispatch on their terminal, single-phase on themselves.
 */
export function dispositionHook(
  fold: AbandonFold,
  registry: DeriverRegistry,
  invalidated?: ReadonlySet<number>,
): (op: JournalOperation) => ReplayDisposition {
  return (op) =>
    replayDisposition(op.running, fold, {
      registry,
      ...(op.terminal === undefined ? {} : { terminal: op.terminal }),
      ...(invalidated === undefined ? {} : { invalidated }),
    });
}
