import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import {
  approachSigCoarse,
  approachSigOf,
  canonicalIsolationTag,
  classifyAttemptOutcome,
  DEFAULT_ESCALATION_LIMITS,
  LEGACY_LTID_PREFIX,
  LEGACY_SIGNATURE_INPUTS,
  LineageIndex,
  normalizeApproachTag,
  validateEscalationLimits,
  type SpawnLineage,
} from './lineage.js';

let seqCounter = 0;
function mkEntry(
  patch: Partial<JournalEntry> & Pick<JournalEntry, 'kind' | 'status'>,
): JournalEntry {
  seqCounter += 1;
  return {
    hashVersion: 2,
    seq: patch.seq ?? seqCounter,
    scope: '',
    key: '',
    ordinal: 0,
    spanId: 's',
    startedAt: '2026-07-09T00:00:00.000Z',
    ...patch,
  };
}

function mkLineage(ltid: string, patch?: Partial<SpawnLineage>): SpawnLineage {
  const coarse = approachSigCoarse(LEGACY_SIGNATURE_INPUTS);
  return {
    logicalTaskId: ltid,
    relation: 'first',
    attemptOrdinal: 0,
    ancestry: [],
    approachSig: approachSigOf(coarse),
    approachSigCoarse: coarse,
    sigVersion: 1,
    approachTag: 'default',
    ...patch,
  };
}

/** The ctx.agent producer shape (M7-T02). */
function mkAdmission(
  ltid: string,
  childScope: string,
  patch?: Partial<SpawnLineage>,
): JournalEntry {
  return mkEntry({
    kind: 'decision',
    status: 'ok',
    value: {
      decisionType: 'spawn-admission',
      origin: 'ctx.agent',
      attemptScope: childScope,
      spawnKey: 'k',
      childScope,
      lineage: mkLineage(ltid, patch) as unknown as Record<string, never>,
    },
  });
}

function mkRoot(childScope: string, key: string): JournalEntry {
  return mkEntry({ kind: 'agent', status: 'running', scope: childScope, key });
}

function mkTerminal(
  root: JournalEntry,
  patch: Partial<JournalEntry> & Pick<JournalEntry, 'status'>,
): JournalEntry {
  return mkEntry({
    kind: 'agent',
    scope: root.scope,
    key: root.key,
    ref: root.seq,
    ...patch,
  });
}

describe('normalizeApproachTag (docs/03, 10.2)', () => {
  it('lowercases, collapses non-alphanumerics, truncates, defaults', () => {
    expect(normalizeApproachTag('Binary Search')).toBe('binary-search');
    expect(normalizeApproachTag('binary_search!!')).toBe('binary-search-');
    expect(normalizeApproachTag('A'.repeat(40))).toBe('a'.repeat(32));
    expect(normalizeApproachTag('')).toBe('default');
    expect(normalizeApproachTag(undefined)).toBe('default');
  });

  it('applies NFC before matching', () => {
    // e plus combining acute composes to a single code point, which is
    // non-ASCII and collapses; both forms canonicalize identically.
    expect(normalizeApproachTag('café')).toBe(normalizeApproachTag('café'));
  });
});

describe('approach signatures (docs/03, 10.2)', () => {
  it('collide for identical coarse inputs and tags regardless of prose', () => {
    const coarse = approachSigCoarse({
      agentType: 'analyst',
      toolsetHash: 't'.repeat(64),
      schemaHash: 's'.repeat(64),
      isolation: 'none',
    });
    // Prompt prose is not an input: the same tag under the same coarse
    // signature is the same approach by construction.
    expect(approachSigOf(coarse, 'Binary Search')).toBe(approachSigOf(coarse, 'binary search'));
    expect(approachSigOf(coarse, 'binary-search')).not.toBe(approachSigOf(coarse, 'regex-scan'));
  });

  it('separates coarse signatures by every identity input', () => {
    const base = {
      agentType: 'a',
      toolsetHash: 't'.repeat(64),
      schemaHash: 's'.repeat(64),
      isolation: 'none',
    };
    const seen = new Set([approachSigCoarse(base)]);
    for (const variant of [
      { ...base, agentType: 'b' },
      { ...base, toolsetHash: 'u'.repeat(64) },
      { ...base, schemaHash: 'v'.repeat(64) },
      { ...base, isolation: 'worktree' },
    ]) {
      const sig = approachSigCoarse(variant);
      expect(seen.has(sig)).toBe(false);
      seen.add(sig);
    }
  });

  it('canonicalizes isolation specs to their identity tags', () => {
    expect(canonicalIsolationTag(undefined)).toBe('none');
    expect(canonicalIsolationTag('readonly')).toBe('readonly');
    expect(canonicalIsolationTag({ kind: 'worktree', ref: 'main' })).toBe('worktree');
  });
});

