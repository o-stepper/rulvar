/**
 * AdmissionController v1 (M6-T06; DEF-2, DEF-3, DEF-5 substrate).
 *
 * Owning spec: docs/07-adaptive-orchestration-spec.md, section
 * "AdmissionController". The single admission point for ALL spawns of any
 * origin: ctx.workflow, the orchestrator spawn tools (M6-T07), escalation
 * decomposition and rung respawns (M7). `admit(spec)` is called BEFORE
 * the carrying spawn-admission decision entry is journaled; the verdict
 * plus reserved amounts plus statsBefore are embedded IN the entry, so
 * replay NEVER re-evaluates admission against the live budget.
 *
 * The AdmitVerdict union is CLOSED here (XF-11) so consumer switches are
 * written once; the reuse_full and admit_graft branches are produced by
 * the DEF-5 reuse machinery in M7-T07, never in M6. M6 enforces maxDepth,
 * maxChildrenPerNode, childBudgetFraction, and the engine lifetime cap;
 * the lineage folds, termination account, and oscillation guard arrive in
 * M7 with their reject codes already registered below.
 */
import { ConfigError } from '../l0/errors.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { parseScopePath } from '../journal/scope.js';
import { DEFAULT_FLAT_RESERVE_USD, type RunBudget } from '../engine/budget.js';

/** Logical-task identity across rebirths (DEF-3); engine-minted ULID. */
export type LogicalTaskId = string;

/** Plan-node identity; engine-minted ULID (docs/07, section 3.1). */
export type NodeId = string;

/** Kernel contentHash of a spawn's root entry (DEF-5). */
export type SpawnKey = string;

/** Donor addressed by the seq of its root entry (DEF-5; producers in M7). */
export type DonorRef = number;

/** Graft bootstrap payload; fields complete with M7-T07 (DEF-5). */
export interface GraftBoot {
  donorRef: DonorRef;
}

/** Layer-1 reservation embedded in the carrying decision entry. */
export interface BudgetReserve {
  reserveUsd: number;
  /** The child sub-account ceiling; absent when the parent is uncapped. */
  childCeilingUsd?: number;
}

/** Telemetry note for a byte-identical repeat admitted fresh (DEF-5). */
export interface DedupNote {
  spawnKey: SpawnKey;
  priorRef: number;
}

/** The lineage block every non-reject verdict carries (DEF-3). */
export interface AdmitLineage {
  logicalTaskId: LogicalTaskId;
  isNew: boolean;
  depth: number;
}

/**
 * The unified admission verdict (docs/07, section 7.2; XF-11). One union,
 * closed now; every debit is atomic with its carrying decision entry and
 * embeds the balance-after (DEF-2).
 */
export type AdmitVerdict =
  | {
      kind: 'admit';
      reserve: BudgetReserve;
      dedup?: DedupNote;
      spawnUnitsAfter: number;
      lineage: AdmitLineage;
    }
  | {
      kind: 'reuse_full';
      donor: DonorRef;
      spawnUnitsAfter: number;
      lineage: AdmitLineage & { isNew: false };
    }
  | {
      kind: 'admit_graft';
      donor: DonorRef;
      reserve: BudgetReserve;
      boot: GraftBoot;
      spawnUnitsAfter: number;
      lineage: AdmitLineage;
    }
  | { kind: 'reject'; reason: AdmitRejectReason };

/** The merged reject-code set (docs/07, section 7.2). */
export type AdmitRejectReason =
  | {
      code:
        | 'depth'
        | 'quota'
        | 'budget'
        | 'lifetime'
        | 'termination_exhausted'
        | 'ladder_exceeds_frozen'
        | 'lineage_exhausted'
        | 'lineage_busy';
    }
  | { code: 'osc_guard'; spawnKey: SpawnKey; oscillationCount: number };

/** Every spawn origin routed through the single admission point (docs/07, 7.1). */
export type SpawnOrigin =
  | 'ctx.workflow'
  | 'ctx.orchestrate'
  | 'spawn_agent'
  | 'parallel_agents'
  | 'escalation-decomposition'
  | 'rung-respawn'
  | 'reuse-link';

