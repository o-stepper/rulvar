/**
 * The container reference executor (RV-216): runs a tool's work inside a
 * one-shot container, which is where the isolation the subprocess
 * executor cannot promise actually holds. By default it drops the network
 * entirely (`--network none`), mounts the root filesystem read-only
 * (`--read-only`), caps memory, CPU, and process count, and drops all
 * Linux capabilities (`--cap-drop ALL`). The only writable path is the
 * per-call ephemeral workdir, bind-mounted at `/work`.
 *
 * Host credentials never enter the container: the container starts from
 * the image's environment plus exactly the variables the executor
 * forwards by name, and those values live in the docker CLI process's
 * environment, not in the argv. Short-lived credentials are minted per
 * call and forwarded the same way.
 *
 * The tool-program protocol is identical to the subprocess executor: one
 * JSON line on stdin, the JSON result on stdout, diagnostics on stderr.
 *
 * A microVM adapter (Firecracker, gVisor, Kata) implements the same
 * ToolExecutorProvider seam; this docker adapter is the batteries-included
 * reference. Docs: https://docs.rulvar.com/guide/isolated-executor.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  IsolatedExecRequest,
  Json,
  ToolExecutorProvider,
} from '@rulvar/core';
import { runChildProcess } from './child.js';
import {
  ExecutorError,
  hashArgs,
  parseToolResult,
  type ToolEffectLedger,
  type ToolEffectRecord,
} from './spi.js';

const wallClock: () => number = Date.now.bind(globalThis);

/** The default host variables the docker CLI needs to reach its daemon. */
const DEFAULT_DAEMON_ENV = ['PATH', 'HOME', 'DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'];

export interface ContainerExecutorOptions {
  /** The image the tool runs in (required). */
  image: string;
  /** The docker-compatible CLI. Default 'docker'. */
  docker?: string;
  /** `--network`. Default 'none' (no network at all). */
  network?: string;
  /** `--memory`. Default '256m'. */
  memory?: string;
  /** `--cpus`. Default '1.0'. */
  cpus?: string;
  /** `--pids-limit`. Default 128. */
  pidsLimit?: number;
  /** `--read-only` root filesystem. Default true. */
  readOnly?: boolean;
  /** Capabilities to drop. Default ['ALL']. */
  capDrop?: readonly string[];
  /** Where the ephemeral workdir is mounted inside the container. Default '/work'. */
  workMount?: string;
  /** Extra raw `docker run` flags, appended before the image. */
  extraDockerArgs?: readonly string[];
  /** Host env names forwarded INTO the container (not the daemon env). Default none. */
  forwardEnv?: readonly string[];
  /** Host env names the docker CLI itself may read. Default the daemon set. */
  daemonEnv?: readonly string[];
  /** Mints per-call short-lived credentials, forwarded into the container. */
  credentials?: (
    request: IsolatedExecRequest,
  ) => Record<string, string> | Promise<Record<string, string>>;
  /** Hard wall-clock ceiling per call. Default 30_000. */
  timeoutMs?: number;
  /** Grace between SIGTERM and SIGKILL of the docker CLI. Default 5_000. */
  killGraceMs?: number;
  /** Max stdout/stderr bytes captured. Default 1 MiB. */
  maxOutputBytes?: number;
  /** Base directory for the per-call ephemeral workdir. Default os.tmpdir(). */
  workdirBase?: string;
  /** Records every dispatch. */
  ledger?: ToolEffectLedger;
  /** Fallback command (inside the container) when executorSpec omits one. */
  command?: string;
  /** Argv prepended before the tool's own args. */
  args?: readonly string[];
  /** Injectable clock for the ledger's timing fields (tests). */
  now?: () => number;
}

/**
 * Builds a container ToolExecutorProvider over a docker-compatible CLI.
 * Register it as
 * `createEngine({ executors: { container: containerExecutor({ image }) } })`;
 * tools declaring `executor: 'container'` dispatch through it. Define such
 * tools with {@link subprocessTool} and set `executor` to 'container', or
 * hand-build a ToolDef.
 */
