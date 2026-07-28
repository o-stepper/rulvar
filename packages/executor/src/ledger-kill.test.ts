/**
 * The crash half of the two-phase contract proven against a REAL
 * process kill (RV501, the ninth-experiment kill matrix): a host that
 * dies between the awaited intent append and the outcome write leaves
 * exactly one orphaned attempt on disk, and a host that dies after the
 * outcome leaves none. The child process uses the BUILT package (dist),
 * the same artifact a host imports, so this exercises the library path,
 * not a reimplementation of it.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadEffectLedger } from './ledger.js';

const DIR = mkdtempSync(join(tmpdir(), 'rulvar-ledger-kill-'));
const DIST = join(import.meta.dirname, '..', 'dist', 'index.js');

// The child writes through the built library, signals READY on stdout,
// then hangs until the parent kills it: the crash window frozen open.
const CHILD_SCRIPT = `
const { jsonlEffectLedger } = await import(process.argv[1]);
const ledger = jsonlEffectLedger(process.argv[2]);
const base = {
  idempotencyKey: 'k-kill', runId: 'r', spanId: 's', tool: 'charge',
  argsHash: 'a'.repeat(64), executor: 'subprocess', workdir: '/tmp/w',
  startedAt: 1, attemptId: process.argv[3],
};
await ledger.intent(base);
if (process.argv[4] === 'with-outcome') {
  await ledger.record({ ...base, durationMs: 1, outcome: 'ok', exitCode: 0, signal: null });
}
process.stdout.write('READY\\n');
setInterval(() => {}, 1000);
`;

async function spawnUntilReady(args: readonly string[]): Promise<ChildProcess> {
  const child = spawn(process.execPath, ['--input-type=module', '-e', CHILD_SCRIPT, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    let out = '';
    let err = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      out += String(chunk);
      if (out.includes('READY')) resolve();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      err += String(chunk);
    });
    child.on('exit', (code) => {
      reject(new Error(`ledger child exited before READY (${String(code)}): ${err}`));
    });
    child.on('error', reject);
  });
  return child;
}

async function killAndWait(child: ChildProcess): Promise<void> {
  const gone = new Promise<void>((resolve) => child.on('exit', () => resolve()));
  child.kill('SIGKILL');
  await gone;
}

describe('SIGKILL between the two phases (RV501 kill matrix)', () => {
  it('a host killed after the intent leaves exactly that attempt orphaned', async () => {
    expect(existsSync(DIST)).toBe(true);
    const path = join(DIR, 'killed-after-intent.jsonl');
    const child = await spawnUntilReady([pathToFileURL(DIST).href, path, 'attempt-killed']);
    await killAndWait(child);
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(0);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.attemptId).toBe('attempt-killed');
    // The orphan carries the full provider-lookup set, straight off disk.
    expect(scan.orphanedIntents[0]?.idempotencyKey).toBe('k-kill');
    expect(scan.orphanedIntents[0]?.argsHash).toBe('a'.repeat(64));
  });

  it('a host killed after the outcome leaves nothing to reconcile', async () => {
    const path = join(DIR, 'killed-after-outcome.jsonl');
    const child = await spawnUntilReady([
      pathToFileURL(DIST).href,
      path,
      'attempt-completed',
      'with-outcome',
    ]);
    await killAndWait(child);
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
    expect(scan.orphanedIntents).toHaveLength(0);
  });
});
