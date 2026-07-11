/**
 * The eval-committer pipeline path (M11-T01; docs/05, 5.4): building
 * measured claims with the docs/05 TTL table applied, committing under
 * the eval-committer gate, and the documented CAS-rebase recipe.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  FileModelKnowledgeStore,
  KnowledgeCasError,
  type ClaimOp,
  type ModelKnowledgeStore,
} from '@rulvar/core';

import { commitEvalMeasured, evalMeasuredClaim, type MeasuredClaimInput } from './committer.js';

function input(id: string, extra?: Partial<MeasuredClaimInput>): MeasuredClaimInput {
  return {
    id,
    subject: { model: 'fake:model', effort: 'medium' },
    taskClass: 'code-edit',
    polarity: 'weakness',
    statement: 'passRate 0.42 over 24 cases: below the 0.7 floor for code-edit',
    metrics: { passRate: 0.42, n: 24, graderId: 'golden' },
    confidence: 'medium',
    observedAt: '2026-07-10T00:00:00.000Z',
    evidence: [{ kind: 'eval', reportId: 'sweep-1', caseIds: ['a', 'b'] }],
    ...extra,
  };
}

function makeStore(): FileModelKnowledgeStore {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-kb-evals-'));
  return new FileModelKnowledgeStore({ path: join(dir, 'rulvar.models.json') });
}

describe('the eval-committer pipeline (M11-T01)', () => {
  it('applies the asymmetric eval TTLs and stamps the identity', () => {
    const weakness = evalMeasuredClaim(input('w1'), 'ci-evals');
    expect(weakness.class).toBe('eval-measured');
    expect(weakness.author).toEqual({ kind: 'eval-pipeline', id: 'ci-evals' });
    // eval weakness: 30 days.
    expect(weakness.expiresAt).toBe('2026-08-09T00:00:00.000Z');
    const strength = evalMeasuredClaim(
      input('s1', { polarity: 'strength', statement: 'passRate 0.94 over 24 cases' }),
      'ci-evals',
    );
    // eval strength: 90 days.
    expect(strength.expiresAt).toBe('2026-10-08T00:00:00.000Z');
  });

  it('commits through the eval-committer gate against the file store', async () => {
    const store = makeStore();
    const version = await commitEvalMeasured(store, [input('m1'), input('m2', { id: 'm2' })], {
      committerId: 'ci-evals',
      reportId: 'sweep-1',
    });
    expect(version).toBe(1);
    const snapshot = await store.current();
    expect(snapshot.claims).toHaveLength(2);
    expect(snapshot.claims.every((claim) => claim.class === 'eval-measured')).toBe(true);
    expect(snapshot.claims.every((claim) => claim.metrics !== undefined)).toBe(true);
  });

  it('rebases through a CAS rejection (the docs/05 recipe)', async () => {
    const store = makeStore();
    let bumped = false;
    // A racing writer lands between current() and commit exactly once.
    const racing: ModelKnowledgeStore = {
      current: () => store.current(),
      commit: async (ops: ClaimOp[], expectedVersion: number) => {
        if (!bumped) {
          bumped = true;
          throw new KnowledgeCasError('simulated concurrent commit', {
            data: { expectedVersion, actualVersion: expectedVersion + 1 },
          });
        }
        return store.commit(ops, expectedVersion);
      },
    };
    const version = await commitEvalMeasured(racing, [input('m1')], {
      committerId: 'ci-evals',
      reportId: 'sweep-1',
    });
    expect(version).toBe(1);
    expect((await store.current()).claims).toHaveLength(1);
  });

  it('exhausted rebase attempts surface the CAS error', async () => {
    const store = makeStore();
    const alwaysStale: ModelKnowledgeStore = {
      current: () => store.current(),
      commit: () =>
        Promise.reject(new KnowledgeCasError('always stale', { data: { actualVersion: 99 } })),
    };
    await expect(
      commitEvalMeasured(alwaysStale, [input('m1')], {
        committerId: 'ci-evals',
        reportId: 'sweep-1',
        attempts: 2,
      }),
    ).rejects.toBeInstanceOf(KnowledgeCasError);
  });
});