export function containerExecutor(options: ContainerExecutorOptions): ToolExecutorProvider {
  const docker = options.docker ?? 'docker';
  const network = options.network ?? 'none';
  const memory = options.memory ?? '256m';
  const cpus = options.cpus ?? '1.0';
  const pidsLimit = options.pidsLimit ?? 128;
  const readOnly = options.readOnly ?? true;
  const capDrop = options.capDrop ?? ['ALL'];
  const workMount = options.workMount ?? '/work';
  const timeoutMs = options.timeoutMs ?? 30_000;
  const killGraceMs = options.killGraceMs ?? 5_000;
  const maxOutputBytes = options.maxOutputBytes ?? 1024 * 1024;
  const workdirBase = options.workdirBase ?? tmpdir();
  const now = options.now ?? wallClock;

  return {
    async run(request) {
      const spec = (request.spec ?? {}) as { command?: unknown; args?: unknown };
      const command = typeof spec.command === 'string' ? spec.command : options.command;
      if (command === undefined || command === '') {
        throw new ExecutorError(
          'config',
          `tool '${request.tool}' has no command: set executorSpec.command or the executor command`,
        );
      }
      const specArgs = Array.isArray(spec.args)
        ? spec.args.filter((a): a is string => typeof a === 'string')
        : [];
      const toolArgs = [...(options.args ?? []), ...specArgs];

      const workdir = await mkdtemp(join(workdirBase, `rulvar-cexec-${request.tool}-`));
      const startedAt = now();
      let outcome: ToolEffectRecord['outcome'] = 'ok';
      let exitCode: number | null = null;
      let signal: string | null = null;
      try {
        // The docker CLI process env: the daemon-reach allowlist, plus the
        // forwarded vars and minted credentials so `-e NAME` copies them
        // into the container by name (values never touch the argv).
        const daemonEnv = options.daemonEnv ?? DEFAULT_DAEMON_ENV;
        const env: Record<string, string> = {};
        for (const name of daemonEnv) {
          const value = process.env[name];
          if (value !== undefined) env[name] = value;
        }
        const forwardNames = new Set<string>([
          'RULVAR_TOOL',
          'RULVAR_RUN_ID',
          'RULVAR_IDEMPOTENCY_KEY',
        ]);
        for (const name of options.forwardEnv ?? []) {
          const value = process.env[name];
          if (value !== undefined) {
            env[name] = value;
            forwardNames.add(name);
          }
        }
        const creds = options.credentials === undefined ? {} : await options.credentials(request);
        for (const [name, value] of Object.entries(creds)) {
          env[name] = value;
          forwardNames.add(name);
        }
        env.RULVAR_TOOL = request.tool;
        env.RULVAR_RUN_ID = request.ctx.runId;
        env.RULVAR_IDEMPOTENCY_KEY = request.ctx.idempotencyKey;

        const dockerArgs: string[] = ['run', '--rm', '-i', '--network', network];
        dockerArgs.push('--memory', memory, '--cpus', cpus, '--pids-limit', String(pidsLimit));
        if (readOnly) dockerArgs.push('--read-only');
        for (const cap of capDrop) dockerArgs.push('--cap-drop', cap);
        for (const name of forwardNames) dockerArgs.push('-e', name);
        dockerArgs.push('-v', `${workdir}:${workMount}`, '-w', workMount);
        dockerArgs.push(...(options.extraDockerArgs ?? []));
        dockerArgs.push(options.image, command, ...toolArgs);

        let child;
        try {
          child = await runChildProcess({
            command: docker,
            args: dockerArgs,
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
          outcome = 'error';
          throw new ExecutorError(
            'spawn',
            `container tool '${request.tool}' could not launch '${docker}': ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        exitCode = child.code;
        signal = child.signal;

        if (child.stopped && child.reason === 'timeout') {
          outcome = 'timeout';
          throw new ExecutorError(
            'timeout',
            `container tool '${request.tool}' exceeded ${timeoutMs}ms and was killed`,
          );
        }
        if (child.stopped && child.reason === 'aborted') {
          outcome = 'error';
          throw new ExecutorError('aborted', `container tool '${request.tool}' was cancelled`);
        }
        if (child.stopped && child.reason === 'output-cap') {
          outcome = 'error';
          throw new ExecutorError(
            'output-cap',
            `container tool '${request.tool}' wrote more than ${maxOutputBytes} bytes and was killed`,
          );
        }
        if (child.code !== 0) {
          outcome = 'error';
          const tail = child.stderr.trim().slice(-500);
          throw new ExecutorError(
            'exit',
            `container tool '${request.tool}' exited ${child.code ?? 'null'}` +
              `${tail === '' ? '' : `: ${tail}`}`,
          );
        }
        return parseToolResult(child.stdout, request.tool) as Json;
      } finally {
        const durationMs = now() - startedAt;
        if (options.ledger !== undefined) {
          await options.ledger.record({
            idempotencyKey: request.ctx.idempotencyKey,
            runId: request.ctx.runId,
            spanId: request.ctx.spanId,
            tool: request.tool,
            argsHash: hashArgs(request.args),
            executor: request.executor,
            workdir,
            startedAt,
            durationMs,
            outcome,
            exitCode,
            signal,
          });
        }
        await rm(workdir, { recursive: true, force: true });
      }
    },
  };
}
