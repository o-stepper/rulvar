import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ClaimOp, GateRecord, ModelClaim } from '../l0/spi/knowledge.js';
import {
  CLAIM_STATEMENT_MAX_CHARS,
  CLAIM_TTL_DAYS,
  KB_ACTIVE_CLAIMS_CAP,
  capIssues,
  claimExpired,
  claimExpiry,
  claimIssues,
  claimOpIssues,
} from './claims.js';
import { FileModelKnowledgeStore } from './file-store.js';

function claim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:model', effort: 'medium' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'solid on small mechanical edits',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'r1', entryRef: 7 }],
    confidence: 'medium',
    observedAt: '2026-07-10',
    expiresAt: '2026-11-07',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

const GATE: GateRecord = {
  kind: 'human',
  approver: 'founder',
  at: '2026-07-10',
  attribution: { ruledOut: ['prompt', 'transient-provider'] },
};

function makeStore(cap?: number): FileModelKnowledgeStore {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-kb-'));
  return new FileModelKnowledgeStore({
    path: join(dir, 'rulvar.models.json'),
    ...(cap === undefined ? {} : { activeClaimsCap: cap }),
  });
}

describe('the editorial claim validators (M10-T02; docs/05)', () => {
  it('a gated op without the attestation is a runtime error at commit', async () => {
    const store = makeStore();
    const rubberStamp = {
      op: 'add',
      claim: claim('c1'),
      gate: { kind: 'human', approver: 'founder', at: '2026-07-10' },
    } as unknown as ClaimOp;
    await expect(store.commit([rubberStamp], 0)).rejects.toThrowError(/attribution attestation/);
    // Nothing landed.
    expect((await store.current()).version).toBe(0);
  });

  it('the eval-confirmed gate is reserved for v2 and commits nothing', () => {
    const op: ClaimOp = {
      op: 'add',
      claim: claim('c1'),
      gate: { kind: 'eval-confirmed', reportId: 'rep1', n: 20, passRate: 0.9 },
    };
    expect(claimOpIssues(op, 0).join('\n')).toMatch(/reserved for v2/);
  });

  it('eval-measured claims and metrics are uncommittable on the editorial path', async () => {
    const store = makeStore();
    await expect(
      store.commit([{ op: 'add', claim: claim('c1', { class: 'eval-measured' }), gate: GATE }], 0),
    ).rejects.toThrowError(/eval-committer identity/);
    await expect(
      store.commit(
        [
          {
            op: 'add',
            claim: claim('c2', {
              metrics: { passRate: 0.8, n: 10, graderId: 'g' },
            }),
            gate: GATE,
          },
        ],
        0,
      ),
    ).rejects.toThrowError(/eval-committer identity/);
    // The M11 identity path validates coherently: eval-measured claims
    // carry their metrics block.
    expect(
      claimIssues(claim('c3', { class: 'eval-measured' }), 'c3', { evalCommitter: true }).join(''),
    ).toMatch(/metrics block/);
    expect(
      claimIssues(
        claim('c4', { class: 'eval-measured', metrics: { passRate: 0.8, n: 10, graderId: 'g' } }),
        'c4',
        { evalCommitter: true },
      ),
    ).toEqual([]);
  });

  it('bounds statements, requires evidence and a taskClass, checks date coherence', () => {
    expect(
      claimIssues(claim('c1', { statement: 'x'.repeat(CLAIM_STATEMENT_MAX_CHARS + 1) }), 'p').join(
        '',
      ),
    ).toMatch(/exceeds 200/);
    expect(claimIssues(claim('c2', { evidence: [] }), 'p').join('')).toMatch(/evidence/);
    expect(claimIssues(claim('c3', { taskClass: '' }), 'p').join('')).toMatch(/taskClass/);
    expect(
      claimIssues(claim('c4', { observedAt: '2026-07-10', expiresAt: '2026-07-09' }), 'p').join(''),
    ).toMatch(/follow observedAt/);
    expect(claimIssues(claim('c5', { status: 'archived' }), 'p').join('')).toMatch(/'active'/);
    expect(claimIssues(claim('ok'), 'p')).toEqual([]);
  });

  it('enforces the active-claims cap per (model, taskClass) at commit', async () => {
    const store = makeStore();
    const eight: ClaimOp[] = Array.from({ length: KB_ACTIVE_CLAIMS_CAP }, (_, index) => ({
      op: 'add',
      claim: claim(`c${String(index)}`),
      gate: GATE,
    }));
    await expect(store.commit(eight, 0)).resolves.toBe(1);
    // The ninth active claim for the SAME pair rejects.
    await expect(
      store.commit([{ op: 'add', claim: claim('c9'), gate: GATE }], 1),
    ).rejects.toThrowError(/over the cap 8/);
    // A different taskClass is a different pair.
    await expect(
      store.commit([{ op: 'add', claim: claim('c9', { taskClass: 'judging' }), gate: GATE }], 1),
    ).resolves.toBe(2);
    // Supersede keeps only the head active: no growth, no rejection.
    await expect(
      store.commit([{ op: 'supersede', claimId: 'c0', by: claim('c0v2'), gate: GATE }], 2),
    ).resolves.toBe(3);
    const snapshot = await store.current();
    const active = snapshot.claims.filter(
      (entry) => entry.status === 'active' && entry.taskClass === 'code-edit',
    );
    expect(active).toHaveLength(KB_ACTIVE_CLAIMS_CAP);
  });

  it('the cap is configurable per store (docs/06, Appendix A)', async () => {
    const store = makeStore(1);
    await store.commit([{ op: 'add', claim: claim('c1'), gate: GATE }], 0);
    await expect(
      store.commit([{ op: 'add', claim: claim('c2'), gate: GATE }], 1),
    ).rejects.toThrowError(/over the cap 1/);
  });

  it('capIssues counts only active claims', () => {
    const claims = [
      claim('a'),
      claim('b', { status: 'superseded' }),
      claim('c', { status: 'archived' }),
    ];
    expect(capIssues(claims, 1)).toEqual([]);
    expect(capIssues([claim('a'), claim('b')], 1).join('')).toMatch(/over the cap 1/);
  });

  it('applies the asymmetric TTL table and the expiry filter', () => {
    expect(CLAIM_TTL_DAYS['human-editorial'].strength).toBe(120);
    expect(CLAIM_TTL_DAYS['eval-measured'].weakness).toBe(30);
    const expiry = claimExpiry('human-editorial', 'weakness', '2026-07-10T00:00:00.000Z');
    expect(expiry).toBe('2026-08-24T00:00:00.000Z');
    expect(claimExpired({ expiresAt: expiry }, '2026-08-23T23:59:59.000Z')).toBe(false);
    expect(claimExpired({ expiresAt: expiry }, expiry)).toBe(true);
    expect(() => claimExpiry('human-editorial', 'strength', 'not a date')).toThrowError(
      ConfigError,
    );
  });
});

