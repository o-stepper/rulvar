/**
 * AdmissionController v1 (M6-T06; DEF-2, DEF-3, DEF-5 substrate).
 *
 * Public contract: https://docs.rulvar.com/guide/adaptive-orchestration.
 * The single admission point for ALL spawns of any
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
import type { JournalEntry } from '../l0/entries.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { parseScopePath } from '../journal/scope.js';
import {
  approachSigCoarse,
  approachSigOf,
  LEGACY_SIGNATURE_INPUTS,
  LINEAGE_SIG_VERSION,
  LineageIndex,
  normalizeApproachTag,
  validateEscalationLimits,
  type ApproachSignatureInputs,
  type EscalationLimits,
  type LineageRelation,
  type LineageStats,
  type LogicalTaskId,
  type SpawnLineage,
  type SpawnLineageOpt,
} from '../journal/lineage.js';
import type { TerminationAccount } from '../journal/termination.js';
import { DEFAULT_FLAT_RESERVE_USD, type RunBudget } from '../engine/budget.js';

export type { LogicalTaskId } from '../journal/lineage.js';
export type { DedupNote, DonorRef, GraftBoot, SpawnKey } from '../journal/reuse.js';
import type { DedupNote, DonorRef, GraftBoot, SpawnKey } from '../journal/reuse.js';

/** Plan-node identity; engine-minted ULID. */
export type NodeId = string;

/** Layer-1 reservation embedded in the carrying decision entry. */
export interface BudgetReserve {
  reserveUsd: number;
  /** The child sub-account ceiling; absent when the parent is uncapped. */
  childCeilingUsd?: number;
}

/** The lineage block every non-reject verdict carries (DEF-3). */
export interface AdmitLineage {
  logicalTaskId: LogicalTaskId;
  isNew: boolean;
  depth: number;
}

/**
 * The unified admission verdict (XF-11). One union,
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

/** The merged reject-code set. */
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

/** Every spawn origin routed through the single admission point. */
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
  /** Explicit child budget; clamped by childBudgetFraction. */
  budgetUsd?: number;
  /** Reserve hint; falls back to the flat engine default. */
  estCostUsd?: number;
  /**
   * Lineage continuation (DEF-3); absence mints a fresh lineage root. A
   * continuation demands a causeRef: the seq of the entry that caused the
   * rebirth.
   */
  lineage?: SpawnLineageOpt;
  /** Raw approach tag; normalized by the engine. */
  approach?: string;
  /** Decomposition parent-LTID chain (relation 'decompose-child' only). */
  ancestry?: LogicalTaskId[];
  /**
   * Coarse-signature identity inputs; unspecified fields canonize onto
   * the deterministic legacy constants so signatures stay byte-stable
   * (the toolset/schema registries land in M7-T05).
   */
  signature?: Partial<ApproachSignatureInputs>;
  /**
   * The declared ladder length of the resolved profile (K_l); default 1,
   * the single implicit rung. Under a termination account, a length
   * beyond the frozen kMax rejects with ladder_exceeds_frozen and a NEW
   * lineage is allocated E0 escalation units plus K_l - 1 rungs (DEF-2).
   */
  ladderLength?: number;
  /**
   * The children-quota key (maxChildrenPerNode); defaults to
   * parentAccountScope. Orchestrators pass their own scope so each node
   * counts its own children.
   */
  nodeKey?: string;
}

/** Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3). */
export interface AdmissionStatsBefore {
  spawnsBefore: number;
  childrenOfParentBefore: number;
  depth: number;
  /** The LTID's pinned lineage fold at admit time (DEF-3). */
  lineage?: LineageStats;
}