describe('validateEscalationLimits (XF-10)', () => {
  it('rejects the pre-rename knob with a migration hint', () => {
    expect(() => validateEscalationLimits({ maxEscalationsPerNode: 3 })).toThrow(
      /maxEscalationsPerLogicalTask/,
    );
  });

  it('fills the committed defaults and validates values', () => {
    expect(validateEscalationLimits()).toEqual(DEFAULT_ESCALATION_LIMITS);
    expect(validateEscalationLimits({ maxAttemptsPerLogicalTask: 3 })).toEqual({
      maxEscalationsPerLogicalTask: 2,
      maxAttemptsPerLogicalTask: 3,
    });
    expect(() => validateEscalationLimits({ maxAttemptsPerLogicalTask: -1 })).toThrow(ConfigError);
    expect(() => validateEscalationLimits({ maxEscalationsPerLogicalTask: 1.5 })).toThrow(
      ConfigError,
    );
  });
});

describe('classifyAttemptOutcome', () => {
  const root = mkRoot('w', 'k1');
  it('maps terminal statuses onto the closed outcome classes', () => {
    expect(classifyAttemptOutcome(mkTerminal(root, { status: 'ok' }))).toBe('ok');
    expect(classifyAttemptOutcome(mkTerminal(root, { status: 'escalated' }))).toBe('escalated');
    expect(classifyAttemptOutcome(mkTerminal(root, { status: 'cancelled' }))).toBe('abandoned');
    expect(classifyAttemptOutcome(mkTerminal(root, { status: 'limit' }))).toBe('limit');
    expect(
      classifyAttemptOutcome(
        mkTerminal(root, {
          status: 'limit',
          error: {
            code: 'agent',
            message: 'stuck',
            retryable: false,
            data: { kind: 'terminal', abortClass: 'no-progress' },
          },
        }),
      ),
    ).toBe('no-progress');
    expect(
      classifyAttemptOutcome(
        mkTerminal(root, {
          status: 'error',
          error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'terminal' } },
        }),
      ),
    ).toBe('task-error');
    expect(
      classifyAttemptOutcome(
        mkTerminal(root, {
          status: 'error',
          error: { code: 'agent', message: 'x', retryable: true, data: { kind: 'transport' } },
        }),
      ),
    ).toBe('transient-error');
  });
});

