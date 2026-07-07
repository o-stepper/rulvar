import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { deriveContentKey } from '../journal/identity.js';
import { EMPTY_SCHEMA_HASH, EMPTY_TOOLSET_HASH } from '../l0/schema.js';
import { GitWorktreeProvider } from './isolation.js';

const execFileAsync = promisify(execFile);

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'lurker-host-repo-'));
  const git = (...args: string[]) => execFileAsync('git', ['-C', dir, ...args]);
  await git('init', '--initial-branch=main');
  await git('config', 'user.email', 'test@example.com');
  await git('config', 'user.name', 'Test');
  await writeFile(join(dir, 'README.md'), 'hello\n');
  await git('add', '-A');
  await git('commit', '-m', 'initial');
  return dir;
}

describe('GitWorktreeProvider (M3-T05)', () => {
  it('a non-git host is a typed ConfigError at acquire', async () => {
    const notARepo = await mkdtemp(join(tmpdir(), 'lurker-not-a-repo-'));
    const provider = new GitWorktreeProvider({ repoRoot: notARepo });
    await expect(provider.acquire({ runId: 'r', spanId: 's' })).rejects.toThrow(ConfigError);
  });

  it('acquire/collect/dispose: the patch round-trips changed and new files', async () => {
    const repo = await makeRepo();
    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const acquired = await provider.acquire({ runId: 'run-1', spanId: 's1' });
    expect(acquired.cwd).not.toBe(repo);
    // A worktree starts at HEAD: the committed file is present.
    await expect(readFile(join(acquired.cwd, 'README.md'), 'utf8')).resolves.toBe('hello\n');

    await writeFile(join(acquired.cwd, 'README.md'), 'hello world\n');
    await writeFile(join(acquired.cwd, 'new-file.txt'), 'fresh\n');
    const { files, patch } = await acquired.collect();
    expect(files.sort()).toEqual(['README.md', 'new-file.txt']);
    const patchText = new TextDecoder().decode(patch);
    expect(patchText).toContain('+hello world');
    expect(patchText).toContain('new-file.txt');

    await acquired.dispose();
    expect(existsSync(acquired.cwd)).toBe(false);

    // Applying the patch is the CALLER's responsibility; prove it applies
    // cleanly onto the host tree.
    const patchPath = join(await mkdtemp(join(tmpdir(), 'lurker-patch-')), 'delta.patch');
    await writeFile(patchPath, patch);
    await execFileAsync('git', ['-C', repo, 'apply', patchPath]);
    await expect(readFile(join(repo, 'new-file.txt'), 'utf8')).resolves.toBe('fresh\n');
  });

  it('collect on an untouched tree yields an empty delta', async () => {
    const repo = await makeRepo();
    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const acquired = await provider.acquire({ runId: 'run-1', spanId: 's1' });
    const { files, patch } = await acquired.collect();
    expect(files).toEqual([]);
    expect(patch.length).toBe(0);
    await acquired.dispose();
  });

  it('keepOnError retains failed trees under the pin cap; overflow drops with a warning', async () => {
    const repo = await makeRepo();
    const warnings: string[] = [];
    const provider = new GitWorktreeProvider({
      repoRoot: repo,
      keepOnError: true,
      maxPinnedWorktrees: 1,
      onWarn: (msg) => warnings.push(msg),
    });
    const first = await provider.acquire({ runId: 'r1', spanId: 's1' });
    const second = await provider.acquire({ runId: 'r2', spanId: 's2' });
    await first.dispose(true);
    expect(existsSync(first.cwd)).toBe(true);
    expect(provider.pinnedWorktrees.size).toBe(1);
    await second.dispose(true);
    expect(existsSync(second.cwd)).toBe(false);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('pin cap');
  });

  it('without keepOnError a keep request still removes the tree', async () => {
    const repo = await makeRepo();
    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const acquired = await provider.acquire({ runId: 'r1', spanId: 's1' });
    await acquired.dispose(true);
    expect(existsSync(acquired.cwd)).toBe(false);
  });

  it('acquire honors an explicit ref', async () => {
    const repo = await makeRepo();
    const git = (...args: string[]) => execFileAsync('git', ['-C', repo, ...args]);
    const first = (await git('rev-parse', 'HEAD')).stdout.trim();
    await writeFile(join(repo, 'README.md'), 'second commit\n');
    await git('add', '-A');
    await git('commit', '-m', 'second');

    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const acquired = await provider.acquire({ runId: 'r1', spanId: 's1', ref: first });
    await expect(readFile(join(acquired.cwd, 'README.md'), 'utf8')).resolves.toBe('hello\n');
    await acquired.dispose();
  });
});

describe('IsolationSpec identity encoding (M3-T05)', () => {
  it('identity differs across isolation values', () => {
    const base = {
      kind: 'agent',
      agentType: '',
      modelSpec: { kind: 'model', model: 'fake:model' },
      prompt: 'p',
      schemaHash: EMPTY_SCHEMA_HASH,
      toolsetHash: EMPTY_TOOLSET_HASH,
    } as const;
    const keys = (['none', 'readonly'] as const).map((isolation) =>
      deriveContentKey({ ...base, isolation }),
    );
    keys.push(deriveContentKey({ ...base, isolation: { kind: 'worktree' } }));
    keys.push(deriveContentKey({ ...base, isolation: { kind: 'worktree', ref: 'main' } }));
    expect(new Set(keys).size).toBe(4);
  });
});
