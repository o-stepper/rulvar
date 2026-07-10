/**
 * modelEpoch capture and the mark_stale op (M11-T04; docs/05, section
 * "Grounding and decay").
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ModelCaps, ModelClaim } from '../index.js';
import { applyClaimOps } from './file-store.js';
import { capsHashOf, modelEpochOf } from './epoch.js';

const CAPS: ModelCaps = {
  contextWindow: 100000,
  maxOutputTokens: 8192,
} as ModelCaps;

function claim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 's',
    class: 'eval-measured',
    status: 'active',
    evidence: [{ kind: 'eval', reportId: 'r', caseIds: ['a'] }],
    metrics: { passRate: 0.9, n: 24, graderId: 'g' },
    confidence: 'high',
    observedAt: '2026-07-10',
    expiresAt: '2026-10-08',
    author: { kind: 'eval-pipeline', id: 'ci' },
    ...extra,
  };
}

describe('modelEpoch and mark_stale (M11-T04)', () => {
  it('capsHashOf is deterministic and drift-sensitive', () => {
    expect(capsHashOf(CAPS)).toBe(capsHashOf({ ...CAPS }));
    expect(capsHashOf(CAPS)).not.toBe(capsHashOf({ ...CAPS, maxOutputTokens: 4096 }));
  });

  it('modelEpochOf assembles only the given signals; empty gives undefined', () => {
    expect(modelEpochOf({})).toBeUndefined();
    const epoch = modelEpochOf({
      pricingVersion: 'prices-7',
      caps: CAPS,
      canaryFingerprint: 'f'.repeat(64),
    });
    expect(epoch?.pricingVersion).toBe('prices-7');
    expect(epoch?.capsHash).toBe(capsHashOf(CAPS));
    expect(epoch?.canaryFingerprint).toBe('f'.repeat(64));
    expect(epoch?.registryVersion).toBeUndefined();
  });

  it('mark_stale flips active to stale, is idempotent, never revives terminals', () => {
    const claims = [
      claim('a', { status: 'active' }),
      claim('s', { status: 'stale' }),
      claim('x', { status: 'archived' }),
    ];
    const flipped = applyClaimOps(claims, [
      { op: 'mark_stale', claimId: 'a', reason: 'canary-drift' },
      { op: 'mark_stale', claimId: 's', reason: 'canary-drift' },
      { op: 'mark_stale', claimId: 'x', reason: 'canary-drift' },
    ]);
    expect(flipped.find((entry) => entry.id === 'a')?.status).toBe('stale');
    expect(flipped.find((entry) => entry.id === 's')?.status).toBe('stale');
    expect(flipped.find((entry) => entry.id === 'x')?.status).toBe('archived');
    expect(() =>
      applyClaimOps(claims, [{ op: 'mark_stale', claimId: 'ghost', reason: 'canary-drift' }]),
    ).toThrowError(ConfigError);
  });
});