describe('LineageIndex fold (DEF-3)', () => {
  it('counts attempts per LTID and enforces liveness (respawn-preserves-counter shape)', () => {
    const index = new LineageIndex();
    const d1 = mkAdmission('L1', 'work');
    const r1 = mkRoot('work', 'k1');
    index.absorb([d1, r1]);
    expect(index.attemptsUsed('L1')).toBe(1);
    expect(index.hasLiveAttempt('L1')).toBe(true);

    const t1 = mkTerminal(r1, { status: 'escalated', escalation: { kind: 'scope_bigger' } });
    const e1 = mkEntry({
      kind: 'decision',
      status: 'ok',
      value: { decisionType: 'escalation-decision', countsAgainstLimit: true, logicalTaskId: 'L1' },
    });
    index.absorb([t1, e1]);
    expect(index.hasLiveAttempt('L1')).toBe(false);
    expect(index.escalationsUsed('L1')).toBe(1);

    // The respawn is a NEW content key under the SAME LTID.
    const d2 = mkAdmission('L1', 'work', {
      relation: 'respawn',
      attemptOrdinal: 1,
      causeRef: e1.seq,
    });
    const r2 = mkRoot('work', 'k2');
    const t2 = mkTerminal(r2, { status: 'escalated', escalation: { kind: 'scope_bigger' } });
    const e2 = mkEntry({
      kind: 'decision',
      status: 'ok',
      value: { decisionType: 'escalation-decision', countsAgainstLimit: true, logicalTaskId: 'L1' },
    });
    index.absorb([d2, r2, t2, e2]);
    expect(index.attemptsUsed('L1')).toBe(2);
    expect(index.escalationsUsed('L1')).toBe(2);
  });

  it('absorb is idempotent by seq cursor', () => {
    const index = new LineageIndex();
    const d1 = mkAdmission('L2', 'w2');
    const entries = [d1, mkRoot('w2', 'k')];
    index.absorb(entries);
    index.absorb(entries);
    expect(index.attemptsUsed('L2')).toBe(1);
  });

  it('canonizes legacy spawns onto deterministic legacy: LTIDs, never random', () => {
    const one = new LineageIndex();
    const two = new LineageIndex();
    const r1 = mkRoot('', 'legacy-key');
    const t1 = mkTerminal(r1, { status: 'ok' });
    const r2 = mkRoot('', 'legacy-key');
    const t2 = mkTerminal(r2, { status: 'ok' });
    for (const index of [one, two]) {
      index.absorb([r1, t1, r2, t2]);
    }
    const ltid = `${LEGACY_LTID_PREFIX}legacy-key`;
    expect(one.knownLogicalTaskIds()).toEqual([ltid]);
    // Byte-identical legacy work shares one deterministic lineage on
    // every engine.
    expect(one.attemptsUsed(ltid)).toBe(2);
    expect(two.attemptsUsed(ltid)).toBe(2);
    expect(one.statsOf(ltid)).toEqual(two.statsOf(ltid));
  });

  it('computes the stall streak with class skips and resets, pinned (stall-streak cassette)', () => {
    const index = new LineageIndex();
    const outcomes: Array<{ status: JournalEntry['status']; error?: JournalEntry['error'] }> = [
      {
        status: 'error',
        error: { code: 'agent', message: 't', retryable: true, data: { kind: 'transport' } },
      },
      {
        status: 'error',
        error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'terminal' } },
      },
      {
        status: 'limit',
        error: {
          code: 'agent',
          message: 'stuck',
          retryable: false,
          data: { kind: 'terminal', abortClass: 'no-progress' },
        },
      },
      { status: 'ok' },
    ];
    const pins: number[] = [];
    for (const [ordinal, outcome] of outcomes.entries()) {
      const d = mkAdmission('L3', 'w3', { attemptOrdinal: ordinal });
      const r = mkRoot('w3', `k${String(ordinal)}`);
      const t = mkTerminal(r, outcome);
      index.absorb([d, r, t]);
      pins.push(t.seq);
    }
    // transient-error, task-error, no-progress, ok => 0, 1, 2, 0.
    expect(index.stallStreak('L3', pins[0])).toBe(0);
    expect(index.stallStreak('L3', pins[1])).toBe(1);
    expect(index.stallStreak('L3', pins[2])).toBe(2);
    expect(index.stallStreak('L3', pins[3])).toBe(0);
    // A re-executed wake turn reads its pinned snapshot, not a live fold.
    expect(index.statsOf('L3', pins[2]).stallStreak).toBe(2);
    expect(index.statsOf('L3', pins[2]).attemptsUsed).toBe(3);
  });

  it('groups attempts by approachSig (reworded-lessons-collide shape)', () => {
    const index = new LineageIndex();
    const coarse = approachSigCoarse({
      agentType: 'analyst',
      toolsetHash: 't'.repeat(64),
      schemaHash: 's'.repeat(64),
      isolation: 'none',
    });
    const sig = approachSigOf(coarse, 'binary-search');
    for (const [ordinal, key] of ['prose-a', 'prose-b'].entries()) {
      const d = mkAdmission('L4', 'w4', {
        attemptOrdinal: ordinal,
        approachSig: sig,
        approachSigCoarse: coarse,
        approachTag: 'binary-search',
      });
      const r = mkRoot('w4', key);
      const t = mkTerminal(r, {
        status: 'error',
        error: { code: 'agent', message: 'x', retryable: false, data: { kind: 'terminal' } },
      });
      index.absorb([d, r, t]);
    }
    const stats = index.statsOf('L4');
    expect(stats.approaches).toEqual([
      { approachSig: sig, approachTag: 'binary-search', attempts: 2, lastOutcome: 'task-error' },
    ]);
    expect(stats.stallStreak).toBe(2);
  });

  it('debits escalations under first-closing-wins and class-decision rules', () => {
    const index = new LineageIndex();
    const suspended = mkEntry({ kind: 'external', status: 'suspended', key: 'esc' });
    const winner = mkEntry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: {
        target: suspended.seq,
        by: 'timeout',
        value: {},
        logicalTaskId: 'L5',
        countsAgainstLimit: true,
      },
    });
    const loser = mkEntry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: {
        target: suspended.seq,
        by: 'operator',
        value: {},
        logicalTaskId: 'L5',
        countsAgainstLimit: true,
      },
    });
    index.absorb([suspended, winner, loser]);
    // The losing attempt is journaled and classified noop by the fold.
    expect(index.escalationsUsed('L5')).toBe(1);

    // Class-level: the decision entry carries the per-lineage debit
    // array; its per-target resolutions must not double-debit (XF-06).
    const classDecision = mkEntry({
      kind: 'decision',
      status: 'ok',
      value: {
        decisionType: 'escalation-decision',
        countsAgainstLimit: true,
        debits: [{ logicalTaskId: 'L6' }, { logicalTaskId: 'L7' }],
      },
    });
    const suspended2 = mkEntry({ kind: 'external', status: 'suspended', key: 'esc2' });
    const classResolution = mkEntry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended2.seq,
      resolution: {
        target: suspended2.seq,
        by: 'class_decision',
        value: {},
        decisionRef: classDecision.seq,
        logicalTaskId: 'L6',
        countsAgainstLimit: true,
      },
    });
    index.absorb([classDecision, suspended2, classResolution]);
    expect(index.escalationsUsed('L6')).toBe(1);
    expect(index.escalationsUsed('L7')).toBe(1);
  });

  it('rebinds an at-least-once redispatch to the same attempt', () => {
    const index = new LineageIndex();
    const d1 = mkAdmission('L8', 'w8');
    const r1 = mkRoot('w8', 'k');
    const t1 = mkTerminal(r1, { status: 'cancelled' });
    index.absorb([d1, r1, t1]);
    expect(index.statsOf('L8').approaches[0]?.lastOutcome).toBe('abandoned');

    const r2 = mkRoot('w8', 'k');
    index.absorb([r2]);
    // The rerun supersedes the cancelled root: one attempt, live again.
    expect(index.attemptsUsed('L8')).toBe(1);
    expect(index.hasLiveAttempt('L8')).toBe(true);
    const t2 = mkTerminal(r2, { status: 'ok' });
    index.absorb([t2]);
    expect(index.attemptsUsed('L8')).toBe(1);
    expect(index.hasLiveAttempt('L8')).toBe(false);
    expect(index.statsOf('L8').approaches[0]?.lastOutcome).toBe('ok');
  });

  it('marks attempts abandoned from severing abandon entries', () => {
    const index = new LineageIndex();
    const d1 = mkAdmission('L9', 'w9');
    const r1 = mkRoot('w9', 'k');
    const abandon = mkEntry({
      kind: 'abandon',
      status: 'ok',
      ref: r1.seq,
      abandon: { target: r1.seq, authorizedBy: d1.seq, reason: 'cancel_task', logicalTaskId: 'L9' },
    });
    index.absorb([d1, r1, abandon]);
    expect(index.hasLiveAttempt('L9')).toBe(false);
    expect(index.statsOf('L9').approaches[0]?.lastOutcome).toBe('abandoned');
  });

  it('applies verify-failed ladder verdicts as outcome overrides', () => {
    const index = new LineageIndex();
    const d1 = mkAdmission('L10', 'w10');
    const r1 = mkRoot('w10', 'k');
    const t1 = mkTerminal(r1, { status: 'ok' });
    const verdict = mkEntry({
      kind: 'decision',
      status: 'ok',
      value: { decisionType: 'ladder-verdict', trigger: 'verify-failed', attemptRef: r1.seq },
    });
    index.absorb([d1, r1, t1, verdict]);
    expect(index.stallStreak('L10')).toBe(1);
    expect(index.statsOf('L10').approaches[0]?.lastOutcome).toBe('verify-failed');
  });

  it('registers embedded admissions of plan.revision entries', () => {
    const index = new LineageIndex();
    const revision = mkEntry({
      kind: 'plan.revision',
      status: 'ok',
      scope: 'plan',
      value: {
        admissions: [
          {
            nodeId: 'N'.repeat(26),
            decision: {
              verdict: { kind: 'admit', lineage: { logicalTaskId: 'L11', isNew: true, depth: 1 } },
              lineage: mkLineage('L11') as unknown as Record<string, never>,
            },
          },
        ],
      },
    });
    const root = mkRoot(`plan/${'N'.repeat(26)}`, 'k');
    index.absorb([revision, root]);
    expect(index.attemptsUsed('L11')).toBe(1);
    expect(index.hasLiveAttempt('L11')).toBe(true);
  });

  it('covers the pre-append admit window via noteAdmitted', () => {
    const index = new LineageIndex();
    index.noteAdmitted('L12');
    expect(index.hasLiveAttempt('L12')).toBe(true);
    const d1 = mkAdmission('L12', 'w12');
    index.absorb([d1]);
    // The journaled attempt replaces the pending marker; the attempt
    // itself is still unsettled, hence live.
    expect(index.hasLiveAttempt('L12')).toBe(true);
    const r1 = mkRoot('w12', 'k');
    const t1 = mkTerminal(r1, { status: 'ok' });
    index.absorb([r1, t1]);
    expect(index.hasLiveAttempt('L12')).toBe(false);
  });
});
