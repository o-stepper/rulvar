/**
 * The host half of the worker sandbox contract (M6-T02).
 *
 * Full contract: https://docs.rulvar.com/guide/planner. WorkerSandboxRunner
 * (@rulvar/planner) owns the worker lifecycle and the MessagePort; this
 * core-owned bridge serves every sandbox primitive against the canonical
 * ctx of the run, so the runner builds exclusively from the public API.
 * The boundary is journal-compatible JSON
 * validated on both sides; raw structured clone is NOT the contract.
 *
 * Responsibilities:
 * - dispatching proxied primitive calls (agent, step, workflow,
 *   awaitExternal, parallel, pipeline, phase, budget) in the correct
 *   scope: parallel branches, pipeline stages, and phases run their
 *   worker thunks under host-allocated scope tokens;
 * - journaling the worker's seeded rand values (now, random, uuid, and
 *   the Date.now/Math.random replacements) as ordinary kind 'rand'
 *   entries with match-first semantics, so resume forward-matches them;
 * - quiescence fidelity: the bridge holds the run's activity token while
 *   the worker computes and releases it when every worker frame is
 *   blocked on a host call, so a sandbox run suspends and quiesces
 *   exactly like an in-process one (the token is re-acquired BEFORE any
 *   response is posted, closing the wake latency gap).
 */
import { ConfigError, RulvarError, type WireError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import { deriveContentKey } from '../journal/identity.js';
import { toJournalValue } from '../journal/serializable.js';
import type { SchemaSpec } from '../l0/schema.js';
import { runtimeOf, type CtxRuntime, type CtxScopeState } from '../engine/internal.js';
import { AgentCallError, type AgentOpts, type Ctx, type WorkflowCallOpts } from '../engine/ctx.js';

/** Methods a sandbox script may proxy to the host ctx. */
export type SandboxMethod =
  | 'agent'
  | 'step'
  | 'workflow'
  | 'awaitExternal'
  | 'parallel'
  | 'pipeline'
  | 'phase'
  | 'budget.spent'
  | 'budget.remaining';

/** Worker-to-host protocol messages (JSON only). */
export type SandboxWorkerToHost =
  | { t: 'call'; id: number; token: number; method: SandboxMethod; params: Json }
  | { t: 'thunk:result'; id: number; value: Json }
  | { t: 'thunk:error'; id: number; error: WireError }
  | {
      t: 'rand';
      token: number;
      subtype: 'now' | 'random' | 'uuid';
      value: number | string;
      key?: string;
    }
  | {
      t: 'log';
      token: number;
      level: 'debug' | 'info' | 'warn' | 'error';
      msg: string;
      data?: Json;
    }
  | { t: 'state'; busy: boolean };

/** Host-to-worker protocol messages (JSON only). */
export type SandboxHostToWorker =
  | { t: 'result'; id: number; value: Json }
  | { t: 'error'; id: number; error: WireError }
  | { t: 'thunk:run'; id: number; fnId: number; token: number; args: Json[] };

export interface SandboxBridgeOptions {
  /** Posts one protocol message to the worker (the runner owns the port). */
  post: (message: SandboxHostToWorker) => void;
}

export interface SandboxBridge {
  /** The run id; the worker seeds its deterministic shims from it. */
  readonly runId: string;
  /** Feeds one worker message into the bridge. */
  onMessage(message: SandboxWorkerToHost): void;
  /** Releases the activity token and rejects outstanding thunks. */
  close(): void;
}

/** The sanctioned JSON subset of AgentOpts a sandbox script may pass. */
const SANDBOX_AGENT_OPT_KEYS = new Set([
  'agentType',
  'model',
  'effort',
  'routing',
  'schema',
  'tools',
  'onError',
  'result',
  'label',
  'key',
  'estCost',
  'memoizeOutcome',
  'limits',
  'escalation',
  'fallback',
  'replay',
]);

function asRecord(value: Json | undefined, what: string): Record<string, Json> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(`sandbox call ${what} must be a JSON object`);
  }
  return value;
}

function wireOf(thrown: unknown): WireError {
  if (thrown instanceof AgentCallError) {
    return {
      code: 'agent',
      message: thrown.message,
      retryable: false,
      data: { status: thrown.result.status },
    };
  }
  if (thrown instanceof RulvarError) {
    return thrown.toWire();
  }
  return {
    code: 'error',
    message: thrown instanceof Error ? thrown.message : String(thrown),
    retryable: false,
  };
}

