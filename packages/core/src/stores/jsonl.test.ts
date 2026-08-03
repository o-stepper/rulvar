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

  it('RV701: an accepted entry whose trailing newline a crash cut survives the next append', async () => {
    // The eleventh experiment's live reproduction: every JSON byte of the
    // append persisted, only the '\n' was lost. load() rightly serves the
    // entry; the next append MUST NOT glue onto it and the load after
    // that MUST NOT repair both records away to a zero-byte file.
    const { store, dir } = makeStore();
    await store.append('r1', entry(0));
    const path = join(dir, 'r1.jsonl');
    const bytes = readFileSync(path);
    writeFileSync(path, bytes.subarray(0, bytes.length - 1));
    const survivor = new JsonlFileStore({ dir });
    expect((await survivor.load('r1')).map((e) => e.seq)).toEqual([0]);
    await survivor.append('r1', entry(1));
    // A SECOND append before any load: were the tail left unterminated,
    // the glued line would now sit mid-file, where repair never looks,
    // and the whole journal would become unreadable.
    await survivor.append('r1', entry(2));
    expect((await survivor.load('r1')).map((e) => e.seq)).toEqual([0, 1, 2]);
    // A fresh instance (the next process) sees the same journal, and the
    // file is newline-terminated again.
    expect((await new JsonlFileStore({ dir }).load('r1')).map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true);
  });

  it('RV701: every byte-length crash prefix of a two-entry journal survives load, append, load', async () => {
    const { store, dir } = makeStore();
    await store.append('r1', entry(0));
    await store.append('r1', entry(1));
    const whole = readFileSync(join(dir, 'r1.jsonl'));
    for (let cut = 0; cut <= whole.length; cut += 1) {
      const caseDir = mkdtempSync(join(tmpdir(), `rulvar-jsonl-cut-${cut}-`));
      writeFileSync(join(caseDir, 'r1.jsonl'), whole.subarray(0, cut));
      const revived = new JsonlFileStore({ dir: caseDir });
      const before = (await revived.load('r1')).map((e) => e.seq);
      await revived.append('r1', entry(2));
      await revived.append('r1', entry(3));
      const after = (await revived.load('r1')).map((e) => e.seq);
      // Whatever load served before the appends stays visible after
      // them, and both appends landed: no cut position may lose an
      // already-served entry (the valid-tail cut used to wipe the file)
      // or leave the journal unreadable (an unterminated tail glued and
      // then buried mid-file by the second append used to).
      expect({ cut, after }).toEqual({ cut, after: [...before, 2, 3] });
      const fresh = (await new JsonlFileStore({ dir: caseDir }).load('r1')).map((e) => e.seq);
      expect({ cut, fresh }).toEqual({ cut, fresh: after });
    }
  });

  it('RV701: repair salvages whole records glued on the torn last line instead of discarding them', async () => {
    // The pre-fix append bug (and any legacy journal it corrupted) left
    // two complete objects concatenated on one unterminated line. Repair
    // must keep every whole record and drop nothing.
    const { store, dir } = makeStore();
    const path = join(dir, 'r1.jsonl');
    writeFileSync(path, JSON.stringify(entry(0)) + JSON.stringify(entry(1)), 'utf8');
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
    await store.append('r1', entry(2));
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true);
  });

  it('RV701: repair keeps the whole prefix records and drops only the trailing torn fragment', async () => {
    const { store, dir } = makeStore();
    const path = join(dir, 'r1.jsonl');
    // A whole record, glued to a mid-write torn fragment of the next one:
    // the record was accepted, the fragment never was.
    writeFileSync(path, `${JSON.stringify(entry(0))}{"hashVersion":2,"seq":1,"sco`, 'utf8');
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0]);
    await store.append('r1', entry(1));
    expect((await store.load('r1')).map((e) => e.seq)).toEqual([0, 1]);
  });

  it('RV701: a brace inside a string never splits a glued line into false records', async () => {
    const { store, dir } = makeStore();
    const tricky = entry(0, { value: { note: 'closing } brace and a quote " inside' } });
    writeFileSync(join(dir, 'r1.jsonl'), JSON.stringify(tricky) + JSON.stringify(entry(1)), 'utf8');
    const loaded = await store.load('r1');
    expect(loaded.map((e) => e.seq)).toEqual([0, 1]);
    expect(loaded[0]?.value).toEqual(tricky.value);
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

/**
 * The verify-only load (RV1512). The A1 salvage model repairs a torn
 * trailing line ON LOAD, which is right for an owner about to append
 * and wrong for an auditor: a "verification" read that rewrites the
 * artifact it verifies destroys the evidence of the tear.
 */
describe('repairOnLoad: false (RV1512)', () => {
  it('serves the salvageable records without touching the file bytes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-verify-'));
    const writer = new JsonlFileStore({ dir });
    await writer.append('TORN', {
      hashVersion: 2,
      seq: 0,
      scope: '',
      key: 'k',
      ordinal: 0,
      kind: 'agent',
      status: 'ok',
      spanId: 's1',
      startedAt: '2026-08-03T00:00:00.000Z',
    });
    const file = join(dir, 'TORN.jsonl');
    appendFileSync(file, '{"hashVersion":2,"seq":1,"scope":"","key":"k2","ordi');
    const before = readFileSync(file, 'utf8');

    const auditor = new JsonlFileStore({ dir, repairOnLoad: false });
    const entries = await auditor.load('TORN');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.seq).toBe(0);
    // The tear is still on disk, byte for byte: evidence, not damage.
    expect(readFileSync(file, 'utf8')).toBe(before);

    // The default owner path repairs exactly as before.
    const owner = new JsonlFileStore({ dir });
    const repaired = await owner.load('TORN');
    expect(repaired).toHaveLength(1);
    expect(readFileSync(file, 'utf8')).not.toBe(before);
  });
});