/** The full admission decision embedded in the carrying entry. */
export interface AdmissionDecision {
  verdict: AdmitVerdict;
  statsBefore: AdmissionStatsBefore;
  /** Node identity minted inside the decision; absent on reject. */
  nodeId?: NodeId;
  /**
   * The computed value-part lineage block (DEF-3): reused byte-exact on
   * replay, never recomputed. Absent on reject.
   */
  lineage?: SpawnLineage;
  /**
   * The declared ladder length recorded for the termination fold
   * (DEF-2): the replay recomputation reads K_l from the entry, never
   * from the live registry. Present only under a termination account.
   */
  ladderLength?: number;
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
  private readonly journalView?: () => readonly JournalEntry[];
  private readonly lineageIndex?: LineageIndex;
  private readonly lineageLimits: EscalationLimits;
  private terminationAccount?: TerminationAccount;
  /** Children admitted per parent node this process lifetime. */
  private readonly childrenOf = new Map<string, number>();
  private admittedTotal = 0;

  constructor(options: {
    budget: RunBudget;
    maxDepth?: number;
    maxChildrenPerNode?: number;
    childBudgetFraction?: number;
    flatReserveUsd?: number;
    /** Per-orchestrate spawn cap (maxSpawns); engine lifetime cap applies regardless. */
    maxTotalSpawns?: number;
    mintId?: () => string;
    /**
     * The lineage binding (DEF-3): a journal view for the pure counter
     * folds plus the configured limits. Without it the controller mints
     * and embeds lineage but enforces no lineage limits (unit contexts).
     */
    lineage?: {
      journalView: () => readonly JournalEntry[];
      limits?: Partial<EscalationLimits> | Record<string, unknown>;
    };
  }) {
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    if (maxDepth < 1 || maxDepth > MAX_DEPTH_CEILING) {
      throw new ConfigError(
        `maxDepth ${String(maxDepth)} is outside [1, ${String(MAX_DEPTH_CEILING)}] ` +
          '(default 1, hard ceiling 4)',
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
    this.lineageLimits = validateEscalationLimits(options.lineage?.limits);
    if (options.lineage !== undefined) {
      this.journalView = options.lineage.journalView;
      this.lineageIndex = new LineageIndex();
    }
  }

  /** The lineage counter folds over the run journal (absorbed lazily). */
  lineage(): LineageIndex | undefined {
    if (this.lineageIndex !== undefined && this.journalView !== undefined) {
      this.lineageIndex.absorb(this.journalView());
    }
    return this.lineageIndex;
  }

  /** The validated lineage limits this controller enforces (DEF-3). */
  get escalationLimits(): EscalationLimits {
    return this.lineageLimits;
  }

  /**
   * Binds the run's TerminationAccount (DEF-2; PlanRunner runs only):
   * from bind time on, every admitted spawn of any
   * origin debits one spawnUnit atomically with its decision entry, and
   * a declared ladder longer than the frozen kMax rejects with
   * ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
   * keep the engine lifetime cap semantics unchanged.
   */
  bindTermination(account: TerminationAccount): void {
    if (this.terminationAccount !== undefined && this.terminationAccount !== account) {
      throw new ConfigError('one run carries exactly one TerminationAccount');
    }
    this.terminationAccount = account;
  }

  /** The bound account, when this is a PlanRunner run (DEF-2). */
  get termination(): TerminationAccount | undefined {
    return this.terminationAccount;
  }

  /**
   * The lineage half of admission (DEF-3): folds are
   * computed live STRICTLY BEFORE the carrying decision entry is appended;
   * the caller embeds the returned block in the entry and replay reads it
   * back byte-exact. Enforces the single-live-attempt invariant
   * (`lineage_busy`) and monotonic attempt consumption
   * (`lineage_exhausted`); never touches budget or structural limits.
   */
  evaluateLineage(spec: {
    name: string;
    lineage?: SpawnLineageOpt;
    approach?: string;
    ancestry?: LogicalTaskId[];
    signature?: Partial<ApproachSignatureInputs>;
  }): {
    decision:
      | { kind: 'ok'; lineage: SpawnLineage }
      | { kind: 'reject'; reason: { code: 'lineage_busy' | 'lineage_exhausted' } };
    statsBefore?: LineageStats;
  } {
    if (spec.lineage !== undefined && typeof spec.lineage.causeRef !== 'number') {
      throw new ConfigError(
        'a lineage continuation demands a causeRef: the seq of the entry that caused the ' +
          'rebirth',
      );
    }
    const index = this.lineage();
    const continued = spec.lineage?.continues;
    const statsBefore =
      index !== undefined && continued !== undefined ? index.statsOf(continued) : undefined;
    if (index !== undefined && continued !== undefined) {
      if (index.hasLiveAttempt(continued)) {
        return {
          decision: { kind: 'reject', reason: { code: 'lineage_busy' } },
          ...(statsBefore === undefined ? {} : { statsBefore }),
        };
      }
      if (index.attemptsUsed(continued) >= this.lineageLimits.maxAttemptsPerLogicalTask) {
        return {
          decision: { kind: 'reject', reason: { code: 'lineage_exhausted' } },
          ...(statsBefore === undefined ? {} : { statsBefore }),
        };
      }
    }
    const logicalTaskId = continued ?? this.mintId();
    const relation: LineageRelation =
      spec.lineage === undefined ? 'first' : (spec.lineage.relation ?? 'respawn');
    const signature: ApproachSignatureInputs = {
      agentType: spec.signature?.agentType ?? spec.name,
      toolsetHash: spec.signature?.toolsetHash ?? LEGACY_SIGNATURE_INPUTS.toolsetHash,
      schemaHash: spec.signature?.schemaHash ?? LEGACY_SIGNATURE_INPUTS.schemaHash,
      isolation: spec.signature?.isolation ?? LEGACY_SIGNATURE_INPUTS.isolation,
    };
    const coarse = approachSigCoarse(signature);
    const lineage: SpawnLineage = {
      logicalTaskId,
      relation,
      attemptOrdinal: index?.attemptsUsed(logicalTaskId) ?? 0,
      ...(spec.lineage?.causeRef === undefined ? {} : { causeRef: spec.lineage.causeRef }),
      ancestry: spec.ancestry ?? [],
      approachSig: approachSigOf(coarse, spec.approach),
      approachSigCoarse: coarse,
      sigVersion: LINEAGE_SIG_VERSION,
      approachTag: normalizeApproachTag(spec.approach),
    };
    return {
      decision: { kind: 'ok', lineage },
      ...(statsBefore === undefined ? {} : { statsBefore }),
    };
  }

  /**
   * Registers a live lineage admit the moment its caller commits to
   * appending the decision entry, closing the single-live-attempt window
   * until the journal absorbs the entry (DEF-3).
   */
  registerLineageAdmit(logicalTaskId: LogicalTaskId): void {
    this.lineageIndex?.noteAdmitted(logicalTaskId);
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
    // Lineage folds are computed live STRICTLY BEFORE the decision entry
    // is appended; the pinned stats embed into the entry.
    const evaluated = this.evaluateLineage(spec);
    const statsBefore: AdmissionStatsBefore = {
      spawnsBefore: this.budget.spent().agentsSpawned,
      childrenOfParentBefore: childrenBefore,
      depth,
      ...(evaluated.statsBefore === undefined ? {} : { lineage: evaluated.statsBefore }),
    };
    if (evaluated.decision.kind === 'reject') {
      // Single-live-attempt (lineage_busy) and monotonic attempt
      // consumption (lineage_exhausted), never replenished.
      return { verdict: { kind: 'reject', reason: evaluated.decision.reason }, statsBefore };
    }
    if (this.terminationAccount !== undefined) {
      // DEF-2: a ladder longer than the frozen kMax would break the
      // variant function's weight C; the new profile serves later runs.
      if ((spec.ladderLength ?? 1) > this.terminationAccount.limits.kMax) {
        return {
          verdict: { kind: 'reject', reason: { code: 'ladder_exceeds_frozen' } },
          statsBefore,
        };
      }
      if (this.terminationAccount.spawnUnitsExhausted) {
        // The caller writes termination.denied strictly before surfacing
        // the typed error, then journals this verdict.
        return {
          verdict: { kind: 'reject', reason: { code: 'termination_exhausted' } },
          statsBefore,
        };
      }
    }
    if (depth > this.maxDepth) {
      return { verdict: { kind: 'reject', reason: { code: 'depth' } }, statsBefore };
    }
    if (childrenBefore >= this.maxChildrenPerNode) {
      return { verdict: { kind: 'reject', reason: { code: 'quota' } }, statsBefore };
    }
    if (this.maxTotalSpawns !== undefined && this.admittedTotal >= this.maxTotalSpawns) {
      return { verdict: { kind: 'reject', reason: { code: 'lifetime' } }, statsBefore };
    }
    let childCeilingUsd: number | undefined;
    const parentRemainder = this.budget.remainderOf(spec.parentAccountScope);
    if (parentRemainder !== undefined) {
      const fractionCap = this.childBudgetFraction * parentRemainder;
      childCeilingUsd =
        spec.budgetUsd === undefined ? fractionCap : Math.min(spec.budgetUsd, fractionCap);
    } else if (spec.budgetUsd !== undefined) {
      childCeilingUsd = spec.budgetUsd;
    }
    // The reserve never exceeds the child's own ceiling: a sub-account
    // bounded to X can never spend more than X, so projected admission
    // must not hold more than X against the parent chain (a flat reserve
    // above a small run ceiling would otherwise deny every capped child).
    let reserveUsd = spec.estCostUsd ?? this.flatReserveUsd;
    if (childCeilingUsd !== undefined) {
      reserveUsd = Math.min(reserveUsd, childCeilingUsd);
    }
    const reserve: BudgetReserve = { reserveUsd };
    if (childCeilingUsd !== undefined) {
      reserve.childCeilingUsd = childCeilingUsd;
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
        // never tears down here.
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
    const lineage = evaluated.decision.lineage;
    this.registerLineageAdmit(lineage.logicalTaskId);
    // Under a termination account the spawn debit is atomic with this
    // decision: minus one spawnUnit for an admitted spawn of ANY origin;
    // a NEW lineage receives its frozen allocation in the same step, and
    // the balance-after is embedded in the verdict (DEF-2).
    let spawnUnitsAfter = this.budget.spawnHeadroom;
    if (this.terminationAccount !== undefined) {
      const debited = this.terminationAccount.debitSpawn({
        logicalTaskId: lineage.logicalTaskId,
        isNew: spec.lineage === undefined,
        ladderLength: spec.ladderLength ?? 1,
      });
      if (!debited.ok) {
        // Unreachable in a single-threaded admit (pre-checked above);
        // kept total for safety.
        return {
          verdict: { kind: 'reject', reason: { code: 'termination_exhausted' } },
          statsBefore,
        };
      }
      spawnUnitsAfter = debited.spawnUnitsAfter;
    }
    const verdict: AdmitVerdict = {
      kind: 'admit',
      reserve,
      spawnUnitsAfter,
      lineage: {
        logicalTaskId: lineage.logicalTaskId,
        isNew: spec.lineage === undefined,
        depth,
      },
    };
    return {
      verdict,
      statsBefore,
      nodeId: this.mintId(),
      lineage,
      ...(this.terminationAccount === undefined ? {} : { ladderLength: spec.ladderLength ?? 1 }),
    };
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
   * itself sits in the root ledger seed.
   */
  recoverSettled(parentAccountScope: string): void {
    this.budget.admitRecovered(0, parentAccountScope);
    this.childrenOf.set(parentAccountScope, (this.childrenOf.get(parentAccountScope) ?? 0) + 1);
    this.admittedTotal += 1;
  }

  /**
   * Resume roll-forward for an admission whose decision entry exists but
   * whose child has NOT settled: re-applies the recorded reserve and
   * counters without re-evaluating any limit (replay never
   * re-evaluates admission; reserves are recovered, never
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
