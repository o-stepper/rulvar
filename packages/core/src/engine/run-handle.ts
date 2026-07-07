/**
 * RunHandle, RunOutcome, RunStatus, and CostReport (M1-T10).
 *
 * Owning specs: docs/06-execution-spec.md, section "RunOptions, RunHandle,
 * RunOutcome, RunStatus"; docs/09-observability-testing-spec.md, sections
 * "RunHandle" and "CostReport".
 */
import type { WireError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { ResolutionOutcome } from '../journal/resolution.js';
import type { WorkflowEvent } from '../l0/events.js';
import type { InvocationRole, Usage } from '../l0/messages.js';
import type { DroppedItem, CostAttribution } from './ctx.js';

/** Suspensions still open at settle time; producers arrive with M2. */
export interface PendingExternal {
  key: string;
  scope: string;
  entryRef: number;
  prompt?: string;
  /** Approvals and Flavor B escalations only. */
  deadlineAt?: string;
}

/** docs/09, section "CostReport". */
export interface CostReport {
  totalUsd: number;
  /** Keyed by canonical ModelRef 'adapterId:model'. */
  byModel: Record<string, number>;
  /** ctx.phase names; phase is structural for this map. */
  byPhase: Record<string, number>;
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  /** All-zero with forcedFinish false in runs without a dynamic orchestrator. */
  orchestrator: {
    spentUsd: number;
    /** spentUsd / max(totalUsd, 0.01): the epsilon-floored H-OrchShare input. */
    share: number;
    wakes: number;
    forcedFinish: boolean;
    reserveUsedUsd: number;
  };
  /** Usage on models absent from pricing; never a silent zero. */
  unpriced: Array<{ model: string; usage: Usage }>;
}

export type RunOutcome<R> = {
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  value?: R;
  error?: WireError;
  /** Pipeline drops and onError:'null' losses; silent losses are forbidden. */
  dropped: DroppedItem[];
  /** Suspensions open at settle time (M2). */
  pending: PendingExternal[];
  usage: Usage;
  cost: CostReport;
};

/** Adds 'running' for in-flight inspection (docs/06, section "Engine and ops API"). */
export type RunStatus = RunOutcome<unknown>['status'] | 'running';

export interface RunHandle<R> {
  runId: string;
  result: Promise<RunOutcome<R>>;
  events: AsyncIterable<WorkflowEvent>;
  on<T extends WorkflowEvent['type']>(
    type: T,
    cb: (e: Extract<WorkflowEvent, { type: T }>) => void,
  ): () => void;
  /**
   * Resolves an open awaitExternal suspension (DEF-4 signature): applied
   * when this attempt wins the first-closing-wins fold; repeated
   * resolution is defined behavior, not an error. An invalid live payload
   * throws InvalidResolutionError and journals nothing.
   */
  resolveExternal(key: string, value: Json): Promise<ResolutionOutcome>;
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
}

const ROLES: InvocationRole[] = ['orchestrate', 'plan', 'loop', 'finalize', 'extract', 'summarize'];

/** Folds the per-run attribution buckets into the normative CostReport. */
export function buildCostReport(attribution: CostAttribution, totalUsd: number): CostReport {
  const byRole = Object.fromEntries(ROLES.map((role) => [role, 0])) as Record<
    InvocationRole,
    number
  >;
  for (const [role, usd] of attribution.byRole) {
    byRole[role] = usd;
  }
  return {
    totalUsd,
    byModel: Object.fromEntries(attribution.byModel),
    byPhase: Object.fromEntries(attribution.byPhase),
    byAgentType: Object.fromEntries(attribution.byAgentType),
    byRole,
    orchestrator: {
      spentUsd: 0,
      share: 0,
      wakes: 0,
      forcedFinish: false,
      reserveUsedUsd: 0,
    },
    unpriced: attribution.unpriced,
  };
}
