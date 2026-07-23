/**
 * The repository research toolset (RV-210 remainder). Reproduced on
 * published 1.53.0: no research toolset exists anywhere in the public
 * API; a generic research agent needs hand-authored list/search/read
 * tools with no stable pagination, no confinement, and no evidence
 * collector. These tests pin the shipped contract: deterministic byte
 * ordering, STABLE keyset cursors (a boundary never shifts when
 * unrelated entries appear), canonical byte-identical pages (the
 * exploration-guard composition), root confinement including symlink
 * escapes, verified evidence collection, and typed error VALUES for
 * every user-level failure.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ToolContext, ToolDef } from '../l0/spi/toolsource.js';
import { repositoryResearchToolset } from './research.js';

let root: string;
let outside: string;

function seed(): void {
  writeFileSync(path.join(root, 'alpha.md'), 'alpha one\nalpha two\nneedle here\n');
  writeFileSync(path.join(root, 'beta.txt'), 'beta only\n');
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'src', 'a.ts'), 'const a = 1;\n// needle in a\n');
  writeFileSync(path.join(root, 'src', 'b.ts'), 'const b = 2;\n');
  mkdirSync(path.join(root, 'node_modules', 'dep'), { recursive: true });
  writeFileSync(path.join(root, 'node_modules', 'dep', 'index.js'), 'needle ignored\n');
  mkdirSync(path.join(root, '.git'));
  writeFileSync(path.join(root, '.git', 'HEAD'), 'ref: needle\n');
  writeFileSync(path.join(root, '.hidden'), 'needle hidden\n');
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'rulvar-research-'));
  outside = mkdtempSync(path.join(tmpdir(), 'rulvar-outside-'));
  writeFileSync(path.join(outside, 'secret.txt'), 'outside secret\n');
  seed();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

const CTX = {} as ToolContext;

function toolByName(tools: ToolDef[], name: string): ToolDef {
  const found = tools.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new Error(`missing tool ${name}`);
  }
  return found;
}

async function call(toolDef: ToolDef, input: unknown): Promise<Record<string, unknown>> {
  return (await toolDef.execute(input, CTX)) as Record<string, unknown>;
}

describe('repositoryResearchToolset (RV-210 remainder)', () => {
  it('validates host configuration at construction', () => {
    expect(() => repositoryResearchToolset({ root: path.join(root, 'missing') })).toThrow(
      ConfigError,
    );
    expect(() => repositoryResearchToolset({ root: path.join(root, 'alpha.md') })).toThrow(
      /not a directory/,
    );
    expect(() => repositoryResearchToolset({ root, pageSize: 0 })).toThrow(/positive integer/);
  });

  it('ships five read-risk tools and an evidence snapshot', () => {
    const kit = repositoryResearchToolset({ root });
    expect(kit.tools.map((toolDef) => toolDef.name)).toEqual([
      'list_files',
      'search_files',
      'read_file',
      'record_evidence',
      'list_evidence',
    ]);
    expect(kit.tools.every((toolDef) => toolDef.risk === 'read')).toBe(true);
    expect(kit.evidence()).toEqual([]);
  });

  it('lists recursively in deterministic byte order, skipping ignored and hidden entries', async () => {
    const kit = repositoryResearchToolset({ root });
    const out = await call(toolByName(kit.tools, 'list_files'), {});
    expect(out).toEqual({
      files: ['alpha.md', 'beta.txt', 'src/a.ts', 'src/b.ts'],
      totalFiles: 4,
    });
  });

  it('pages the listing with a STABLE keyset cursor: new files never shift a taken boundary', async () => {
    const kit = repositoryResearchToolset({ root, pageSize: 2 });
    const list = toolByName(kit.tools, 'list_files');
    const page1 = await call(list, {});
    expect(page1.files).toEqual(['alpha.md', 'beta.txt']);
    expect(typeof page1.nextCursor).toBe('string');
    // A file sorting BEFORE the cursor boundary appears between pages: an
    // offset cursor would now re-serve 'beta.txt'; the keyset cursor does
    // not shift.
    writeFileSync(path.join(root, 'aaa.md'), 'late arrival\n');
    const page2 = await call(list, { cursor: page1.nextCursor });
    expect(page2.files).toEqual(['src/a.ts', 'src/b.ts']);
    expect(page2.nextCursor).toBeUndefined();
    // The invalid-cursor path is a typed error value.
    const bad = await call(list, { cursor: 'garbage' });
    expect(bad.error).toMatch(/invalid cursor/);
  });

  it('searches literally in (path, line) order with a query-bound cursor', async () => {
    const kit = repositoryResearchToolset({ root, pageSize: 1 });
    const search = toolByName(kit.tools, 'search_files');
    const page1 = await call(search, { query: 'needle' });
    expect(page1.matches).toEqual([{ file: 'alpha.md', line: 3, text: 'needle here' }]);
    expect(page1.filesScanned).toBe(4);
    const page2 = await call(search, { query: 'needle', cursor: page1.nextCursor });
    expect(page2.matches).toEqual([{ file: 'src/a.ts', line: 2, text: '// needle in a' }]);
    expect(page2.nextCursor).toBeUndefined();
    // A cursor replayed against a DIFFERENT query is refused.
    const mismatched = await call(search, { query: 'other', cursor: page1.nextCursor });
    expect(mismatched.error).toMatch(/invalid cursor/);
  });

  it('skips binary and oversized files and counts them', async () => {
    writeFileSync(path.join(root, 'blob.bin'), Buffer.from([0x6e, 0x00, 0x65, 0x65]));
    writeFileSync(path.join(root, 'big.txt'), `needle ${'x'.repeat(100)}\n`);
    const kit = repositoryResearchToolset({ root, maxFileBytes: 64 });
    const out = await call(toolByName(kit.tools, 'search_files'), { query: 'needle' });
    expect(out.filesSkipped).toBe(2);
    expect((out.matches as { file: string }[]).map((match) => match.file)).toEqual([
      'alpha.md',
      'src/a.ts',
    ]);
  });

  it('reads numbered whole-line pages under the character budget with a continuing cursor', async () => {
    writeFileSync(path.join(root, 'long.txt'), 'first line\nsecond line\nthird line\n');
    const kit = repositoryResearchToolset({ root, readPageChars: 30 });
    const read = toolByName(kit.tools, 'read_file');
    const page1 = await call(read, { path: 'long.txt' });
    expect(page1.content).toBe('1: first line\n2: second line');
    expect(page1.fromLine).toBe(1);
    expect(page1.toLine).toBe(2);
    expect(page1.totalLines).toBe(4);
    const page2 = await call(read, { path: 'long.txt', cursor: page1.nextCursor });
    expect(page2.content).toBe('3: third line\n4: ');
    expect(page2.nextCursor).toBeUndefined();
    // Canonical pages: the identical window is byte-identical however
    // often it is read (the maxNoNewEvidenceCalls composition).
    const again = await call(read, { path: 'long.txt' });
    expect(JSON.stringify(again)).toBe(JSON.stringify(page1));
  });

  it('confines every path to the root: escapes and symlinks are typed error values', async () => {
    symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'sneaky.txt'));
    const kit = repositoryResearchToolset({ root });
    const read = toolByName(kit.tools, 'read_file');
    expect((await call(read, { path: '../secret.txt' })).error).toMatch(/escapes/);
    expect((await call(read, { path: path.join(outside, 'secret.txt') })).error).toMatch(
      /must be relative/,
    );
    expect((await call(read, { path: 'src/../../secret.txt' })).error).toMatch(/escapes/);
    expect((await call(read, { path: 'sneaky.txt' })).error).toMatch(/escapes/);
    // The symlink is also invisible to the walk.
    const listed = await call(toolByName(kit.tools, 'list_files'), {});
    expect(listed.files).not.toContain('sneaky.txt');
  });

  it('verifies evidence at record time: existence, line range, and verbatim quote', async () => {
    const kit = repositoryResearchToolset({ root });
    const record = toolByName(kit.tools, 'record_evidence');
    const ok = await call(record, {
      claim: 'alpha documents the needle',
      file: 'alpha.md',
      lines: '3',
      quote: 'needle here',
    });
    expect(ok).toEqual({ recorded: true, duplicate: false, totalEvidence: 1 });
    expect((await call(record, { claim: 'c', file: 'missing.md' })).error).toMatch(/no such file/);
    expect((await call(record, { claim: 'c', file: 'alpha.md', lines: '9-12' })).error).toMatch(
      /outside/,
    );
    expect((await call(record, { claim: 'c', file: 'alpha.md', lines: 'x' })).error).toMatch(
      /lines must be/,
    );
    expect(
      (await call(record, { claim: 'c', file: 'alpha.md', quote: 'never in the file' })).error,
    ).toMatch(/quote not found/);
    // The failed attempts recorded nothing.
    expect(kit.evidence()).toHaveLength(1);
  });

  it('dedupes identical evidence entries and pages list_evidence', async () => {
    const kit = repositoryResearchToolset({ root, pageSize: 1 });
    const record = toolByName(kit.tools, 'record_evidence');
    await call(record, { claim: 'one', file: 'alpha.md' });
    const dup = await call(record, { claim: 'one', file: 'alpha.md' });
    expect(dup).toEqual({ recorded: false, duplicate: true, totalEvidence: 1 });
    await call(record, { claim: 'two', file: 'beta.txt' });
    const listEvidence = toolByName(kit.tools, 'list_evidence');
    const page1 = await call(listEvidence, {});
    expect(page1.evidence).toEqual([{ claim: 'one', file: 'alpha.md' }]);
    const page2 = await call(listEvidence, { cursor: page1.nextCursor });
    expect(page2.evidence).toEqual([{ claim: 'two', file: 'beta.txt' }]);
    expect(page2.nextCursor).toBeUndefined();
    // The snapshot is a copy: mutating it never touches the collector.
    const snapshot = kit.evidence();
    snapshot.pop();
    (snapshot[0] as { claim: string }).claim = 'mutated';
    expect(kit.evidence()).toEqual([
      { claim: 'one', file: 'alpha.md' },
      { claim: 'two', file: 'beta.txt' },
    ]);
  });

  it('bounds the walk with maxScannedFiles as a typed error value', async () => {
    const kit = repositoryResearchToolset({ root, maxScannedFiles: 2 });
    const out = await call(toolByName(kit.tools, 'list_files'), {});
    expect(out.error).toMatch(/maxScannedFiles/);
  });
});
