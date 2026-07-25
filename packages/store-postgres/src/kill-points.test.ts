/**
 * The engine-level kill-point suite over PostgresStore (the 1.65.0
 * experiment review, P1.10): a real child process drives a scripted run
 * over one schema and SIGKILLs itself around each durable write (the
 * running entry, the ok terminal, the limit terminal, the run settle,
 * the meta projection), severing its pool connections mid-flight; the
 * referee resumes over the same schema from this process and asserts
 * the documented recovery semantics, exact re-pay counts included.
 * Gated on RULVAR_POSTGRES_URL like the conformance file; the writer
 * script is generated with the built dist entries baked in as absolute
 * URLs.
 */
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, it } from 'vitest';
import pg from 'pg';

import { killPointConformance, registerConformance } from '@rulvar/store-conformance';

import { PostgresStore } from './store.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);

const storeDistUrl = new URL('../dist/index.js', import.meta.url).href;
const conformanceDistUrl = pathToFileURL(
  createRequire(import.meta.url).resolve('@rulvar/store-conformance'),
).href;

const WRITER_SCRIPT = `
import { PostgresStore } from ${JSON.stringify(storeDistUrl)};
import { runKillPointWorker, killPointWorkerConfigFromEnv } from ${JSON.stringify(conformanceDistUrl)};

const config = killPointWorkerConfigFromEnv();
// The store LOCATION for postgres is the database url plus the
// scenario's schema, not the harness-minted file path.
const store = new PostgresStore({
  url: process.env.RULVAR_POSTGRES_URL,
  schema: process.env.RULVAR_PG_KP_SCHEMA,
  ttlMs: config.ttlMs,
  max: 3,
});
await runKillPointWorker({ journal: store, transcripts: store.transcripts() }, config);
await store.close();
`;

const dir = mkdtempSync(join(tmpdir(), 'rulvar-pg-kp-'));
const writerScript = join(dir, 'kp-writer.mjs');
writeFileSync(writerScript, WRITER_SCRIPT);

const SUITE_ID = randomUUID().replaceAll('-', '').slice(0, 10);
let schemaCounter = 0;
const schemas: string[] = [];
const opened: PostgresStore[] = [];

afterAll(async () => {
  for (const store of opened) {
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

// Registered UNCONDITIONALLY: without a database the skipIf registrar
// records the whole table as skipped (a file whose every suite lives
// behind `if (hasDb)` registers nothing on the no-service CI jobs, and
// vitest fails it with "No test suite found").
registerConformance(
  killPointConformance({
    writerScript,
    dir,
    prepare: () => {
      schemaCounter += 1;
      const schema = `rulvar_kp_${SUITE_ID}_${String(schemaCounter)}`;
      schemas.push(schema);
      return {
        env: { RULVAR_POSTGRES_URL: url ?? '', RULVAR_PG_KP_SCHEMA: schema },
        openStore: () => {
          const store = new PostgresStore({ url: url ?? '', schema, ttlMs: 300, max: 3 });
          opened.push(store);
          return { journal: store, transcripts: store.transcripts() };
        },
      };
    },
  }),
  { describe: describeDb, it: (name, fn) => it.skipIf(!hasDb)(name, fn, 40_000) },
);
