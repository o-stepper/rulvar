/**
 * IsolationProvider SPI: worktree acquire/collect/dispose lifecycle. One of
 * the six SPI seams frozen at 1.0. The shipped git worktree provider and
 * the full lifecycle land in M3.
 *
 * Full contract: https://docs.rulvar.com/guide/tools.
 */
import type { Bytes } from '../json.js';

/**
 * The canonical identity encoding of spawn isolation: this exact value
 * domain enters spawn identity.
 * 'readonly' is a determinism and blast-radius declaration, not
 * containment.
 */
export type IsolationSpec = 'none' | 'readonly' | { kind: 'worktree'; ref?: string };

export interface IsolationProvider {
  acquire(s: { runId: string; spanId: string; ref?: string }): Promise<{
    cwd: string;
    collect(): Promise<{ files: string[]; patch: Bytes }>;
    dispose(keep?: boolean): Promise<void>;
  }>;
}
