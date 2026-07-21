import { appendFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { JournalOrderViolation } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { LARGE_VALUE_WARN_BYTES, Replayer } from '../journal/replayer.js';
import { FileTranscriptStore, JsonlFileStore } from './jsonl.js';

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
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-jsonl-'));
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

describe('FileTranscriptStore path containment (v1.36.0 review SEC-P1)', () => {
  const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);
  const makeTranscripts = (): { store: FileTranscriptStore; dir: string; root: string } => {
    const root = mkdtempSync(join(tmpdir(), 'transcripts-sec-'));
    const dir = join(root, 'base');
    return { store: new FileTranscriptStore({ dir }), dir, root };
  };

  it('round-trips a valid nested ref inside the root', async () => {
    const { store } = makeTranscripts();
    await store.put('run/ckpt/1', bytes('checkpoint'));
    const got = await store.get('run/ckpt/1');
    expect(got).not.toBeNull();
    expect(new TextDecoder().decode(got ?? undefined)).toBe('checkpoint');
  });

  it.each(['..', '.', '../escape', 'a/../b', './x', 'a//b', '../../x'])(
    'refuses the traversal ref %j on put',
    async (ref) => {
      const { store, root } = makeTranscripts();
      await expect(store.put(ref, bytes('pwned'))).rejects.toBeInstanceOf(JournalOrderViolation);
      // Nothing escaped: the parent of the root holds only the root dir.
      expect(readdirSync(root)).toEqual(['base']);
    },
  );

  it('refuses a traversal ref on get and delete', async () => {
    const { store } = makeTranscripts();
    await expect(store.get('../secret')).rejects.toBeInstanceOf(JournalOrderViolation);
    await expect(store.delete('../victim')).rejects.toBeInstanceOf(JournalOrderViolation);
  });

  it.each(['..', '.'])('refuses list(%j) so it cannot walk the parent directory', async (runId) => {
    // A sibling blob one level above the root must never be enumerable.
    const { store, root } = makeTranscripts();
    writeFileSync(join(root, 'sibling.bin'), bytes('outside'));
    await expect(store.list(runId)).rejects.toBeInstanceOf(JournalOrderViolation);
  });

  it('the containment backstop rejects a sibling-prefix escape', async () => {
    // A root whose sibling shares its prefix: a naive startsWith(root)
    // check would admit 'base-evil'. The separator boundary rejects it.
    const root = mkdtempSync(join(tmpdir(), 'transcripts-prefix-'));
    const store = new FileTranscriptStore({ dir: join(root, 'base') });
    await expect(store.put('..', bytes('x'))).rejects.toBeInstanceOf(JournalOrderViolation);
  });
});
