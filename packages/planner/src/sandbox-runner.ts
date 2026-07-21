/**
 * WorkerSandboxRunner (M6-T02): the mandatory runner for machine-generated
 * scripts, mode (b). Owns the worker lifecycle and the dedicated
 * MessageChannel; every primitive call is served by the core sandbox
 * bridge against the canonical run ctx.
 *
 * Port lifecycle: one channel per run; the worker end rides the init
 * transfer list; the host end is referenced while the worker computes and
 * unreferenced while every worker frame is blocked on a host call, so a
 * suspended run lets the process exit and a computing
 * worker keeps it alive. Breaching timeoutMs or memoryMb terminates the
 * worker and the run completes with outcome 'error' carrying the typed
 * SandboxError.
 */
import { MessageChannel, Worker } from 'node:worker_threads';

import type { CompiledWorkflow, Ctx, ScriptRunner, Workflow } from '@rulvar/core';
import { ConfigError, createSandboxBridge, SandboxError, toJournalValue } from '@rulvar/core';

import type { SandboxLifecycleMessage } from './sandbox-worker.js';

export const DEFAULT_SANDBOX_TIMEOUT_MS = 300_000;
export const DEFAULT_SANDBOX_MEMORY_MB = 512;

export interface WorkerSandboxRunnerOptions {
  /** Wall-clock ceiling for one execution; default 300000 (Appendix A). */
  timeoutMs?: number;
  /** Worker old-generation heap ceiling; default 512 (Appendix A). */
  memoryMb?: number;
  /**
   * The worker entry module; defaults to the built sandbox-worker.js next
   * to this module. Tests running from source point at the built dist.
   */
  workerUrl?: URL;
  /**
   * Node CLI options for the worker thread; default `[]` (an isolated
   * list). Without an explicit value Node would hand the worker
   * `process.execArgv`, and host-only launch flags break a file-entry
   * worker before the first sandbox operation: `--input-type=module`
   * (any ESM stdin or `--eval` host) is rejected for file entries, and
   * an inherited `--eval` carries the host's whole source text (v1.24.1
   * review P2-2). Hosts that need loader, coverage, or instrumentation
   * flags inside the worker opt in explicitly; the list is passed to the
   * worker verbatim.
   */
  execArgv?: readonly string[];
}

/** Accepts CompiledWorkflow ONLY: feeding a closure is a type error. */
export class WorkerSandboxRunner implements ScriptRunner {
  private readonly timeoutMs: number;
  private readonly memoryMb: number;
  private readonly workerUrl: URL;
  private readonly execArgv: readonly string[];

  constructor(options?: WorkerSandboxRunnerOptions) {
    // timeoutMs is handed to setTimeout as-is, so it is bounded by the
    // Node timer maximum: above 2147483647 ms Node clamps the delay to
    // 1 ms and a trivial worker would be killed immediately with
    // sandbox_limit (v1.34.0 review P2-2). NaN and friends fail typed
    // here too, before any worker exists (v1.34.0 review P2-3).
    if (options?.timeoutMs !== undefined) {
      const timeoutMs = options.timeoutMs;
      if (
        typeof timeoutMs !== 'number' ||
        !Number.isInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 2_147_483_647
      ) {
        throw new ConfigError(
          'WorkerSandboxRunner timeoutMs must be an integer between 1 and 2147483647 ms ' +
            `(the Node timer maximum); got ${String(timeoutMs)}`,
        );
      }
    }
    if (options?.memoryMb !== undefined) {
      const memoryMb = options.memoryMb;
      if (typeof memoryMb !== 'number' || !Number.isInteger(memoryMb) || memoryMb < 1) {
        throw new ConfigError(
          `WorkerSandboxRunner memoryMb must be a positive integer; got ${String(memoryMb)}`,
        );
      }
    }
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_SANDBOX_TIMEOUT_MS;
    this.memoryMb = options?.memoryMb ?? DEFAULT_SANDBOX_MEMORY_MB;
    this.workerUrl = options?.workerUrl ?? new URL('./sandbox-worker.js', import.meta.url);
    this.execArgv = [...(options?.execArgv ?? [])];
  }

