/**
 * The container reference executor (RV-216): runs a tool's work inside a
 * one-shot container, which is where the isolation the subprocess
 * executor cannot promise actually holds. By default it drops the network
 * entirely (`--network none`), mounts the root filesystem read-only
 * (`--read-only`), caps memory, CPU, and process count, and drops all
 * Linux capabilities (`--cap-drop ALL`). The only writable path is the
 * work mount at `/work`: the per-call ephemeral workdir, or, under
 * worktree isolation (RV4914), the acquired worktree the request carries
 * as `cwd`, with the ephemeral workdir mounted beside it at `/scratch`.
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
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IsolatedExecRequest, Json, ToolExecutorProvider } from '@rulvar/core';
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

/** The digest pinned image reference form docker accepts: name[:tag]@sha256:<64 hex>. */
const IMAGE_DIGEST = /^[^@\s]+@sha256:[0-9a-f]{64}$/;

/**
 * The image one dispatch runs in (RV4915). The tools guide has said
 * since RV1802 that an `executorSpec` naming a pinned image digest puts
 * the pin inside the toolset authority hash, and the executor read only
 * `command` and `args` from the spec, so the pinned image was attested
 * and never used. A spec image is honored now, digest pinned only: a
 * tag on the spec would ride the attestation as a pin it is not.
 */
function resolveImage(specImage: unknown, fallback: string, tool: string): string {
  if (specImage === undefined) return fallback;
  if (typeof specImage !== 'string' || !IMAGE_DIGEST.test(specImage)) {
    throw new ExecutorError(
      'config',
      `tool '${tool}' names executorSpec.image ${JSON.stringify(specImage)}, which is not ` +
        'pinned by digest (name@sha256:<64 hex>): a per tool image rides the toolset authority ' +
        'hash as the attestation of what runs, and a tag is not a pin',
    );
  }
  return specImage;
}

