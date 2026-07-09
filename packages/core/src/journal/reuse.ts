/**
 * Reuse-by-reference: SpawnKey dedup, donor rules, node.link, and the
 * abandoned-spend ledger (M7-T07, DEF-5).
 *
 * Owning spec: docs/03-journal-spec.md, section 9; docs/07, section 7.3.
 * Oscillation (cancel followed by a byte-identical re-add) no longer
 * means full repayment: completed work under an abandoned scope comes
 * back by reference, partially completed work grafts through a
 * scope-prefix alias, and both outcomes are fixed by a journaled
 * `node.link` entry written strictly before effects.
 *
 * There is no new hash concept: a SpawnKey IS the kernel contentHash of
 * the spawn's root entry; matching is strict byte equality. The
 * DedupIndex is a pure fold computed against the fold HEAD at
 * revision-apply time under the PlanWriteLock (base snapshots validate
 * only); on replay every verdict is READ from its deciding entry and the
 * alias map rebuilds by fold.
 */
import { createHash } from 'node:crypto';
import type { EntryRef, JournalEntry } from '../l0/entries.js';
import type { ModelRef, Usage } from '../l0/messages.js';
import { jcsSerialize } from '../l0/jcs.js';
import { childCoveragePrefix } from './disposition.js';
import type { LogicalTaskId } from './lineage.js';

/** Kernel contentHash of a spawn root entry (docs/03, 9.2). */
export type SpawnKey = string;

/** Plan-node identity (docs/07, 3.1). */
type NodeId = string;

/** The rich donor descriptor embedded in reuse verdicts (docs/03, 9.9). */
export interface DonorRef {
  /** Head of the link chain. */
  nodeId: NodeId;
  /** Seq of the donor's root entry. */
  rootEntryRef: EntryRef;
  /** Transitive chain, oldest first. */
  chain: NodeId[];
  spawnKey: SpawnKey;
  /** Lineage continues through the link (docs/03, 9.6; DEF-3). */
  logicalTaskId: LogicalTaskId;
  /** Paid under the chain at the verdict snapshot. */
  paidUsd: number;
}

/** Graft bootstrap payload (docs/03, 9.9). */
export interface GraftBoot {
  /** Retained by the abandon entry, when it was. */
  checkpointRef?: string;
  /** Deterministic sum of match-eligible payments. */
  eligiblePaidUsd: number;
  worktreePinned: boolean;
}

/** Telemetry for a SpawnKey match admitted fresh (docs/03, 9.9). */
export interface DedupNote {
  spawnKey: SpawnKey;
  donorNodeId: NodeId;
  reason: 'donor_failed' | 'no_paid_entries' | 'graft_unsafe' | 'donor_active';
}

/** The reuse block of AdmissionConfig (docs/03, 9.9). */
export interface ReuseConfig {
  /** Default true. */
  enabled?: boolean;
  /** Default true. */
  allowGraft?: boolean;
  /** Default 2 (Appendix A). */
  maxOscillationsPerKey?: number;
  /** Optional RevisionGuards trigger on netLostUsd (docs/07, 3.8). */
  maxAbandonedNetUsdFraction?: number;
}

export const DEFAULT_MAX_OSCILLATIONS_PER_KEY = 2;

/** The consumer-facing reuse mark on results (docs/03, 9.9). */
export interface AgentResultMeta {
  reusedFrom?: {
    nodeId: NodeId;
    rootEntryRef: EntryRef;
    mode: 'full' | 'graft';
    reclaimedUsd: number;
  };
}

/** The node.link entry value (docs/03, 9.5): an ordinary content-keyed effect entry. */
export interface NodeLinkValue {
  targetNodeId: NodeId;
  /** plan/NewNodeId. */
  targetScope: string;
  /** plan/HeadNodeId (only the donor is addressed by seq elsewhere). */
  donorScope: string;
  /** Full chain for transitive drainage, oldest first. */
  chain: string[];
  spawnKey: SpawnKey;
  logicalTaskId: LogicalTaskId;
  mode: 'full' | 'graft';
  /** full is shareable, graft is exclusive (docs/03, 9.5). */
  claim: 'shared' | 'exclusive';
  checkpointRef?: string;
  reclaimedUsdAtLink: number;
  donorRootRef: EntryRef;
}

