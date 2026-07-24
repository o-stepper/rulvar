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
 * a pure function of the run, the tool name, and the JCS-canonical
 * arguments, so the same logical call always yields the same key
 * (byte-identical reruns dedupe) and distinct calls never collide. The
 * key never enters run identity; it exists only for the provider's own
 * side-effect deduplication.
 */
export function deriveExecIdempotencyKey(runId: string, tool: string, args: Json): string {
  const canonical = jcsSerialize({ runId, tool, args });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
