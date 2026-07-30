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
  MAX_TIMER_DELAY_MS,
  QUOTA_WINDOW_MS,
  createEngine,
  defineWorkflow,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
  type QuotaReservationRequest,
  type QuotaRule,
} from '@rulvar/core';

import { quotaRulesConformance, registerConformance } from '@rulvar/store-conformance';

import {
  PostgresQuotaLimiter,
  QUOTA_LOCK_TIMEOUT_MS,
  QuotaDeadlineError,
  QuotaGenerationError,
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

// The shared construction contract (RV704): duplicated rules are
// refused before any connection, byte for byte like every other
// reference limiter; validation precedes the pool, so no database is
// needed and the negative control's pool closes without connecting.
registerConformance(
  quotaRulesConformance(
    (rules) => new PostgresQuotaLimiter({ url: 'postgres://nobody@localhost:1/none', rules }),
  ),
  { describe, it },
);

describe('PostgresQuotaLimiter construction refusals (no database needed)', () => {
  it('refuses a duplicated rule under its own construction site (RV704)', () => {
    const rule: QuotaRule = { provider: 'fake', requestsPerMinute: 4 };
    expect(
      () =>
        new PostgresQuotaLimiter({
          url: 'postgres://nobody@localhost:1/none',
          rules: [rule, { ...rule }],
        }),
    ).toThrow(
      /PostgresQuotaLimiterOptions\.rules\[1\] duplicates PostgresQuotaLimiterOptions\.rules\[0\]/,
    );
  });

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

  it('refuses a non-boolean acceptRulesUpdate before any connection (RV608)', () => {
    const base = {
      url: 'postgres://nobody@localhost:1/none',
      rules: [{ requestsPerMinute: 1 }],
    };
    // The rotation opt-in authorizes rewriting the schema's recorded
    // rule identity; truthiness ("false", 1) must never be able to.
    expect(
      () => new PostgresQuotaLimiter({ ...base, acceptRulesUpdate: 'false' as never }),
    ).toThrow(/acceptRulesUpdate must be a boolean/);
    expect(() => new PostgresQuotaLimiter({ ...base, acceptRulesUpdate: 1 as never })).toThrow(
      ConfigError,
    );
    expect(() => new PostgresQuotaLimiter({ ...base, acceptRulesUpdate: false })).not.toThrow();
    expect(() => new PostgresQuotaLimiter({ ...base, acceptRulesUpdate: true })).not.toThrow();
  });

  it('refuses an admission deadline above the Node timer ceiling (RV608)', () => {
    const base = {
      url: 'postgres://nobody@localhost:1/none',
      rules: [{ requestsPerMinute: 1 }],
    };
    // Above the ceiling, setTimeout clamps to 1 ms: a configured
    // multi-week deadline would refuse every admission after about a
    // millisecond, so the constructor refuses it before the pool exists.
    expect(
      () => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: MAX_TIMER_DELAY_MS + 1 }),
    ).toThrow(/timer maximum/);
    expect(
      () => new PostgresQuotaLimiter({ ...base, admissionDeadlineMs: MAX_TIMER_DELAY_MS }),
    ).not.toThrow();
  });

  it('the deadline refusal narrates only what actually happened to a connection (RV608)', () => {
    // A refusal while WAITING held no connection, so claiming one was
    // destroyed misdirects the operator reading the incident.
    expect(new QuotaDeadlineError(2_500, 's', 'acquire').message).not.toMatch(/destroyed/);
    expect(new QuotaDeadlineError(2_500, 's', 'transaction').message).toMatch(/destroyed/);
    expect(new QuotaDeadlineError(2_500, 's', 'bootstrap').message).toMatch(/bootstrap/);
    expect(new QuotaDeadlineError(2_500, 's', 'bootstrap').message).toMatch(
      /was committed|committed/,
    );
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
    // Frozen mid-window: on the real clock, two reserves landing just
    // before a minute boundary read back as zero after it rolls (seen
    // once in CI, run 30458711808), which is window math working, not
    // coexistence failing. Freezing pins the assertion to one window.
    const at = QUOTA_WINDOW_MS * 850 + 10_000;
    const one = [
      { provider: 'fake', requestsPerMinute: 30 },
      { provider: 'fake', tokensPerMinute: 5_000 },
    ];
    const two = [
      { provider: 'fake', tokensPerMinute: 5_000 },
      { provider: 'fake', requestsPerMinute: 30 },
    ];
    const a = limiterOver(schema, { rules: one, now: () => at });
    const b = limiterOver(schema, { rules: two, now: () => at });
    expect((await a.reserve(request())).granted).toBe(true);
    expect((await b.reserve(request())).granted).toBe(true);
    // Both instances hit the SAME buckets: rule identity is content.
    expect((await a.snapshot())[0]?.requests).toBe(2);
  });
});