/**
 * node.link identity (docs/03, 9.5): sha256 of {kind, spawnKey,
 * donorScope, targetNodeId}; targetNodeId is deterministic on replay
 * because NodeIds are assigned inside plan.revision.
 */
export function nodeLinkKey(spawnKey: SpawnKey, donorScope: string, targetNodeId: NodeId): string {
  return createHash('sha256')
    .update(jcsSerialize({ kind: 'node.link', spawnKey, donorScope, targetNodeId }), 'utf8')
    .digest('hex');
}

/** The abandoned-spend ledger fold (docs/03, 9.7). */
export interface AbandonedSpendView {
  abandonedUsd: number;
  reclaimedUsd: number;
  netLostUsd: number;
  byKey: Record<SpawnKey, { oscillationCount: number; abandonedUsd: number; reclaimedUsd: number }>;
}

/** One donor candidate surfaced by the DedupIndex fold (docs/03, 9.3). */
export interface DonorCandidate {
  rootEntryRef: EntryRef;
  rootScope: string;
  spawnKey: SpawnKey;
  /** From the abandon payload when the sever named the node. */
  nodeId?: NodeId;
  logicalTaskId?: LogicalTaskId;
  /** Effective root status BEFORE the abandon overlay. */
  preAbandonStatus: 'ok' | 'escalated' | 'running' | 'cancelled' | 'error' | 'limit';
  memoizedFailure: boolean;
  /** Total paid under the donor's child coverage at fold time. */
  paidUsd: number;
  /** Match-eligible (completed, non-running, non-cancelled) payments. */
  eligiblePaidUsd: number;
  hasPaidEntries: boolean;
  isolationWorktree: boolean;
  worktreePinned: boolean;
  checkpointRef?: string;
  retainedCheckpoint: boolean;
  /** Seq of the exclusive node.link that captured this donor, if any. */
  claimedBy?: EntryRef;
  /** Scope chain for transitive drainage, oldest first (docs/03, 9.6). */
  chain: string[];
}

/**
 * The DedupIndex: a pure fold over spawn roots, severing abandons, and
 * node.link entries. Prices fold from journal facts (servedBy, usage)
 * through the injected price function; on replay the embedded verdict
 * values are authoritative and this fold serves integrity only.
 */
export class DedupIndex {
  private readonly donors = new Map<SpawnKey, DonorCandidate[]>();
  private readonly links = new Map<SpawnKey, number>();
  private readonly spend: AbandonedSpendView = {
    abandonedUsd: 0,
    reclaimedUsd: 0,
    netLostUsd: 0,
    byKey: {},
  };

