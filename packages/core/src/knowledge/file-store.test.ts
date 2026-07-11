import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ConfigError, KnowledgeCasError } from '../l0/errors.js';
import type {
  ClaimOp,
  GateRecord,
  KnowledgeSnapshot,
  ModelClaim,
  ModelKnowledgeHandle,
  ModelKnowledgeStore,
} from '../l0/spi/knowledge.js';
import { FileModelKnowledgeStore, knowledgeHash } from './file-store.js';

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

function makeStore(): FileModelKnowledgeStore {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-kb-'));
  return new FileModelKnowledgeStore({ path: join(dir, 'rulvar.models.json') });
}

describe('FileModelKnowledgeStore (M10-T01; docs/05, section "Commit discipline")', () => {
  it('reads the empty snapshot when no file exists', async () => {
    const store = makeStore();
    const snapshot = await store.current();
    expect(snapshot).toEqual({ version: 0, hash: knowledgeHash([]), claims: [] });
  });

  it('round-trips add, supersede, and archive with append-only status flips', async () => {
    const store = makeStore();
    const v1 = await store.commit([{ op: 'add', claim: claim('c1'), gate: GATE }], 0);
    expect(v1).toBe(1);
    const v2 = await store.commit(
      [
        {
          op: 'supersede',
          claimId: 'c1',
          by: claim('c2', { statement: 'solid on small edits, weak on refactors' }),
          gate: GATE,
        },
        { op: 'add', claim: claim('c3', { taskClass: 'judging' }), gate: GATE },
      ],
      1,
    );
    expect(v2).toBe(2);
    const v3 = await store.commit([{ op: 'archive', claimId: 'c3', reason: 'rejected' }], 2);
    expect(v3).toBe(3);

    const snapshot = await store.current();
    expect(snapshot.version).toBe(3);
    expect(snapshot.hash).toBe(knowledgeHash(snapshot.claims));
    const byId = new Map(snapshot.claims.map((entry) => [entry.id, entry]));
    // Nothing deletes: the chain stays for the audit trail.
    expect(snapshot.claims).toHaveLength(3);
    expect(byId.get('c1')?.status).toBe('superseded');
    expect(byId.get('c2')?.status).toBe('active');
    expect(byId.get('c2')?.supersedes).toBe('c1');
    expect(byId.get('c3')?.status).toBe('archived');
  });

  it('serializes concurrent commits by CAS failure and rebase', async () => {
    const store = makeStore();
    const attempt = (id: string): Promise<number> =>
      store.commit([{ op: 'add', claim: claim(id), gate: GATE }], 0);
    const settled = await Promise.allSettled([attempt('left'), attempt('right')]);
    const wins = settled.filter((outcome) => outcome.status === 'fulfilled');
    const losses = settled.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
    );
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    const cas = losses[0]?.reason as KnowledgeCasError;
    expect(cas).toBeInstanceOf(KnowledgeCasError);
    expect(cas.retryable).toBe(true);

    // The documented rebase recipe: re-read current, commit again.
    const fresh = await store.current();
    const rebased = await store.commit(
      [{ op: 'add', claim: claim('rebased'), gate: GATE }],
      fresh.version,
    );
    expect(rebased).toBe(2);
    expect((await store.current()).claims).toHaveLength(2);
  });

  it('rejects dangling supersede and archive and duplicate ids as typed errors', async () => {
    const store = makeStore();
    await expect(
      store.commit([{ op: 'supersede', claimId: 'ghost', by: claim('x'), gate: GATE }], 0),
    ).rejects.toBeInstanceOf(ConfigError);
    await expect(
      store.commit([{ op: 'archive', claimId: 'ghost', reason: 'stale' }], 0),
    ).rejects.toBeInstanceOf(ConfigError);
    await store.commit([{ op: 'add', claim: claim('dup'), gate: GATE }], 0);
    await expect(
      store.commit([{ op: 'add', claim: claim('dup'), gate: GATE }], 1),
    ).rejects.toBeInstanceOf(ConfigError);
    // A failed batch commits NOTHING (single atomic replace per commit).
    expect((await store.current()).version).toBe(1);
  });

  it('writes a git-diffable pretty snapshot with a trailing newline', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kb-'));
    const path = join(dir, 'rulvar.models.json');
    const store = new FileModelKnowledgeStore({ path });
    await store.commit([{ op: 'add', claim: claim('c1'), gate: GATE }], 0);
    const raw = readFileSync(path, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(raw.split('\n').length).toBeGreaterThan(5);
    expect(JSON.parse(raw) as KnowledgeSnapshot).toEqual(await store.current());
  });

  it('rejects a corrupt file as a typed ConfigError', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-kb-'));
    const path = join(dir, 'rulvar.models.json');
    const store = new FileModelKnowledgeStore({ path });
    await store.commit([{ op: 'add', claim: claim('c1'), gate: GATE }], 0);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path, '{ not json', 'utf8');
    await expect(store.current()).rejects.toBeInstanceOf(ConfigError);
  });

  it('the runtime handle physically lacks commit (docs/05, security channel 3)', () => {
    expectTypeOf<keyof ModelKnowledgeHandle>().toEqualTypeOf<'current'>();
    const store: ModelKnowledgeStore = makeStore();
    const handle: ModelKnowledgeHandle = store;
    expectTypeOf(handle).not.toHaveProperty('commit');
    // A GateRecord of the human kind does not assemble without the
    // attribution attestation: the shape below must not typecheck.
    expectTypeOf<{
      op: 'add';
      claim: ModelClaim;
      gate: { kind: 'human'; approver: string; at: string };
    }>().not.toMatchTypeOf<ClaimOp>();
  });
});
