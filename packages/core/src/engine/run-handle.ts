/**
 * RunHandle, RunOutcome, RunStatus, and CostReport (M1-T10).
 *
 * Full contract: https://docs.rulvar.com/guide/observability.
 */
import type { WireError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { ResolutionOutcome } from '../journal/resolution.js';
import type { WorkflowEvent } from '../l0/events.js';
import type { InvocationRole, Usage } from '../l0/messages.js';
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import type { DroppedItem } from './ctx.js';

/** Suspensions still open at settle time; producers arrive with M2. */
export interface PendingExternal {
  key: string;
  scope: string;
  entryRef: number;
  prompt?: string;
  /** Approvals and Flavor B escalations only. */
  deadlineAt?: string;
}

/** Full contract: https://docs.rulvar.com/guide/observability. */
export interface CostReport {
  /**
   * Where every dollar of this report comes from (RV1413): journaled
   * usage priced at the CALLER'S pricing table (declared rates or
   * adapter caps), never a provider statement. Always
   * `'locally-estimated'` today, declared as a literal so finance
   * tooling never has to guess, mirroring `InvoiceExport.pricingBasis`;
   * reconcile real bills through the invoice export and
   * `reconcileStatement`, which carry their own provenance.
   */
  basis: 'locally-estimated';
  /**
   * The NET ledger: priced terminal usage with abandoned subtrees
   * contributing zero (their spend is a sunk cost of branches the
   * orchestrator discarded, not of the work the run kept). The
   * provider still billed them: reconcile invoices against `grossUsd`,
   * never this.
   */
  totalUsd: number;
  /**
   * The gross/net split (P1.3): totalUsd + abandoned.usd, every priced
   * terminal slice with abandonment included. This is the immutable
   * provider-spend figure an invoice reconciles against; abandoning a
   * branch never shrinks it.
   */
  grossUsd: number;
  /**
   * Provider wire requests recorded by the per-dispatch ledger
   * (RV1904): the sum of every settled entry's providerCalls, each
   * record counting its absorbed continuations (`wireRequests`, RV905)
   * and one otherwise, abandoned subtrees included, because their
   * attempts hit the wire all the same. On ledger-covered runs this
   * equals the invoice cardinality's `wireRequests`, the recovery
   * benchmark's 55, so the terminal and the invoice finally share one
   * denominator; pre-ledger slices carry no record and surface in the
   * invoice as unattributed rows instead. Set by the journal fold;
   * absent from a live `buildCostReport` accumulation that did not
   * count wires.
   */
  wireRequests?: number;
  /**
   * Priced spend under abandoned subtrees, exactly the part totalUsd
   * excludes. `unpriced` here surfaces abandoned slices with no price
   * row (the top-level `unpriced` lists only slices contributing to
   * totalUsd), and `usageApprox` follows the same semantics as the
   * top-level flag over the abandoned entries; grossUsd is an estimate
   * whenever either flag is raised.
   */
  abandoned: {
    usd: number;
    unpriced: Array<{ model: string; usage: Usage }>;
    usageApprox?: boolean;
  };
  /** Keyed by canonical ModelRef 'adapterId:model'. */
  byModel: Record<string, number>;
  /** ctx.phase names; phase is structural for this map. */
  byPhase: Record<string, number>;
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  /**
   * All-zero with forcedFinish false in runs without a dynamic
   * orchestrator (or when no cap resolved, so no sub-account opened).
   * Folded purely from the journal: spentUsd is the priced usage of
   * entries debited to the orchestrator sub-account, reserveUsedUsd its
   * reserve-funded forced-finish share, wakes the ARMED (journaled)
   * wake suspensions (a wait satisfied synchronously never suspends and
   * is not counted), and forcedFinish the journaled at-cap decision.
   */
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
  /**
   * Present and true when any terminal entry folded into totalUsd carried
   * approximate usage (a transport cut, a stream the ceiling severed, or
   * an abort estimated the turn instead of the provider reporting it), so
   * totalUsd is a lower bound estimate, never an exact charge. Absent
   * means every contributing entry reported exact usage. The field the
   * v1.39.0 review asked the report to raise so approximate cost is never
   * shown as though it were the provider invoice.
   */
  usageApprox?: boolean;
}

/**
 * One row of the acceptance fold's per-child roster (RV806): the
 * settled status, the salvage arm that would have accepted the child
 * (absent when none applied), and the evidence verdict where the child
 * declared an evidence contract. `waivedBySalvage: true` marks a child
 * whose evidence floor was NOT met but which a salvage arm accepted
 * anyway; gate on it where waived evidence must not pass silently.
 * `floorRequired: true` marks the opposite verdict under
 * `acceptance.requireEvidenceFloor` (RV1207): the arm applied, the
 * floor was not met, and the child was NOT promoted, so the row is
 * diagnostic and the child counted against the policy. Since RV1412 an
 * OK row can carry `floorRequired` too: the child settled 'ok' below
 * its declared floor and the same flag excluded it from the policy
 * count (without the flag such a row keeps `met: false` unmarked, and
 * the child rides `belowFloorOkChildren` with a degradation note).
 */
export interface AcceptanceChildSummary {
  child: string;
  status: string;
  salvage?: 'partial' | 'terminal-output';
  evidence?: {
    recordedEntries: number;
    minEntries: number;
    met: boolean;
    waivedBySalvage?: true;
    floorRequired?: true;
  };
}

export type RunOutcome<R> = {
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  value?: R;
  error?: WireError;
  /**
   * The semantic completion lift, mirrored from `run:end` (RV-207 tail;
   * the 1.65.0 experiment review, P0.5): present when the workflow
   * reported semantic completion through the completion envelope
   * contract, an `ok`/`exhausted` run whose result value is an object
   * carrying a valid `completion` literal, or an `error` run whose typed
   * error data carries one (the orchestrator acceptance path emits
   * both). Transport status says whether the run ran; completion says
   * whether the work is COMPLETE: an accepted degraded run is `status:
   * 'ok'` with `completion: 'partial'`. The engine computes the lift
   * ONCE and both surfaces spread the same object, so the outcome and
   * the event can never disagree; a host reads completeness here
   * without parsing workflow-specific value shapes on the accepted path
   * or digging typed error data on the rejected one. Absent when the
   * workflow makes no completion claim.
   */
  completion?: 'complete' | 'partial' | 'rejected';
  /**
   * Settled child statuses by status name, lifted from the same
   * envelope (or typed error data) when it carries a valid record of
   * nonnegative integers; the mirror of the `run:end` field. Absent
   * otherwise.
   */
  childStatusCounts?: Record<string, number>;
  /**
   * Per-child degradation notes, lifted from the same envelope (or
   * typed error data) when it carries a valid string array (the fifth
   * experiment, cycle 75): the facts the orchestrator acceptance path
   * has always emitted beside completion, now on the outcome itself so
   * a host stops digging error.data on the rejected path. An empty
   * array is the workflow's claim of zero degradation; absence means no
   * claim was made.
   */
  degradedReasons?: string[];
  /** Children accepted by acceptPartialChildren; same lift and posture. */
  salvagedPartialChildren?: string[];
  /**
   * Children accepted through validated terminal output salvage on
   * 'limit'; same lift and posture.
   */
  salvagedTerminalOutputChildren?: string[];
  /**
   * Children that settled 'ok' below their declared evidence floor
   * (RV1412); same lift and posture. A fact list in both modes: under
   * the default their shortfall is a degradation note and the verdict
   * is untouched; under `acceptance.requireEvidenceFloor` they also
   * counted against the policy.
   */
  belowFloorOkChildren?: string[];
  /**
   * The per-child machine roster of the acceptance fold (RV806), lifted
   * from the same envelope (or typed error data) under the same
   * posture: each spawned child with its settled status, the salvage
   * arm that accepted it (when one did), and the evidence verdict where
   * the child declared an evidence contract, `waivedBySalvage` marking
   * a below-floor child a salvage arm accepted anyway. The twelfth
   * comparison run accepted two below-floor children through salvage
   * and the outcome showed it only as name lists; this is the machine
   * verdict. Replay-stable: the roster is journaled inside the single
   * acceptance decision.
   */
  acceptanceChildren?: AcceptanceChildSummary[];
  /** Pipeline drops and onError:'null' losses; silent losses are forbidden. */
  dropped: DroppedItem[];
  /** Suspensions open at settle time (M2). */
  pending: PendingExternal[];
  usage: Usage;
  cost: CostReport;
  /**
   * The unified terminal envelope (RV1105): every terminal fact in ONE
   * shape, assembled once at the settlement chokepoint and shared with
   * the `run:end` event, so the SDK and the event stream can never
   * disagree. A RESOLVED outcome always carries `settled: true` inside
   * it: an unsettled terminal rejects `handle.result` typed instead of
   * resolving (RV907, RV1009), and its refusing envelope rides the
   * event alone.
   */
  envelope: TerminalEnvelope;
};

/** Adds 'running' for in-flight inspection. */
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

export { buildCostReport } from './cost-report.js';