  static fold(
    entries: readonly JournalEntry[],
    options?: { priceUsd?: (servedBy: ModelRef | undefined, usage: Usage) => number | undefined },
  ): DedupIndex {
    const index = new DedupIndex();
    const priceOf = (entry: JournalEntry): number => {
      if (entry.usage === undefined) {
        return 0;
      }
      return options?.priceUsd?.(entry.servedBy, entry.usage) ?? 0;
    };
    const bySeq = new Map<number, JournalEntry>();
    const terminals = new Map<number, JournalEntry>();
    for (const entry of entries) {
      bySeq.set(entry.seq, entry);
      if (entry.ref !== undefined && entry.kind !== 'resolution' && entry.kind !== 'abandon') {
        terminals.set(entry.ref, entry);
      }
    }
    const coveredPrefixes: string[] = [];
    const coveredSeqs = new Set<number>();
    const isCovered = (entry: JournalEntry): boolean =>
      coveredSeqs.has(entry.seq) ||
      coveredPrefixes.some(
        (prefix) => entry.scope === prefix || entry.scope.startsWith(`${prefix}/`),
      );
    for (const entry of entries) {
      if (entry.kind === 'abandon' && entry.ref !== undefined) {
        const target = bySeq.get(entry.ref);
        if (target === undefined || isCovered(target)) {
          // Repeated abandons fold to noop (docs/03, 9.1).
          continue;
        }
        coveredSeqs.add(target.seq);
        const spawnPrefix = childCoveragePrefix(target);
        coveredPrefixes.push(spawnPrefix);
        if (target.kind !== 'agent' && target.kind !== 'child') {
          continue;
        }
        const terminal = terminals.get(target.seq);
        const preAbandonStatus = (terminal?.status ??
          target.status) as DonorCandidate['preAbandonStatus'];
        const payload = entry.abandon;
        // Payments under the donor's coverage at fold time: for plan
        // nodes the branch lives in the root's OWN scope (plan/NodeId,
        // exclusive to the node); nested spawns live under the spawn
        // prefix (docs/03, 2.2). Shared parent scopes are never swept.
        const prefixes = [spawnPrefix];
        if (isPlanNodeScope(target.scope) && target.scope !== spawnPrefix) {
          prefixes.push(target.scope);
        }
        const seen = new Set<number>();
        let paidUsd = 0;
        let eligiblePaidUsd = 0;
        for (const member of entries) {
          if (seen.has(member.seq)) {
            continue;
          }
          const covered =
            member.seq === target.seq ||
            member.seq === terminal?.seq ||
            prefixes.some(
              (prefix) => member.scope === prefix || member.scope.startsWith(`${prefix}/`),
            );
          if (!covered) {
            continue;
          }
          seen.add(member.seq);
          const memberUsd = priceOf(member);
          paidUsd += memberUsd;
          if (member.status !== 'running' && member.status !== 'cancelled') {
            eligiblePaidUsd += memberUsd;
          }
        }
        const isolation = readIsolation(target);
        const donorScope = isPlanNodeScope(target.scope) ? target.scope : spawnPrefix;
        const candidate: DonorCandidate = {
          rootEntryRef: target.seq,
          rootScope: donorScope,
          spawnKey: target.key,
          ...(payload?.nodeId === undefined ? {} : { nodeId: payload.nodeId }),
          ...(payload?.logicalTaskId === undefined ? {} : { logicalTaskId: payload.logicalTaskId }),
          preAbandonStatus,
          memoizedFailure:
            preAbandonStatus === 'error' &&
            (terminal?.memoizeOutcome === true || target.memoizeOutcome === true),
          paidUsd,
          eligiblePaidUsd,
          hasPaidEntries: paidUsd > 0,
          isolationWorktree: isolation === 'worktree',
          worktreePinned: payload?.retainWorktree === true,
          ...(terminal?.checkpointRef === undefined
            ? {}
            : { checkpointRef: terminal.checkpointRef }),
          retainedCheckpoint: payload?.retainCheckpoint !== false,
          chain: [donorScope],
        };
        const list = index.donors.get(target.key) ?? [];
        list.push(candidate);
        index.donors.set(target.key, list);
        index.spend.abandonedUsd += paidUsd;
        const byKey = (index.spend.byKey[target.key] ??= {
          oscillationCount: 0,
          abandonedUsd: 0,
          reclaimedUsd: 0,
        });
        byKey.abandonedUsd += paidUsd;
        continue;
      }
      if (entry.kind === 'node.link') {
        const value = entry.value as unknown as NodeLinkValue;
        index.links.set(value.spawnKey, (index.links.get(value.spawnKey) ?? 0) + 1);
        index.spend.reclaimedUsd += value.reclaimedUsdAtLink;
        const byKey = (index.spend.byKey[value.spawnKey] ??= {
          oscillationCount: 0,
          abandonedUsd: 0,
          reclaimedUsd: 0,
        });
        byKey.oscillationCount += 1;
        byKey.reclaimedUsd += value.reclaimedUsdAtLink;
        // Claims resolve first-wins in journal order; chains extend for
        // transitive drainage (docs/03, 9.6).
        const donorsOfKey = index.donors.get(value.spawnKey) ?? [];
        const donor = donorsOfKey.find(
          (candidate) =>
            candidate.rootScope === value.donorScope && candidate.claimedBy === undefined,
        );
        if (donor !== undefined && value.claim === 'exclusive') {
          donor.claimedBy = entry.seq;
        }
        if (donor !== undefined) {
          donor.chain = [...value.chain];
        }
      }
    }
    index.spend.netLostUsd = index.spend.abandonedUsd - index.spend.reclaimedUsd;
    return index;
  }

