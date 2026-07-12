/**
 * Role trigger protocol (M4-T01): the pure firing predicates behind the
 * six invocation roles. The resolution chain itself lives in router.ts;
 * this module decides WHEN a role produces its own invocation.
 *
 * The six roles:
 *
 * - loop:        every turn while tools are available to the model (the
 *                agent loop in runtime/agent-loop.ts).
 * - extract:     a separate final structured-output invocation only when
 *                `needsSeparateExtract` holds; otherwise the schema rides
 *                the last loop turn with no extra call.
 * - finalize:    only if configured in routing: after tools stop, one
 *                synthesis invocation with toolChoice 'none' over the
 *                full transcript (`finalizeFires`).
 * - summarize:   at the compaction threshold (`atCompactionThreshold`;
 *                the compaction pipeline itself is M4-T03).
 * - plan,
 *   orchestrate: resolved through the same chain (router.ts takes any
 *                role tag); the modes that dispatch them land with
 *                @rulvar/plan (M7). No trigger predicate here.
 *
 * Docs: https://docs.rulvar.com/guide/model-routing (invocation roles,
 * firing protocol, and tier selection per the M4-T01 amendment) and
 * https://docs.rulvar.com/guide/agents (agent runtime binding).
 */
import type { InvocationRole, ModelRef } from '../l0/messages.js';
import type { StructuredOutputTier } from './caps.js';
import type { ResolutionLayer } from './router.js';

/**
 * True when the given structured-output tier can ride the last loop turn.
 * `native` and `prompt` coexist with tool availability; `forced-tool`
 * pins toolChoice to the synthesized emit_result contract and therefore
 * cannot ride while the agent's tools must remain available. For an
 * agent with no tools every tier rides (the M1 behavior, unchanged).
 */
export function canRideLoopTurn(tier: StructuredOutputTier, toolsAvailable: boolean): boolean {
  return tier !== 'forced-tool' || !toolsAvailable;
}

/** The inputs of the extract-necessity rule. */
export interface ExtractNecessityInput {
  /** A schema is set on the call; without one extract never fires. */
  schemaSet: boolean;
  /** The loop-resolved model. */
  loopRef: ModelRef;
  /** The extract-resolved model (same chain, role 'extract'). */
  extractRef: ModelRef;
  /** The required tier for the schema on the LOOP model. */
  loopTier: StructuredOutputTier;
  /** The agent's toolset is non-empty (escalate opt-in counts). */
  toolsAvailable: boolean;
  /** Finalize is configured in routing (`finalizeConfigured`). */
  finalizeRouted: boolean;
}

/**
 * The completed extract-necessity rule: a separate final structured-output
 * invocation fires only when a schema is set AND (routing directs extract
 * to a different model OR the loop model's caps cannot serve the required
 * tier OR finalize is routed, in which case the schema never rides a loop
 * or synthesis turn). Otherwise the schema rides the last loop turn with
 * no extra call (as amended in M4-T01).
 */
export function needsSeparateExtract(input: ExtractNecessityInput): boolean {
  if (!input.schemaSet) {
    return false;
  }
  return (
    input.extractRef !== input.loopRef ||
    !canRideLoopTurn(input.loopTier, input.toolsAvailable) ||
    input.finalizeRouted
  );
}

/**
 * True when any resolution layer configures the given role in its routing
 * map. This is the finalize TRIGGER: firing is decided by the presence of
 * a routing entry at any layer; the model it fires ON still resolves
 * through the full chain (a higher layer's all-roles `model` may override
 * the routed choice).
 */
export function roleConfiguredInRouting(
  role: InvocationRole,
  layers: Array<ResolutionLayer | undefined>,
): boolean {
  return layers.some((layer) => layer?.routing?.[role] !== undefined);
}

/**
 * The finalize firing rule: only if configured in routing, and only after
 * tools stop, which presupposes a non-empty toolset. A no-tools agent's
 * single loop turn is already its synthesis (as amended in M4-T01). The
 * caller additionally gates on the loop having
 * ended without an abort: a limit/error/cancelled/escalated loop never
 * reaches synthesis.
 */
export function finalizeFires(options: { routed: boolean; toolsAvailable: boolean }): boolean {
  return options.routed && options.toolsAvailable;
}

/**
 * The summarize trigger: the compaction threshold on the context window
 * (default 0.8). Pure predicate; the compaction
 * pipeline that acts on it is M4-T03.
 */
export function atCompactionThreshold(
  usedTokens: number,
  contextWindow: number,
  threshold: number,
): boolean {
  if (contextWindow <= 0) {
    return false;
  }
  return usedTokens >= contextWindow * threshold;
}
