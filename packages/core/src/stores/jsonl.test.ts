import { appendFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { JournalOrderViolation } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { LARGE_VALUE_WARN_BYTES, Replayer } from '../journal/replayer.js';
import { JsonlFileStore } from './jsonl.js';

function entry(seq: number, extra?: Partial<JournalEntry>): JournalEntry {
  return {
    hashVersion: 2,
    seq,
    scope: '',
    key: 'k',
    ordinal: seq,
    kind: 'step',
    status: 'ok',
    spanId: 's',
    startedAt: '2026-07-07T00:00:00.000Z',
    ...extra,
  };
}

function makeStore(): { store: JsonlFileStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'lurker-jsonl-'));
  return { store: new JsonlFileStore({ dir }), dir };
}

describe('JsonlFileStore (M2-T01; docs/03 section 12)', () => {
  it('A2/A3: append order is load order, stable across loads, immediately visible', async () => {
    const { store } = makeStore();
    await store.append('r1', entry(0));
    await store.append('r1', entry(1, { value: { a: 1 } }));
    await store.append('r2', entry(0));
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
    expect(await store.load('r2')).toHaveLength(1);
    expect(await store.load('missing')).toEqual([]);
  });

  it('A4: unknown kinds and fields round-trip byte-exactly', async () => {
    const { store } = makeStore();
    const exotic = {
      ...entry(0),
      kind: 'future.kind' as JournalEntry['kind'],
      futureField: { nested: [1, 'two', null] },
    } as JournalEntry;
    await store.append('r1', exotic);
    const [loaded] = await store.load('r1');
    expect(loaded).toEqual(exotic);
  });

  it('A1: a torn trailing line from a crash is invisible and repaired', async () => {
    const { store, dir } = makeStore();
    await store.append('r1', entry(0));
    await store.append('r1', entry(1));
    // Simulate a crash mid-append: a partial JSON line without newline.
    appendFileSync(join(dir, 'r1.jsonl'), '{"hashVersion":2,"seq":2,"sco', 'utf8');
    const loaded = await store.load('r1');
    expect(loaded.map((e) => e.seq)).toEqual([0, 1]);
    // The tail was repaired: a subsequent append lands on a clean line.
    await store.append('r1', entry(2));
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1, 2]);
    const raw = readFileSync(join(dir, 'r1.jsonl'), 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('mid-file corruption is a hard JournalOrderViolation, not silent repair', async () => {
    const { store, dir } = makeStore();
    await store.append('r1', entry(0));
    appendFileSync(join(dir, 'r1.jsonl'), 'GARBAGE-NOT-JSON\n', 'utf8');
    await store.append('r1', entry(1));
    await expect(store.load('r1')).rejects.toThrow(JournalOrderViolation);
  });

  it('meta is replaced atomically and listed without touching journals', async () => {
    const { store } = makeStore();
    await store.putMeta({ runId: 'r1', status: 'running', name: 'n', tags: ['t'], updatedAt: 'x' });
    await store.putMeta({ runId: 'r1', status: 'ok', name: 'n', tags: ['t'], updatedAt: 'y' });
    await store.putMeta({ runId: 'r2', status: 'ok', updatedAt: 'z' });
    expect(await store.listRuns()).toHaveLength(2);
    expect(await store.listRuns({ status: 'ok', name: 'n' })).toHaveLength(1);
    expect(await store.listRuns({ tags: ['t', 'missing'] })).toHaveLength(0);
  });

  it('delete removes journal and meta; rejects unsafe run ids', async () => {
    const { store } = makeStore();
    await store.append('r1', entry(0));
    await store.putMeta({ runId: 'r1', status: 'ok', updatedAt: 'x' });
    await store.delete('r1');
    expect(await store.load('r1')).toEqual([]);
    expect(await store.listRuns()).toEqual([]);
    await expect(store.load('../escape')).rejects.toThrow(JournalOrderViolation);
  });

  it('serves as the Replayer backing store end to end', async () => {
    const { store } = makeStore();
    const replayer = new Replayer({ runId: 'run-x', store });
    const running = await replayer.appendRunning({
      scope: '',
      key: 'agent-key',
      kind: 'agent',
      spanId: 's',
    });
    await replayer.appendTerminal(running.seq, {
      status: 'ok',
      value: { verdict: 'pass' },
      usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    const loaded = await store.load('run-x');
    expect(loaded).toHaveLength(2);
    expect(loaded[1]?.ref).toBe(loaded[0]?.seq);
    expect(loaded[1]?.value).toEqual({ verdict: 'pass' });
  });
});

describe('large-value soft warn threshold (M2 entry gate; docs/06 Appendix A)', () => {
  it('defaults to 262144 bytes and warns without erroring', async () => {
    expect(LARGE_VALUE_WARN_BYTES).toBe(262_144);
    const warnings: string[] = [];
    const { store } = makeStore();
    const replayer = new Replayer({
      runId: 'r',
      store,
      onWarn: (msg) => warnings.push(msg),
      largeValueWarnBytes: 64,
    });
    await replayer.appendSinglePhase({
      scope: '',
      key: 'k',
      kind: 'step',
      status: 'ok',
      spanId: 's',
      value: { blob: 'x'.repeat(200) },
      site: 'big step',
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('big step');
    expect(warnings[0]).toContain('TranscriptStore');
    // The entry was still journaled: a warning, never an error.
    expect(await store.load('r')).toHaveLength(1);
  });
});