/** What the admission point needs to know about one spawn. */
export interface AdmitSpec {
  origin: SpawnOrigin;
  /** Registered workflow name or agent profile name; telemetry and cards only. */
  name: string;
  /** The child's journal scope; doubles as its budget account scope. */
  childScope: string;
  /** The nearest enclosing budget account of the spawner. */
  parentAccountScope: string;
  /** Explicit child budget; clamped by childBudgetFraction (docs/07, 4.1). */
  budgetUsd?: number;
  /** Reserve hint; falls back to the flat engine default (docs/06, 5.1). */
  estCostUsd?: number;
  /** Lineage continuation (DEF-3); absence mints a fresh lineage root. */
  lineage?: { continues: LogicalTaskId };
  /**
   * The children-quota key (maxChildrenPerNode); defaults to
   * parentAccountScope. Orchestrators pass their own scope so each node
   * counts its own children (docs/07, 7.3).
   */
  nodeKey?: string;
}

/** Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3). */
export interface AdmissionStatsBefore {
  spawnsBefore: number;
  childrenOfParentBefore: number;
  depth: number;
}

/** The full admission decision embedded in the carrying entry. */
export interface AdmissionDecision {
  verdict: AdmitVerdict;
  statsBefore: AdmissionStatsBefore;
  /** Node identity minted inside the decision (docs/07, section 5); absent on reject. */
  nodeId?: NodeId;
}

export const DEFAULT_MAX_DEPTH = 1;
export const MAX_DEPTH_CEILING = 4;
export const DEFAULT_MAX_CHILDREN_PER_NODE = 16;
export const DEFAULT_CHILD_BUDGET_FRACTION = 0.3;

/** Nesting depth of a child scope: its workflow, agent, and plan-node segments. */
export function spawnDepthOf(childScope: string): number {
  return parseScopePath(childScope).filter(
    (segment) =>
      segment.kind === 'workflow' || segment.kind === 'agent' || segment.kind === 'plan-node',
  ).length;
}

export class AdmissionController {
  private readonly budget: RunBudget;
  private readonly maxDepth: number;
  private readonly maxChildrenPerNode: number;
  private readonly childBudgetFraction: number;
  private readonly flatReserveUsd: number;
  private readonly maxTotalSpawns?: number;
  private readonly mintId: () => string;
  /** Children admitted per parent node this process lifetime. */
  private readonly childrenOf = new Map<string, number>();
  private admittedTotal = 0;

  constructor(options: {
    budget: RunBudget;
    maxDepth?: number;
    maxChildrenPerNode?: number;
    childBudgetFraction?: number;
    flatReserveUsd?: number;
    /** Per-orchestrate spawn cap (docs/06, 9.3 maxSpawns); engine lifetime cap applies regardless. */
    maxTotalSpawns?: number;
    mintId?: () => string;
  }) {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    if (maxDepth < 1 || maxDepth > MAX_DEPTH_CEILING) {
      throw new ConfigError(
        `maxDepth ${String(maxDepth)} is outside [1, ${String(MAX_DEPTH_CEILING)}] ` +
          '(docs/06, Appendix A: default 1, hard ceiling 4)',
      );
    }
    this.budget = options.budget;
    this.maxDepth = maxDepth;
    this.maxChildrenPerNode = options.maxChildrenPerNode ?? DEFAULT_MAX_CHILDREN_PER_NODE;
    this.childBudgetFraction = options.childBudgetFraction ?? DEFAULT_CHILD_BUDGET_FRACTION;
    this.flatReserveUsd = options.flatReserveUsd ?? DEFAULT_FLAT_RESERVE_USD;
    if (options.maxTotalSpawns !== undefined) {
      this.maxTotalSpawns = options.maxTotalSpawns;
    }
    this.mintId = options.mintId ?? createCanonicalIdMinter();
  }

