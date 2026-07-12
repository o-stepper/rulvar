import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { Artifact } from '../runtime/agent-loop.js';
import { GitWorktreeProvider } from '../tools/isolation.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const execFileAsync = promisify(execFile);

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'rulvar-ctx-repo-'));
  const git = (...args: string[]) => execFileAsync('git', ['-C', dir, ...args]);
  await git('init', '--initial-branch=main');
  await git('config', 'user.email', 'test@example.com');
  await git('config', 'user.name', 'Test');
  await writeFile(join(dir, 'README.md'), 'base\n');
  await git('add', '-A');
  await git('commit', '-m', 'initial');
  return dir;
}

const writeNote = tool({
  name: 'write_note',
  description: 'writes a note into the working directory',
  parameters: { type: 'object' },
  risk: 'write',
  execute: async (_input, ctx) => {
    await writeFile(join(ctx.cwd, 'note.txt'), 'from the agent\n');
    return `wrote into ${ctx.cwd}`;
  },
});

describe('worktree isolation through ctx.agent (M3-T05)', () => {
  it('tools run inside the worktree; the patch lands in artifacts and the journal', async () => {
    const repo = await makeRepo();
    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'write_note', args: {} } } : { text: 'noted' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      isolation: provider,
    });
    const ctx = createCtx(internals);
    const result = (await ctx.agent('take a note', {
      tools: [writeNote],
      isolation: { kind: 'worktree' },
      result: 'full',
    })) as { status: string; artifacts?: Artifact[] };
    expect(result.status).toBe('ok');
    const patchArtifact = result.artifacts?.find((artifact) => artifact.kind === 'patch');
    expect(patchArtifact?.files).toEqual(['note.txt']);
    expect(patchArtifact?.ref).toBeDefined();

    await internals.replayer.flush();
    const terminal = internals.replayer
      .snapshot()
      .find((entry) => entry.kind === 'agent' && entry.status === 'ok');
    expect(terminal?.artifacts).toEqual([patchArtifact]);

    // The patch blob is durable and applies to the host by the caller.
    const blob = await internals.transcripts.get(patchArtifact?.ref ?? '');
    expect(blob).not.toBeNull();
    expect(new TextDecoder().decode(blob ?? new Uint8Array())).toContain('from the agent');
  });

  it('a replayed isolated agent reconstructs artifacts with zero live calls', async () => {
    const repo = await makeRepo();
    const provider = new GitWorktreeProvider({ repoRoot: repo });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'write_note', args: {} } } : { text: 'noted' },
    );
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      isolation: provider,
    });
    await createCtx(internals).agent('take a note', {
      tools: [writeNote],
      isolation: { kind: 'worktree' },
    });
    await internals.replayer.flush();
    const prior = await store.load('test-run');

    const replayAdapter = scriptedAdapter(() => ({ text: 'never' }));
    const { internals: resumed } = makeInternals({
      adapters: [replayAdapter],
      routing: { loop: 'fake:model' },
      priorEntries: prior,
      isolation: provider,
    });
    const replayed = (await createCtx(resumed).agent('take a note', {
      tools: [writeNote],
      isolation: { kind: 'worktree' },
      result: 'full',
    })) as { status: string; artifacts?: Artifact[] };
    expect(replayAdapter.calls).toHaveLength(0);
    expect(replayed.status).toBe('ok');
    expect(replayed.artifacts?.[0]?.kind).toBe('patch');
    expect(replayed.artifacts?.[0]?.files).toEqual(['note.txt']);
  });

  it('worktree isolation without a provider is a ConfigError before any dispatch', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'x' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    await expect(ctx.agent('take a note', { isolation: { kind: 'worktree' } })).rejects.toThrow(
      ConfigError,
    );
    expect(adapter.calls).toHaveLength(0);
  });

  it("isolation 'readonly' is accepted as a declaration with the host cwd", async () => {
    const adapter = scriptedAdapter(() => ({ text: 'read only' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    await expect(ctx.agent('look around', { isolation: 'readonly' })).resolves.toBe('read only');
  });
});

describe("'readonly' isolation compiles a write/destructive deny rule into the spawn chain", () => {
  const riskyTool = (risk: 'read' | 'write' | 'destructive', ran: { value: boolean }) =>
    tool({
      name: 'probe',
      description: 'observable probe tool',
      parameters: { type: 'object' },
      risk,
      execute: () => {
        ran.value = true;
        return Promise.resolve('probe ran');
      },
    });

  const driveOnce = async (
    risk: 'read' | 'write' | 'destructive',
    isolation: 'readonly' | undefined,
  ): Promise<{ ran: boolean; secondRequest: string }> => {
    const ran = { value: false };
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { toolCall: { name: 'probe', args: {} } } : { text: 'settled' },
    );
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const result = await ctx.agent('use the probe', {
      tools: [riskyTool(risk, ran)],
      ...(isolation === undefined ? {} : { isolation }),
    });
    expect(result).toBe('settled');
    return { ran: ran.value, secondRequest: JSON.stringify(adapter.calls[1] ?? {}) };
  };

  it('denies a write tool under readonly without executing it', async () => {
    const { ran, secondRequest } = await driveOnce('write', 'readonly');
    expect(ran).toBe(false);
    expect(secondRequest).toMatch(/deny/i);
  });

  it('denies a destructive tool under readonly without executing it', async () => {
    const { ran } = await driveOnce('destructive', 'readonly');
    expect(ran).toBe(false);
  });

  it('leaves read tools allowed under readonly', async () => {
    const { ran } = await driveOnce('read', 'readonly');
    expect(ran).toBe(true);
  });

  it('leaves write tools allowed without isolation', async () => {
    const { ran } = await driveOnce('write', undefined);
    expect(ran).toBe(true);
  });
});
