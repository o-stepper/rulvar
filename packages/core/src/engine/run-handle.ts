/**
 * RunHandle, RunOutcome, RunStatus, and CostReport (M1-T10).
 *
 * Full contract: https://docs.rulvar.com/guide/observability.
 */
import type { WireError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { ApprovalRevocationOutcome } from './external.js';
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
  /**
   * ctx.phase names; phase is structural for this map. Spend with no
   * phase, or an EMPTY phase, folds under the named 'unknown' bucket
   * (RV3604): a '' key is unaddressable in every downstream table,
   * and the third comparison run's report read `byPhase {"": 5.58}`
   * for the whole run. In dynamic runs the orchestrator's own stages
   * name their dispatches since RV3905 ('fan-out' children,
   * 'coordination' loop turns and the forced-finish wake,
   * 'composition' synthesis and incremental notes, 'judge' claim
   * passes, 'repair' the bounded claim repair round), filling only
   * the vacuum: an explicit host ctx.phase around the orchestration
   * keeps its own bucket. The fourth comparison run's report read
   * byPhase 100% 'unknown' over stages the journal held apart. The
   * 'repair' bucket additionally receives the granted mechanical
   * repair turns' own wires (RV4002): the call that immediately
   * follows a rejected terminal-tool exchange carries a wire-level
   * override, so a draft or composition repair's money no longer
   * drowns in its hosting dispatch's bucket (the fifth comparison
   * run's one draft repair wire read 'coordination').
   */
  byPhase: Record<string, number>;
  /** Spawn agentType names; absent and empty fold under 'unknown' (RV3604). */
  byAgentType: Record<string, number>;
  byRole: Record<InvocationRole, number>;
  /**
   * Spend per journal scope (RV3805): the root and every child are
   * addressable rows whose sum equals `totalUsd`, so the children
   * versus whole-workflow cut (the third comparison analysis had to
   * hand-aggregate it from invoice rows) reads off the report
   * directly. The root's OWN scope is the empty string BY
   * CONSTRUCTION, present data rather than an absence, so it folds
   * under the named 'root' bucket; children keep their scope strings
   * verbatim, and only a truly absent scope folds under 'unknown',
   * the RV3604 fallback.
   */
  byScope: Record<string, number>;
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
/**
 * One semantic pass's explicit summary (RV1906): `ran: true` means the
 * pass executed (its findings and meta fields carry the details);
 * `ran: false` names WHY in `reason` ('not-configured', 'run-rejected',
 * 'valid-draft', 'not-run'), so an absent findings field can never be
 * read as a clean pass. The four-role benchmark's artifacts carried
 * `contradictions: null` and `claimConsistencyMeta: null`, and the
 * judge had to annotate by hand that null meant NOT RUN.
 */
export interface SemanticPassSummary {
  ran: boolean;
  reason?: string;
}

/** The three semantic passes' explicit summaries (RV1906). */
export interface SemanticPassesSummary {
  contradictions: SemanticPassSummary;
  claimConsistency: SemanticPassSummary;
  synthesis: SemanticPassSummary;
}

/**
 * One finish candidate the declared contract did NOT accept (RV2507).
 * The 1.226.0 comparison run rejected three syntheses; nothing on its
 * terminal said so, nothing said whether the three differed from each
 * other, and the only way to read them was an external script that
 * re-parsed the whole agent transcript. The row is the artifact that
 * dig produced, made first class.
 *
 * `hash` is the sha256 over the canonical candidate: two rows with the
 * same hash are the model serving the same document twice, which is a
 * different failure from three genuine attempts and used to be
 * invisible. `ref` is present exactly under
 * `finishValidation.retainRejectedCandidates`, and points at a
 * transcript blob holding the candidate verbatim; without it the row
 * still identifies and sizes what was rejected, and names the
 * validators that did it.
 */
export interface RejectedFinishCandidate {
  /** The finish tool call this candidate arrived on. */
  callId: string;
  /** `'repair'` when another turn was granted, `'rejected'` when this was the last. */
  verdict: 'repair' | 'rejected';
  /** sha256 over the canonical candidate; identity, not location. */
  hash: string;
  /** The candidate's length in characters, honest whether or not the bytes were retained. */
  chars: number;
  /** Each validator that rejected it, with its reasons: the diff. */
  failed: { name: string; reasons: string[] }[];
  /** Transcript ref holding the bytes; absent unless retention is on and the write succeeded. */
  ref?: string;
}

/**
 * The roster facts of a run that died before any acceptance verdict
 * (RV2602): a fold over the children's own journaled terminals, so an
 * `exhausted` or failed orchestration still names the work it paid for.
 */
export interface ChildrenAtFailure {
  /** Children admitted, whether or not they settled. */
  spawned: number;
  /** Of those, the ones carrying a terminal at the moment of death. */
  settled: number;
  /** Their statuses, counted; the same vocabulary a child terminal uses. */
  statusCounts: Record<string, number>;
  /**
   * Children that settled `ok` under a declared evidence contract they
   * did not meet. The acceptance fold names these too, but only after
   * it runs: the fourth parity run's silent worker was `ok` with zero
   * recorded entries and its run never reached acceptance at all.
   */
  belowFloorOkChildren?: string[];
  /** Children still running when the run gave up; absent when none were. */
  unsettled?: string[];
}

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
  /** The explicit semantic pass summaries (RV1906); same lift and posture. */
  semanticPasses?: SemanticPassesSummary;
  /**
   * The claim-consistency pass meta (`judgeInvoked`, `judgeDeclined`,
   * the pair counts), lifted from the same envelope or typed error
   * data (RV2203). The RV2106 mirror run journaled its declined judge
   * and the error terminal carried null: the truth now rides every
   * terminal that has it, ok and failed alike.
   */
  claimConsistencyMeta?: Record<string, unknown>;
  /**
   * The judged contradictions themselves (RV3601), lifted from the
   * same envelope or typed error data as the meta beside them. RV3304
   * deliberately kept the details off this surface and let the meta's
   * `findings` count stand in; the 2026-08-13 comparison run then
   * failed typed with the findings buried in `error.data` while the
   * outcome's top level read null beside a null meta, so the details
   * now ride wherever the meta rides (this outcome, the journaled
   * settle, `run:end`), the compact terminal envelope alone keeping
   * the meta only. `[]` is the judge's claim of a clean document;
   * absence means nothing was judged (RV1209).
   */
  claimContradictions?: Record<string, unknown>[];
  /** The synthesis-skip marker from the same envelope; same lift and posture (RV2203). */
  synthesisSkipped?: boolean | string;
  /**
   * Whether the artifact THIS terminal carries was accepted by the
   * declared finish contract (RV2506), lifted from the same envelope or
   * typed error data. The one question `status` and `completion` cannot
   * answer between them: the 1.226.0 comparison run accepted its
   * children (`completion: 'complete'` was earned by the acceptance
   * policy over child statuses), then failed its synthesis against the
   * contract three times and settled carrying nothing the contract ever
   * accepted, and the scoring harness read `status: 'ok'` and could not
   * tell. Absent, NEVER false, when no `finishValidation` was declared:
   * nothing judged anything, and absence means NOT RECORDED (RV1209).
   * False means a contract was declared and the artifact here did not
   * pass it, including the case where nothing was ever judged because
   * the run died first.
   */
  deliverableAccepted?: boolean;
  /**
   * Whether this terminal carries a deliverable to read at all
   * (RV2506); same lift and posture. False on every enriched failure
   * (an `error` outcome carries no value by construction) and on an
   * accepted run whose synthesis resolved to null. Distinct from
   * `deliverableAccepted`: an unjudged artifact still EXISTS, and a run
   * with no artifact still has a completion claim.
   */
  resultAvailable?: boolean;
  /**
   * The journal seq of the decision entry that records the acceptance
   * of the artifact this terminal carries (RV2506); same lift and
   * posture, absent whenever `deliverableAccepted` is not true. Three
   * different entries answer to it, which is the point of having one
   * field: the accepted `orchestrator_finish_validation` decision on
   * the ordinary path, the `orchestrator_synthesis_skip` decision when
   * the RV510 gate settled on a valid draft, and the
   * `orchestrator_synthesis_regressed` decision when the RV2505 floor
   * handed a failing synthesis back to its draft. Read it with
   * `rulvar inspect` (or any journal reader) to see WHICH validators
   * rendered the acceptance and over WHICH draft hash.
   */
  acceptedArtifactRef?: number;
  /**
   * Every finish candidate the declared contract did NOT accept, in the
   * order they were judged (RV2507); same lift and posture. Present
   * only when there was at least one, so a run that passed first try
   * keeps its exact terminal. It rides the ok terminal as well as the
   * failed one: a run that recovered on its second attempt still owes a
   * post-mortem the first, and the comparison analysis that had to
   * reconstruct three rejected syntheses from a transcript is the
   * reason the field exists.
   */
  rejectedFinishCandidates?: RejectedFinishCandidate[];
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
  /**
   * What the children had produced when the run died BEFORE its
   * acceptance policy ever rendered a verdict (RV2602).
   *
   * Every other field on this envelope describes a policy's claim, and
   * a policy that never ran claims nothing: an orchestration whose
   * coordination loop crosses its ceiling mid-roster settles with
   * `completion` absent, and until this shipped the terminal said
   * nothing at all about work that was already paid for, even though
   * every child terminal was in the journal. Deliberately NOT
   * `childStatusCounts`: that field is the acceptance fold's number,
   * and a fold done by no policy must not borrow its name.
   *
   * Present exactly when children were spawned AND no acceptance
   * verdict exists, so the two readings never overlap and neither can
   * be mistaken for the other. Frozen at the moment of death, before
   * the RV1903 exit barrier settles the stragglers, which is why
   * `unsettled` can be non-empty: those children had not landed when
   * the run gave up.
   */
  childrenAtFailure?: ChildrenAtFailure;
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
  /**
   * Revokes a tool approval (RV4008): a still-open approval is denied
   * through the ordinary arbitration, and a RECORDED allow gains a
   * journaled `approval_revoked` decision that beats it at the
   * consumption recheck, so an allow granted, crashed over, and
   * revoked never dispatches its tool on resume.
   */
  revokeApproval(
    key: string,
    options: { principal: string; reason: string },
  ): Promise<ApprovalRevocationOutcome>;
  /** Cooperative cancellation; the run settles 'cancelled' with a complete CostReport. */
  cancel(reason?: string): Promise<void>;
}

export { buildCostReport } from './cost-report.js';
