/**
 * PostgresQuotaLimiter (RV410): the multi-host reference limiter
 * mirrors memoryQuotaLimiter's and SqliteQuotaLimiter's semantics over
 * one database, so limiter INSTANCES on several hosts coordinate one
 * global quota, and reconciliation works from any of them. Gated on
 * RULVAR_POSTGRES_URL exactly like the store conformance: without a
 * database everything but the constructor refusals skips (CI provides
 * a service container); locally, point it at any postgres, e.g.
 *   docker run -d -e POSTGRES_PASSWORD=rulvar -p 54329:5432 postgres:16
 *   RULVAR_POSTGRES_URL=postgres://postgres:rulvar@127.0.0.1:54329/postgres
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import {
  ConfigError,
  InMemoryStore,
  QUOTA_WINDOW_MS,
  createEngine,
  defineWorkflow,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type QuotaReservationRequest,
} from '@rulvar/core';

import {
  PostgresQuotaLimiter,
  QUOTA_LOCK_TIMEOUT_MS,
  QuotaDeadlineError,
  quotaRulesFingerprint,
} from './quota.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);

const SUITE_ID = randomUUID().replaceAll('-', '').slice(0, 10);
let schemaCounter = 0;
const schemas: string[] = [];
const limiters: PostgresQuotaLimiter[] = [];

/** A fresh schema name; tracked for teardown. */
function freshSchema(): string {
  schemaCounter += 1;
  const schema = `rulvar_q_${SUITE_ID}_${String(schemaCounter)}`;
  schemas.push(schema);
  return schema;
}

/** A limiter over a schema; tracked for teardown. */
function limiterOver(
  schema: string,
  options: Omit<ConstructorParameters<typeof PostgresQuotaLimiter>[0], 'url' | 'schema'>,
): PostgresQuotaLimiter {
  const limiter = new PostgresQuotaLimiter({ url: url ?? '', schema, max: 2, ...options });
  limiters.push(limiter);
  return limiter;
}

afterAll(async () => {
  for (const limiter of limiters) {
    await limiter.close();
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

const request = (over: Partial<QuotaReservationRequest> = {}): QuotaReservationRequest => ({
  provider: 'fake',
  model: 'fake-model',
  estimate: { requests: 1, inputTokens: 10 },
  ...over,
});

describe('PostgresQuotaLimiter construction refusals (no database needed)', () => {
  it('refuses out-of-domain options with a typed ConfigError before any connection', () => {
    expect(() => new PostgresQuotaLimiter({ url: '', rules: [{ requestsPerMinute: 1 }] })).toThrow(
      ConfigError,
    );
    expect(
      () =>
        new PostgresQuotaLimiter({
          url: 'postgres://nobody@localhost:1/none',
          rules: [],
        }),
    ).toThrow(/at least one rule/);
    expect(
      () =>
        new PostgresQuotaLimiter({
          url: 'postgres://nobody@localhost:1/none',
          schema: 'bad-schema',
          rules: [{ requestsPerMinute: 1 }],
        }),
    ).toThrow(/plain SQL identifier/);
    expect(
      () =>
        new PostgresQuotaLimiter({
          url: 'postgres://nobody@localhost:1/none',
          max: 0,
          rules: [{ requestsPerMinute: 1 }],
        }),
    ).toThrow(ConfigError);
  });

  it('refuses an admission deadline that is not an integer above the internal lock bound', () => {
    const base = {
      url: 'postgres://nobody@localhost:1/none',
      rules: [{ requestsPerMinute: 1 }],
    };
    // The 2000 ms lock_timeout is an INTERNAL stage of the admission
    // path; a full-path deadline at or below it could never be the
    // bound that fires, so the constructor refuses the misconfiguration
    // instead of shipping a dead knob.
    expect(
      () => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: QUOTA_LOCK_TIMEOUT_MS }),
    ).toThrow(/greater than/);
    expect(() => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: 0 })).toThrow(
      ConfigError,
    );
    expect(() => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: 2_500.5 })).toThrow(
      ConfigError,
    );
    expect(() => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: 2_001 })).not.toThrow();
  });

  it('fingerprints identical rule sets identically regardless of order', () => {
    const one = [
      { provider: 'fake', requestsPerMinute: 3 },
      { provider: 'fake', tokensPerMinute: 500 },
    ];
    const two = [
      { provider: 'fake', tokensPerMinute: 500 },
      { provider: 'fake', requestsPerMinute: 3 },
    ];
    expect(quotaRulesFingerprint(one)).toBe(quotaRulesFingerprint(two));
    expect(quotaRulesFingerprint(one)).toMatch(/^[0-9a-f]{64}$/);
    expect(quotaRulesFingerprint(one)).not.toBe(
      quotaRulesFingerprint([{ provider: 'fake', requestsPerMinute: 4 }]),
    );
  });
});

