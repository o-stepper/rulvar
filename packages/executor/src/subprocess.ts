/**
 * The subprocess reference executor (RV-216): runs a tool's work in a
 * child process with a REPLACED environment (host credentials scrubbed),
 * a fresh ephemeral working directory per call, a hard timeout that kills
 * the child, a bounded output capture, and per-call short-lived
 * credentials. It records every dispatch to the side-effect ledger.
 *
 * What it does and does not isolate is stated plainly in the guide:
 * scrubbing the environment removes the host's ambient credentials (the
 * usual exfiltration path), and the timeout and output cap bound a
 * runaway child. It does NOT by itself block a child from reading
 * world-readable host files or opening sockets: for that, either pass a
 * `sandbox` launcher (bwrap, firejail, sandbox-exec, nsjail) or use the
 * container executor, which drops the network and mounts the filesystem
 * read-only.
 *
 * The tool-program protocol: the child reads one JSON line on stdin,
 * `{ tool, args, idempotencyKey }`, does its work, and writes its JSON
 * result to stdout. Diagnostics go to stderr.
 *
 * Docs: https://docs.rulvar.com/guide/isolated-executor.
 */
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tool } from '@rulvar/core';
import type {
  IsolatedExecRequest,
  Json,
  SchemaSpec,
  ToolDef,
  ToolExecutorProvider,
  ToolRisk,
} from '@rulvar/core';
import { runChildProcess } from './child.js';
import {
  ExecutorError,
  hashArgs,
  parseToolResult,
  type ToolEffectLedger,
  type ToolEffectRecord,
} from './spi.js';

// Bound at module load, before any RV-209 dev-mode bare-Date.now patch
// can replace it: this clock times dispatch durations for the ledger, not
// run identity, so it must stay the real wall clock.
const wallClock: () => number = Date.now.bind(globalThis);

/** The command a subprocess tool runs, carried on its `executorSpec`. */
export interface SubprocessCommandSpec {
  command: string;
  args?: readonly string[];
}

export interface SubprocessExecutorOptions {
  /**
   * Host environment variable names copied into the child. DEFAULT: none.
   * The child's environment is otherwise empty except the per-call vars
   * the executor injects, so host credentials in process.env never reach
   * the tool. A bare command name needs 'PATH' here to be resolvable;
   * prefer an absolute command path instead.
   */
  allowEnv?: readonly string[];
  /**
   * Mints short-lived credentials for one dispatch, injected as child
   * environment variables. Called fresh per call, so a rotating or
   * request-scoped token is minted at use and never lives in the host
   * environment. Return an empty object to inject none.
   */
  credentials?: (
    request: IsolatedExecRequest,
  ) => Record<string, string> | Promise<Record<string, string>>;
  /** Hard wall-clock ceiling per call; the child is killed on expiry. Default 30_000. */
  timeoutMs?: number;
  /** Grace between SIGTERM and SIGKILL. Default 2_000. */
  killGraceMs?: number;
  /** Max stdout/stderr bytes captured; exceeding it kills the child. Default 1 MiB. */
  maxOutputBytes?: number;
  /** Base directory for the per-call ephemeral workdir. Default os.tmpdir(). */
  workdirBase?: string;
  /**
   * A sandbox launcher whose argv is prepended to the command: the real
   * filesystem and network isolation plug in here. It receives the
   * resolved workdir and the request and returns the wrapper argv (for
   * example `['bwrap', '--unshare-net', '--bind', workdir, workdir, ...]`).
   * Default: none.
   */
  sandbox?: (context: { workdir: string; request: IsolatedExecRequest }) => readonly string[];
  /** Records every dispatch; the host owns retention and approval binding. */
  ledger?: ToolEffectLedger;
  /** Fallback command when a tool's executorSpec omits one. */
  command?: string;
  /** Argv prepended before the tool's own args (e.g. a fixed runner script). */
  args?: readonly string[];
  /** Injectable clock for the ledger's timing fields (tests). */
  now?: () => number;
}

function resolveCommand(
  request: IsolatedExecRequest,
  options: SubprocessExecutorOptions,
): { command: string; args: string[] } {
  const spec = (request.spec ?? {}) as Partial<SubprocessCommandSpec>;
  const command = typeof spec.command === 'string' ? spec.command : options.command;
  if (command === undefined || command === '') {
    throw new ExecutorError(
      'config',
      `tool '${request.tool}' has no command: set executorSpec.command on the tool ` +
        'or command on the executor',
    );
  }
  const specArgs = Array.isArray(spec.args)
    ? spec.args.filter((a): a is string => typeof a === 'string')
    : [];
  return { command, args: [...(options.args ?? []), ...specArgs] };
}

