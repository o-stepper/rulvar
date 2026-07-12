/**
 * ToolContext assembly (M3-T01): the per-call context handed to execute,
 * permission hooks, and canUseTool. Built by the ctx layer per tool call
 * with a fresh tool span under the agent span. Exposes NO spawn
 * primitives (invariant I3).
 *
 * Full contract: https://docs.rulvar.com/guide/tools
 */
import type { Json } from '../l0/json.js';
import type { IsolationSpec } from '../l0/spi/isolation.js';
import type { ToolContext } from '../l0/spi/toolsource.js';

export interface ToolContextSeed {
  runId: string;
  agentType: string;
  label?: string;
  /** Isolation working directory; the host cwd under isolation 'none'. */
  cwd: string;
  isolation: IsolationSpec;
  /** Fires on cancellation, budget ceiling, UsageLimits expiry. */
  signal: AbortSignal;
  /** Mints the tool span under the agent span. */
  mintSpan(): string;
  emitLog(
    spanId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    msg: string,
    data?: Json,
  ): void;
}

/** Builds the per-call ToolContext; one fresh span per tool call. */
export function buildToolContext(seed: ToolContextSeed): ToolContext {
  const spanId = seed.mintSpan();
  return {
    runId: seed.runId,
    spanId,
    agent: {
      agentType: seed.agentType,
      ...(seed.label === undefined ? {} : { label: seed.label }),
    },
    cwd: seed.cwd,
    isolation: seed.isolation,
    signal: seed.signal,
    log: (level, msg, data) => seed.emitLog(spanId, level, msg, data),
  };
}