export function createSandboxBridge(ctx: Ctx<never>, options: SandboxBridgeOptions): SandboxBridge {
  const runtime: CtxRuntime = runtimeOf(ctx);
  const { internals } = runtime;
  const tokenStates = new Map<number, CtxScopeState>([[0, runtime.currentState()]]);
  let nextToken = 1;
  let nextThunkId = 1;
  const pendingThunks = new Map<
    number,
    { resolve: (value: Json) => void; reject: (error: Error) => void }
  >();
  let closed = false;

  // Quiescence fidelity: one activity token mirrors the worker busy state.
  let exitActivity: (() => void) | undefined;
  const acquireActivity = (): void => {
    if (exitActivity === undefined && !closed) {
      exitActivity = internals.external?.enter();
    }
  };
  const releaseActivity = (): void => {
    exitActivity?.();
    exitActivity = undefined;
  };
  acquireActivity();

  const allocToken = (state: CtxScopeState): number => {
    const token = nextToken;
    nextToken += 1;
    tokenStates.set(token, state);
    return token;
  };

  const runThunk = (fnId: number, token: number, args: Json[]): Promise<Json> => {
    if (closed) {
      return Promise.reject(new ConfigError('sandbox bridge closed'));
    }
    const id = nextThunkId;
    nextThunkId += 1;
    return new Promise<Json>((resolve, reject) => {
      pendingThunks.set(id, { resolve, reject });
      // The worker resumes computing when it receives the request.
      acquireActivity();
      options.post({ t: 'thunk:run', id, fnId, token, args });
    });
  };

  const stateOf = (token: number): CtxScopeState => {
    const state = tokenStates.get(token);
    if (state === undefined) {
      throw new ConfigError(`sandbox call references unknown scope token ${String(token)}`);
    }
    return state;
  };

  async function dispatch(method: SandboxMethod, token: number, params: Json): Promise<Json> {
    const state = stateOf(token);
    return runtime.runInScope(state, async (): Promise<Json> => {
      switch (method) {
        case 'agent': {
          const record = asRecord(params, 'agent params');
          if (typeof record.prompt !== 'string') {
            throw new ConfigError('sandbox agent call requires a string prompt');
          }
          const rawOpts = record.opts === undefined ? {} : asRecord(record.opts, 'agent options');
          for (const key of Object.keys(rawOpts)) {
            if (!SANDBOX_AGENT_OPT_KEYS.has(key)) {
              throw new ConfigError(
                `sandbox agent option '${key}' is outside the sanctioned dialect; allowed: ` +
                  [...SANDBOX_AGENT_OPT_KEYS].sort().join(', '),
              );
            }
          }
          if (rawOpts.tools !== undefined) {
            const tools: Json = rawOpts.tools;
            const allNames = Array.isArray(tools) && tools.every((v) => typeof v === 'string');
            if (!allNames) {
              throw new ConfigError(
                'sandbox agent tools must be registered profile NAMES (docs/06, 8.3)',
              );
            }
          }
          const opts = rawOpts as unknown as AgentOpts<SchemaSpec> & { result?: 'full' };
          const result = await (ctx.agent as (prompt: string, o?: unknown) => Promise<unknown>)(
            record.prompt,
            opts,
          );
          return toJournalValue(result ?? null, 'sandbox agent result');
        }
        case 'step': {
          const record = asRecord(params, 'step params');
          if (typeof record.label !== 'string' || typeof record.fnId !== 'number') {
            throw new ConfigError('sandbox step call requires { label, fnId }');
          }
          const fnId = record.fnId;
          const stepOpts: { deps?: Json[]; key?: string } = {};
          if (Array.isArray(record.deps)) {
            stepOpts.deps = record.deps;
          }
          if (typeof record.key === 'string') {
            stepOpts.key = record.key;
          }
          // The fn body executes inside the worker under the caller's
          // token; only its JSON result crosses back.
          return ctx.step(record.label, () => runThunk(fnId, token, []), stepOpts);
        }
        case 'workflow': {
          const record = asRecord(params, 'workflow params');
          if (typeof record.name !== 'string') {
            throw new ConfigError(
              'sandbox workflow calls take a registered workflow NAME (docs/06, 2.5)',
            );
          }
          const callOpts: WorkflowCallOpts = {};
          if (typeof record.key === 'string') {
            callOpts.key = record.key;
          }
          const value = await ctx.workflow(record.name, record.args ?? null, callOpts);
          return toJournalValue(value ?? null, 'sandbox workflow result');
        }
        case 'awaitExternal': {
          const record = asRecord(params, 'awaitExternal params');
          if (typeof record.key !== 'string') {
            throw new ConfigError('sandbox awaitExternal requires a string key');
          }
          const externalOpts: { schema?: SchemaSpec; prompt?: string } = {};
          if (record.schema !== undefined) {
            externalOpts.schema = record.schema as SchemaSpec;
          }
          if (typeof record.prompt === 'string') {
            externalOpts.prompt = record.prompt;
          }
          return ctx.awaitExternal<Json>(record.key, externalOpts);
        }
        case 'parallel': {
          const record = asRecord(params, 'parallel params');
          if (!Array.isArray(record.fnIds) || !record.fnIds.every((v) => typeof v === 'number')) {
            throw new ConfigError('sandbox parallel requires fnIds: number[]');
          }
          const settle = record.settle === true;
          const tasks = record.fnIds.map((fnId) => () => {
            // Inside the branch: currentState() is the branch scope.
            const branchToken = allocToken(runtime.currentState());
            return runThunk(fnId, branchToken, []);
          });
          const outcome = settle
            ? await ctx.parallel(tasks, { settle: true })
            : await ctx.parallel(tasks);
          return toJournalValue(outcome, 'sandbox parallel result');
        }
        case 'pipeline': {
          const record = asRecord(params, 'pipeline params');
          if (!Array.isArray(record.items)) {
            throw new ConfigError('sandbox pipeline requires items: Json[]');
          }
          if (
            !Array.isArray(record.stageFnIds) ||
            !record.stageFnIds.every((v) => typeof v === 'number') ||
            record.stageFnIds.length === 0
          ) {
            throw new ConfigError('sandbox pipeline requires stageFnIds: number[]');
          }
          const stages = record.stageFnIds.map((fnId) => (value: unknown) => {
            const stageToken = allocToken(runtime.currentState());
            return runThunk(fnId, stageToken, [toJournalValue(value ?? null, 'stage input')]);
          });
          const pipelineArgs: unknown[] = [record.items, ...stages];
          if (record.onItemError !== undefined) {
            pipelineArgs.push({ onItemError: record.onItemError });
          }
          const pipeline = (...a: unknown[]): Promise<unknown> =>
            (ctx.pipeline as unknown as (...inner: unknown[]) => Promise<unknown>).apply(ctx, a);
          const outcome = await pipeline(...pipelineArgs);
          return toJournalValue(outcome, 'sandbox pipeline result');
        }
        case 'phase': {
          const record = asRecord(params, 'phase params');
          if (typeof record.name !== 'string' || typeof record.fnId !== 'number') {
            throw new ConfigError('sandbox phase requires { name, fnId }');
          }
          const fnId = record.fnId;
          return ctx.phase(record.name, () => {
            const phaseToken = allocToken(runtime.currentState());
            return runThunk(fnId, phaseToken, []);
          });
        }
        case 'budget.spent':
          return toJournalValue(ctx.budget.spent(), 'budget.spent');
        case 'budget.remaining':
          return toJournalValue(ctx.budget.remaining(), 'budget.remaining');
        default: {
          const exhaustive: never = method;
          throw new ConfigError(`unknown sandbox method '${String(exhaustive)}'`);
        }
      }
    });
  }

  const mirrorRand = (message: Extract<SandboxWorkerToHost, { t: 'rand' }>): void => {
    const state = stateOf(message.token);
    const identity =
      message.key === undefined
        ? ({ kind: 'rand', subtype: message.subtype } as const)
        : ({ kind: 'rand', subtype: message.subtype, key: message.key } as const);
    const matched = internals.replayer.match(state.scope, identity, 'scoped');
    if (matched.kind === 'replay') {
      // Resume: the seeded stream regenerates the journaled value; the
      // mirror forward-matches and appends nothing.
      return;
    }
    const payload: Record<string, Json> = { subtype: message.subtype, value: message.value };
    if (message.key !== undefined) {
      payload.key = message.key;
    }
    void internals.replayer.appendSinglePhase({
      scope: state.scope,
      key: deriveContentKey(identity),
      kind: 'rand',
      status: 'ok',
      spanId: state.spanId,
      value: payload,
    });
  };

  return {
    runId: internals.runId,
    onMessage(message: SandboxWorkerToHost): void {
      if (closed) {
        return;
      }
      switch (message.t) {
        case 'call': {
          const { id, method, token, params } = message;
          void dispatch(method, token, params).then(
            (value) => {
              if (closed) {
                return;
              }
              // The worker resumes computing on delivery: hold activity
              // BEFORE the response leaves so quiescence cannot fire in
              // the gap.
              acquireActivity();
              options.post({ t: 'result', id, value });
            },
            (thrown: unknown) => {
              if (closed) {
                return;
              }
              acquireActivity();
              options.post({ t: 'error', id, error: wireOf(thrown) });
            },
          );
          return;
        }
        case 'thunk:result': {
          const pending = pendingThunks.get(message.id);
          pendingThunks.delete(message.id);
          pending?.resolve(message.value);
          return;
        }
        case 'thunk:error': {
          const pending = pendingThunks.get(message.id);
          pendingThunks.delete(message.id);
          const rebuilt = new Error(message.error.message);
          rebuilt.name = message.error.code;
          pending?.reject(rebuilt);
          return;
        }
        case 'rand':
          mirrorRand(message);
          return;
        case 'log': {
          const state = stateOf(message.token);
          void runtime.runInScope(state, () => {
            ctx.log(message.level, message.msg, message.data);
            return Promise.resolve();
          });
          return;
        }
        case 'state': {
          if (message.busy) {
            acquireActivity();
          } else {
            releaseActivity();
          }
          return;
        }
        default: {
          const exhaustive: never = message;
          throw new ConfigError(`unknown sandbox message ${JSON.stringify(exhaustive)}`);
        }
      }
    },
    close(): void {
      if (closed) {
        return;
      }
      closed = true;
      releaseActivity();
      for (const [, pending] of pendingThunks) {
        pending.reject(new ConfigError('sandbox bridge closed'));
      }
      pendingThunks.clear();
    },
  };
}