/**
 * Builds a subprocess ToolExecutorProvider. Register it on the engine as
 * `createEngine({ executors: { subprocess: subprocessExecutor(...) } })`;
 * tools declaring `executor: 'subprocess'` (see {@link subprocessTool})
 * then dispatch through it.
 */
export function subprocessExecutor(options: SubprocessExecutorOptions = {}): ToolExecutorProvider {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const killGraceMs = options.killGraceMs ?? 2_000;
  const maxOutputBytes = options.maxOutputBytes ?? 1024 * 1024;
  const workdirBase = options.workdirBase ?? tmpdir();
  const now = options.now ?? wallClock;

  return {
    // The construction-side posture attestation (RV4204): a PURE
    // snapshot of what this executor chose at construction, read at
    // compile time by compileRegulatedProfile and folded into the
    // hashed posture map (the regulated floor requires the ledger:
    // an effect no ledger records is an effect nobody can reconcile).
    describeRegulatedPosture: () => ({
      regulatedPosture: 1,
      kind: 'tool-executor',
      name: 'subprocess',
      ledger: options.ledger !== undefined,
      allowEnv: [...(options.allowEnv ?? [])],
      bounds: { timeoutMs, maxOutputBytes },
      isolation: { flavor: 'subprocess', sandboxed: options.sandbox !== undefined },
    }),

    async run(request) {
      const { command, args } = resolveCommand(request, options);
      const workdir = await mkdtemp(join(workdirBase, `rulvar-exec-${request.tool}-`));
      const startedAt = now();
      const argsHash = hashArgs(request.args);
      // One dispatch is one ATTEMPT (RV501): the id joins the intent to
      // exactly its own outcome row, whatever the wall clock says.
      const attemptId = randomUUID();
      // The two-phase capability (RV404): the intent lands durably
      // BEFORE the external effect, so a host crash between the effect
      // and the outcome row leaves an orphan intent (the reconciliation
      // signal) instead of an untracked effect. A failed intent write
      // refuses the dispatch typed: proceeding would open exactly the
      // window the capability exists to close. A ledger without the
      // method keeps the historical single-record contract, byte for
      // byte.
      if (options.ledger?.intent !== undefined) {
        try {
          await options.ledger.intent({
            idempotencyKey: request.ctx.idempotencyKey,
            runId: request.ctx.runId,
            spanId: request.ctx.spanId,
            tool: request.tool,
            argsHash,
            executor: request.executor,
            workdir,
            startedAt,
            attemptId,
          });
        } catch (err) {
          await rm(workdir, { recursive: true, force: true });
          throw new ExecutorError(
            'ledger',
            `tool '${request.tool}' was not dispatched: the two-phase ledger intent write ` +
              `failed (${err instanceof Error ? err.message : String(err)})`,
          );
        }
      }
      // Honest by default: any throw the branches below do not classify
      // (a credentials mint, a sandbox launcher, cancellation mid-mint)
      // ledgers 'error' with the null exit code of a child that never
      // ran; 'ok' is set at exactly one place, the successful return.
      let outcome: ToolEffectRecord['outcome'] = 'error';
      let exitCode: number | null = null;
      let signal: string | null = null;
      let settled: Json | undefined;
      let bodyThrew = false;
      let thrownBody: unknown;
      try {
        const env: Record<string, string> = {};
        for (const name of options.allowEnv ?? []) {
          const value = process.env[name];
          if (value !== undefined) env[name] = value;
        }
        const creds = options.credentials === undefined ? {} : await options.credentials(request);
        Object.assign(env, creds);
        env.RULVAR_TOOL = request.tool;
        env.RULVAR_RUN_ID = request.ctx.runId;
        env.RULVAR_IDEMPOTENCY_KEY = request.ctx.idempotencyKey;

        const wrapper =
          options.sandbox === undefined ? [] : [...options.sandbox({ workdir, request })];
        const [spawnCommand, ...spawnPrefix] = wrapper.length > 0 ? wrapper : [command];
        const spawnArgs = wrapper.length > 0 ? [...spawnPrefix, command, ...args] : args;

        let child;
        try {
          child = await runChildProcess({
            command: spawnCommand,
            args: spawnArgs,
            env,
            cwd: workdir,
            stdinData: JSON.stringify({
              tool: request.tool,
              args: request.args,
              idempotencyKey: request.ctx.idempotencyKey,
            }),
            timeoutMs,
            killGraceMs,
            maxOutputBytes,
            signal: request.ctx.signal,
          });
        } catch (err) {
          throw new ExecutorError(
            'spawn',
            `tool '${request.tool}' could not be spawned: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        exitCode = child.code;
        signal = child.signal;

        if (child.stopped && child.reason === 'timeout') {
          outcome = 'timeout';
          throw new ExecutorError(
            'timeout',
            `tool '${request.tool}' exceeded ${timeoutMs}ms and was killed`,
          );
        }
        if (child.stopped && child.reason === 'aborted') {
          throw new ExecutorError('aborted', `tool '${request.tool}' was cancelled`);
        }
        if (child.stopped && child.reason === 'output-cap') {
          throw new ExecutorError(
            'output-cap',
            `tool '${request.tool}' wrote more than ${maxOutputBytes} bytes and was killed`,
          );
        }
        if (child.code !== 0) {
          const tail = child.stderr.trim().slice(-500);
          throw new ExecutorError(
            'exit',
            `tool '${request.tool}' exited ${child.code ?? 'null'}` +
              `${child.signal === null ? '' : ` (signal ${child.signal})`}` +
              `${tail === '' ? '' : `: ${tail}`}`,
          );
        }
        const result = parseToolResult(child.stdout, request.tool) as Json;
        outcome = 'ok';
        settled = result;
      } catch (thrown) {
        bodyThrew = true;
        thrownBody = thrown;
      }
      // The settle epilogue (RV503), on every path: the ephemeral
      // workdir never survives the dispatch, even when the audit write
      // fails, and a rejected record surfaces as the typed 'ledger'
      // refusal because an effect whose outcome could not be audited
      // must not report success silently.
      const durationMs = now() - startedAt;
      let ledgerFailure: ExecutorError | undefined;
      try {
        if (options.ledger !== undefined) {
          await options.ledger.record({
            idempotencyKey: request.ctx.idempotencyKey,
            runId: request.ctx.runId,
            spanId: request.ctx.spanId,
            tool: request.tool,
            argsHash,
            executor: request.executor,
            workdir,
            startedAt,
            attemptId,
            durationMs,
            outcome,
            exitCode,
            signal,
          });
        }
      } catch (recordErr) {
        ledgerFailure = new ExecutorError(
          'ledger',
          `tool '${request.tool}' outcome was not recorded: the ledger record write failed ` +
            `(${recordErr instanceof Error ? recordErr.message : String(recordErr)})` +
            (bodyThrew
              ? `; the dispatch itself had already failed (${
                  thrownBody instanceof Error ? thrownBody.message : String(thrownBody)
                })`
              : ''),
        );
      }
      await rm(workdir, { recursive: true, force: true });
      if (ledgerFailure !== undefined) throw ledgerFailure;
      if (bodyThrew) throw thrownBody;
      return settled as Json;
    },
  };
}

export interface SubprocessToolInit<S extends SchemaSpec> {
  name: string;
  description: string;
  parameters: S;
  /** Contract version, part of toolsetHash. */
  version?: string;
  /** The program to run, and its fixed argv. */
  command: string;
  args?: readonly string[];
  /** The terminal permission default asks when true. */
  needsApproval?: boolean;
  /** Policy metadata; never identity. */
  risk?: ToolRisk;
}

/**
 * Defines a tool that runs under a subprocess (or container) executor.
 * The returned ToolDef declares `executor: 'subprocess'` and carries the
 * command on `executorSpec`; its `execute` closure exists only as a
 * guard, and throws if ever called in process, because dispatch routes to
 * the registered executor instead. Register that executor on the engine
 * for the tool to run.
 */
export function subprocessTool<S extends SchemaSpec>(init: SubprocessToolInit<S>): ToolDef<S> {
  return tool({
    name: init.name,
    description: init.description,
    parameters: init.parameters,
    ...(init.version === undefined ? {} : { version: init.version }),
    executor: 'subprocess',
    executorSpec: {
      command: init.command,
      ...(init.args === undefined ? {} : { args: [...init.args] }),
    },
    ...(init.needsApproval === undefined ? {} : { needsApproval: init.needsApproval }),
    ...(init.risk === undefined ? {} : { risk: init.risk }),
    execute: () =>
      Promise.reject(
        new ExecutorError(
          'config',
          `tool '${init.name}' runs under an out-of-process executor; register it via ` +
            'createEngine({ executors: { subprocess: subprocessExecutor(...) } })',
        ),
      ),
  });
}
