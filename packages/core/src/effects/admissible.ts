/**
 * The effect lane admission predicate (plan 45, rfcs/effects.md
 * section 5): an effect intent for a run deliverable may be recorded
 * only when EVERY conjunct holds on the run's terminal envelope. One
 * clean-looking verdict is deliberately not enough; each conjunct has
 * a concrete counterexample it exists to refuse, and the refusal names
 * the first conjunct that failed.
 *
 * The companion prohibition, stated here because the bypass exists in
 * the shipped code: an effectful operation MUST NOT ride the plain
 * isolated tool path (ToolExecutorProvider plus the optional executor
 * ledger). That path rechecks the approval and then dispatches with no
 * intent fold, no epoch, and no receipt machinery; it is the correct
 * seam for sandboxed computation and the wrong seam for money. The
 * effect adapter seam (the @rulvar/effects package) is the only
 * dispatch path the conformance kit blesses for effect classes.
 */
import type { TerminalEnvelope } from '../l0/terminal-envelope.js';
import {
  productionAcceptable,
  type SemanticTerminalVerdict,
} from '../orchestrator/semantic-verdict.js';

export type EffectLaneAdmissionVerdict =
  | { ok: true }
  | {
      ok: false;
      /** The first failed conjunct, by its RFC name. */
      conjunct:
        'settled' | 'status' | 'completion' | 'deliverableAccepted' | 'productionAcceptable';
      reason: string;
    };

/**
 * Evaluates the five conjuncts of RFC section 5 over a terminal
 * envelope, fail closed on absence: an unsettled or superseded segment
 * never licenses effects; an `exhausted` or `cancelled` terminal can
 * still carry artifacts, but they are diagnostics, not deliverables; a
 * `partial` salvage is readable by humans and unacceptable to an
 * effect lane; without a finish contract there is no accepted
 * deliverable to act on; and `waived`, `partial`, `vacuous`, and
 * `not-judged` semantic verdicts all refuse, by the RV4209 rule.
 */
export function effectLaneAdmissible(envelope: TerminalEnvelope): EffectLaneAdmissionVerdict {
  if (envelope.settled !== true) {
    return {
      ok: false,
      conjunct: 'settled',
      reason: 'an unsettled or superseded segment must never license effects',
    };
  }
  if (envelope.status !== 'ok') {
    return {
      ok: false,
      conjunct: 'status',
      reason:
        `status '${envelope.status}' refuses: an exhausted or cancelled terminal can ` +
        'still carry artifacts, but they are diagnostics, not deliverables',
    };
  }
  if (envelope.completion !== 'complete') {
    return {
      ok: false,
      conjunct: 'completion',
      reason:
        `completion '${envelope.completion ?? '<absent>'}' refuses: a partial salvage is ` +
        'readable by humans and unacceptable to an effect lane',
    };
  }
  if (envelope.deliverableAccepted !== true) {
    return {
      ok: false,
      conjunct: 'deliverableAccepted',
      reason: 'without a finish contract there is no accepted deliverable to act on',
    };
  }
  const semantic = productionAcceptable(
    envelope.semanticTerminalVerdict as SemanticTerminalVerdict | undefined,
  );
  if (!semantic.ok) {
    return {
      ok: false,
      conjunct: 'productionAcceptable',
      reason: semantic.reason ?? 'the semantic terminal verdict refused',
    };
  }
  return { ok: true };
}
