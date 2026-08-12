/**
 * The unified terminal envelope (RV1105, the P1-5 arc): ONE shape
 * carrying every fact of a run's terminal, assembled once at the
 * engine's settlement chokepoint and mirrored verbatim onto the
 * resolved outcome (`outcome.envelope`), the `run:end` event
 * (`event.envelope`), and through them the HTTP outcome response and
 * the OTel run attributes. An SDK consumer, an event-only consumer,
 * and an HTTP consumer read the SAME set of facts without assembling
 * pieces from surface-specific fields; nothing pre-existing was
 * renamed or removed, the envelope is an assembly over it.
 *
 * Doctrine notes:
 * - `status` is the computation's verdict; `settled` says whether
 *   anything durable records it (RV907). A resolved outcome always
 *   carries `settled: true`, because an unsettled terminal REJECTS
 *   `handle.result` typed instead of resolving; the `settled: false`
 *   envelopes exist only on the event stream, where `settledReason:
 *   'superseded'` distinguishes the fenced-out segment (RV1009) from
 *   a settlement write fault.
 * - `usageApprox` is normalized to a boolean here (the run:end field
 *   keeps its absent-means-exact byte contract): `true` means some
 *   priced usage was approximate, so `totalUsd` is a lower bound.
 * - `costByModel` is a detached copy of the settled fold's per-model
 *   split; mutating it never touches the cost report. Since RV1213
 *   `error` is detached the same way, `data` nesting included, so the
 *   whole envelope is a reading a consumer may annotate freely.
 *
 * Docs: https://docs.rulvar.com/guide/observability
 */
import type { WireError } from './errors.js';
import type { Usage } from './messages.js';

/** One run terminal, the same on every surface (RV1105). */
export interface TerminalEnvelope {
  /** The run this terminal speaks for. */
  runId: string;
  /** The workflow name the run was started (or resumed) under. */
  workflow: string;
  /** The computed transport status of the run. */
  status: 'ok' | 'error' | 'cancelled' | 'exhausted' | 'suspended';
  /** The typed error, exactly the outcome's, when status is 'error'. */
  error?: WireError;
  /** The semantic completion claim, when the workflow made one. */
  completion?: 'complete' | 'partial' | 'rejected';
  /**
   * Whether anything durable records this terminal (RV907). False only
   * on the event stream: `handle.result` rejects typed instead of
   * resolving an unsettled outcome.
   */
  settled: boolean;
  /** Present only beside `settled: false` when a successor owns settlement (RV1009). */
  settledReason?: 'superseded';
  /** The NET settled fold: what the run recorded as spent. */
  totalUsd: number;
  /** The gross figure with abandoned subtrees included (P1.3). */
  grossUsd: number;
  /**
   * Where the dollars above come from (RV1413): journaled usage priced
   * at the CALLER'S pricing table (declared rates or adapter caps),
   * never a provider statement. Always `'locally-estimated'` today,
   * declared as a literal so finance tooling never has to guess,
   * mirroring `InvoiceExport.pricingBasis`; reconcile real bills
   * through the invoice export and `reconcileStatement`, which carry
   * their own provenance.
   */
  costBasis: 'locally-estimated';
  /** The per-model split of totalUsd, keyed by canonical ModelRef. */
  costByModel: Record<string, number>;
  /**
   * Provider wire requests recorded by the per-dispatch ledger
   * (RV1904), the same journal-derived figure `CostReport.wireRequests`
   * carries: on ledger-covered runs it equals the invoice cardinality,
   * so the terminal a consumer gates on and the invoice a finance
   * pipeline folds finally share one denominator. Absent when the
   * producing fold did not count wires (a pre-RV1904 live accumulation
   * a host fed into `buildCostReport`).
   */
  wireRequests?: number;
  /** The run's usage aggregate, TTL attribution included. */
  usage: Usage;
  /** True when any priced usage is approximate: totalUsd is a lower bound. */
  usageApprox: boolean;
  /** Agents admitted over the run's lifetime, resume seed included. */
  agentsSpawned: number;
  /**
   * Whether the artifact this terminal carries passed the declared
   * finish contract (RV2506), mirrored onto the envelope since RV3304:
   * the 2026-08-12 comparison run settled ok/complete over a retained
   * contradiction, and neither the HTTP response nor the persisted
   * rebuild could say whether anything ever judged the deliverable.
   * Absent when no contract judged anything; absence means NOT
   * RECORDED, never "accepted".
   */
  deliverableAccepted?: boolean;
  /**
   * Whether this terminal carries a deliverable to read at all
   * (RV2506); same mirror and posture. Distinct from
   * `deliverableAccepted`: an unjudged artifact still EXISTS, and a
   * run with no artifact still has a completion claim.
   */
  resultAvailable?: boolean;
  /**
   * The journal seq of the decision entry recording the acceptance of
   * the artifact this terminal carries (RV2506); same mirror, absent
   * unless the acceptance actually rendered. Read it with
   * `rulvar inspect` to see WHICH validators accepted WHICH hash.
   */
  acceptedArtifactRef?: number;
  /**
   * The claim consistency pass meta, detached (RV3304): `judgedStage`,
   * `judgedHash`, the coverage grade and the `findings` count, so the
   * surface a consumer gates on says WHAT was semantically verified,
   * over WHICH document, and what the judge found, without reaching
   * into the workflow value. Mutating this copy never touches the
   * outcome the engine owns.
   */
  claimConsistencyMeta?: Record<string, unknown>;
  /**
   * The host declared config identity the run was started under
   * (RV3210), echoed here since RV3304 so a decision consumer binds
   * the verdict above to the configuration that produced it without a
   * second read of the run record. Absent when the run declared none.
   */
  configFingerprint?: string;
  /**
   * Where THIS copy of the envelope was assembled (RV1209). Absent, the
   * historical byte contract, means the settlement chokepoint built it
   * from the live outcome, so every field above is the run's own
   * report. `'journal'` means a process that never held the run rebuilt
   * it from the journal that recorded the settle (a restart, a second
   * replica, an offline reader): the money, the usage, the agent count
   * and the settlement verdict are the SAME facts. `completion` is
   * present exactly when the settle recorded the semantic lift beside
   * its output digest (the persisted-terminal tail); a settle written
   * before the lift rode it stays absent. `error` is ABSENT because
   * the journal does not record the run's own wire error, and absence
   * under this provenance means "not recorded", never "the workflow
   * claimed nothing" or "the run did not fail". A consumer that needs
   * the error reads it from the live outcome or the run:end event.
   */
  provenance?: 'journal';
}
