/**
 * Durable admission over postgres (plan 45), gated on
 * RULVAR_POSTGRES_URL exactly like the conformance file: the state
 * document survives the holder and a fresh scheduler over the same
 * schema recovers tickets by unit identity.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import type { AdmissionRequest } from '@rulvar/core';

import { admissionConformance, registerConformance } from '@rulvar/store-conformance';

import { PostgresAdmissionScheduler } from './admission.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);

const SUITE_ID = randomUUID().replaceAll('-', '').slice(0, 10);
const schemas: string[] = [];

const CONFIG = {
  levels: { tenant: { algorithm: 'sliding-window' as const, capWires: 2, windowMs: 60_000 } },
  leaseTtlMs: 30_000,
};

const request = (unitId: string, wires = 1): AdmissionRequest => ({
  unitId,
  generation: 'g1',
  resolvedTenant: 'acme',
  reservation: { wires },
});

describeDb('PostgresAdmissionScheduler durability', () => {
  it('a queued ticket survives the holder and settles once', async () => {
    const schema = `rulvar_adm_${SUITE_ID}`;
    schemas.push(schema);
    const now = { ms: 0 };
    const first = new PostgresAdmissionScheduler({
      url: url ?? '',
      schema,
      config: CONFIG,
      now: () => now.ms,
    });
    expect((await first.enqueue(request('a', 2), 'op-a')).state).toBe('granted');
    expect((await first.enqueue(request('b'), 'op-b')).state).toBe('queued');
    await first.close();
    const second = new PostgresAdmissionScheduler({
      url: url ?? '',
      schema,
      config: CONFIG,
      now: () => now.ms,
    });
    expect((await second.recover('a', 'g1', 'op-r1')).state).toBe('granted');
    const recoveredB = await second.recover('b', 'g1', 'op-r2');
    expect(recoveredB.state).toBe('queued');
    await second.release('a', 'g1', { wires: 2 }, 'op-release');
    await second.release('a', 'g1', { wires: 2 }, 'op-release');
    now.ms = 61_000;
    const pumped = await second.pump('op-pump');
    expect(pumped.map((t) => t.unitId)).toEqual(['b']);
    await second.close();
  });
});

afterAll(async () => {
  if (hasDb && schemas.length > 0) {
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    for (const schema of schemas) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    }
    await pool.end();
  }
});

let kitCounter = 0;
describeDb('admission conformance (postgres)', () => {
  registerConformance(
    admissionConformance({
      make: (config, now) => {
        kitCounter += 1;
        const schema = `rulvar_admk_${SUITE_ID}_${String(kitCounter)}`;
        schemas.push(schema);
        let current = new PostgresAdmissionScheduler({ url: url ?? '', schema, config, now });
        return {
          get scheduler() {
            return current;
          },
          reopen: () => {
            void current.close();
            current = new PostgresAdmissionScheduler({ url: url ?? '', schema, config, now });
            return current;
          },
          close: () => current.close(),
        };
      },
    }),
    {
      describe,
      // The matrix's burst rows make hundreds of document-CAS calls;
      // they carry their own bound instead of the 5 s default.
      it: (name, fn) => {
        it(name, fn, 30_000);
      },
    },
  );
});

describe('the advisory lock bound (RV4804)', () => {
  it('a malformed lockTimeoutMs refuses typed at construction', () => {
    expect(
      () =>
        new PostgresAdmissionScheduler({
          url: 'postgres://unused',
          config: CONFIG,
          lockTimeoutMs: 0,
        }),
    ).toThrow('lockTimeoutMs');
  });
});

describeDb('the advisory lock bound over a live schema (RV4804)', () => {
  it('a held scheduler lock refuses typed and retryable past lockTimeoutMs', async () => {
    // A holder that hangs mid-transaction used to block every
    // lifecycle call of the whole fleet forever; the bound turns the
    // camp into the typed retryable LeaseHeldError.
    const schema = `rulvar_admlk_${SUITE_ID}`;
    schemas.push(schema);
    const sched = new PostgresAdmissionScheduler({
      url: url ?? '',
      schema,
      config: CONFIG,
      lockTimeoutMs: 200,
      now: () => 0,
    });
    expect((await sched.enqueue(request('warm'), 'op-warm')).state).toBe('granted');
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, $2))', [
      `rulvar-adm:${schema}:default`,
      0x52_55_4c_41,
    ]);
    try {
      await expect(sched.recover('warm', 'g1', 'op-blocked')).rejects.toMatchObject({
        code: 'lease_held',
      });
    } finally {
      await client.query('ROLLBACK');
      client.release();
      await pool.end();
      await sched.close();
    }
  }, 15_000);
});
