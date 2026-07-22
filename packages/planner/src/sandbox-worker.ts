/**
 * The worker half of the sandbox contract (M6-T02): evaluates a
 * CompiledWorkflow source inside a worker_threads realm with the curated
 * global scope and proxies every primitive call as JSON-RPC over the
 * dedicated MessagePort to the host bridge.
 *
 * Determinism: now, random, uuid, and the Date.now/Math.random realm
 * replacements all draw from ONE seeded stream (seed = sha256(runId)), so
 * two runs with the same runId generate identical values; every generated
 * value is mirrored to the host and journaled as an ordinary kind 'rand'
 * entry (match-first on resume). import, fetch, and process are absent
 * from the scope; values crossing the boundary are validated
 * journal-compatible JSON, never raw structured clone.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { parentPort, type MessagePort as NodeMessagePort } from 'node:worker_threads';

import type {
  Json,
  SandboxHostToWorker,
  SandboxMethod,
  SandboxWorkerToHost,
  WireError,
} from '@rulvar/core';
import { NonSerializableValueError, toJournalValue } from '@rulvar/core';

import { SANDBOX_GLOBALS } from './compile.js';

/** Runner-to-worker bootstrap message; the port rides the transfer list. */
export interface SandboxInitMessage {
  t: 'init';
  port: unknown;
  source: string;
  args: Json;
  runId: string;
}

/** Worker lifecycle messages the RUNNER consumes (the bridge never sees them). */
export type SandboxLifecycleMessage = { t: 'done'; value: Json } | { t: 'fail'; error: WireError };

function wireOf(thrown: unknown): WireError {
  if (thrown instanceof NonSerializableValueError) {
    return thrown.toWire();
  }
  if (thrown instanceof Error) {
    const code = thrown.name !== '' && thrown.name !== 'Error' ? thrown.name : 'error';
    return { code, message: thrown.message, retryable: false };
  }
  return { code: 'error', message: String(thrown), retryable: false };
}