describeDb('PostgresQuotaLimiter semantics', () => {
  it('admits, denies with the window remainder, and reconciles like the references', async () => {
    let at = QUOTA_WINDOW_MS * 100 + 15_000;
    const limiter = limiterOver(freshSchema(), {
      rules: [
        { provider: 'fake', requestsPerMinute: 2 },
        { provider: 'fake', tokensPerMinute: 100 },
      ],
      now: () => at,
    });
    const first = await limiter.reserve(
      request({ estimate: { requests: 1, inputTokens: 40, maxOutputTokens: 40 } }),
    );
    expect(first.granted).toBe(true);
    // 80 of 100 tokens estimated: an 80-token estimate cannot fit.
    const blocked = await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }));
    expect(blocked).toEqual({
      granted: false,
      retryAfterMs: 45_000,
      reason: 'tokensPerMinute 100 exhausted',
    });
    // The first attempt settles at 15 actual tokens; now it fits, and
    // the request cap (2) becomes the binding rule for the third call.
    await limiter.reconcile((first as { reservationId: string }).reservationId, {
      inputTokens: 10,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect((await limiter.snapshot())[1]?.tokens).toBe(15);
    expect(
      (await limiter.reserve(request({ estimate: { requests: 1, inputTokens: 80 } }))).granted,
    ).toBe(true);
    const third = await limiter.reserve(request());
    expect(third).toEqual({
      granted: false,
      retryAfterMs: 45_000,
      reason: 'requestsPerMinute 2 exhausted',
    });
    // The next window admits again.
    at += QUOTA_WINDOW_MS;
    expect((await limiter.reserve(request())).granted).toBe(true);
  });

  it('two instances over one schema enforce one cap, and reconcile crosses instances', async () => {
    const schema = freshSchema();
    const at = QUOTA_WINDOW_MS * 9;
    const rules = [{ provider: 'fake', requestsPerMinute: 3, tokensPerMinute: 1_000 }];
    const a = limiterOver(schema, { rules, now: () => at });
    const b = limiterOver(schema, { rules, now: () => at });
    const first = await a.reserve(request({ estimate: { requests: 1, inputTokens: 600 } }));
    expect(first.granted).toBe(true);
    expect((await b.reserve(request())).granted).toBe(true);
    expect((await a.reserve(request())).granted).toBe(true);
    // The shared request cap of 3 is exhausted for BOTH instances.
    expect((await b.reserve(request())).granted).toBe(false);
    expect((await a.reserve(request())).granted).toBe(false);
    // Instance B reconciles the reservation instance A granted.
    await b.reconcile((first as { reservationId: string }).reservationId, {
      inputTokens: 5,
      outputTokens: 5,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect((await a.snapshot())[0]?.tokens).toBe(30);
    expect((await b.snapshot())[0]?.requests).toBe(3);
  });

  it('a concurrent storm over two instances never over-admits the window', async () => {
    const schema = freshSchema();
    const at = QUOTA_WINDOW_MS * 40;
    const rules = [{ provider: 'fake', requestsPerMinute: 25 }];
    const a = limiterOver(schema, { rules, now: () => at });
    const b = limiterOver(schema, { rules, now: () => at });
    // 60 concurrent admissions against a cap of 25, alternating
    // instances: every reserve is its own pool client and transaction,
    // so this contends on the advisory lock for real.
    const decisions = await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        (i % 2 === 0 ? a : b).reserve(request({ estimate: { requests: 1, inputTokens: 1 } })),
      ),
    );
    const granted = decisions.filter((decision) => decision.granted).length;
    const denied = decisions.length - granted;
    expect(granted).toBe(25);
    expect(denied).toBe(35);
    for (const decision of decisions) {
      if (!decision.granted) {
        expect(decision.retryAfterMs).toBeGreaterThanOrEqual(0);
      }
    }
    // Every grant is accounted in exactly one bucket row: admission was
    // atomic (a lost update would leave granted above the recorded sum).
    const snapshot = await a.snapshot();
    expect(snapshot[0]?.requests).toBe(25);
  });

  it('a call still waiting past the lock timeout throws instead of hanging', async () => {
    const schema = freshSchema();
    const rules = [{ provider: 'fake', requestsPerMinute: 5 }];
    const limiter = limiterOver(schema, { rules });
    // Prime the bootstrap so the contended call goes straight to the
    // admission lock.
    expect((await limiter.reserve(request())).granted).toBe(true);
    // A raw client camps on the SAME advisory lock in an open
    // transaction; the limiter's next admission must give up with a
    // typed driver error once QUOTA_LOCK_TIMEOUT_MS passes, which is
    // what the engine's onLimiterError policy consumes.
    const camper = new pg.Client({ connectionString: url });
    await camper.connect();
    await camper.query('BEGIN');
    await camper.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
      `${schema}:rulvar-quota`,
      8_214,
    ]);
    const started = Date.now();
    await expect(limiter.reserve(request())).rejects.toThrow(/lock timeout|canceling statement/);
    expect(Date.now() - started).toBeGreaterThanOrEqual(QUOTA_LOCK_TIMEOUT_MS - 100);
    await camper.query('ROLLBACK');
    await camper.end();
  }, 20_000);

  it('the FULL admission path is bounded by admissionDeadlineMs and the refused connection does not leak', async () => {
    const schema = freshSchema();
    const rules = [{ provider: 'fake', requestsPerMinute: 50 }];
    // Pool of ONE client and a 2600 ms full deadline: call A occupies
    // the only client waiting on the admission lock (its own 2000 ms
    // lock_timeout cancels it); call B spends ~2000 ms of its deadline
    // waiting for the checkout and the rest inside the transaction, so
    // NEITHER internal stage bound fires for B. Only a deadline over
    // the whole path (checkout wait PLUS transaction) can refuse it.
    const limiter = limiterOver(schema, { rules, max: 1, admissionDeadlineMs: 2_600 });
    // Prime the bootstrap so the timed calls measure admission alone.
    expect((await limiter.reserve(request())).granted).toBe(true);
    const camper = new pg.Client({ connectionString: url });
    await camper.connect();
    await camper.query('BEGIN');
    await camper.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
      `${schema}:rulvar-quota`,
      8_214,
    ]);
    const started = Date.now();
    const first = limiter.reserve(request()).then(
      () => 'granted',
      (thrown: unknown) => thrown,
    );
    const second = limiter.reserve(request());
    await expect(second).rejects.toThrow(QuotaDeadlineError);
    await expect(second).rejects.toThrow(/admission/);
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(2_500);
    expect(elapsed).toBeLessThan(4_000);
    expect(String(await first)).toMatch(/lock timeout|canceling statement/);
    await camper.query('ROLLBACK');
    await camper.end();
    // The deadline destroyed B's checked-out connection instead of
    // returning it dirty; the pool of one still serves fresh admissions.
    expect((await limiter.reserve(request())).granted).toBe(true);
  }, 20_000);

  it('a second instance with different rules is refused with both fingerprints, and acceptRulesUpdate rotates', async () => {
    const schema = freshSchema();
    const original = [{ provider: 'fake', requestsPerMinute: 50 }];
    const changed = [{ provider: 'fake', requestsPerMinute: 9 }];
    const a = limiterOver(schema, { rules: original });
    expect((await a.reserve(request())).granted).toBe(true);
    // A host with a drifted rule set must NOT silently split the budget
    // into its own buckets: boot compares the recorded fingerprint and
    // refuses typed, naming both hashes and the schema.
    const b = limiterOver(schema, { rules: changed });
    const refusal = await b.reserve(request()).then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    expect(refusal).toBeInstanceOf(ConfigError);
    expect(String(refusal)).toContain(quotaRulesFingerprint(original));
    expect(String(refusal)).toContain(quotaRulesFingerprint(changed));
    expect(String(refusal)).toContain(schema);
    // The refusal is stable: the cleared boot memo re-runs the check.
    await expect(b.reserve(request())).rejects.toThrow(ConfigError);
    // Rotation: a deployment booted with acceptRulesUpdate rewrites the
    // recorded fingerprint under the boot lock...
    const c = limiterOver(schema, { rules: changed, acceptRulesUpdate: true });
    expect((await c.reserve(request())).granted).toBe(true);
    // ...after which instances with the NEW rules boot clean without
    // the flag, and the ORIGINAL set is the refused one.
    const d = limiterOver(schema, { rules: changed });
    expect((await d.reserve(request())).granted).toBe(true);
    await expect(limiterOver(schema, { rules: original }).reserve(request())).rejects.toThrow(
      /fingerprint/,
    );
  });

  it('reordered identical rule sets share one fingerprint and coexist over one schema', async () => {
    const schema = freshSchema();
    const one = [
      { provider: 'fake', requestsPerMinute: 30 },
      { provider: 'fake', tokensPerMinute: 5_000 },
    ];
    const two = [
      { provider: 'fake', tokensPerMinute: 5_000 },
      { provider: 'fake', requestsPerMinute: 30 },
    ];
    const a = limiterOver(schema, { rules: one });
    const b = limiterOver(schema, { rules: two });
    expect((await a.reserve(request())).granted).toBe(true);
    expect((await b.reserve(request())).granted).toBe(true);
    // Both instances hit the SAME buckets: rule identity is content.
    expect((await a.snapshot())[0]?.requests).toBe(2);
  });
});