  /** Unclaimed donor candidates for a key, oldest (chain head) first. */
  donorsOf(spawnKey: SpawnKey): DonorCandidate[] {
    return (this.donors.get(spawnKey) ?? []).filter(
      (candidate) => candidate.claimedBy === undefined,
    );
  }

  /** Every donor for a key including claimed ones (diagnostics). */
  allDonorsOf(spawnKey: SpawnKey): DonorCandidate[] {
    return this.donors.get(spawnKey) ?? [];
  }

  /** Link count per key: the oscillation counter (docs/03, 9.7). */
  oscillationCountOf(spawnKey: SpawnKey): number {
    return this.links.get(spawnKey) ?? 0;
  }

  abandonedSpend(): AbandonedSpendView {
    return {
      abandonedUsd: this.spend.abandonedUsd,
      reclaimedUsd: this.spend.reclaimedUsd,
      netLostUsd: this.spend.netLostUsd,
      byKey: Object.fromEntries(
        Object.entries(this.spend.byKey).map(([key, value]) => [key, { ...value }]),
      ),
    };
  }
}

/** A plan-node scope (docs/03, 2.1): its entries belong to one node. */
function isPlanNodeScope(scope: string): boolean {
  return /(^|\/)plan\/[0-9A-Z]{26}$/.test(scope);
}

function readIsolation(entry: JournalEntry): string {
  const value = entry.value as { isolation?: unknown } | undefined;
  const isolation = value?.isolation;
  if (typeof isolation === 'string') {
    return isolation;
  }
  if (typeof isolation === 'object' && isolation !== null) {
    return (isolation as { kind?: string }).kind ?? 'none';
  }
  return 'none';
}

/**
 * The four-outcome verdict evaluation on a SpawnKey match (docs/03,
 * 9.4), computed once live at the fold head and embedded into the
 * deciding entry; replay never re-evaluates.
 */
export function evaluateReuse(
  index: DedupIndex,
  spawnKey: SpawnKey,
  config?: ReuseConfig,
):
  | { kind: 'none' }
  | { kind: 'reject_osc_guard'; oscillationCount: number }
  | { kind: 'reuse_full'; donor: DonorCandidate }
  | { kind: 'admit_graft'; donor: DonorCandidate }
  | { kind: 'fresh'; note: DedupNote } {
  if (config?.enabled === false) {
    return { kind: 'none' };
  }
  const maxOscillations = config?.maxOscillationsPerKey ?? DEFAULT_MAX_OSCILLATIONS_PER_KEY;
  const oscillationCount = index.oscillationCountOf(spawnKey);
  const candidates = index.donorsOf(spawnKey);
  if (candidates.length === 0) {
    return { kind: 'none' };
  }
  if (oscillationCount >= maxOscillations) {
    return { kind: 'reject_osc_guard', oscillationCount };
  }
  // Oldest first: the chain drains from its head (docs/03, 9.6).
  const donor = candidates[0];
  if (donor.memoizedFailure || donor.preAbandonStatus === 'error') {
    return {
      kind: 'fresh',
      note: { spawnKey, donorNodeId: donor.nodeId ?? '', reason: 'donor_failed' },
    };
  }
  if (donor.preAbandonStatus === 'ok' || donor.preAbandonStatus === 'escalated') {
    return { kind: 'reuse_full', donor };
  }
  // Severed in flight: graft when safe.
  if (!donor.hasPaidEntries || donor.eligiblePaidUsd <= 0) {
    return {
      kind: 'fresh',
      note: { spawnKey, donorNodeId: donor.nodeId ?? '', reason: 'no_paid_entries' },
    };
  }
  if (config?.allowGraft === false || (donor.isolationWorktree && !donor.worktreePinned)) {
    return {
      kind: 'fresh',
      note: { spawnKey, donorNodeId: donor.nodeId ?? '', reason: 'graft_unsafe' },
    };
  }
  return { kind: 'admit_graft', donor };
}
