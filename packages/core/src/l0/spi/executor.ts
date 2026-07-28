/**
 * ToolExecutorProvider SPI (RV-216): the seam that runs a tool's work OUT
 * of the engine process, under host-owned isolation, and returns its JSON
 * result. In-process tools are ordinary function calls with full host
 * capabilities (an execution convenience, never a sandbox for hostile or
 * model-generated code); a tool that must run untrusted input declares a
 * non-inprocess `executor` and the engine routes its dispatch here.
 *
 * The provider is host-supplied and registered on the engine
 * (`createEngine({ executors })`); the shipped reference adapters live in
 * `@rulvar/executor`. This module is type-only: the engine consults the
 * registry at spawn time (an unregistered tag is a ConfigError before any
 * provider call) and calls `run` at dispatch time.
 *
 * Full contract: https://docs.rulvar.com/guide/isolated-executor.
 */
import type { Json } from '../json.js';
import type { ToolExecutor } from './toolsource.js';

/** The non-inprocess executor tags a provider can be registered under. */
export type IsolatedExecutorTag = Exclude<ToolExecutor, 'inprocess'>;

/**
 * The per-call context handed to a ToolExecutorProvider. It carries the
 * tool span (so provider telemetry nests under the run tree), the
 * cancellation signal, and a stable idempotency key.
 */
export interface IsolatedExecContext {
  runId: string;
  /** The tool span, minted under the agent span exactly like inprocess. */
  spanId: string;
  agentType: string;
  /**
   * Stable identity of THIS logical tool call within THIS run
   * incarnation: a deterministic function of the run, the logical
   * invocation (the containing agent's journal seq plus the call's
   * ordinal in that agent's tool loop), the tool name, the canonical
   * arguments, and, for runs stamped with derivation 2
   * (RunMeta.execKeyDerivation; RV403), the run's generation token. A
   * rerun of the same call after a mid-flight crash reuses the key, so
   * a provider whose work has external side effects can fold an
   * at-least-once retry into effectively-once; a different call, even
   * with byte-identical arguments, never collides; and under
   * derivation 2 a deleteRun-then-recreate of the same runId never
   * reuses the deleted incarnation's keys.
   */
  idempotencyKey: string;
  /** Fires on cancellation, a budget ceiling, or UsageLimits expiry. */
  signal: AbortSignal;
  /** Emits telemetry log events under the tool span; never journals. */
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: Json): void;
}

/** One out-of-process tool dispatch. */
export interface IsolatedExecRequest {
  /** The declared executor tag ('subprocess' | 'container'). */
  executor: IsolatedExecutorTag;
  /** The tool contract name. */
  tool: string;
  /** The validated arguments, after the permission chain rewrote them. */
  args: Json;
  /**
   * The tool's `executorSpec`: opaque host data telling THIS provider
   * what to run (for a subprocess adapter, the command and its argv).
   * Never identity; the engine passes it through verbatim.
   */
  spec: Json;
  ctx: IsolatedExecContext;
}

/**
 * The isolated tool executor seam. A provider runs one dispatch to its
 * JSON result. A thrown error becomes the call's error tool result, never
 * a run abort: an executor failure (non-zero exit, timeout kill,
 * unparseable output, infrastructure error) is surfaced to the model
 * exactly like any other tool error, so the loop can react and the run
 * stays durable.
 */
export interface ToolExecutorProvider {
  /** Runs one dispatch to its JSON result; throws to signal tool failure. */
  run(request: IsolatedExecRequest): Promise<Json>;
}

/**
 * The engine's executor registry: at most one provider per non-inprocess
 * tag. A tool whose `executor` tag is absent here fails typed at spawn
 * time, before any provider or model call.
 */
export type ExecutorRegistry = Partial<Record<IsolatedExecutorTag, ToolExecutorProvider>>;
