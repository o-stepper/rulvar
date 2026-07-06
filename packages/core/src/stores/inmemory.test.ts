import { describe, expect, it, vi } from 'vitest';

import type { JournalEntry } from '../l0/entries.js';
import { normalizeEntry } from '../l0/entries.js';
import { InMemoryStore, InMemoryTranscriptStore } from './inmemory.js';

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

describe('InMemoryStore (M1-T04; docs/03 section 12)', () => {
  it('preserves total per-run append order across loads (A2)', async () => {
    const store = new InMemoryStore();
    await store.append('r1', entry(0));
    await store.append('r1', entry(1));
    await store.append('r2', entry(0));
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
    expect(await store.load('r2')).toHaveLength(1);
    expect(await store.load('missing')).toEqual([]);
  });

  it('passes unknown fields and kinds through byte-for-byte (A4)', async () => {
    const store = new InMemoryStore();
    const exotic = {
      ...entry(0),
      kind: 'future.kind' as JournalEntry['kind'],
      futureField: { nested: true },
    } as JournalEntry;
    await store.append('r1', exotic);
    const [loaded] = await store.load('r1');
    expect(loaded).toEqual(exotic);
  });

  it('read-your-writes: an awaited append is immediately visible (A3)', async () => {
    const store = new InMemoryStore();
    await store.append('r1', entry(0));
    expect(await store.load('r1')).toHaveLength(1);
  });

  it('returns copies: mutations of loaded entries never reach the store', async () => {
    const store = new InMemoryStore();
    await store.append('r1', entry(0, { value: { a: 1 } }));
    const [loaded] = await store.load('r1');
    (loaded.value as { a: number }).a = 999;
    const [reloaded] = await store.load('r1');
    expect(reloaded.value).toEqual({ a: 1 });
  });

  it('putMeta/listRuns filter by status, name, and tags without payload parsing', async () => {
    const store = new InMemoryStore();
    await store.putMeta({
      runId: 'r1',
      status: 'running',
      name: 'review',
      tags: ['ci', 'pr'],
      updatedAt: '2026-07-07T00:00:00.000Z',
    });
    await store.putMeta({ runId: 'r2', status: 'ok', updatedAt: '2026-07-07T00:00:01.000Z' });
    expect(await store.listRuns()).toHaveLength(2);
    expect(await store.listRuns({ status: 'ok' })).toHaveLength(1);
    expect(await store.listRuns({ name: 'review' })).toHaveLength(1);
    expect(await store.listRuns({ tags: ['ci'] })).toHaveLength(1);
    expect(await store.listRuns({ tags: ['ci', 'nightly'] })).toHaveLength(0);
  });

  it('delete removes the journal and the meta', async () => {
    const store = new InMemoryStore();
    await store.append('r1', entry(0));
    await store.putMeta({ runId: 'r1', status: 'ok', updatedAt: 'now' });
    await store.delete('r1');
    expect(await store.load('r1')).toEqual([]);
    expect(await store.listRuns()).toEqual([]);
  });

  it('warns loudly exactly once per instance about disabled resume', async () => {
    const warnings: string[] = [];
    const spy = vi.spyOn(process, 'emitWarning').mockImplementation((warning: string | Error) => {
      warnings.push(String(warning));
    });
    try {
      const store = new InMemoryStore();
      await store.append('r1', entry(0));
      await store.append('r1', entry(1));
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('resume is disabled');
      const second = new InMemoryStore();
      await second.append('r1', entry(0));
      expect(warnings).toHaveLength(2);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('InMemoryTranscriptStore (M1-T04)', () => {
  it('stores blobs by ref and lists by runId prefix', async () => {
    const store = new InMemoryTranscriptStore();
    await store.put('r1/t0', new Uint8Array([1, 2]));
    await store.put('r1/t1', new Uint8Array([3]));
    await store.put('r2/t0', new Uint8Array([4]));
    expect(await store.get('r1/t0')).toEqual(new Uint8Array([1, 2]));
    expect(await store.get('missing')).toBeNull();
    expect((await store.list('r1')).sort()).toEqual(['r1/t0', 'r1/t1']);
  });

  it('returns copies of stored blobs', async () => {
    const store = new InMemoryTranscriptStore();
    const original = new Uint8Array([1, 2]);
    await store.put('r1/t0', original);
    original[0] = 9;
    const loaded = await store.get('r1/t0');
    expect(loaded![0]).toBe(1);
    loaded![1] = 9;
    expect((await store.get('r1/t0'))![1]).toBe(2);
  });
});

describe('normalizeEntry (M1-T04; docs/03 section 4.1)', () => {
  it('reads round-1 { v: 1 } as hashVersion 1 without other rewrites', () => {
    const raw = { v: 1, seq: 0, scope: '', key: 'k', ordinal: 0, kind: 'step', status: 'ok' };
    const normalized = normalizeEntry(raw);
    expect(normalized.hashVersion).toBe(1);
    expect((normalized as Record<string, unknown>).v).toBeUndefined();
    expect(normalized.kind).toBe('step');
  });

  it('defaults a bare entry to hashVersion 1 and keeps explicit hashVersion', () => {
    expect(normalizeEntry({ seq: 0 }).hashVersion).toBe(1);
    expect(normalizeEntry({ hashVersion: 2, seq: 0 }).hashVersion).toBe(2);
  });
});
