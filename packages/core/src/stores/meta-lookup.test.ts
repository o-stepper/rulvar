/**
 * Meta-lookup capability (v1.25.0 scale review): the exact-lookup
 * guard and fallback, the shared RunFilter predicate with the advisory
 * statuses field, the shipped stores' getMeta, and capability
 * preservation through the serialization wrapper.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { JournalStore, RunMeta } from '../l0/spi/store.js';
import { wrapJournalStore } from '../l0/serialization.js';
import { InMemoryStore } from './inmemory.js';
import { JsonlFileStore } from './jsonl.js';
import { hasMetaLookup, metaMatchesFilter, readRunMeta } from './meta-lookup.js';

const meta = (runId: string, status: string, over?: Partial<RunMeta>): RunMeta => ({
  runId,
  status,
  updatedAt: '2026-07-20T00:00:00.000Z',
  ...over,
});

describe('readRunMeta and hasMetaLookup', () => {
  it('uses getMeta when the store has the capability', async () => {
    const store = new InMemoryStore({ quiet: true });
    await store.putMeta(meta('a', 'ok'));
    expect(hasMetaLookup(store)).toBe(true);
    expect((await readRunMeta(store, 'a'))?.status).toBe('ok');
    expect(await readRunMeta(store, 'missing')).toBeUndefined();
  });

  it('falls back to the listRuns scan for a store without the capability', async () => {
    const inner = new InMemoryStore({ quiet: true });
    await inner.putMeta(meta('a', 'ok'));
    let listed = 0;
    const legacy: JournalStore = {
      append: (runId, e) => inner.append(runId, e),
      load: (runId) => inner.load(runId),
      putMeta: (m) => inner.putMeta(m),
      listRuns: (f) => {
        listed += 1;
        return inner.listRuns(f);
      },
      delete: (runId) => inner.delete(runId),
    };
    expect(hasMetaLookup(legacy)).toBe(false);
    expect((await readRunMeta(legacy, 'a'))?.runId).toBe('a');
    expect(listed).toBe(1);
  });

  it('the serialization wrapper preserves the capability when the inner store has it', async () => {
    const inner = new InMemoryStore({ quiet: true });
    await inner.putMeta(meta('a', 'ok'));
    const identity = { toStored: (e: never) => e, fromStored: (e: never) => e };
    const wrapped = wrapJournalStore(inner, identity);
    expect(hasMetaLookup(wrapped)).toBe(true);
    expect((await readRunMeta(wrapped, 'a'))?.runId).toBe('a');
    const wrappedLegacy = wrapJournalStore(
      {
        append: (runId, e) => inner.append(runId, e),
        load: (runId) => inner.load(runId),
        putMeta: (m) => inner.putMeta(m),
        listRuns: (f) => inner.listRuns(f),
        delete: (runId) => inner.delete(runId),
      },
      identity,
    );
    expect(hasMetaLookup(wrappedLegacy)).toBe(false);
  });
});

describe('metaMatchesFilter statuses semantics', () => {
  it('status and statuses combine as either-matches; empty statuses alone matches nothing', () => {
    const m = meta('a', 'suspended');
    expect(metaMatchesFilter(m)).toBe(true);
    expect(metaMatchesFilter(m, { status: 'suspended' })).toBe(true);
    expect(metaMatchesFilter(m, { statuses: ['running', 'suspended'] })).toBe(true);
    expect(metaMatchesFilter(m, { statuses: ['running'] })).toBe(false);
    expect(metaMatchesFilter(m, { status: 'suspended', statuses: ['running'] })).toBe(true);
    expect(metaMatchesFilter(m, { statuses: [] })).toBe(false);
    expect(metaMatchesFilter(m, { statuses: ['suspended'], name: 'other' })).toBe(false);
  });
});

describe('shipped stores: getMeta and the statuses filter', () => {
  it('InMemoryStore getMeta returns a copy and listRuns honors statuses', async () => {
    const store = new InMemoryStore({ quiet: true });
    await store.putMeta(meta('a', 'ok'));
    await store.putMeta(meta('b', 'suspended'));
    await store.putMeta(meta('c', 'running'));
    const fetched = await store.getMeta('b');
    expect(fetched?.status).toBe('suspended');
    (fetched as RunMeta).status = 'mutated';
    expect((await store.getMeta('b'))?.status).toBe('suspended');
    const candidates = await store.listRuns({ statuses: ['running', 'suspended'] });
    expect(candidates.map((m) => m.runId).sort()).toEqual(['b', 'c']);
  });

  it('JsonlFileStore getMeta reads one file and listRuns honors statuses', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-meta-lookup-'));
    const store = new JsonlFileStore({ dir });
    await store.putMeta(meta('a', 'ok'));
    await store.putMeta(meta('b', 'suspended'));
    expect((await store.getMeta('b'))?.status).toBe('suspended');
    expect(await store.getMeta('missing')).toBeUndefined();
    const candidates = await store.listRuns({ statuses: ['suspended'] });
    expect(candidates.map((m) => m.runId)).toEqual(['b']);
  });
});
