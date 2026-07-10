/**
 * Grounding and decay (M11-T03; docs/05, section "Grounding and
 * decay"): the asymmetric TTL table under clock control, the
 * re-measurement queue as a pure status filter, archive-never-delete
 * maintenance, and the read-path acceptance: an expired claim stops
 * influencing the card at the next pin or repin.
 */
import { describe, expect, it } from 'vitest';

import type { ModelClaim } from '../l0/spi/knowledge.js';
import { filterClaimsForRun, type DeclaredLadder } from './card.js';
import { applyClaimOps } from './file-store.js';
import {
  archiveDeprecatedModelOps,
  claimExpiry,
  INBOX_PROPOSAL_TTL_DAYS,
  remeasureQueue,
  ttlState,
} from './decay.js';

function claim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'solid on small mechanical edits',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'r1', entryRef: 7 }],
    confidence: 'medium',
    observedAt: '2026-07-10T00:00:00.000Z',
    expiresAt: '2026-11-07T00:00:00.000Z',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

const OBSERVED = '2026-07-10T00:00:00.000Z';

describe('decay (M11-T03; docs/05, section "Grounding and decay")', () => {
  it('the four TTL corners under clock control', () => {
    const corners = [
      ['eval-measured', 'strength', '2026-10-08T00:00:00.000Z'],
      ['eval-measured', 'weakness', '2026-08-09T00:00:00.000Z'],
      ['human-editorial', 'strength', '2026-11-07T00:00:00.000Z'],
      ['human-editorial', 'weakness', '2026-08-24T00:00:00.000Z'],
    ] as const;
    for (const [claimClass, polarity, expiry] of corners) {
      expect(claimExpiry(claimClass, polarity, OBSERVED)).toBe(expiry);
      const subject = { expiresAt: expiry };
      expect(ttlState(subject, OBSERVED)).toBe('holds');
      // One millisecond before the boundary holds; the boundary expires.
      expect(ttlState(subject, new Date(Date.parse(expiry) - 1).toISOString())).toBe('holds');
      expect(ttlState(subject, expiry)).toBe('expired');
    }
    expect(INBOX_PROPOSAL_TTL_DAYS).toBe(14);
  });

  it('the re-measurement queue is a status filter over expired ACTIVE eval claims', () => {
    const evalExpired = claim('e-expired', {
      class: 'eval-measured',
      metrics: { passRate: 0.4, n: 24, graderId: 'g' },
      expiresAt: '2026-08-01T00:00:00.000Z',
    });
    const evalHolding = claim('e-holds', {
      class: 'eval-measured',
      metrics: { passRate: 0.9, n: 24, graderId: 'g' },
      expiresAt: '2027-01-01T00:00:00.000Z',
    });
    const editorialExpired = claim('n-expired', { expiresAt: '2026-08-01T00:00:00.000Z' });
    const archivedEval = claim('e-archived', {
      class: 'eval-measured',
      status: 'archived',
      expiresAt: '2026-08-01T00:00:00.000Z',
    });
    const queue = remeasureQueue(
      [evalExpired, evalHolding, editorialExpired, archivedEval],
      '2026-09-01T00:00:00.000Z',
    );
    expect(queue.map((entry) => entry.id)).toEqual(['e-expired']);
  });

  it('deprecation archives every live claim of the model and deletes nothing', () => {
    const claims = [
      claim('keep', { subject: { model: 'fake:other' } }),
      claim('a1'),
      claim('a2', { status: 'stale' }),
      claim('done', { status: 'archived' }),
    ];
    const ops = archiveDeprecatedModelOps(claims, ['fake:model']);
    expect(ops).toEqual([
      { op: 'archive', claimId: 'a1', reason: 'deprecated' },
      { op: 'archive', claimId: 'a2', reason: 'deprecated' },
    ]);
    const after = applyClaimOps(claims, ops);
    expect(after).toHaveLength(4);
    expect(after.find((entry) => entry.id === 'a1')?.status).toBe('archived');
    expect(after.find((entry) => entry.id === 'keep')?.status).toBe('active');
  });

  it('an expired claim stops influencing the card at the next pin or repin', () => {
    const ladder: DeclaredLadder = {
      name: 'worker',
      startTier: 0,
      rungs: [{ model: 'fake:model' }],
    };
    const subject = claim('c1', { expiresAt: '2026-08-01T00:00:00.000Z' });
    // The pin before expiry sees it; the repin after does not: the SAME
    // filter the engine applies at kb_pinned and kb_repinned (M10-T03).
    const before = filterClaimsForRun([subject], {
      ladders: [ladder],
      now: '2026-07-31T00:00:00.000Z',
    });
    const after = filterClaimsForRun([subject], {
      ladders: [ladder],
      now: '2026-08-01T00:00:00.000Z',
    });
    expect(before.map((entry) => entry.id)).toEqual(['c1']);
    expect(after).toEqual([]);
  });
});
