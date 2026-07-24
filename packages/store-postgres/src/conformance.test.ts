/**
 * PostgresStore conformance (RV-214 acceptance): the FULL
 * @rulvar/store-conformance suites (A1-A4, meta separation, golden fold
 * fixture, decide-once oracle, abandon skip; lease exclusivity, fencing
 * epochs, release fencing, ttl expiry and renew cadence; fenced writes
 * and fenced transcripts) plus cross-instance fencing over one schema
 * and an engine-level e2e. Gated on RULVAR_POSTGRES_URL: without a
 * database the whole file skips (CI provides a service container, so
 * the gate always runs there); locally, point it at any postgres, e.g.
 *   docker run -d -e POSTGRES_PASSWORD=rulvar -p 54329:5432 postgres:16
 *   RULVAR_POSTGRES_URL=postgres://postgres:rulvar@127.0.0.1:54329/postgres
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import {
  ConfigError,
  JournalOrderViolation,
  LeaseHeldError,
  createEngine,
  defineWorkflow,
  type JournalEntry,
} from '@rulvar/core';
import {
  fencedTranscriptsConformance,
  fencedWritesConformance,
  journalStoreConformance,
  leasableStoreConformance,
  registerConformance,
} from '@rulvar/store-conformance';

import { PostgresStore } from './store.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);
const itDb = it.skipIf(!hasDb);

const SUITE_ID = randomUUID().replaceAll('-', '').slice(0, 10);
let schemaCounter = 0;
const schemas: string[] = [];
const stores: PostgresStore[] = [];

/** A fresh store over a fresh schema; tracked for teardown. */
function fresh(options: { ttlMs?: number; now?: () => number } = {}): PostgresStore {
  schemaCounter += 1;
  const schema = `rulvar_t_${SUITE_ID}_${String(schemaCounter)}`;
  schemas.push(schema);
  const store = new PostgresStore({ url: url ?? '', schema, max: 2, ...options });
  stores.push(store);
  return store;
}

/** A second store instance over an EXISTING schema (another process). */
function over(schema: string, options: { ttlMs?: number; now?: () => number } = {}): PostgresStore {
  const store = new PostgresStore({ url: url ?? '', schema, max: 2, ...options });
  stores.push(store);
  return store;
}

afterAll(async () => {
  for (const store of stores) {
    await store.close();
  }
  if (!hasDb || schemas.length === 0) {
    return;
  }
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  for (const schema of schemas) {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
  await admin.end();
});

if (hasDb) {
  registerConformance(
    journalStoreConformance(() => fresh()),
    { describe, it },
  );
  registerConformance(
    leasableStoreConformance(() => fresh({ ttlMs: 150 }), { ttlMs: 150 }),
    { describe, it },
  );
  registerConformance(
    fencedWritesConformance(() => fresh()),
    { describe, it },
  );
  registerConformance(
    fencedTranscriptsConformance(() => {
      const store = fresh();
      return { journal: store, transcripts: store.transcripts() };
    }),
    { describe, it },
  );
}

function entry(seq: number): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: `k-${String(seq)}`,
    ordinal: 0,
    kind: 'step',
    status: 'ok',
    value: { seq },
    spanId: 's',
    startedAt: new Date(1_700_000_000_000 + seq).toISOString(),
  };
}

describe('PostgresStore option intake', () => {
  it('refuses a malformed url, schema, ttl, and pool size before any connection', () => {
    expect(() => new PostgresStore({ url: '' })).toThrow(ConfigError);
    expect(() => new PostgresStore({ url: 'postgres://x', schema: 'bad-name' })).toThrow(
      /schema must be a plain SQL identifier/,
    );
    for (const ttlMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, 2_147_483_648]) {
      expect(() => new PostgresStore({ url: 'postgres://x', ttlMs })).toThrow(
        /ttlMs must be an integer between 1 and 2147483647 ms/,
      );
    }
    expect(() => new PostgresStore({ url: 'postgres://x', max: 0 })).toThrow(
      /max must be a positive integer/,
    );
  });
});

