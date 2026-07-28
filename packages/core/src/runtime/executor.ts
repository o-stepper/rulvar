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
 * The derivation version fresh runs stamp into RunMeta.execKeyDerivation
 * (RV403). A run derives ONE version for its whole life: the stamp is
 * written at genesis and carried verbatim by every resume segment, so an
 * upgrade mid-run never flips an already-started run's keys.
 */
export const CURRENT_EXEC_KEY_DERIVATION = 2;

/**
 * Which exec idempotency key derivation a run uses (RV403), resolved at
 * engine boot from RunMeta.execKeyDerivation. Version 1 is the original
 * genesis-free five-part key, the only derivation runs recorded without
 * the meta field can ever use; version 2 additionally binds the run's
 * generation token, so it must carry it.
 */
export type ExecKeyDerivation = { version: 1 } | { version: 2; genesis: string };

/**
 * Derives the VERSION 1 idempotency key for one isolated tool dispatch.
 * The key is a pure function of the run, the LOGICAL INVOCATION (the seq
 * of the containing agent's journal entry plus that call's ordinal
 * within the agent's tool loop), the tool name, and the JCS-canonical
 * arguments.
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
 * Version 1 is NOT incarnation-scoped: a deleteRun-then-recreate of the
 * same explicit runId reproduces its keys, which is why fresh runs stamp
 * derivation 2 (below). Runs recorded without the stamp keep this
 * derivation forever, so external dedup state accumulated for them stays
 * valid across the upgrade; the derivation itself must therefore stay
 * byte-frozen.
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

/**
 * Derives the VERSION 2 idempotency key (RV403): the version 1 inputs
 * plus the run's generation token (RunMeta.genesis), which scopes the
 * key to the run INCARNATION. A deleteRun-then-recreate of the same
 * explicit runId mints a fresh genesis, so the recreated incarnation's
 * intended effects never collide with the deleted one's in a long-lived
 * external dedup store; within one incarnation the token is carried
 * verbatim by every segment, so the at-least-once fold of a crash-and-
 * resume redispatch is exactly as stable as under version 1. The
 * explicit derivation marker in the canonical form domain-separates the
 * versions: a version 2 key can never equal a version 1 key, even for
 * identical logical inputs.
 */
export function deriveExecIdempotencyKeyV2(
  runId: string,
  genesis: string,
  agentSeq: number,
  ordinal: number,
  tool: string,
  args: Json,
): string {
  const canonical = jcsSerialize({ derivation: 2, runId, genesis, agentSeq, ordinal, tool, args });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
