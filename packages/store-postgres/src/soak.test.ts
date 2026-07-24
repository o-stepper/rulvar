/**
 * The adversarial multi-process soak over PostgresStore (the RV-214
 * acceptance): real OS processes storm ONE database schema through
 * every write surface (journal append, meta, transcript blobs, fenced
 * deletion, renew, release) with injected stalls past the lease ttl,
 * SIGKILL victim cycles, and the referee diffs the actual store state
 * against the one serial history the fencing epochs promise. Plus the
 * fleet boot race: concurrent construction over one fresh schema all
 * boots clean (the schema-scoped advisory lock serializes the DDL).
 *
 * Gated on RULVAR_POSTGRES_URL like the conformance file; the writer
 * script is generated with the built dist entries baked in as absolute
 * URLs (a child process resolves neither vitest aliases nor this
 * package's node_modules from a temp dir).
 */
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import pg from 'pg';

import { runMultiProcessSoak } from '@rulvar/store-conformance';

import { PostgresStore } from './store.js';

const url = process.env.RULVAR_POSTGRES_URL;
const hasDb = typeof url === 'string' && url !== '';
const describeDb = describe.skipIf(!hasDb);

const storeDistUrl = new URL('../dist/index.js', import.meta.url).href;
const conformanceDistUrl = pathToFileURL(
  createRequire(import.meta.url).resolve('@rulvar/store-conformance'),
).href;

const schemas: string[] = [];
const freshSchema = (): string => {
  const schema = `rulvar_soak_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  schemas.push(schema);
  return schema;
};

afterAll(async () => {
  if (!hasDb || schemas.length === 0) {
    return;
  }
  const admin = new pg.Pool({ connectionString: url, max: 1 });
  for (const schema of schemas) {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
  await admin.end();
});

const WRITER_SCRIPT = `
import { PostgresStore } from ${JSON.stringify(storeDistUrl)};
import { runSoakWriter, soakWriterConfigFromEnv } from ${JSON.stringify(conformanceDistUrl)};

const config = soakWriterConfigFromEnv();
// The store LOCATION for postgres is the database url plus the soak's
// schema, not the harness-minted file path.
const store = new PostgresStore({
  url: process.env.RULVAR_POSTGRES_URL,
  schema: process.env.RULVAR_PG_SOAK_SCHEMA,
  ttlMs: config.ttlMs,
  max: 3,
});
// Transient connection loss is retryable (a victim cycle can sever a
// neighbor's server connection mid-checkout); contract rejections
// (LeaseHeldError and friends) are the harness's own currency and are
// never classified here.
const retryable = (thrown) => {
  const code = thrown?.code;
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === '57P01' ||
    code === '08003' ||
    code === '08006' ||
    /Connection terminated/i.test(String(thrown?.message ?? ''))
  );
};
await runSoakWriter({ journal: store, transcripts: store.transcripts() }, config, {
  retryable,
});
await store.close();
`;

describeDb('multi-process soak over one postgres schema (RV-214 acceptance)', () => {
  it('three writers storm one schema to quorum with zero fencing violations', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-pg-soak-'));
    const writerScript = join(dir, 'soak-writer.mjs');
    writeFileSync(writerScript, WRITER_SCRIPT);
    const schema = freshSchema();
    const opened: PostgresStore[] = [];
    const result = await runMultiProcessSoak({
      writerScript,
      dir,
      env: { RULVAR_POSTGRES_URL: url ?? '', RULVAR_PG_SOAK_SCHEMA: schema },
      openStore: () => {
        const store = new PostgresStore({ url: url ?? '', schema, ttlMs: 250, max: 3 });
        opened.push(store);
        return { journal: store, transcripts: store.transcripts() };
      },
      closeStore: async () => {
        for (const store of opened) {
          await store.close();
        }
      },
    });
    // The quorum is the floor; the run reaching it is the assertion
    // that the storm actually exercised every surface.
    expect(result.activity.epochs).toBeGreaterThanOrEqual(4);
    expect(result.activity.staleRejects).toBeGreaterThanOrEqual(16);
    expect(result.activity.victimCycles).toBeGreaterThanOrEqual(1);
    expect(result.activity.liveCrossRejects).toBeGreaterThanOrEqual(1);
    expect(result.journalEntries).toBeGreaterThanOrEqual(8);
  }, 120_000);

  it('concurrent multi-process construction over one fresh schema all boots clean', async () => {
    // Eight processes construct AND lazily bootstrap over the SAME
    // fresh schema at once (a fleet start): the schema-scoped advisory
    // transaction lock serializes the idempotent DDL, so nobody dies
    // on a duplicate-object race.
    const script = `
import { PostgresStore } from ${JSON.stringify(storeDistUrl)};
const store = new PostgresStore({
  url: process.env.RULVAR_POSTGRES_URL,
  schema: process.env.RULVAR_PG_BOOT_SCHEMA,
  ttlMs: 250,
  max: 2,
});
// Boot is lazy: touch the store so the bootstrap actually runs.
await store.getMeta('boot-probe');
await store.close();
`;
    for (let round = 0; round < 2; round += 1) {
      const dir = mkdtempSync(join(tmpdir(), 'rulvar-pg-boot-'));
      const scriptPath = join(dir, 'boot.mjs');
      writeFileSync(scriptPath, script);
      const schema = freshSchema();
      const children = Array.from({ length: 8 }, () =>
        spawn(process.execPath, [scriptPath], {
          env: {
            ...process.env,
            RULVAR_POSTGRES_URL: url ?? '',
            RULVAR_PG_BOOT_SCHEMA: schema,
          },
          stdio: ['ignore', 'ignore', 'pipe'],
        }),
      );
      const outcomes = await Promise.all(
        children.map(
          (child) =>
            new Promise<{ code: number | null; stderr: string }>((resolve) => {
              let stderr = '';
              child.stderr.on('data', (chunk: Buffer) => {
                stderr += String(chunk);
              });
              child.on('exit', (code) => resolve({ code, stderr }));
            }),
        ),
      );
      for (const { code, stderr } of outcomes) {
        expect(code, stderr).toBe(0);
      }
    }
  }, 60_000);
});
