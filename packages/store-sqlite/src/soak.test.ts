/**
 * The adversarial multi-process soak over SqliteStore (the fenced run
 * state RFC, phase 3's last open item): real OS processes storm one
 * database file through every write surface (journal append, meta,
 * transcript blobs, fenced deletion, renew, release) with injected
 * stalls past the lease ttl, and the referee diffs the actual store
 * state against the one serial history the fencing epochs promise.
 * Runs until an activity quorum is met, so a slow machine storms
 * longer instead of asserting on thin coverage.
 *
 * The writer script is generated into the scratch directory with the
 * built dist entries baked in as absolute URLs (a child process
 * resolves neither vitest aliases nor this package's node_modules from
 * a temp dir). Construction is bare on purpose: concurrent boot over
 * one fresh file is part of the promise under test.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { runMultiProcessSoak } from '@rulvar/store-conformance';

import { SqliteStore } from './store.js';

const storeDistUrl = new URL('../dist/index.js', import.meta.url).href;
const conformanceDistUrl = pathToFileURL(
  createRequire(import.meta.url).resolve('@rulvar/store-conformance'),
).href;

const WRITER_SCRIPT = `
import { SqliteStore } from ${JSON.stringify(storeDistUrl)};
import { runSoakWriter, soakWriterConfigFromEnv } from ${JSON.stringify(conformanceDistUrl)};

const config = soakWriterConfigFromEnv();
const store = new SqliteStore({ path: config.storePath, ttlMs: config.ttlMs });
const busy = (thrown) => {
  const errcode = thrown?.errcode;
  return errcode !== undefined && (errcode & 0xff) === 5;
};
await runSoakWriter({ journal: store, transcripts: store.transcripts() }, config, {
  retryable: busy,
});
store.close();
`;

describe('multi-process soak (RFC phase 3): every write surface under real processes', () => {
  it('three writers storm one file to quorum with zero fencing violations', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-mp-soak-'));
    const writerScript = join(dir, 'soak-writer.mjs');
    writeFileSync(writerScript, WRITER_SCRIPT);
    const result = await runMultiProcessSoak({
      writerScript,
      dir,
      openStore: (storePath) => {
        const store = new SqliteStore({ path: storePath, ttlMs: 250 });
        return { journal: store, transcripts: store.transcripts() };
      },
      closeStore: (fixture) => {
        (fixture.journal as SqliteStore).close();
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

  it('concurrent multi-process construction over one fresh file all boots clean', async () => {
    // Eight processes construct over the SAME fresh path at once (a
    // fleet start): before the boot-scoped busy retry, the schema
    // bootstrap collided and most of the fleet died in the constructor
    // with a raw SQLITE_BUSY (60 percent at six processes).
    const script = `
import { SqliteStore } from ${JSON.stringify(storeDistUrl)};
const store = new SqliteStore({ path: process.env.RULVAR_BOOT_DB, ttlMs: 250 });
store.close();
`;
    for (let round = 0; round < 2; round += 1) {
      const dir = mkdtempSync(join(tmpdir(), 'rulvar-boot-race-'));
      const scriptPath = join(dir, 'boot.mjs');
      writeFileSync(scriptPath, script);
      const dbPath = join(dir, 'fresh.db');
      const children = Array.from({ length: 8 }, () =>
        spawn(process.execPath, [scriptPath], {
          env: { ...process.env, RULVAR_BOOT_DB: dbPath },
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
