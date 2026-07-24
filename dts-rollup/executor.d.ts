import { IsolatedExecRequest, IsolatedExecutorTag, SchemaSpec, ToolDef, ToolExecutorProvider, ToolRisk } from "@rulvar/core";

//#region src/spi.d.ts
/** Why an isolated dispatch failed. */
type ExecutorErrorCode = "config" | "timeout" | "aborted" | "output-cap" | "exit" | "protocol" | "spawn";
/**
* A failed isolated dispatch. The engine catches whatever a
* ToolExecutorProvider throws and turns it into the call's error tool
* result, so `message` is what the model sees: it is kept concise and
* carries a stderr tail on `exit`.
*/
declare class ExecutorError extends Error {
  readonly code: ExecutorErrorCode;
  constructor(code: ExecutorErrorCode, message: string);
}
/** One dispatch's side-effect facts, for the ledger. */
interface ToolEffectRecord {
  /** The stable per-call idempotency key (createEngine derives it). */
  idempotencyKey: string;
  runId: string;
  spanId: string;
  tool: string;
  /** sha256 of the canonical arguments: correlates without storing them. */
  argsHash: string;
  executor: IsolatedExecutorTag;
  /** The ephemeral working directory the dispatch ran in. */
  workdir: string;
  startedAt: number;
  durationMs: number;
  outcome: "ok" | "error" | "timeout";
  /** Child exit code, or null when terminated by a signal. */
  exitCode: number | null;
  /** The terminating signal, when any. */
  signal: string | null;
}
/**
* The side-effect ledger seam. An executor calls `record` once per
* dispatch (success or failure). Binding an approval to its effect is
* then a lookup: the approval entry and the effect share
* (runId, tool, argsHash), and the idempotency key is stable across a
* rerun of the same call.
*/
interface ToolEffectLedger {
  record(entry: ToolEffectRecord): void | Promise<void>;
}
/** An in-memory ledger for tests and single-process hosts. */
declare function memoryEffectLedger(): ToolEffectLedger & {
  entries(): readonly ToolEffectRecord[];
};
/**
* A stable content hash of the arguments for the ledger's `argsHash`. It
* canonicalizes object key order so equal arguments hash equally
* regardless of property order.
*/
declare function hashArgs(args: unknown): string;
/**
* The tool-program result protocol: the child's stdout, trimmed, is the
* JSON result. Empty stdout is the null result; anything else must parse
* as JSON or the dispatch fails typed `protocol`. Diagnostics belong on
* stderr, which never enters the result.
*/
declare function parseToolResult(stdout: string, tool: string): unknown;
//#endregion
//#region src/subprocess.d.ts
/** The command a subprocess tool runs, carried on its `executorSpec`. */
interface SubprocessCommandSpec {
  command: string;
  args?: readonly string[];
}
interface SubprocessExecutorOptions {
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
  credentials?: (request: IsolatedExecRequest) => Record<string, string> | Promise<Record<string, string>>;
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
  sandbox?: (context: {
    workdir: string;
    request: IsolatedExecRequest;
  }) => readonly string[];
  /** Records every dispatch; the host owns retention and approval binding. */
  ledger?: ToolEffectLedger;
  /** Fallback command when a tool's executorSpec omits one. */
  command?: string;
  /** Argv prepended before the tool's own args (e.g. a fixed runner script). */
  args?: readonly string[];
  /** Injectable clock for the ledger's timing fields (tests). */
  now?: () => number;
}
/**
* Builds a subprocess ToolExecutorProvider. Register it on the engine as
* `createEngine({ executors: { subprocess: subprocessExecutor(...) } })`;
* tools declaring `executor: 'subprocess'` (see {@link subprocessTool})
* then dispatch through it.
*/
declare function subprocessExecutor(options?: SubprocessExecutorOptions): ToolExecutorProvider;
interface SubprocessToolInit<S extends SchemaSpec> {
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
declare function subprocessTool<S extends SchemaSpec>(init: SubprocessToolInit<S>): ToolDef<S>;
//#endregion
//#region src/container.d.ts
interface ContainerExecutorOptions {
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
  credentials?: (request: IsolatedExecRequest) => Record<string, string> | Promise<Record<string, string>>;
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
declare function containerExecutor(options: ContainerExecutorOptions): ToolExecutorProvider;
//#endregion
//#region src/conformance.d.ts
/** The executor options the shared contract exercises. */
interface ConformanceExecutorConfig {
  command: string;
  args: string[];
  allowEnv?: string[];
  credentials?: (request: IsolatedExecRequest) => Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  ledger?: ReturnType<typeof memoryEffectLedger>;
}
/** Builds the provider under test from a shared-contract config. */
type ConformanceExecutorFactory = (config: ConformanceExecutorConfig) => ToolExecutorProvider;
interface ExecutorConformanceCheck {
  id: string;
  title: string;
  run(): Promise<void>;
}
interface ExecutorConformanceSuite {
  name: string;
  checks: readonly ExecutorConformanceCheck[];
  run(): Promise<void>;
}
/** Structural subset of the Vitest/Jest registration API. */
interface ExecutorTestRegistrar {
  describe(name: string, factory: () => void): void;
  it(name: string, fn: () => Promise<void>): void;
}
declare function registerExecutorConformance(suite: ExecutorConformanceSuite, api: ExecutorTestRegistrar): void;
/**
* Builds the conformance suite. `factory` produces the provider under
* test from a shared config; the kit supplies the command (its own
* runner, run by `runtime`, default the current Node) and the per-check
* options.
*/
declare function executorConformance(factory: ConformanceExecutorFactory, options?: {
  runtime?: string;
}): ExecutorConformanceSuite;
//#endregion
//#region src/child.d.ts
interface ChildSpec {
  command: string;
  args: readonly string[];
  /**
  * The child's COMPLETE environment. It replaces the host environment
  * rather than extending it: whatever is not listed here is absent from
  * the child, which is how host credentials in process.env are kept out
  * of the tool.
  */
  env: Record<string, string>;
  cwd: string;
  /** Written to the child's stdin, which is then closed. */
  stdinData: string;
  /** Hard wall-clock ceiling; on expiry the child is SIGTERM'd then SIGKILL'd. */
  timeoutMs: number;
  /** Grace between SIGTERM and the SIGKILL that follows if it ignores it. */
  killGraceMs: number;
  /** Captured stdout/stderr are each bounded to this many bytes. */
  maxOutputBytes: number;
  /** Cancels the child immediately when it fires (run abort, budget, limits). */
  signal?: AbortSignal;
}
type ChildStopReason = "timeout" | "aborted" | "output-cap";
interface ChildResult {
  stdout: string;
  stderr: string;
  /** Process exit code; null when the child was terminated by a signal. */
  code: number | null;
  /** The terminating signal, when any. */
  signal: NodeJS.Signals | null;
  /** True when the runner (not the child) ended it, with the reason why. */
  stopped: boolean;
  reason?: ChildStopReason;
}
/**
* Spawns one child and resolves with its captured output and exit status,
* or rejects if the process could not be spawned at all (e.g. the command
* is a bare name and PATH is not in `env`, so it cannot be resolved). A
* child that exits non-zero or is killed resolves normally; interpreting
* that is the caller's job.
*/
declare function runChildProcess(spec: ChildSpec): Promise<ChildResult>;
//#endregion
export { type ChildResult, type ChildSpec, type ChildStopReason, type ConformanceExecutorConfig, type ConformanceExecutorFactory, type ContainerExecutorOptions, type ExecutorConformanceCheck, type ExecutorConformanceSuite, ExecutorError, type ExecutorErrorCode, type ExecutorTestRegistrar, type SubprocessCommandSpec, type SubprocessExecutorOptions, type SubprocessToolInit, type ToolEffectLedger, type ToolEffectRecord, containerExecutor, executorConformance, hashArgs, memoryEffectLedger, parseToolResult, registerExecutorConformance, runChildProcess, subprocessExecutor, subprocessTool };