describe('the eval-committer identity (M11-T01; docs/05, 5.4)', () => {
  const EVAL_GATE = {
    kind: 'eval-committer',
    committerId: 'ci-evals',
    reportId: 'sweep-2026-07-10',
  } as const;
  const measured = (id: string, extra?: Partial<ModelClaim>): ModelClaim =>
    claim(id, {
      class: 'eval-measured',
      author: { kind: 'eval-pipeline', id: 'ci-evals' },
      metrics: { passRate: 0.85, n: 24, graderId: 'golden' },
      evidence: [{ kind: 'eval', reportId: 'sweep-2026-07-10', caseIds: ['a', 'b'] }],
      ...extra,
    });

  it('the eval pipeline commit succeeds through the store', async () => {
    const store = makeStore();
    await expect(
      store.commit([{ op: 'add', claim: measured('m1'), gate: EVAL_GATE }], 0),
    ).resolves.toBe(1);
    const snapshot = await store.current();
    expect(snapshot.claims[0]?.class).toBe('eval-measured');
    expect(snapshot.claims[0]?.metrics?.passRate).toBe(0.85);
  });

  it('a human-authored op with metrics rejects (the acceptance pair)', async () => {
    const store = makeStore();
    await expect(
      store.commit(
        [
          {
            op: 'add',
            claim: claim('h1', { metrics: { passRate: 0.9, n: 5, graderId: 'g' } }),
            gate: GATE,
          },
        ],
        0,
      ),
    ).rejects.toThrowError(/eval-committer identity/);
  });

  it('enforces the coherence square under the eval-committer gate', () => {
    // Editorial class under the eval gate.
    expect(claimOpIssues({ op: 'add', claim: claim('x'), gate: EVAL_GATE }, 0).join('\n')).toMatch(
      /eval-measured claims only/,
    );
    // Human author under the eval gate.
    expect(
      claimOpIssues(
        {
          op: 'add',
          claim: measured('x', { author: { kind: 'human', id: 'f' } }),
          gate: EVAL_GATE,
        },
        0,
      ).join('\n'),
    ).toMatch(/author\.kind 'eval-pipeline'/);
    // Metrics mandatory under the eval gate.
    expect(
      claimOpIssues(
        { op: 'add', claim: measured('x', { metrics: undefined }), gate: EVAL_GATE },
        0,
      ).join('\n'),
    ).toMatch(/metrics block/);
    // The gate itself requires its identity fields.
    expect(
      claimOpIssues(
        {
          op: 'add',
          claim: measured('x'),
          gate: { kind: 'eval-committer', committerId: '', reportId: '' },
        },
        0,
      ).join('\n'),
    ).toMatch(/committerId/);
  });

  it('supersede under the eval gate follows the same square', async () => {
    const store = makeStore();
    await store.commit([{ op: 'add', claim: measured('m1'), gate: EVAL_GATE }], 0);
    await expect(
      store.commit(
        [
          {
            op: 'supersede',
            claimId: 'm1',
            by: measured('m2', { metrics: { passRate: 0.6, n: 40, graderId: 'golden' } }),
            gate: EVAL_GATE,
          },
        ],
        1,
      ),
    ).resolves.toBe(2);
    const snapshot = await store.current();
    expect(snapshot.claims.find((entry) => entry.id === 'm1')?.status).toBe('superseded');
    expect(snapshot.claims.find((entry) => entry.id === 'm2')?.supersedes).toBe('m1');
  });
});