export interface ContainerExecutorOptions {
  /**
   * The image the tool runs in (required). A tool whose `executorSpec`
   * names an `image` pinned by digest runs in that image instead
   * (RV4915); the regulated floor requires this one to be pinned too.
   */
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
  /**
   * Where the work directory is mounted inside the container: the
   * ephemeral workdir, or the acquired worktree when the request carries
   * a `cwd` (RV4914). Default '/work'.
   */
  workMount?: string;
  /**
   * Where the ephemeral workdir is mounted when the work mount is a
   * worktree (RV4914); the tool program reads the path from
   * `RULVAR_SCRATCH`. Default '/scratch'.
   */
  scratchMount?: string;
  /**
   * Extra raw `docker run` flags, placed BEFORE the hardening flags
   * (RV4915) so a repeated single valued flag (`--memory`,
   * `--pids-limit`, `--read-only`) resolves to the fixed value and a
   * conflicting `--network` fails the dispatch at the daemon instead of
   * running with it. List valued flags such as `--cap-add` accumulate
   * whatever the order, which is why the regulated floor refuses any
   * extra flag rather than denylisting some.
   */
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
  const scratchMount = options.scratchMount ?? '/scratch';
  const timeoutMs = options.timeoutMs ?? 30_000;
  const killGraceMs = options.killGraceMs ?? 5_000;
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
      name: 'container',
      ledger: options.ledger !== undefined,
      allowEnv: [...(options.forwardEnv ?? [])],
      bounds: { timeoutMs, maxOutputBytes },
      // The whole seam (RV4915): the image, the dropped capabilities,
      // the limits, the mount paths, and the raw extra flags verbatim,
      // so the regulated floor can judge each by name and hash the
      // rest; before this it saw the network mode and the root posture
      // and nothing else that decides what the container can do.
      isolation: {
        flavor: 'container',
        network,
        readOnlyRoot: readOnly,
        image: options.image,
        capDrop: [...capDrop],
        memory,
        cpus,
        pidsLimit,
        workMount,
        scratchMount,
        extraDockerArgs: [...(options.extraDockerArgs ?? [])],
      },
    }),

    async run(request) {
      const spec = (request.spec ?? {}) as { command?: unknown; args?: unknown; image?: unknown };
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
      const image = resolveImage(spec.image, options.image, request.tool);
      // The acquired worktree (RV4914): present exactly when the
      // dispatching agent runs under worktree isolation. It becomes the
      // work mount, so the tool's writes land in the tree the patch is
      // collected from, and the ledger rows name the mount.
      const worktree = request.cwd;

      const workdir = await mkdtemp(join(workdirBase, `rulvar-cexec-${request.tool}-`));
      const startedAt = now();
      const argsHash = hashArgs(request.args);
      // One dispatch is one ATTEMPT (RV501), the subprocess twin.
      const attemptId = randomUUID();
      // The two-phase capability (RV404), the exact subprocess twin: the
      // intent lands durably BEFORE the container launches, a failed
      // intent write refuses the dispatch typed, and a ledger without
      // the method keeps the single-record contract byte for byte.
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
            ...(worktree === undefined ? {} : { cwd: worktree, workMount }),
            startedAt,
            attemptId,
          });
        } catch (err) {
          await rm(workdir, { recursive: true, force: true });
          throw new ExecutorError(
            'ledger',
            `container tool '${request.tool}' was not dispatched: the two-phase ledger ` +
              `intent write failed (${err instanceof Error ? err.message : String(err)})`,
          );
        }
      }
      // Honest by default, the subprocess twin: any throw the branches
      // below do not classify (a credentials mint, cancellation mid-mint)
      // ledgers 'error' with the null exit code of a container that never
      // launched; 'ok' is set at exactly one place, the successful return.
      let outcome: ToolEffectRecord['outcome'] = 'error';
      let exitCode: number | null = null;
      let signal: string | null = null;
      let settled: Json | undefined;
      let bodyThrew = false;
      let thrownBody: unknown;
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
        if (worktree !== undefined) {
          // The scratch mount's container path, so a tool program whose
          // cwd is the worktree can still find its ephemeral directory.
          env.RULVAR_SCRATCH = scratchMount;
          forwardNames.add('RULVAR_SCRATCH');
        }

        const dockerArgs: string[] = ['run', '--rm', '-i'];
        // The host's extra flags go FIRST (RV4915): docker resolves a
        // repeated single valued flag to its last occurrence, so the
        // fixed hardening flags below win over a repeated --memory,
        // --pids-limit or --read-only=false, and a conflicting --network
        // fails the dispatch at the daemon instead of running with it.
        // Before this the extra flags trailed the hardening flags, and
        // ['--network', 'host'] ran with the host network beneath a
        // regulated fingerprint that attested none. List valued flags
        // (--cap-add) accumulate whatever the order, which is why the
        // regulated floor refuses extra flags outright rather than
        // trusting this order alone.
        dockerArgs.push(...(options.extraDockerArgs ?? []));
        dockerArgs.push('--network', network);
        dockerArgs.push('--memory', memory, '--cpus', cpus, '--pids-limit', String(pidsLimit));
        if (readOnly) dockerArgs.push('--read-only');
        for (const cap of capDrop) dockerArgs.push('--cap-drop', cap);
        for (const name of forwardNames) dockerArgs.push('-e', name);
        if (worktree === undefined) {
          dockerArgs.push('-v', `${workdir}:${workMount}`, '-w', workMount);
        } else {
          // The worktree is the work mount (RV4914), so the tool's writes
          // land in the tree the patch is collected from; the ephemeral
          // directory stays mounted beside it as scratch.
          dockerArgs.push('-v', `${worktree}:${workMount}`, '-w', workMount);
          dockerArgs.push('-v', `${workdir}:${scratchMount}`);
        }
        dockerArgs.push(image, command, ...toolArgs);

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
          throw new ExecutorError('aborted', `container tool '${request.tool}' was cancelled`);
        }
        if (child.stopped && child.reason === 'output-cap') {
          throw new ExecutorError(
            'output-cap',
            `container tool '${request.tool}' wrote more than ${maxOutputBytes} bytes and was killed`,
          );
        }
        if (child.code !== 0) {
          const tail = child.stderr.trim().slice(-500);
          throw new ExecutorError(
            'exit',
            `container tool '${request.tool}' exited ${child.code ?? 'null'}` +
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
      // The settle epilogue (RV503), the subprocess twin, on every
      // path: the workdir never survives the dispatch, and a rejected
      // record surfaces as the typed 'ledger' refusal, never a silently
      // unaudited success.
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
            ...(worktree === undefined ? {} : { cwd: worktree, workMount }),
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
          `container tool '${request.tool}' outcome was not recorded: the ledger record ` +
            `write failed (${recordErr instanceof Error ? recordErr.message : String(recordErr)})` +
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