  async execute<A, R>(wf: CompiledWorkflow, ctx: Ctx<never>, args: A): Promise<R> {
    if ((wf as CompiledWorkflow | Workflow<A, R>).kind !== 'compiled-workflow') {
      // Typed guard for the JS boundary; the type split prevents this in TS.
      throw new ConfigError(
        'WorkerSandboxRunner executes CompiledWorkflow values only; closures run in process ' + '',
      );
    }
    const argsJson = toJournalValue(args ?? null, 'sandbox workflow args');
    const channel = new MessageChannel();
    // execArgv is always explicit: inheriting process.execArgv would let
    // host-only launch flags (--input-type, --eval and its source) kill
    // a file-entry worker before the first sandbox operation (v1.24.1
    // review P2-2).
    const worker = new Worker(this.workerUrl, {
      execArgv: [...this.execArgv],
      resourceLimits: { maxOldGenerationSizeMb: this.memoryMb },
    });
    const bridge = createSandboxBridge(ctx, {
      post: (message) => channel.port1.postMessage(message),
    });

    return new Promise<R>((resolve, reject) => {
      let settled = false;
      const cleanup = (): void => {
        clearTimeout(timer);
        bridge.close();
        channel.port1.close();
        void worker.terminate();
      };
      const settleOk = (value: unknown): void => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(value as R);
        }
      };
      const settleErr = (error: Error): void => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      };

      const timer = setTimeout(() => {
        settleErr(
          new SandboxError(
            `sandbox timeoutMs ${String(this.timeoutMs)} breached; the worker was terminated`,
            { data: { reason: 'timeout', limit: this.timeoutMs } },
          ),
        );
      }, this.timeoutMs);

      channel.port1.on('message', (message: SandboxLifecycleMessage | { t: string }) => {
        if (message.t === 'done') {
          settleOk((message as Extract<SandboxLifecycleMessage, { t: 'done' }>).value);
          return;
        }
        if (message.t === 'fail') {
          const wire = (message as Extract<SandboxLifecycleMessage, { t: 'fail' }>).error;
          if (wire.code === 'config') {
            // Rehydrate the typed class: a pre-call ConfigError (an
            // unknown toolset name, a bad option shape) must stay a
            // typed 'config' outcome across the worker boundary, not
            // degrade to a generic error (v1.23.0 review P2-1).
            settleErr(new ConfigError(wire.message));
            return;
          }
          const rebuilt = new Error(wire.message);
          rebuilt.name = wire.code;
          settleErr(rebuilt);
          return;
        }
        if (message.t === 'state') {
          // Port referencing mirrors the worker busy state: a computing
          // worker keeps the process alive; a fully blocked one lets a
          // suspended run exit.
          if ((message as { busy?: boolean }).busy === true) {
            channel.port1.ref();
          } else {
            channel.port1.unref();
          }
        }
        bridge.onMessage(message as Parameters<typeof bridge.onMessage>[0]);
      });

      worker.on('error', (error: Error & { code?: string }) => {
        if (error.code === 'ERR_WORKER_OUT_OF_MEMORY') {
          settleErr(
            new SandboxError(
              `sandbox memoryMb ${String(this.memoryMb)} breached; the worker was terminated`,
              { data: { reason: 'memory', limit: this.memoryMb } },
            ),
          );
          return;
        }
        settleErr(error);
      });
      worker.on('exit', (code) => {
        if (!settled) {
          settleErr(
            new ConfigError(`sandbox worker exited unexpectedly with code ${String(code)}`),
          );
        }
      });
      // The worker thread itself never keeps the process alive; the port
      // reference (busy mirror above) is the liveness signal.
      worker.unref();

      worker.postMessage(
        {
          t: 'init',
          port: channel.port2,
          source: wf.source,
          args: argsJson,
          runId: bridge.runId,
        },
        [channel.port2],
      );
    });
  }
}
