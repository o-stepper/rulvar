import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { InMemoryStore, JsonlFileStore, type JournalEntry, type JournalStore } from '@rulvar/core';
import { journalStoreConformance } from './journal.js';
import { registerConformance } from './types.js';

// The M2 required store matrix (docs/11, section "Conformance tier"):
// InMemoryStore and JsonlFileStore; @rulvar/store-sqlite joins in M5.
registerConformance(
  journalStoreConformance(() => new InMemoryStore()),
  { describe: (name, factory) => describe(`InMemoryStore ${name}`, factory), it },
);

registerConformance(
  journalStoreConformance(
    () => new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-conformance-')) }),
  ),
  { describe: (name, factory) => describe(`JsonlFileStore ${name}`, factory), it },
);

/** A deliberately broken store: load reverses the append order (violates A2). */
class ReorderingStore extends InMemoryStore {
  override async load(runId: string): Promise<JournalEntry[]> {
    return (await super.load(runId)).reverse();
  }
}

/** A deliberately broken store: load rewrites legacy entries (violates A4). */
class NormalizingStore extends InMemoryStore {
  override async load(runId: string): Promise<JournalEntry[]> {
    return (await super.load(runId)).map((entry) => ({
      ...entry,
      hashVersion: entry.hashVersion ?? 1,
    }));
  }
}

/** A deliberately broken store: load tears the last entry's payload (violates A1). */
class TearingStore extends InMemoryStore {
  override async load(runId: string): Promise<JournalEntry[]> {
    const entries = await super.load(runId);
    const last = entries[entries.length - 1];
    if (last !== undefined && typeof (last.value as { blob?: string })?.blob === 'string') {
      (last.value as { blob: string }).blob = (last.value as { blob: string }).blob.slice(0, 10);
    }
    return entries;
  }
}

describe('mutation-tested bad stores fail loudly (M2-T11 acceptance)', () => {
  it('a reordering store fails the a2 total-order check', async () => {
    const suite = journalStoreConformance(() => new ReorderingStore());
    const a2 = suite.checks.find((check) => check.id === 'a2-total-order');
    await expect(a2?.run()).rejects.toThrow(/a2-total-order/);
  });

  it('a normalizing store fails the a4 opacity check', async () => {
    const suite = journalStoreConformance(() => new NormalizingStore());
    const a4 = suite.checks.find((check) => check.id === 'a4-opaque-payload');
    await expect(a4?.run()).rejects.toThrow(/a4-opaque-payload/);
  });

  it('a tearing store fails the a1 atomicity check', async () => {
    const suite = journalStoreConformance(() => new TearingStore());
    const a1 = suite.checks.find((check) => check.id === 'a1-append-atomicity');
    await expect(a1?.run()).rejects.toThrow(/a1-append-atomicity/);
  });

  it('suite.run executes every check sequentially and reports the first violation', async () => {
    const good = journalStoreConformance(() => new InMemoryStore());
    await expect(good.run()).resolves.toBeUndefined();
    const bad = journalStoreConformance(() => new ReorderingStore());
    await expect(bad.run()).rejects.toThrow(/store-conformance/);
  });
});

// The kit's own SPI sanity: the factory contract tolerates async factories.
describe('async store factories', () => {
  it('mk may return a promise', async () => {
    const suite = journalStoreConformance((): Promise<JournalStore> =>
      Promise.resolve(new InMemoryStore()),
    );
    const a3 = suite.checks.find((check) => check.id === 'a3-read-your-writes');
    await expect(a3?.run()).resolves.toBeUndefined();
  });
});
