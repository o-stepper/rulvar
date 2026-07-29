/**
 * Cross-process repair exclusion (RV606): the destructive half of the
 * tail repair (truncate plus quarantine) is mutually exclusive between
 * writer processes through a sidecar O_EXCL lock, the ledger file is
 * re-read AFTER the lock is held, and a boundary computed from a stale
 * read is never truncated. The interleaving that used to lose a
 * CONFIRMED intent (two instances repair the same torn file, the slower
 * truncate lands after the faster instance already quarantined and
 * appended) is driven deterministically here by gating the second
 * truncate until the first repairer has fully finished.
 */
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  truncateSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { jsonlEffectLedger, loadEffectLedger } from './ledger.js';
import type { ToolEffectIntent, ToolEffectRecord } from './spi.js';

const gate = vi.hoisted(() => ({
  truncates: 0,
  armed: false,
  release: (): void => {},
  held: Promise.resolve(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  const truncate: typeof real.truncate = async (path, len) => {
    gate.truncates += 1;
    if (gate.armed && gate.truncates >= 2) {
      await gate.held;
    }
    return real.truncate(path, len);
  };
  return { ...real, truncate };
});

const DIR = mkdtempSync(join(tmpdir(), 'rulvar-ledger-exclusion-'));
let fileSeq = 0;
const freshPath = (): string => join(DIR, `ledger-${(fileSeq += 1)}.jsonl`);
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function intentOf(key: string, startedAt: number, attemptId: string): ToolEffectIntent {
  return {
    idempotencyKey: key,
    runId: 'run-1',
    spanId: 's1',
    tool: 'charge',
    argsHash: 'a'.repeat(64),
    executor: 'subprocess',
    workdir: '/tmp/w',
    startedAt,
    attemptId,
  };
}

function outcomeOf(key: string, startedAt: number, attemptId: string): ToolEffectRecord {
  return {
    ...intentOf(key, startedAt, attemptId),
    durationMs: 5,
    outcome: 'ok',
    exitCode: 0,
    signal: null,
  };
}

describe('cross-process repair exclusion (RV606)', () => {
  it('two instances on one torn file lose nothing and quarantine exactly once', async () => {
    // Both instances read the torn file before either truncates; the
    // second truncate is held until the first instance has quarantined
    // AND appended its confirmed intent. Without the lock and the
    // re-read after capture, that held truncate lands on the stale
    // boundary and erases the first instance's quarantine and intent.
    const path = freshPath();
    const prior = JSON.stringify({ phase: 'intent', ...intentOf('k-prior', 1, 'a-prior') });
    const fragment = '{"phase":"intent","idempotencyKey":"cut';
    writeFileSync(path, `${prior}\n${fragment}`, 'utf8');
    gate.held = new Promise((resolve) => {
      gate.release = resolve;
    });
    gate.armed = true;
    try {
      const a = jsonlEffectLedger(path, { now: () => 111 });
      const b = jsonlEffectLedger(path, { now: () => 222 });
      const pa = a.intent?.(intentOf('k-first', 2, 'a-first'));
      const pb = b.intent?.(intentOf('k-second', 3, 'a-second'));
      await Promise.race([pa, pb]);
      gate.release();
      await Promise.all([pa, pb]);
    } finally {
      gate.armed = false;
      gate.release();
    }
    const scan = await loadEffectLedger(path);
    expect(scan.intents.map((entry) => entry.idempotencyKey).sort()).toEqual([
      'k-first',
      'k-prior',
      'k-second',
    ]);
    expect(scan.tornArtifacts).toHaveLength(1);
    expect(scan.tornArtifacts[0]?.bytes).toBe(fragment);
    expect(scan.corrupt).toHaveLength(0);
    expect(scan.tornTail).toBeUndefined();
  });

  it('a writer waiting on a live repair lock re-reads and never truncates the repaired file', async () => {
    const path = freshPath();
    const lockPath = `${path}.repair-lock`;
    const prior = JSON.stringify({
      phase: 'intent',
      ...intentOf('k-holder-prior', 1, 'a-holder-prior'),
    });
    const fragment = '{"phase":"intent","idempotencyKey":"cut';
    writeFileSync(path, `${prior}\n${fragment}`, 'utf8');
    // A live holder: the lock exists with a fresh mtime, so the waiting
    // writer must poll instead of repairing over the holder's work.
    writeFileSync(lockPath, 'held-by-the-test', 'utf8');
    const before = gate.truncates;
    const ledger = jsonlEffectLedger(path, { now: () => 5 });
    const pending = ledger.intent?.(intentOf('k-waiter', 2, 'a-waiter'));
    await delay(80);
    // The holder (this test) repairs the file itself, then releases.
    truncateSync(path, Buffer.byteLength(`${prior}\n`, 'utf8'));
    appendFileSync(
      path,
      `${JSON.stringify({ phase: 'torn', bytes: fragment, recoveredAt: 4 })}\n`,
      'utf8',
    );
    appendFileSync(
      path,
      `${JSON.stringify({ phase: 'intent', ...intentOf('k-holder', 3, 'a-holder') })}\n`,
      'utf8',
    );
    unlinkSync(lockPath);
    await pending;
    // The waiter re-read after capture, found the tail already clean,
    // and appended without cutting a byte of the holder's rows.
    expect(gate.truncates).toBe(before);
    const scan = await loadEffectLedger(path);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual([
      'k-holder-prior',
      'k-holder',
      'k-waiter',
    ]);
    expect(scan.tornArtifacts).toHaveLength(1);
  });

  it('a stale lock left by a crashed repairer is stolen and consumed', async () => {
    const path = freshPath();
    const lockPath = `${path}.repair-lock`;
    const fragment = '{"phase":"intent","idempotencyKey":"dangling';
    writeFileSync(path, fragment, 'utf8');
    writeFileSync(lockPath, 'crashed-holder', 'utf8');
    const past = new Date(Date.now() - 60_000);
    utimesSync(lockPath, past, past);
    const ledger = jsonlEffectLedger(path, { now: () => 9 });
    await ledger.intent?.(intentOf('k-after-steal', 1, 'a-after-steal'));
    expect(existsSync(lockPath)).toBe(false);
    const scan = await loadEffectLedger(path);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual(['k-after-steal']);
    expect(scan.tornArtifacts).toHaveLength(1);
    expect(scan.tornArtifacts[0]?.bytes).toBe(fragment);
    expect(scan.tornArtifacts[0]?.recoveredAt).toBe(9);
  });

  it('a clean file is appended to without a truncate and without the lock ever existing', async () => {
    const path = freshPath();
    const lockPath = `${path}.repair-lock`;
    const line = `${JSON.stringify({ phase: 'intent', ...intentOf('k-clean', 1, 'a-clean') })}\n`;
    writeFileSync(path, line, 'utf8');
    const before = gate.truncates;
    const ledger = jsonlEffectLedger(path);
    await ledger.record(outcomeOf('k-clean', 1, 'a-clean'));
    expect(gate.truncates).toBe(before);
    expect(existsSync(lockPath)).toBe(false);
    expect(readFileSync(path, 'utf8').startsWith(line)).toBe(true);
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(0);
  });

  it('repair is idempotent: a second instance on the repaired file cuts nothing', async () => {
    const path = freshPath();
    writeFileSync(path, 'not json at all', 'utf8');
    const before = gate.truncates;
    const first = jsonlEffectLedger(path, { now: () => 1 });
    await first.intent?.(intentOf('k-one', 1, 'a-one'));
    const second = jsonlEffectLedger(path, { now: () => 2 });
    await second.intent?.(intentOf('k-two', 2, 'a-two'));
    expect(gate.truncates).toBe(before + 1);
    const scan = await loadEffectLedger(path);
    expect(scan.tornArtifacts).toHaveLength(1);
    expect(scan.intents.map((entry) => entry.idempotencyKey)).toEqual(['k-one', 'k-two']);
  });
});
