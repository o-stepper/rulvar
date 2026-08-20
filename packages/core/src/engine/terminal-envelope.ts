/**
 * The ONE producer of the terminal envelope (RV1105): the settlement
 * chokepoint assembles it from the outcome's own facts plus the run
 * identity, the agent counter, and the settlement verdict, and every
 * surface (the resolved outcome, the run:end event, the HTTP outcome
 * response, the OTel run attributes) carries THIS object or fields
 * derived from it, so the surfaces cannot disagree by construction.
 */
import type { WireError } from '../l0/errors.js';
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import type { RunOutcome } from './run-handle.js';

/**
 * A total copy of one typed error (RV1213). `data` is `Json` by the
 * WireError contract, so a JCS-free structured clone reproduces it
 * exactly; a non-cloneable value (a host that smuggled a function or a
 * symbol past the type) falls back to the original reference rather
 * than throwing at the settlement chokepoint, because a terminal must
 * settle even over a malformed error projection.
 */
function detachedError(error: WireError): WireError {
  try {
    return structuredClone(error);
  } catch {
    return { ...error };
  }
}

/** The outcome facts the assembler reads; a structural subset of RunOutcome. */
export type TerminalOutcomeFacts = Pick<
  RunOutcome<unknown>,
  | 'status'
  | 'error'
  | 'completion'
  // The semantic outcome (RV3304): the acceptance verdict, the
  // deliverable presence, the acceptance ref and the judge meta join
  // the picks so the one producer can mirror them onto the envelope.
  | 'deliverableAccepted'
  | 'resultAvailable'
  | 'acceptedArtifactRef'
  | 'claimConsistencyMeta'
  | 'semanticTerminalVerdict'
> & {
  usage: RunOutcome<unknown>['usage'];
  cost: Pick<RunOutcome<unknown>['cost'], 'totalUsd' | 'grossUsd' | 'byModel'> & {
    usageApprox?: boolean;
    wireRequests?: number;
  };
};

/**
 * A detached copy of the judge meta (RV3304), the `detachedError`
 * posture: Json shaped by construction, so a structured clone
 * reproduces it exactly, and a host that smuggled something exotic
 * past the type falls back to a shallow copy rather than throwing at
 * the settlement chokepoint.
 */
function detachedMeta(meta: Record<string, unknown>): Record<string, unknown> {
  try {
    return structuredClone(meta);
  } catch {
    return { ...meta };
  }
}

/**
 * Assembles one terminal envelope (RV1105). `settlement` present means
 * nothing durable records the terminal: `settled` reads false, and the
 * optional `settledReason: 'superseded'` names the fenced-out segment
 * (RV1009); absent means the settle held and `settled` reads true. The
 * per-model split is detached, so a consumer mutating the envelope
 * never reaches back into the cost report.
 *
 * `provenance: 'journal'` marks a copy rebuilt from the journal after
 * the run left its process (RV1209). It is the same producer on
 * purpose: a persisted reader must not assemble a second, subtly
 * different shape, which is the whole point of the arc.
 */
export function terminalEnvelopeOf(input: {
  runId: string;
  workflow: string;
  outcome: TerminalOutcomeFacts;
  agentsSpawned: number;
  settlement?: { settledReason?: 'superseded' };
  provenance?: 'journal';
  /** The run's declared config identity (RV3210), echoed onto the envelope (RV3304). */
  configFingerprint?: string;
}): TerminalEnvelope {
  const { outcome } = input;
  const envelope: TerminalEnvelope = {
    runId: input.runId,
    workflow: input.workflow,
    status: outcome.status,
    settled: input.settlement === undefined,
    totalUsd: outcome.cost.totalUsd,
    grossUsd: outcome.cost.grossUsd,
    // The money's provenance (RV1413), stamped at the ONE producer so
    // the live outcome, the event, the HTTP response, and the journal
    // rebuild all carry it: these dollars are locally estimated at the
    // caller's pricing table, never a provider statement.
    costBasis: 'locally-estimated',
    costByModel: { ...outcome.cost.byModel },
    usage: { ...outcome.usage },
    usageApprox: outcome.cost.usageApprox === true,
    agentsSpawned: input.agentsSpawned,
  };
  if (outcome.error !== undefined) {
    // Detached exactly like `costByModel` (RV1213): the envelope is a
    // READING of the terminal, and a consumer that annotates the error
    // it holds (a message rewrite, a `data` field for its own
    // pipeline) must never reach back into the outcome the engine
    // still owns. `data` is Json by contract, so the clone is total
    // rather than a top-level spread that leaves the nesting shared.
    envelope.error = detachedError(outcome.error);
  }
  if (outcome.completion !== undefined) {
    envelope.completion = outcome.completion;
  }
  // The semantic outcome joins the terminal (RV3304): mirrored only
  // when the outcome carries it, so absence keeps meaning NOT
  // RECORDED on every surface, live and journal derived alike.
  if (outcome.deliverableAccepted !== undefined) {
    envelope.deliverableAccepted = outcome.deliverableAccepted;
  }
  if (outcome.resultAvailable !== undefined) {
    envelope.resultAvailable = outcome.resultAvailable;
  }
  if (outcome.acceptedArtifactRef !== undefined) {
    envelope.acceptedArtifactRef = outcome.acceptedArtifactRef;
  }
  if (outcome.claimConsistencyMeta !== undefined) {
    envelope.claimConsistencyMeta = detachedMeta(outcome.claimConsistencyMeta);
  }
  // The one-word verdict rides beside the meta it was folded from
  // (RV4209), the same detached posture.
  if (outcome.semanticTerminalVerdict !== undefined) {
    envelope.semanticTerminalVerdict = detachedMeta(outcome.semanticTerminalVerdict);
  }
  if (input.configFingerprint !== undefined) {
    envelope.configFingerprint = input.configFingerprint;
  }
  if (outcome.cost.wireRequests !== undefined) {
    // The wire denominator (RV1904): lifted from the same cost fold as
    // the dollars, so the envelope and the invoice cardinality agree
    // on ledger-covered runs by construction.
    envelope.wireRequests = outcome.cost.wireRequests;
  }
  if (input.settlement?.settledReason !== undefined) {
    envelope.settledReason = input.settlement.settledReason;
  }
  if (input.provenance !== undefined) {
    envelope.provenance = input.provenance;
  }
  return envelope;
}
