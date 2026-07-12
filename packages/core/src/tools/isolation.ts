/**
 * Worktree isolation (M3-T05): the shipped IsolationProvider over git
 * worktrees. Acquire creates a detached worktree from HEAD (or a given
 * ref) of the host repository; the agent's tools receive cwd inside it;
 * collect() snapshots changed files and a binary patch (the engine stores
 * the patch in TranscriptStore and returns its reference in
 * AgentResult.artifacts; applying the patch is ALWAYS the caller's
 * responsibility); dispose cleans up, with keepOnError as the opt-in to
 * retain failed trees under the shared pin cap.
 *
 * The sandbox is a determinism and blast-radius boundary, NOT a security
 * boundary.
 *
 * Full contract: https://docs.rulvar.com/guide/tools
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { ConfigError } from '../l0/errors.js';
import type { Bytes } from '../l0/json.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';

const execFileAsync = promisify(execFile);

/** Appendix A: the shared pin cap (park/unpark and retainWorktree). */
export const DEFAULT_MAX_PINNED_WORKTREES = 4;

export interface GitWorktreeProviderOptions {
  /** Host repository root; default process.cwd(). */
  repoRoot?: string;
  /**
   * Retain the tree of a FAILED agent for inspection when the engine
   * requests keep on dispose. Default false.
   */
  keepOnError?: boolean;
  /** Pin cap shared by park/unpark and retainWorktree (default 4). */
  maxPinnedWorktrees?: number;
  /** Warning sink (cap overflow); defaults to process.emitWarning. */
  onWarn?: (msg: string) => void;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

/**
 * The shipped git worktree lifecycle. A non-git host is a typed
 * ConfigError at acquire.
 */
export class GitWorktreeProvider implements IsolationProvider {
  private readonly repoRoot: string;
  private readonly keepOnError: boolean;
  private readonly maxPinned: number;
  private readonly onWarn: (msg: string) => void;
  private readonly pinned = new Set<string>();

  constructor(options?: GitWorktreeProviderOptions) {
    this.repoRoot = options?.repoRoot ?? process.cwd();
    this.keepOnError = options?.keepOnError ?? false;
    this.maxPinned = options?.maxPinnedWorktrees ?? DEFAULT_MAX_PINNED_WORKTREES;
    this.onWarn =
      options?.onWarn ??
      ((msg) => process.emitWarning(msg, { code: 'RULVAR_WORKTREE', type: 'RulvarWarning' }));
  }

  /** Trees currently retained under the pin cap. */
  get pinnedWorktrees(): ReadonlySet<string> {
    return this.pinned;
  }

  async acquire(spawn: { runId: string; spanId: string; ref?: string }): Promise<{
    cwd: string;
    collect(): Promise<{ files: string[]; patch: Bytes }>;
    dispose(keep?: boolean): Promise<void>;
  }> {
    try {
      await git(this.repoRoot, ['rev-parse', '--git-common-dir']);
    } catch {
      throw new ConfigError(
        `worktree isolation requires a git repository at '${this.repoRoot}' ` + '',
      );
    }
    const dir = await mkdtemp(join(tmpdir(), `rulvar-wt-${spawn.runId.slice(0, 8)}-`));
    await git(this.repoRoot, ['worktree', 'add', '--detach', dir, spawn.ref ?? 'HEAD']);

    const collect = async (): Promise<{ files: string[]; patch: Bytes }> => {
      // Stage everything (including untracked) so one cached diff covers
      // the whole delta; the tree is engine-owned, staging is harmless.
      await git(dir, ['add', '-A']);
      const names = await git(dir, ['diff', '--cached', '--name-only', '-z']);
      const files = names.split('\0').filter((name) => name !== '');
      const patchText = await git(dir, ['diff', '--cached', '--binary']);
      return { files, patch: new TextEncoder().encode(patchText) };
    };

    const dispose = async (keep?: boolean): Promise<void> => {
      if (keep === true && this.keepOnError) {
        if (this.pinned.size < this.maxPinned) {
          this.pinned.add(dir);
          return;
        }
        this.onWarn(
          `worktree pin cap (${this.maxPinned}) reached; dropping the tree of a failed ` +
            'agent instead of retaining it',
        );
      }
      try {
        await git(this.repoRoot, ['worktree', 'remove', '--force', dir]);
      } catch {
        // A tree the user deleted manually or a half-created one: fall
        // back to prune plus direct removal.
        await rm(dir, { recursive: true, force: true });
        await git(this.repoRoot, ['worktree', 'prune']).catch(() => undefined);
      }
    };

    return { cwd: dir, collect, dispose };
  }
}