  /**
   * Evaluates one spawn live, strictly BEFORE its decision entry is
   * appended. On admit the reserve is committed on the whole ancestor
   * account chain atomically with the evaluation; the caller journals the
   * returned decision and only then produces effects (child account,
   * dispatch). On reject nothing is committed and the reject verdict is
   * journaled by the caller so replay re-delivers it without
   * re-evaluation.
   */
  admit(spec: AdmitSpec, options?: { commitReserve?: boolean }): AdmissionDecision {
    const commitReserve = options?.commitReserve ?? true;
    const nodeKey = spec.nodeKey ?? spec.parentAccountScope;
    const depth = spawnDepthOf(spec.childScope);
    const childrenBefore = this.childrenOf.get(nodeKey) ?? 0;
    const statsBefore: AdmissionStatsBefore = {
      spawnsBefore: this.budget.spent().agentsSpawned,
      childrenOfParentBefore: childrenBefore,
      depth,
    };
    if (depth > this.maxDepth) {
      return { verdict: { kind: 'reject', reason: { code: 'depth' } }, statsBefore };
    }
    if (childrenBefore >= this.maxChildrenPerNode) {
      return { verdict: { kind: 'reject', reason: { code: 'quota' } }, statsBefore };
    }
    if (this.maxTotalSpawns !== undefined && this.admittedTotal >= this.maxTotalSpawns) {
      return { verdict: { kind: 'reject', reason: { code: 'lifetime' } }, statsBefore };
    }
    const reserveUsd = spec.estCostUsd ?? this.flatReserveUsd;
    const reserve: BudgetReserve = { reserveUsd };
    const parentRemainder = this.budget.remainderOf(spec.parentAccountScope);
    if (parentRemainder !== undefined) {
      const fractionCap = this.childBudgetFraction * parentRemainder;
      reserve.childCeilingUsd =
        spec.budgetUsd === undefined ? fractionCap : Math.min(spec.budgetUsd, fractionCap);
    } else if (spec.budgetUsd !== undefined) {
      reserve.childCeilingUsd = spec.budgetUsd;
    }
    if (this.budget.spawnHeadroom <= 0) {
      return { verdict: { kind: 'reject', reason: { code: 'lifetime' } }, statsBefore };
    }
    if (commitReserve) {
      try {
        this.budget.admitSpawn(reserveUsd, spec.parentAccountScope);
      } catch {
        // The layer-1 refusal maps onto the embedded verdict: the caller
        // journals the rejection and surfaces the typed error; the run
        // never tears down here (docs/07, 7.3).
        return { verdict: { kind: 'reject', reason: { code: 'budget' } }, statsBefore };
      }
    } else {
      // The spawn tools dispatch through ctx.agent, whose OWN layer-1
      // admission commits the real reserve moments later (one debit,
      // never two); admission still evaluates the chain read-only so a
      // rejection embeds before any dispatch (M6-T07).
      const remainder = this.budget.remainderOf(spec.parentAccountScope);
      if (remainder !== undefined && remainder <= 0) {
        return { verdict: { kind: 'reject', reason: { code: 'budget' } }, statsBefore };
      }
    }
    this.childrenOf.set(nodeKey, childrenBefore + 1);
    this.admittedTotal += 1;
    const logicalTaskId = spec.lineage?.continues ?? this.mintId();
    const verdict: AdmitVerdict = {
      kind: 'admit',
      reserve,
      spawnUnitsAfter: this.budget.spawnHeadroom,
      lineage: {
        logicalTaskId,
        isNew: spec.lineage === undefined,
        depth,
      },
    };
    return { verdict, statsBefore, nodeId: this.mintId() };
  }

  /**
   * Resume roll-forward for an orchestrator child (M6-T07): restores the
   * children-quota counter only. The budget seed already counts settled
   * agent dispatches, and an in-flight child re-commits its reserve
   * through the ctx.agent dispatch path.
   */
  recoverChild(nodeKey: string): void {
    this.childrenOf.set(nodeKey, (this.childrenOf.get(nodeKey) ?? 0) + 1);
    this.admittedTotal += 1;
  }

  /**
   * Resume roll-forward for a child that already SETTLED before the
   * resume: re-registers the counters (maxChildrenPerNode, the lifetime
   * cap, statsBefore fidelity) without committing any reserve; the spend
   * itself sits in the root ledger seed (docs/03, 13.3).
   */
  recoverSettled(parentAccountScope: string): void {
    this.budget.admitRecovered(0, parentAccountScope);
    this.childrenOf.set(parentAccountScope, (this.childrenOf.get(parentAccountScope) ?? 0) + 1);
    this.admittedTotal += 1;
  }

  /**
   * Resume roll-forward for an admission whose decision entry exists but
   * whose child has NOT settled: re-applies the recorded reserve and
   * counters without re-evaluating any limit (docs/07, 7.1: replay never
   * re-evaluates admission; docs/06, 5.1: reserves are recovered, never
   * re-estimated).
   */
  recoverInFlight(parentAccountScope: string, verdict: AdmitVerdict): void {
    if (verdict.kind === 'reject') {
      return;
    }
    const reserveUsd = verdict.kind === 'reuse_full' ? 0 : verdict.reserve.reserveUsd;
    this.budget.admitRecovered(reserveUsd, parentAccountScope);
    this.childrenOf.set(parentAccountScope, (this.childrenOf.get(parentAccountScope) ?? 0) + 1);
    this.admittedTotal += 1;
  }
}
