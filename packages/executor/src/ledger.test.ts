/**
 * The durable JSONL reference of the two-phase effect ledger (RV404): it
 * writes one line per phase, loads back into paired intents and
 * outcomes, and identifies the orphan intents (an intent whose key never
 * got an outcome row) that are the host's reconciliation signal after a
 * crash between the effect and the outcome write.
 */
import { appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { jsonlEffectLedger, loadEffectLedger } from './ledger.js';
import type { ToolEffectIntent, ToolEffectRecord } from './spi.js';

const DIR = mkdtempSync(join(tmpdir(), 'rulvar-ledger-tests-'));
let fileSeq = 0;
const freshPath = (): string => join(DIR, `ledger-${(fileSeq += 1)}.jsonl`);

function intentOf(key: string, startedAt: number): ToolEffectIntent {
  return {
    idempotencyKey: key,
    runId: 'run-1',
    spanId: 's1',
    tool: 'charge',
    argsHash: 'a'.repeat(64),
    executor: 'subprocess',
    workdir: '/tmp/w',
    startedAt,
  };
}

function outcomeOf(key: string, startedAt: number): ToolEffectRecord {
  return {
    ...intentOf(key, startedAt),
    durationMs: 5,
    outcome: 'ok',
    exitCode: 0,
    signal: null,
  };
}

describe('jsonlEffectLedger and loadEffectLedger (RV404)', () => {
  it('writes both phases and loads them back paired', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-1', 100));
    await ledger.record(outcomeOf('k-1', 100));
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(1);
    expect(scan.intents[0]?.idempotencyKey).toBe('k-1');
    expect(scan.outcomes[0]?.outcome).toBe('ok');
    expect(scan.orphanedIntents).toHaveLength(0);
  });

  it('reports an intent whose key never got an outcome as orphaned', async () => {
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-dead', 100));
    await ledger.intent?.(intentOf('k-live', 200));
    await ledger.record(outcomeOf('k-live', 200));
    const scan = await loadEffectLedger(path);
    expect(scan.orphanedIntents).toHaveLength(1);
    expect(scan.orphanedIntents[0]?.idempotencyKey).toBe('k-dead');
    // The orphan carries the full provider-lookup set.
    expect(scan.orphanedIntents[0]?.tool).toBe('charge');
    expect(scan.orphanedIntents[0]?.argsHash).toBe('a'.repeat(64));
    expect(scan.orphanedIntents[0]?.runId).toBe('run-1');
  });

  it('does not orphan a retried key whose later attempt has the outcome', async () => {
    // At-least-once: attempt 1 crashed between phases, attempt 2 of the
    // SAME logical call completed. The key has an outcome, so the first
    // intent needs no reconciliation: the retry already resolved it.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-retry', 100));
    await ledger.intent?.(intentOf('k-retry', 200));
    await ledger.record(outcomeOf('k-retry', 200));
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(2);
    expect(scan.orphanedIntents).toHaveLength(0);
  });

  it('skips a torn trailing line instead of failing the whole scan', async () => {
    // A crash mid-write leaves exactly this artifact: a complete line
    // followed by a torn tail with no newline. The scan must keep the
    // durable rows.
    const path = freshPath();
    const ledger = jsonlEffectLedger(path);
    await ledger.intent?.(intentOf('k-torn', 100));
    appendFileSync(path, '{"phase":"outcome","idempo');
    const scan = await loadEffectLedger(path);
    expect(scan.intents).toHaveLength(1);
    expect(scan.outcomes).toHaveLength(0);
    expect(scan.orphanedIntents).toHaveLength(1);
  });
});
