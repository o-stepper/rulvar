/**
 * The effect lane kill point kit over the REAL postgres store (plan
 * 45), gated on RULVAR_POSTGRES_URL exactly like the conformance file.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, describe, it } from 'vitest';
import pg from 'pg';

import { effectsConformance } from '@rulvar/effects';
import { registerConformance } from '@rulvar/store-conformance';

import { PostgresStore } from './store.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);

const SUITE_ID = randomUUID().replaceAll('-', '').slice(0, 10);
let schemaCounter = 0;
const schemas: string[] = [];
const stores: PostgresStore[] = [];

function fresh(): PostgresStore {
  schemaCounter += 1;
  const schema = `rulvar_ek_${SUITE_ID}_${String(schemaCounter)}`;
  schemas.push(schema);
  const store = new PostgresStore({ url: url ?? '', schema, max: 2 });
  stores.push(store);
  return store;
}

describeDb('effects kill point kit (postgres)', () => {
  registerConformance(effectsConformance({ store: () => fresh() }), { describe, it });
});

afterAll(async () => {
  for (const store of stores) {
    await store.close().catch(() => undefined);
  }
  if (hasDb && schemas.length > 0) {
    const pool = new pg.Pool({ connectionString: url, max: 1 });
    for (const schema of schemas) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    }
    await pool.end();
  }
});