/** mulberry32 over the first four bytes of sha256(runId). */
function seededStream(runId: string): () => number {
  const digest = createHash('sha256').update(runId, 'utf8').digest();
  let state = digest.readUInt32LE(0) ^ digest.readUInt32LE(4);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main(port: NodeMessagePort, init: SandboxInitMessage): void {
  const next = seededStream(init.runId);
  // A deterministic logical clock: seed-derived base, monotonic advance.
  let logicalNow = 1_700_000_000_000 + Math.floor(next() * 1_000_000_000);

  const frameToken = new AsyncLocalStorage<number>();
  const currentToken = (): number => frameToken.getStore() ?? 0;

  // busy-frame protocol: the host holds the run's activity
  // token while any worker frame computes and releases it when every
  // frame is blocked on a host call, so suspension and quiescence behave
  // exactly like in-process runs.
  let busyFrames = 0;
  let lastReportedBusy: boolean | undefined;
  const reportState = (): void => {
    const busy = busyFrames > 0;
    if (busy !== lastReportedBusy) {
      lastReportedBusy = busy;
      post({ t: 'state', busy });
    }
  };
  const enterFrame = (): void => {
    busyFrames += 1;
    reportState();
  };
  const exitFrame = (): void => {
    busyFrames -= 1;
    reportState();
  };

  function post(message: SandboxWorkerToHost | SandboxLifecycleMessage): void {
    port.postMessage(message);
  }

  let nextCallId = 1;
  const pendingCalls = new Map<
    number,
    { resolve: (value: Json) => void; reject: (error: Error) => void }
  >();

  function callHost(method: SandboxMethod, params: Json): Promise<Json> {
    const validated = toJournalValue(params, `sandbox ${method} params`);
    const id = nextCallId;
    nextCallId += 1;
    const token = currentToken();
    return new Promise<Json>((resolve, reject) => {
      pendingCalls.set(id, { resolve, reject });
      // The frame blocks on the host until the response arrives.
      exitFrame();
      post({ t: 'call', id, token, method, params: validated });
    });
  }

  let nextFnId = 1;
  const fns = new Map<number, (...fnArgs: Json[]) => unknown>();
  const registerFns = (candidates: unknown[], what: string): number[] =>
    candidates.map((candidate) => {
      if (typeof candidate !== 'function') {
        throw new TypeError(`${what} accepts functions only`);
      }
      const fnId = nextFnId;
      nextFnId += 1;
      fns.set(fnId, candidate as (...fnArgs: Json[]) => unknown);
      return fnId;
    });

  const mirrorRand = (subtype: 'now' | 'random' | 'uuid', value: number | string): void => {
    post({ t: 'rand', token: currentToken(), subtype, value });
  };

  const shimNow = (): number => {
    logicalNow += 1 + Math.floor(next() * 7);
    const value = logicalNow;
    mirrorRand('now', value);
    return value;
  };
  const shimRandom = (): number => {
    const value = next();
    mirrorRand('random', value);
    return value;
  };
  const shimUuid = (): string => {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(next() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    const value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    mirrorRand('uuid', value);
    return value;
  };

  // Realm scrub: Date.now and Math.random are REPLACED by
  // the seeded journaled shims; import/fetch/process are absent. The
  // worker realm is isolated, so this never touches the host.
  Date.now = shimNow;
  Math.random = shimRandom;
  Reflect.set(globalThis, 'fetch', undefined);
  Reflect.set(globalThis, 'process', undefined);
  // Defense in depth against dynamic code generation (v1.37.0 review SEC-P2):
  // eval and the Function constructor compile arbitrary text in a fresh scope
  // where import() and host capability are back in reach. Unbinding the
  // globals stops the bare `eval(...)`/`Function(...)` forms for a source that
  // reached the worker without passing compileScript.
  Reflect.set(globalThis, 'eval', undefined);
  Reflect.set(globalThis, 'Function', undefined);

  // The AsyncFunction constructor the worker uses to compile the body, taken
  // from a prototype BEFORE the reconstruction path is tamed below.
  const asyncProto = Object.getPrototypeOf(shimAsyncMarker) as {
    constructor: new (...ctorArgs: string[]) => (...fnArgs: unknown[]) => Promise<unknown>;
  };
  const AsyncFunctionCtor = asyncProto.constructor;

  // Neutralize the .constructor reconstruction path (v1.38.0 review
  // P2-CODEGEN-PARITY). compileScript rejects every statically visible codegen
  // form, but a truly dynamic key like fn[keyFromAnAgent] or fn[parts.join('')]
  // cannot be seen at compile time. Every function value still exposes its
  // constructor through the prototype chain (a regular, async, generator, or
  // async generator function each reaches its own Function family constructor),
  // so we replace that slot on all four prototypes with a thrower. The
  // AsyncFunction constructor the worker needs is already captured above, so
  // building the body below is unaffected. This closes the runtime
  // reconstruction path as far as one realm allows; it is NOT hostile code
  // containment (other intrinsics remain), which is why the sandbox stays a
  // determinism and blast radius boundary, not a security wall.
  const denyCodegen = function constructor(): never {
    throw new EvalError('dynamic code generation is not available in the sandbox dialect');
  };
  for (const proto of [
    Object.getPrototypeOf(shimRegularMarker) as object,
    asyncProto as object,
    Object.getPrototypeOf(shimGeneratorMarker) as object,
    Object.getPrototypeOf(shimAsyncGeneratorMarker) as object,
  ]) {
    Object.defineProperty(proto, 'constructor', {
      value: denyCodegen,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }

  const sandboxGlobals: Record<string, unknown> = {
    agent: (prompt: unknown, opts?: unknown) =>
      callHost('agent', {
        prompt: prompt as Json,
        ...(opts === undefined ? {} : { opts: opts as Json }),
      }),
    parallel: (tasks: unknown, opts?: unknown) => {
      if (!Array.isArray(tasks)) {
        throw new TypeError('parallel takes an array of functions');
      }
      const fnIds = registerFns(tasks, 'parallel');
      const settle = (opts as { settle?: boolean } | undefined)?.settle === true;
      return callHost('parallel', settle ? { fnIds, settle: true } : { fnIds });
    },
    pipeline: (items: unknown, ...rest: unknown[]) => {
      if (!Array.isArray(items)) {
        throw new TypeError('pipeline takes an items array first');
      }
      const last = rest[rest.length - 1];
      const hasOpts = typeof last === 'object' && last !== null;
      const stages = hasOpts ? rest.slice(0, -1) : rest;
      const stageFnIds = registerFns(stages, 'pipeline stages');
      const onItemError = hasOpts ? (last as { onItemError?: string }).onItemError : undefined;
      return callHost('pipeline', {
        items: items as Json[],
        stageFnIds,
        ...(onItemError === undefined ? {} : { onItemError }),
      });
    },
    step: (label: unknown, fn: unknown, opts?: unknown) => {
      const [fnId] = registerFns([fn], 'step');
      const o = (opts ?? {}) as { deps?: Json[]; key?: string };
      return callHost('step', {
        label: label as Json,
        fnId,
        ...(o.deps === undefined ? {} : { deps: o.deps }),
        ...(o.key === undefined ? {} : { key: o.key }),
      });
    },
    phase: (name: unknown, fn: unknown) => {
      const [fnId] = registerFns([fn], 'phase');
      return callHost('phase', { name: name as Json, fnId });
    },
    log: (level: unknown, msg: unknown, data?: unknown) => {
      post({
        t: 'log',
        token: currentToken(),
        level: level as 'debug' | 'info' | 'warn' | 'error',
        msg: String(msg),
        ...(data === undefined ? {} : { data: toJournalValue(data, 'sandbox log data') }),
      });
    },
    budget: {
      spent: () => callHost('budget.spent', {}),
      remaining: () => callHost('budget.remaining', {}),
    },
    workflow: (name: unknown, args?: unknown, opts?: unknown) =>
      callHost('workflow', {
        name: name as Json,
        ...(args === undefined ? {} : { args: args as Json }),
        ...((opts as { key?: string } | undefined)?.key === undefined
          ? {}
          : { key: (opts as { key: string }).key }),
      }),
    awaitExternal: (key: unknown, opts?: unknown) => {
      const o = (opts ?? {}) as { schema?: Json; prompt?: string };
      return callHost('awaitExternal', {
        key: key as Json,
        ...(o.schema === undefined ? {} : { schema: o.schema }),
        ...(o.prompt === undefined ? {} : { prompt: o.prompt }),
      });
    },
    now: shimNow,
    random: (key?: unknown) => {
      if (key !== undefined && typeof key !== 'string') {
        throw new TypeError('random(key) takes a string discriminator');
      }
      const value = next();
      post({
        t: 'rand',
        token: currentToken(),
        subtype: 'random',
        value,
        ...(key === undefined ? {} : { key }),
      });
      return value;
    },
    uuid: shimUuid,
  };

  port.on('message', (raw: SandboxHostToWorker) => {
    switch (raw.t) {
      case 'result': {
        const pending = pendingCalls.get(raw.id);
        pendingCalls.delete(raw.id);
        if (pending !== undefined) {
          enterFrame();
          pending.resolve(raw.value);
        }
        return;
      }
      case 'error': {
        const pending = pendingCalls.get(raw.id);
        pendingCalls.delete(raw.id);
        if (pending !== undefined) {
          enterFrame();
          const rebuilt = new Error(raw.error.message);
          rebuilt.name = raw.error.code;
          pending.reject(rebuilt);
        }
        return;
      }
      case 'thunk:run': {
        const fn = fns.get(raw.fnId);
        enterFrame();
        void (async () => {
          try {
            if (fn === undefined) {
              throw new Error(`unknown sandbox thunk ${String(raw.fnId)}`);
            }
            const value = await frameToken.run(raw.token, () => fn(...raw.args));
            post({
              t: 'thunk:result',
              id: raw.id,
              value: toJournalValue(value ?? null, 'sandbox thunk result'),
            });
          } catch (thrown) {
            post({ t: 'thunk:error', id: raw.id, error: wireOf(thrown) });
          } finally {
            exitFrame();
          }
        })();
        return;
      }
      default:
        return;
    }
  });

  enterFrame();
  void (async () => {
    try {
      const body = new AsyncFunctionCtor(...SANDBOX_GLOBALS, init.source);
      const value = await body(...SANDBOX_GLOBALS.map((name) => sandboxGlobals[name]));
      post({ t: 'done', value: toJournalValue(value ?? null, 'sandbox script result') });
    } catch (thrown) {
      post({ t: 'fail', error: wireOf(thrown) });
    } finally {
      exitFrame();
    }
  })();
}

/** Markers reaching each Function family constructor prototype; never invoked. */
// eslint-disable-next-line @typescript-eslint/require-await
const shimAsyncMarker = async (): Promise<undefined> => undefined;
const shimRegularMarker = (): undefined => undefined;
// eslint-disable-next-line require-yield
function* shimGeneratorMarker(): Generator<undefined> {
  return undefined;
}
// eslint-disable-next-line require-yield, @typescript-eslint/require-await
async function* shimAsyncGeneratorMarker(): AsyncGenerator<undefined> {
  return undefined;
}

parentPort?.once('message', (init: SandboxInitMessage) => {
  main(init.port as NodeMessagePort, init);
});
