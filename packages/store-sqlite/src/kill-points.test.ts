/**
 * The engine-level kill-point suite over SqliteStore (the 1.65.0
 * experiment review, P1.10): a real child process drives a scripted run
 * over one database file and SIGKILLs itself around each durable write
 * (the running entry, the ok terminal, the limit terminal, the run
 * settle, the meta projection); the referee resumes over the same file
 * and asserts the documented recovery semantics, exact re-pay counts
 * included. The writer script is generated with the built dist entries
 * baked in as absolute URLs (a child process resolves neither vitest
 * aliases nor this package's node_modules from a temp dir).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, it } from 'vitest';

import { killPointConformance, registerConformance } from '@rulvar/store-conformance';

import { SqliteStore } from './store.js';

const storeDistUrl = new URL('../dist/index.js', import.meta.url).href;
const conformanceDistUrl = pathToFileURL(
  createRequire(import.meta.url).resolve('@rulvar/store-conformance'),
).href;

const WRITER_SCRIPT = `
import { SqliteStore } from ${JSON.stringify(storeDistUrl)};
import { runKillPointWorker, killPointWorkerConfigFromEnv } from ${JSON.stringify(conformanceDistUrl)};

const config = killPointWorkerConfigFromEnv();
const store = new SqliteStore({ path: config.storePath, ttlMs: config.ttlMs });
await runKillPointWorker({ journal: store, transcripts: store.transcripts() }, config);
store.close();
`;

const dir = mkdtempSync(join(tmpdir(), 'rulvar-sqlite-kp-'));
const writerScript = join(dir, 'kp-writer.mjs');
writeFileSync(writerScript, WRITER_SCRIPT);

const opened: SqliteStore[] = [];
afterAll(() => {
  for (const store of opened) {
    store.close();
  }
});

registerConformance(
  killPointConformance({
    writerScript,
    dir,
    prepare: () => {
      const storePath = join(mkdtempSync(join(tmpdir(), 'rulvar-sqlite-kp-db-')), 'kp.db');
      return {
        storePath,
        openStore: () => {
          const store = new SqliteStore({ path: storePath, ttlMs: 300 });
          opened.push(store);
          return { journal: store, transcripts: store.transcripts() };
        },
        // Closed in afterAll: the fixture outlives the check only until
        // the file's teardown, and scenario ids keep the paths distinct.
        cleanup: () => undefined,
      };
    },
  }),
  { describe, it: (name, fn) => it(name, fn, 40_000) },
);
