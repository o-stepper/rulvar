/**
 * The ONE producer of the terminal envelope (RV1105): the settlement
 * chokepoint assembles it from the outcome's own facts plus the run
 * identity, the agent counter, and the settlement verdict, and every
 * surface (the resolved outcome, the run:end event, the HTTP outcome
 * response, the OTel run attributes) carries THIS object or fields
 * derived from it, so the surfaces cannot disagree by construction.
 */
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import type { RunOutcome } from './run-handle.js';

/** The outcome facts the assembler reads; a structural subset of RunOutcome. */
export type TerminalOutcomeFacts = Pick<RunOutcome<unknown>, 'status' | 'error' | 'completion'> & {
  usage: RunOutcome<unknown>['usage'];
  cost: Pick<RunOutcome<unknown>['cost'], 'totalUsd' | 'grossUsd' | 'byModel'> & {
    usageApprox?: boolean;
  };
};

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
}): TerminalEnvelope {
  const { outcome } = input;
  const envelope: TerminalEnvelope = {
    runId: input.runId,
    workflow: input.workflow,
    status: outcome.status,
    settled: input.settlement === undefined,
    totalUsd: outcome.cost.totalUsd,
    grossUsd: outcome.cost.grossUsd,
    costByModel: { ...outcome.cost.byModel },
    usage: { ...outcome.usage },
    usageApprox: outcome.cost.usageApprox === true,
    agentsSpawned: input.agentsSpawned,
  };
  if (outcome.error !== undefined) {
    envelope.error = outcome.error;
  }
  if (outcome.completion !== undefined) {
    envelope.completion = outcome.completion;
  }
  if (input.settlement?.settledReason !== undefined) {
    envelope.settledReason = input.settlement.settledReason;
  }
  if (input.provenance !== undefined) {
    envelope.provenance = input.provenance;
  }
  return envelope;
}