const caps: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
};

function answeringAdapter(): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => caps,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      calls.push(req);
      yield { type: 'text-delta', text: 'answered' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { inputTokens: 12, outputTokens: 7, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    },
  };
}

describeDb('two engines over one database (the RV410 acceptance, in-process form)', () => {
  it('the second engine is denied by the quota the first consumed', async () => {
    const schema = freshSchema();
    const rules = [{ provider: 'fake', requestsPerMinute: 1 }];
    // Frozen 1 ms before the window end: the denial's honest
    // window-remainder retryAfterMs is 1 ms, so the bounded retry
    // exhausts promptly instead of waiting out a real minute.
    const now = (): number => QUOTA_WINDOW_MS * 5 - 1;
    const wf = defineWorkflow({ name: 'ask' }, (ctx) => ctx.agent('go', { result: 'full' }));
    const engineFor = (adapter: ProviderAdapter, limiter: PostgresQuotaLimiter) =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        defaults: {
          routing: { loop: 'fake:model' },
          retry: { attempts: 2, backoff: { initialMs: 1, factor: 1, maxMs: 1 } },
        },
        quota: { limiter },
      });

    const adapterA = answeringAdapter();
    const limiterA = limiterOver(schema, { rules, now });
    const first = await engineFor(adapterA, limiterA).run(wf, undefined).result;
    expect(first.status).toBe('ok');
    expect(adapterA.calls.length).toBe(1);

    const adapterB = answeringAdapter();
    const limiterB = limiterOver(schema, { rules, now });
    const second = await engineFor(adapterB, limiterB).run(wf, undefined).result;
    expect(second.status).toBe('ok');
    const result = (second as { value: { status: string; error?: { kind: string } } }).value;
    expect(result.status).toBe('error');
    expect(result.error?.kind).toBe('rate-limit');
    expect(adapterB.calls.length).toBe(0);
    expect((await limiterB.snapshot())[0]?.requests).toBe(1);
  });
});
