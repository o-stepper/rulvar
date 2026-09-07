/**
 * The worktree cwd rides the isolated exec request (RV4914). Before it,
 * the request carried no directory at all: an agent under worktree
 * isolation whose tool dispatched through the container executor drafted
 * its patch in an ephemeral directory the executor removed after the
 * call, and the "isolated patch" posture came back empty, silently. The
 * request now carries the acquired tree exactly when one was acquired,
 * and nothing else changes on the other isolation values.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

import type { Json } from '../l0/json.js';
import type { IsolatedExecRequest, ToolExecutorProvider } from '../l0/spi/executor.js';
import { GitWorktreeProvider } from '../tools/isolation.js';
import { tool } from '../tools/tool.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const execFileAsync = promisify(execFile);

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'rulvar-ctx-exec-repo-'));
  const git = (...args: string[]) => execFileAsync('git', ['-C', dir, ...args]);
  await git('init', '--initial-branch=main');
  await git('config', 'user.email', 'test@example.com');
  await git('config', 'user.name', 'Test');
  await writeFile(join(dir, 'README.md'), 'base\n');
  await git('add', '-A');
  await git('commit', '-m', 'initial');
  return dir;
}

/** An external tool: dispatch routes to the registered provider. */
const patcher = tool({
  name: 'patcher',
  description: 'drafts a change out of process',
  parameters: {},
  executor: 'container',
  executorSpec: { command: 'unused' },
  execute: () => Promise.reject(new Error('must not run in process')),
});

/** What the provider saw at dispatch time: the tree is disposed after the agent settles. */
interface Seen {
  request: IsolatedExecRequest;
  /** Whether the request cwd held the repository's README at dispatch time. */
  readmeInCwd: boolean;
}

/** Records every request handed to the provider, judged while the tree still exists. */
function recordingExecutor(seen: Seen[]): { container: ToolExecutorProvider } {
  return {
    container: {
      run: (request: IsolatedExecRequest): Promise<Json> => {
        seen.push({
          request,
          readmeInCwd: request.cwd !== undefined && existsSync(join(request.cwd, 'README.md')),
        });
        return Promise.resolve({ ok: true });
      },
    },
  };
}

const oneCall = () =>
  scriptedAdapter((_req, call) =>
    call === 0 ? { toolCall: { name: 'patcher', args: {} } } : { text: 'drafted' },
  );

describe('the worktree cwd rides the isolated exec request (RV4914)', () => {
  it('under worktree isolation the request carries the acquired tree', async () => {
    const repo = await makeRepo();
    const seen: Seen[] = [];
    const { internals } = makeInternals({
      adapters: [oneCall()],
      routing: { loop: 'fake:model' },
      isolation: new GitWorktreeProvider({ repoRoot: repo }),
      executors: recordingExecutor(seen),
    });
    await createCtx(internals).agent('draft a change', {
      tools: [patcher],
      isolation: { kind: 'worktree' },
    });
    expect(seen).toHaveLength(1);
    const cwd = seen[0]?.request.cwd;
    expect(typeof cwd).toBe('string');
    // The tree was a checkout of the repository while the dispatch ran,
    // and neither the host cwd nor the repository itself.
    expect(seen[0]?.readmeInCwd).toBe(true);
    expect(cwd).not.toBe(repo);
    expect(cwd).not.toBe(process.cwd());
  });

  it("under 'none' and 'readonly' the request has no cwd key at all", async () => {
    for (const isolation of [undefined, 'readonly'] as const) {
      const seen: Seen[] = [];
      const { internals } = makeInternals({
        adapters: [oneCall()],
        routing: { loop: 'fake:model' },
        executors: recordingExecutor(seen),
      });
      await createCtx(internals).agent('draft a change', {
        tools: [patcher],
        ...(isolation === undefined ? {} : { isolation }),
      });
      expect(seen).toHaveLength(1);
      expect(Object.hasOwn(seen[0]?.request ?? {}, 'cwd')).toBe(false);
    }
  });
});