describeDb('quota generations, rotation, and the snapshot (RV608)', () => {
  it('rotation carries current-window consumption conservatively', async () => {
    const schema = freshSchema();
    const at = QUOTA_WINDOW_MS * 500 + 10_000;
    const a = limiterOver(schema, {
      rules: [{ provider: 'fake', requestsPerMinute: 3 }],
      now: () => at,
    });
    expect((await a.reserve(request())).granted).toBe(true);
    expect((await a.reserve(request())).granted).toBe(true);
    // Rotate to a HIGHER cap mid-window: the new bucket must inherit
    // the two consumed requests, so the raise grants the difference,
    // never a fresh full window on top of old consumption.
    const b = limiterOver(schema, {
      rules: [{ provider: 'fake', requestsPerMinute: 4 }],
      acceptRulesUpdate: true,
      now: () => at,
    });
    expect((await b.reserve(request())).granted).toBe(true);
    expect((await b.reserve(request())).granted).toBe(true);
    const fifth = await b.reserve(request());
    expect(fifth.granted).toBe(false);
    expect((await b.snapshot())[0]?.requests).toBe(4);
  });

  it('a booted host is fenced typed after rotation instead of admitting under retired rules', async () => {
    const schema = freshSchema();
    const at = QUOTA_WINDOW_MS * 600;
    const stale = limiterOver(schema, {
      rules: [{ provider: 'fake', requestsPerMinute: 50 }],
      now: () => at,
    });
    expect((await stale.reserve(request())).granted).toBe(true);
    const rotator = limiterOver(schema, {
      rules: [{ provider: 'fake', requestsPerMinute: 2 }],
      acceptRulesUpdate: true,
      now: () => at,
    });
    // The carry counts the stale host's grant against the new cap.
    expect((await rotator.reserve(request())).granted).toBe(true);
    // The stale host's next admission re-reads the schema's identity
    // INSIDE its transaction and is fenced typed, never silently
    // admitting under retired bucket keys.
    const fenced = await stale.reserve(request()).then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    expect(fenced).toBeInstanceOf(QuotaGenerationError);
    expect(String(fenced)).toContain(schema);
    expect(String(fenced)).toMatch(/generation/);
    // The fence cleared the boot memo: the NEXT call re-boots and gets
    // the honest boot-time fingerprint refusal.
    await expect(stale.reserve(request())).rejects.toThrow(ConfigError);
    // Reconcile from the fenced host is refused the same way; its
    // reservation ages out with the window, the documented residue.
    await expect(
      stale.reconcile('r-any', {
        inputTokens: 1,
        outputTokens: 1,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    ).rejects.toThrow(/fingerprint|generation/);
  });

  it('a held boot lock cannot produce a late rotation commit after the caller was refused', async () => {
    const schema = freshSchema();
    const original = [{ provider: 'fake', requestsPerMinute: 5 }];
    const a = limiterOver(schema, { rules: original });
    expect((await a.reserve(request())).granted).toBe(true);
    // A raw client camps on the BOOT lock in an open transaction; the
    // rotating limiter's bootstrap must be refused within its own
    // bounds, and releasing the lock afterwards must NOT let an
    // abandoned bootstrap commit the rotation late.
    const camper = new pg.Client({ connectionString: url });
    await camper.connect();
    await camper.query('BEGIN');
    await camper.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
      `rulvar-quota-boot:${schema}`,
      8_214,
    ]);
    const changed = [{ provider: 'fake', requestsPerMinute: 9 }];
    const rotator = limiterOver(schema, {
      rules: changed,
      acceptRulesUpdate: true,
      admissionDeadlineMs: 4_000,
    });
    const started = Date.now();
    await expect(rotator.reserve(request())).rejects.toThrow(
      /lock timeout|canceling statement|deadline/,
    );
    // Bounded by the bootstrap's own lock_timeout, NOT by when the
    // camper happens to release.
    expect(Date.now() - started).toBeLessThan(2_600);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await camper.query('ROLLBACK');
    await camper.end();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const meta = new pg.Client({ connectionString: url });
    await meta.connect();
    const recorded = (
      (
        await meta.query(
          `SELECT value FROM "${schema}".rulvar_quota_meta WHERE key = 'rules_fingerprint'`,
        )
      ).rows as Array<{ value: string }>
    )[0]?.value;
    await meta.end();
    expect(recorded).toBe(quotaRulesFingerprint(original));
    // The schema still serves the original set cleanly.
    expect((await a.reserve(request())).granted).toBe(true);
  }, 20_000);

  it('caller mutation after construction changes no decision and not the recorded fingerprint', async () => {
    const schema = freshSchema();
    const rules: QuotaRule[] = [{ provider: 'fake', requestsPerMinute: 1 }];
    const at = QUOTA_WINDOW_MS * 700;
    const limiter = limiterOver(schema, { rules, now: () => at });
    // Mutate BEFORE the first admission (the fingerprint is recorded at
    // the lazy boot) and after it: neither may reach a decision or the
    // recorded identity.
    rules[0].requestsPerMinute = 100;
    expect((await limiter.reserve(request())).granted).toBe(true);
    rules.push({ provider: 'fake', tokensPerMinute: 1 });
    expect((await limiter.reserve(request())).granted).toBe(false);
    // A sibling declaring the ORIGINAL set matches the recorded
    // fingerprint and shares the same exhausted bucket.
    const sibling = limiterOver(schema, {
      rules: [{ provider: 'fake', requestsPerMinute: 1 }],
      now: () => at,
    });
    expect((await sibling.reserve(request())).granted).toBe(false);
  });

  it('permuted identical rule sets yield the byte-identical denial object over one schema', async () => {
    const schema = freshSchema();
    const at = QUOTA_WINDOW_MS * 800 + 30_000;
    const ruleA = { provider: 'fake', requestsPerMinute: 1 };
    const ruleB = { provider: 'fake', tokensPerMinute: 5 };
    const one = limiterOver(schema, { rules: [ruleA, ruleB], now: () => at });
    const two = limiterOver(schema, { rules: [ruleB, ruleA], now: () => at });
    expect(
      (await one.reserve(request({ estimate: { requests: 1, inputTokens: 2 } }))).granted,
    ).toBe(true);
    const d1 = await one.reserve(request({ estimate: { requests: 1, inputTokens: 10 } }));
    const d2 = await two.reserve(request({ estimate: { requests: 1, inputTokens: 10 } }));
    expect(d1).toEqual({
      granted: false,
      retryAfterMs: 30_000,
      reason: 'requestsPerMinute 1 exhausted',
    });
    expect(JSON.stringify(d2)).toBe(JSON.stringify(d1));
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
