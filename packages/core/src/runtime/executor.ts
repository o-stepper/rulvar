/**
 * Isolated-executor dispatch helpers (RV-216). The engine routes a
 * non-inprocess tool call through the registered ToolExecutorProvider;
 * this module derives the stable per-call idempotency key the provider
 * receives, so an at-least-once retry of a side-effecting tool can be
 * folded into effectively-once.
 *
 * Public contract: https://docs.rulvar.com/guide/isolated-executor.
 */
import { createHash } from 'node:crypto';
import type { Json } from '../l0/json.js';
import { jcsSerialize } from '../l0/jcs.js';

/**
 * Derives the idempotency key for one isolated tool dispatch. The key is
 * a pure function of the run, the LOGICAL INVOCATION (the seq of the
 * containing agent's journal entry plus that call's ordinal within the
 * agent's tool loop), the tool name, and the JCS-canonical arguments.
 *
 * The logical-invocation component is what makes the key both stable and
 * distinguishing (v1.59.x review P0.4): the agent-entry seq and the
 * per-agent tool-call ordinal are journal- and checkpoint-stable, so a
 * crash-and-resume re-dispatch of the SAME logical call (the at-least-
 * once window between execution and the turn checkpoint) reuses the same
 * dispatch entry and the restored ordinal, and therefore the same key;
 * while two SEPARATE calls in one run, even with byte-identical
 * arguments, occupy different ordinals and never collide. Without it two
 * intended effects sharing arguments would fold into one under external
 * deduplication.
 *
 * The key never enters run identity (it is absent from every content key
 * and toolset hash); it exists only for the provider's own side-effect
 * deduplication.
 */
export function deriveExecIdempotencyKey(
  runId: string,
  agentSeq: number,
  ordinal: number,
  tool: string,
  args: Json,
): string {
  const canonical = jcsSerialize({ runId, agentSeq, ordinal, tool, args });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
