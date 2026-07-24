/**
 * The RV-215 acceptance gate, multi-process form: real OS processes
 * over one database file never exceed the global quota. Two storms:
 * bare limiter instances hammering reserve() concurrently (admission
 * atomicity under contention), and a fleet of REAL engines each in
 * its own process, where the referee proves the wire dispatch count
 * equals the recorded window consumption and every window stays at or
 * under the cap.
 *
 * The worker scripts are generated into the scratch directory with
 * the built dist entries baked in as absolute URLs (a child process
 * resolves neither vitest aliases nor this package's node_modules
 * from a temp dir), the multi-process soak pattern.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const storeDistUrl = new URL('../dist/index.js', import.meta.url).href;
const coreDistUrl = pathToFileURL(createRequire(import.meta.url).resolve('@rulvar/core')).href;

interface ChildResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runChild(script: string, env: Record<string, string>): Promise<ChildResult> {
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
    });
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

function windowRows(path: string): Array<{ window_start: number; requests: number }> {
  const db = new DatabaseSync(path);
  const rows = db
    .prepare('SELECT window_start, requests FROM quota_buckets ORDER BY window_start')
    .all() as Array<{ window_start: number; requests: number }>;
  db.close();
  return rows;
}

const STORM_WORKER = `
import { SqliteQuotaLimiter } from ${JSON.stringify(storeDistUrl)};

const limiter = new SqliteQuotaLimiter({
  path: process.env.RULVAR_QUOTA_DB,
  rules: [{ provider: 'fake', requestsPerMinute: 25 }],
});
let granted = 0;
let denied = 0;
let denialShapeOk = true;
for (let i = 0; i < 30; i += 1) {
  const decision = await limiter.reserve({
    provider: 'fake',
    model: 'fake-model',
    estimate: { requests: 1, inputTokens: 1 },
  });
  if (decision.granted) {
    granted += 1;
  } else {
    denied += 1;
    if (typeof decision.retryAfterMs !== 'number' || decision.retryAfterMs < 0) {
      denialShapeOk = false;
    }
  }
}
console.log(JSON.stringify({ granted, denied, denialShapeOk }));
limiter.close();
`;

const ENGINE_WORKER = `
import { createEngine, defineWorkflow, InMemoryStore } from ${JSON.stringify(coreDistUrl)};
import { SqliteQuotaLimiter } from ${JSON.stringify(storeDistUrl)};

const calls = [];
const adapter = {
  id: 'fake',
  caps: () => ({
    structuredOutput: 'native',
    supportsTemperature: false,
    supportsParallelTools: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    contextWindow: 200000,
    maxOutputTokens: 4096,
  }),
  async *stream(req) {
    calls.push(req);
    yield { type: 'text-delta', text: 'answered' };
    yield {
      type: 'finish',
      finish: { reason: 'stop' },
      usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  },
};
const limiter = new SqliteQuotaLimiter({
  path: process.env.RULVAR_QUOTA_DB,
  rules: [{ provider: 'fake', requestsPerMinute: 2 }],
});
const engine = createEngine({
  adapters: [adapter],
  stores: { journal: new InMemoryStore({ quiet: true }) },
  defaults: {
    routing: { loop: 'fake:model' },
    // attempts 1: a denial is terminal immediately, so a denied child
    // never waits out the real window remainder.
    retry: { attempts: 1, backoff: { initialMs: 1, factor: 1, maxMs: 1 } },
  },
  quota: { limiter },
});
const wf = defineWorkflow({ name: 'ask' }, (ctx) => ctx.agent('go', { result: 'full' }));
const outcome = await engine.run(wf, undefined).result;
const result = outcome.status === 'ok' ? outcome.value : { status: outcome.status };
console.log(
  JSON.stringify({
    dispatched: calls.length,
    status: result.status,
    errorKind: result.error === undefined ? null : result.error.kind,
  }),
);
limiter.close();
`;

describe('multi-process quota gate (RV-215 acceptance)', () => {
  it('four processes storming one file never over-admit a window', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-quota-storm-'));
    const script = join(dir, 'storm-worker.mjs');
    writeFileSync(script, STORM_WORKER);
    const dbPath = join(dir, 'quota.db');
    const results = await Promise.all(
      Array.from({ length: 4 }, () => runChild(script, { RULVAR_QUOTA_DB: dbPath })),
    );
    for (const child of results) {
      expect(child.code, child.stderr).toBe(0);
    }
    const reports = results.map(
      (child) =>
        JSON.parse(child.stdout) as { granted: number; denied: number; denialShapeOk: boolean },
    );
    const granted = reports.reduce((sum, report) => sum + report.granted, 0);
    const denied = reports.reduce((sum, report) => sum + report.denied, 0);
    expect(granted + denied).toBe(120);
    expect(reports.every((report) => report.denialShapeOk)).toBe(true);
    // 120 attempts against a cap of 25: denials MUST have happened
    // unless the storm somehow straddled five windows (it runs in
    // seconds; two is the realistic worst case).
    const rows = windowRows(dbPath);
    for (const row of rows) {
      expect(row.requests).toBeLessThanOrEqual(25);
    }
    // Every grant is accounted in exactly one window row: admission
    // was atomic (a lost update would leave granted above the sum).
    expect(rows.reduce((sum, row) => sum + row.requests, 0)).toBe(granted);
    expect(denied).toBeGreaterThan(0);
  }, 60_000);

  it('a fleet of four engine processes dispatches at most the global cap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-quota-fleet-'));
    const script = join(dir, 'engine-worker.mjs');
    writeFileSync(script, ENGINE_WORKER);
    const dbPath = join(dir, 'quota.db');
    const results = await Promise.all(
      Array.from({ length: 4 }, () => runChild(script, { RULVAR_QUOTA_DB: dbPath })),
    );
    for (const child of results) {
      expect(child.code, child.stderr).toBe(0);
    }
    const reports = results.map(
      (child) =>
        JSON.parse(child.stdout) as {
          dispatched: number;
          status: string;
          errorKind: string | null;
        },
    );
    const dispatched = reports.reduce((sum, report) => sum + report.dispatched, 0);
    const rows = windowRows(dbPath);
    for (const row of rows) {
      expect(row.requests).toBeLessThanOrEqual(2);
    }
    // The wire calls the fleet actually paid are exactly the window
    // consumption the limiter recorded: nothing dispatched without a
    // reservation, and no reservation was double-spent.
    expect(rows.reduce((sum, row) => sum + row.requests, 0)).toBe(dispatched);
    expect(reports.filter((report) => report.status === 'ok').length).toBe(dispatched);
    for (const report of reports) {
      if (report.status === 'error') {
        expect(report.errorKind).toBe('rate-limit');
        expect(report.dispatched).toBe(0);
      }
    }
    // Four runs against a cap of two: at least two children were
    // denied unless the fleet straddled a window boundary; even then
    // the per-window cap above already proved the gate.
    expect(dispatched).toBeGreaterThanOrEqual(2);
  }, 60_000);
});
