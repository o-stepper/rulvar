/**
 * Partial-result recovery (cookbook recipe; the rendered walk-through
 * is https://docs.rulvar.com/guide/cookbook). A tolerant completion
 * policy accepts the run once enough children succeeded, reports every
 * degraded child by name, and keeps the failed child's full error
 * reachable through the evidence tools, so the orchestrator can read
 * WHY a specialist failed and respawn a narrowed replacement instead of
 * losing the whole run. Nothing here is a mode: it is the acceptance
 * envelope plus the evidence tools, composed.
 */
import type { OrchestrateOptions } from '@rulvar/core';

/**
 * Accept the run once `minSuccessful` children settled ok; the envelope
 * then reports `completion: 'partial'` with every degraded child in
 * `degradedReasons`. The evidence tools stay on so the orchestrator can
 * page a failed child's error message before deciding to respawn.
 */
export function partialRecoveryOptions(minSuccessful: number): OrchestrateOptions {
  return {
    exposeChildResultTools: true,
    acceptance: { childPolicy: { minSuccessful } },
  };
}

/** The acceptance envelope, narrowed to what recovery decisions read. */
export interface PartialEnvelope<R = unknown> {
  result: R;
  completion: 'complete' | 'partial';
  childStatusCounts: Record<string, number>;
  degradedReasons: string[];
}

/** True when the accepted run still carries degraded children. */
export function isPartial(envelope: PartialEnvelope): boolean {
  return envelope.completion === 'partial';
}
