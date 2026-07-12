/**
 * Park and unpark (M7-T08).
 *
 * Full contract: https://docs.rulvar.com/guide/durability. Park preserves the
 * child's transcript checkpoint; worktree-isolated parked nodes either
 * pin the tree under `maxPinnedWorktrees` (default 4, shared with
 * DEF-5's `retainWorktree`) or unpark restarts the agent: silent resume
 * against a fresh tree is impossible (the same rule that gates graft
 * safety). Overflow keeps the checkpoint but drops the worktree, so the
 * unpark becomes a restart and grafts degrade to fresh (graft_unsafe).
 * An unpark that restarts is a lineage attempt (relation
 * 'unpark-restart'); it always takes an embedded
 * admission reserve.
 */
import type { IsolationSpec, JournalEntry } from '@rulvar/core';

/** Appendix A: the single pin cap shared by park/unpark and retainWorktree. */
export const DEFAULT_MAX_PINNED_WORKTREES = 4;

/**
 * The worktree pin ledger: a pure fold counting live pins from abandon
 * entries carrying `retainWorktree: true` (park pinning and DEF-5
 * retention share the cap by construction).
 */
export class PinLedger {
  private readonly pinnedTargets = new Set<number>();
  private readonly byNode = new Map<string, number>();

  static fold(entries: readonly JournalEntry[]): PinLedger {
    const ledger = new PinLedger();
    for (const entry of entries) {
      if (entry.kind !== 'abandon' || entry.abandon?.retainWorktree !== true) {
        continue;
      }
      ledger.pinnedTargets.add(entry.abandon.target);
      if (entry.abandon.nodeId !== undefined) {
        ledger.byNode.set(entry.abandon.nodeId, entry.abandon.target);
      }
    }
    return ledger;
  }

  get count(): number {
    return this.pinnedTargets.size;
  }

  hasCapacity(maxPinnedWorktrees: number = DEFAULT_MAX_PINNED_WORKTREES): boolean {
    return this.count < maxPinnedWorktrees;
  }

  isPinnedNode(nodeId: string): boolean {
    return this.byNode.has(nodeId);
  }
}

/** The park disposition computed at landing time. */
export interface ParkDisposition {
  /** Checkpoints are always retained on park. */
  retainCheckpoint: true;
  /** True only for worktree isolation with pin capacity left. */
  retainWorktree: boolean;
}

export function parkDispositionOf(
  isolation: IsolationSpec | undefined,
  pins: PinLedger,
  maxPinnedWorktrees: number = DEFAULT_MAX_PINNED_WORKTREES,
): ParkDisposition {
  const worktree = typeof isolation === 'object' && isolation.kind === 'worktree';
  return {
    retainCheckpoint: true,
    retainWorktree: worktree && pins.hasCapacity(maxPinnedWorktrees),
  };
}

/** The unpark placement: continuation or restart. */
export interface UnparkPlacement {
  /** True when the agent must restart (no checkpoint, or tree dropped). */
  restart: boolean;
  /** The retained checkpoint the continuation boots from. */
  bootCheckpointRef?: string;
}

export function unparkPlacementOf(input: {
  /** The parked node's recorded checkpoint anchor (root dispatch seq). */
  checkpointRef?: number;
  /** The retained transcript ref derived from the anchor, when any. */
  transcriptRef?: string;
  isolation?: IsolationSpec;
  worktreePinned: boolean;
}): UnparkPlacement {
  const worktree = typeof input.isolation === 'object' && input.isolation.kind === 'worktree';
  if (input.checkpointRef === undefined || input.transcriptRef === undefined) {
    return { restart: true };
  }
  if (worktree && !input.worktreePinned) {
    // The pin cap dropped the tree: the checkpoint survives but a silent
    // resume against a fresh tree is impossible.
    return { restart: true };
  }
  return { restart: false, bootCheckpointRef: input.transcriptRef };
}
