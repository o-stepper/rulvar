/**
 * Golden fold-state fixture (M2-T11; docs/03, section "Conformance
 * obligations"): a hand-authored journal with applied, noop, and invalid
 * resolutions plus applied and noop abandons. Folding it through the
 * kernel MUST produce a fold state whose canonical hash equals
 * GOLDEN_FOLD_STATE_SHA256 on every store implementation: a store cannot
 * influence replay semantics.
 *
 * FROZEN fixture (docs/11, section "Frozen journal fixtures"): any edit
 * requires an explicit hashVersion-bump changeset
 * (scripts/check-frozen-fixtures.mjs).
 */
import { createHash } from 'node:crypto';
import { ResolutionFold, type JournalEntry } from '@lurker/core';
import { stableStringify } from '../types.js';

function entry(partial: Partial<JournalEntry> & { seq: number }): JournalEntry {
  return {
    hashVersion: 2,
    scope: '',
    key: `golden-${partial.seq}`,
    ordinal: 0,
    kind: 'external',
    status: 'suspended',
    spanId: 'golden-span',
    startedAt: new Date(1_700_000_000_000 + partial.seq * 1000).toISOString(),
    ...partial,
  };
}

const GATE_A_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok'],
  properties: { ok: { type: 'boolean' } },
};

/**
 * seq 0  agent spawn (running; abandoned by seq 6)
 * seq 1  suspended external gate-a under the spawn's child scope
 * seq 2  suspended external gate-b at the root
 * seq 3  resolution of gate-a: schema-INVALID (never closes)
 * seq 4  resolution of gate-a: applied
 * seq 5  resolution of gate-a: noop (already_resolved)
 * seq 6  abandon of the spawn: applied (covers the agent:0 subtree)
 * seq 7  resolution of gate-b: applied (root scope, not covered)
 * seq 8  abandon of gate-b: noop (already_resolved; first-closing-wins)
 * seq 9  abandon of the spawn again: noop (target_abandoned)
 */
export const GOLDEN_FOLD_JOURNAL: readonly JournalEntry[] = [
  entry({ seq: 0, kind: 'agent', status: 'running' }),
  entry({ seq: 1, scope: 'agent:0', value: { key: 'gate-a', schema: GATE_A_SCHEMA } }),
  entry({ seq: 2, value: { key: 'gate-b' } }),
  entry({
    seq: 3,
    kind: 'resolution',
    status: 'ok',
    ref: 1,
    scope: 'agent:0',
    resolution: { target: 1, by: 'external', value: { ok: 'yes' } },
  }),
  entry({
    seq: 4,
    kind: 'resolution',
    status: 'ok',
    ref: 1,
    scope: 'agent:0',
    resolution: { target: 1, by: 'operator', value: { ok: true } },
  }),
  entry({
    seq: 5,
    kind: 'resolution',
    status: 'ok',
    ref: 1,
    scope: 'agent:0',
    resolution: { target: 1, by: 'timeout', value: { ok: false } },
  }),
  entry({
    seq: 6,
    kind: 'abandon',
    status: 'ok',
    ref: 0,
    abandon: { target: 0, authorizedBy: 0, reason: 'golden abandon' },
  }),
  entry({
    seq: 7,
    kind: 'resolution',
    status: 'ok',
    ref: 2,
    resolution: { target: 2, by: 'external', value: { go: 1 } },
  }),
  entry({
    seq: 8,
    kind: 'abandon',
    status: 'ok',
    ref: 2,
    abandon: { target: 2, authorizedBy: 6, reason: 'late abandon over a resolved gate' },
  }),
  entry({
    seq: 9,
    kind: 'abandon',
    status: 'ok',
    ref: 0,
    abandon: { target: 0, authorizedBy: 6, reason: 'repeat abandon' },
  }),
];

/**
 * Materializes the observable fold state of a journal: ref-entry
 * classifications (invalid details excluded: validator message wording is
 * not contractual), suspension states, and per-seq abandon coverage.
 */
export function materializeFoldState(entries: readonly JournalEntry[]): Record<string, unknown> {
  const fold = new ResolutionFold(entries);
  const abandonFold = fold.abandonFold;
  const classifications: Record<string, unknown> = {};
  const suspensions: Record<string, unknown> = {};
  const abandoned: Record<string, boolean> = {};
  for (const item of entries) {
    abandoned[String(item.seq)] = abandonFold.isAbandoned(item.seq);
    const classification = fold.classificationOf(item.seq);
    if (classification !== undefined) {
      classifications[String(item.seq)] =
        classification.classification === 'invalid'
          ? { classification: 'invalid' }
          : classification;
    }
    if (item.status === 'suspended') {
      suspensions[String(item.seq)] = fold.suspensionState(item.seq);
    }
  }
  return { classifications, suspensions, abandoned };
}

export function foldStateSha256(entries: readonly JournalEntry[]): string {
  return createHash('sha256')
    .update(stableStringify(materializeFoldState(entries)), 'utf8')
    .digest('hex');
}

/** The reference hash; computed once from the kernel fold and frozen. */
export const GOLDEN_FOLD_STATE_SHA256 =
  '81e6ccff549fb3e6c1de4d34ba65b912162eba6f66403b5d5f23a3e1ec69243c';