describeDb('cross-instance fencing over one schema (two processes in production)', () => {
  it('a takeover on instance B fences instance A out of every write surface', async () => {
    const a = fresh({ ttlMs: 120 });
    const schema = schemas[schemas.length - 1];
    const b = over(schema, { ttlMs: 120 });

    const stale = await a.acquire('RUN', 'worker-a');
    await a.append('RUN', entry(1), stale);
    // The ttl elapses; B takes over and advances the epoch.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const takeover = await b.acquire('RUN', 'worker-b');
    expect(takeover.epoch).toBe(stale.epoch + 1);

    // Every write surface of the superseded holder rejects typed and
    // mutates nothing, from the OTHER instance's point of view too.
    await expect(a.append('RUN', entry(2), stale)).rejects.toThrow(LeaseHeldError);
    await expect(
      a.putMeta({ runId: 'RUN', status: 'ok', updatedAt: 'now' }, stale),
    ).rejects.toThrow(LeaseHeldError);
    await expect(a.delete('RUN', stale)).rejects.toThrow(LeaseHeldError);
    await expect(a.transcripts().put('RUN/blob', new Uint8Array([1]), stale)).rejects.toThrow(
      LeaseHeldError,
    );
    await expect(a.renew(stale)).rejects.toThrow(LeaseHeldError);

    const loaded = await b.load('RUN');
    expect(loaded.map((e) => e.seq)).toEqual([1]);
    // The successor writes fine.
    await b.append('RUN', entry(2), takeover);
    expect((await a.load('RUN')).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('A5 across instances: a stale-tail append loses with a typed JournalOrderViolation', async () => {
    const a = fresh();
    const schema = schemas[schemas.length - 1];
    const b = over(schema);
    await a.append('SEQ', entry(1));
    await b.append('SEQ', entry(2));
    await expect(a.append('SEQ', entry(2))).rejects.toThrow(JournalOrderViolation);
    await expect(b.append('SEQ', entry(1))).rejects.toThrow(JournalOrderViolation);
    expect((await a.load('SEQ')).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('concurrent unleased appends of the same seq admit exactly one', async () => {
    const a = fresh();
    const schema = schemas[schemas.length - 1];
    const b = over(schema);
    const results = await Promise.allSettled([
      a.append('RACE', entry(1)),
      b.append('RACE', entry(1)),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(JournalOrderViolation);
    expect((await a.load('RACE')).map((e) => e.seq)).toEqual([1]);
  });
});

describeDb('engine e2e over PostgresStore', () => {
  itDb(
    'a run journals through postgres and a second engine resumes it with zero adapter calls',
    async () => {
      const store = fresh();
      const wf = defineWorkflow({ name: 'pg-e2e' }, async (ctx) => {
        const answer = await ctx.agent('say something durable');
        return { answer };
      });
      const adapterA = {
        id: 'fake',
        caps: () => ({
          structuredOutput: 'native' as const,
          supportsTemperature: false,
          supportsParallelTools: true,
          reasoningEfforts: ['low' as const, 'medium' as const, 'high' as const],
          contextWindow: 200_000,
          maxOutputTokens: 4_096,
        }),
        // eslint-disable-next-line @typescript-eslint/require-await
        async *stream() {
          yield { type: 'text-delta' as const, text: 'durable answer' };
          yield {
            type: 'finish' as const,
            finish: { reason: 'stop' as const },
            usage: { inputTokens: 3, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
        },
      };
      const engineA = createEngine({
        adapters: [adapterA],
        stores: { journal: store, transcripts: store.transcripts() },
        defaults: { routing: { loop: 'fake:model' } },
      });
      const first = await engineA.run(wf, undefined, { runId: 'PG-E2E' }).result;
      expect(first.status).toBe('ok');
      expect(first.value).toEqual({ answer: 'durable answer' });

      let liveCalls = 0;
      const adapterB = {
        ...adapterA,
        // eslint-disable-next-line @typescript-eslint/require-await
        async *stream() {
          liveCalls += 1;
          yield { type: 'text-delta' as const, text: 'MUST NOT RUN' };
          yield {
            type: 'finish' as const,
            finish: { reason: 'stop' as const },
            usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
        },
      };
      const schema = schemas[schemas.length - 1];
      const storeB = over(schema);
      const engineB = createEngine({
        adapters: [adapterB],
        stores: { journal: storeB, transcripts: storeB.transcripts() },
        defaults: { routing: { loop: 'fake:model' } },
      });
      const resumed = await engineB.resume('PG-E2E', wf).result;
      expect(resumed.status).toBe('ok');
      expect(resumed.value).toEqual({ answer: 'durable answer' });
      expect(liveCalls).toBe(0);
    },
  );
});
