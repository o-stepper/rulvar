// The decision-chain fold (RV1705): the authority record in one call.
import { describe, expect, it } from 'vitest';

import { DECISION_CHAIN_KINDS, reduceDecisionChain } from './decision-chain.js';
import type { JournalEntry } from './entries.js';

const entry = (partial: Partial<JournalEntry> & Pick<JournalEntry, 'seq' | 'kind'>): JournalEntry =>
  ({
    hashVersion: 2,
    scope: '',
    key: `k${String(partial.seq)}`,
    ordinal: 0,
    status: 'ok',
    ...partial,
  }) as JournalEntry;

describe('reduceDecisionChain (RV1705)', () => {
  it('folds only the authority kinds, in seq order, with references intact', () => {
    const chain = reduceDecisionChain([
      entry({ seq: 9, kind: 'resolution', value: { target: 4, by: 'operator', value: null } }),
      entry({ seq: 1, kind: 'agent' }),
      entry({
        seq: 2,
        kind: 'decision',
        value: { decisionType: 'spawn-admission', estCost: 0.5 },
      }),
      entry({ seq: 4, kind: 'approval', status: 'suspended' }),
      entry({ seq: 5, kind: 'step' }),
      entry({
        seq: 11,
        kind: 'abandon',
        value: { target: 2, authorizedBy: 9, reason: 'superseded' },
      }),
      entry({ seq: 12, kind: 'termination.init', value: { capUsd: 3 } }),
    ]);
    expect(chain.map((row) => row.seq)).toEqual([2, 4, 9, 11, 12]);
    expect(chain[0]).toMatchObject({ kind: 'decision', decisionType: 'spawn-admission' });
    expect(chain[1]).toMatchObject({ kind: 'approval', status: 'suspended' });
    expect(chain[2]).toMatchObject({ kind: 'resolution', by: 'operator', target: 4 });
    expect(chain[3]).toMatchObject({ kind: 'abandon', target: 2, authorizedBy: 9 });
    expect(chain[4]).toMatchObject({ kind: 'termination.init' });
    expect(chain[4]?.value).toEqual({ capUsd: 3 });
  });

  it('never invents fields: a bare authority entry folds to its identity row alone', () => {
    const [row] = reduceDecisionChain([entry({ seq: 3, kind: 'external', status: 'suspended' })]);
    expect(row).toEqual({ seq: 3, kind: 'external', scope: '', key: 'k3', status: 'suspended' });
  });

  it('a resolution without a journaled target falls back to the entry ref', () => {
    const [row] = reduceDecisionChain([
      entry({ seq: 7, kind: 'resolution', ref: 3, value: { by: 'timeout', value: null } }),
    ]);
    expect(row).toMatchObject({ target: 3, by: 'timeout' });
  });

  it('reads the canonical resolution payload the engine journals (RV1801)', () => {
    const [row] = reduceDecisionChain([
      entry({
        seq: 9,
        kind: 'resolution',
        ref: 4,
        resolution: {
          target: 4,
          by: 'external',
          value: { decision: 'allow', reason: 'reviewed' },
          decisionRef: 7,
        },
      }),
    ]);
    expect(row).toMatchObject({ by: 'external', target: 4, decisionRef: 7 });
    expect(row?.value).toEqual({ decision: 'allow', reason: 'reviewed' });
  });

  it('reads the canonical abandon payload the engine journals (RV1801)', () => {
    const [row] = reduceDecisionChain([
      entry({
        seq: 11,
        kind: 'abandon',
        ref: 2,
        abandon: { target: 2, authorizedBy: 9, reason: 'superseded' },
      }),
    ]);
    expect(row).toMatchObject({ target: 2, authorizedBy: 9 });
    expect(row?.by).toBeUndefined();
  });

  it('the canonical payload wins over value-carried fields; entry.value stays verbatim', () => {
    const [row] = reduceDecisionChain([
      entry({
        seq: 5,
        kind: 'resolution',
        ref: 3,
        resolution: { target: 3, by: 'operator', value: null },
        value: { by: 'timeout', target: 99, note: 'hand-written' },
      }),
    ]);
    expect(row).toMatchObject({ by: 'operator', target: 3 });
    expect(row?.value).toEqual({ by: 'timeout', target: 99, note: 'hand-written' });
  });

  it('tolerates unknown kinds and excludes every work kind', () => {
    const chain = reduceDecisionChain([
      entry({ seq: 1, kind: 'agent' }),
      entry({ seq: 2, kind: 'child' }),
      entry({ seq: 3, kind: 'rand' }),
      entry({ seq: 4, kind: 'mystery.kind' as JournalEntry['kind'] }),
      entry({ seq: 5, kind: 'node.link' }),
    ]);
    expect(chain).toEqual([]);
    expect(DECISION_CHAIN_KINDS).not.toContain('agent');
  });
});
