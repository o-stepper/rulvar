import { IsolatedExecRequest, IsolatedExecutorTag, SchemaSpec, ToolDef, ToolExecutorProvider, ToolRisk } from "@rulvar/core";

//#region src/spi.d.ts
/** Why an isolated dispatch failed. */
type ExecutorErrorCode = "config" | "timeout" | "aborted" | "output-cap" | "exit" | "protocol" | "spawn" | "ledger";
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
/**
* The pre-dispatch half of a two-phase ledger entry (RV404): everything
* the executor knows BEFORE the external effect is dispatched, which is
* exactly the set a host needs to reconcile an orphaned effect with the
* effect's provider (look the idempotency key up, correlate by tool and
* argsHash). `attemptId` is the attempt join key (RV501): the outcome
* record of the same attempt carries the identical value. `startedAt`
* remains the documented legacy join for rows written before the id
* shipped; a wall-clock millisecond is not unique, which is why the id
* exists.
*/
interface ToolEffectIntent {
  /** The stable per-call idempotency key (createEngine derives it). */
  idempotencyKey: string;
  runId: string;
  spanId: string;
  tool: string;
  /** sha256 of the canonical arguments: correlates without storing them. */
  argsHash: string;
  executor: IsolatedExecutorTag;
  /** The ephemeral working directory the dispatch runs in. */
  workdir: string;
  startedAt: number;
  /**
  * Unique id of this dispatch ATTEMPT (RV501): the reference executors
  * mint one before the intent row is written and copy it verbatim onto
  * the same attempt's outcome row, so the two phases pair exactly.
  * Optional because rows written before v1.96.0 (and third-party
  * ledgers) may omit it; {@link loadEffectLedger} then falls back to
  * the legacy (idempotencyKey, startedAt) join.
  */
  attemptId?: string;
}
/** One dispatch's side-effect facts, for the ledger. */
interface ToolEffectRecord extends ToolEffectIntent {
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
  /**
  * The two-phase capability (RV404): when the method is present, the
  * reference executors durably record the intent BEFORE the external
  * effect is dispatched (awaited; a failed write refuses the dispatch
  * with the typed `ledger` code) and the outcome `record` after it. A
  * host crash between the effect and the outcome row then leaves an
  * orphan intent, the reconciliation signal, instead of an untracked
  * effect: an intent whose OWN attempt has no outcome row (RV501)
  * means "look this key up with the effect's provider before retrying
  * or compensating". Absent, the ledger keeps the historical
  * single-record contract and executor behavior is byte-identical.
  */
  intent?(entry: ToolEffectIntent): void | Promise<void>;
}
/**
* An in-memory ledger for tests and single-process hosts. It implements
* the two-phase capability: `intents()` exposes the pre-dispatch rows,
* `entries()` the outcomes, exactly as before.
*/
declare function memoryEffectLedger(): ToolEffectLedger & {
  entries(): readonly ToolEffectRecord[];
  intents(): readonly ToolEffectIntent[];
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
//#region src/ledger.d.ts
/**
* A two-phase ToolEffectLedger appending JSON lines to `path`
* (`{ phase: 'intent' | 'outcome', ... }`). Pass it to
* `subprocessExecutor({ ledger })` or `containerExecutor({ ledger })`;
* scan it back with {@link loadEffectLedger}. The first append lazily
* repairs a torn tail left by a crashed predecessor (RV502).
*
* Writer contract (RV606), stated publicly: appends are whole-line
* O_APPEND writes, and the destructive tail repair is mutually
* exclusive across processes (a sidecar `<path>.repair-lock` taken with
* O_EXCL, the file re-read after capture, a stale lock stolen after a
* ten-second TTL), so several writer processes on one LOCAL path can no
* longer truncate away each other's confirmed rows while repairing.
* Still, prefer ONE WRITER PER PATH, a `effects.<worker>.jsonl` file
* per worker process merged at reconciliation time: per-line append
* atomicity is a local-filesystem property, and neither O_APPEND nor
* O_EXCL is dependable on network filesystems.
*/
declare function jsonlEffectLedger(path: string, options?: {
  now?: () => number;
}): ToolEffectLedger;
/** One malformed line of the ledger file, surfaced for triage. */
interface CorruptLedgerLine {
  /** 1-based physical line number in the file. */
  line: number;
  /** Byte offset of the line's first byte within the file. */
  offset: number;
  /** sha256 (hex) of the raw line bytes: forensics without re-reading. */
  sha256: string;
  /** The first 120 characters of the line (lossy-decoded when the bytes
  * are not valid UTF-8; the hash pins the exact bytes). */
  preview: string;
}
/** A torn fragment the writer quarantined while repairing a tail (RV502). */
interface TornLedgerArtifact {
  /** The raw torn bytes, preserved verbatim. */
  bytes: string;
  /** Wall-clock ms when the writer quarantined the fragment. */
  recoveredAt: number;
}
/**
* The fail-closed refusal of {@link loadEffectLedger} (RV502, widened
* by RV607): the file holds at least one line the scan cannot admit,
* unparseable bytes on an interior line, invalid UTF-8, a JSON value
* that is not an object, a missing or mistyped required field, or an
* unknown phase, none of which the writer's tail repair can produce, so
* it means external damage or a foreign writer, never a normal crash
* artifact. Reconciling from a partial scan would silently drop
* intents; triage the named lines instead (`tolerateCorrupt: true`
* surfaces them as data).
*/
declare class LedgerCorruptionError extends Error {
  readonly lines: CorruptLedgerLine[];
  constructor(path: string, lines: CorruptLedgerLine[]);
}
/** What {@link loadEffectLedger} reads back from a JSONL ledger file. */
interface EffectLedgerScan {
  intents: ToolEffectIntent[];
  outcomes: ToolEffectRecord[];
  /**
  * The reconciliation signal (RV501): every intent whose OWN attempt
  * never got an outcome row. Pairing is exact: an outcome resolves the
  * intent carrying the same `attemptId` (rows written before the id
  * shipped pair by the legacy (idempotencyKey, startedAt) join), and
  * an outcome of ANY class resolves only its own attempt. A sibling
  * retry's outcome, ok or error, says nothing about THIS attempt, so
  * it never clears it: closing the logical key belongs to the host
  * reconciler, against the effect provider's receipt. For each orphan,
  * look the key up with the effect's provider before retrying or
  * compensating.
  */
  orphanedIntents: ToolEffectIntent[];
  /**
  * Lines the scan refused to admit (RV607): unparseable interior
  * bytes, invalid UTF-8, non-object JSON, a missing or mistyped
  * required field, or an unknown phase. Populated only under
  * `tolerateCorrupt` (the default scan throws
  * {@link LedgerCorruptionError} instead). Empty on a healthy file.
  */
  corrupt: CorruptLedgerLine[];
  /** Fragments the writer quarantined while repairing torn tails (RV502). */
  tornArtifacts: TornLedgerArtifact[];
  /**
  * A live unterminated, unparseable trailing fragment: the artifact of
  * a crash mid-write no writer has repaired yet. Tolerated and named,
  * never silent. (An unterminated line that PARSES but fails the shape
  * is corruption instead: a torn prefix of the writer's own flat
  * record can never parse, so such a line is foreign, not a crash
  * artifact.)
  */
  tornTail?: {
    preview: string;
  };
}
/**
* Scans a JSONL ledger file into intents, outcomes, and the orphaned
* intents a host must reconcile, pairing attempts exactly (RV501). A
* torn TRAILING fragment (the crash-mid-write artifact) is tolerated
* and reported; everything else the scan cannot decode, parse, and
* validate, invalid UTF-8, non-object JSON, a missing required field,
* an unknown phase (RV607), fails the scan closed with a typed
* {@link LedgerCorruptionError} unless `tolerateCorrupt` asks for the
* lines as data (RV502). Under `tolerateCorrupt` the scan never throws
* anything rawer than that: a malformed line is data, not an exception.
*/
declare function loadEffectLedger(path: string, options?: {
  tolerateCorrupt?: boolean;
}): Promise<EffectLedgerScan>;
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
  ledger?: ToolEffectLedger;
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
export { type ChildResult, type ChildSpec, type ChildStopReason, type ConformanceExecutorConfig, type ConformanceExecutorFactory, type ContainerExecutorOptions, type CorruptLedgerLine, type EffectLedgerScan, type ExecutorConformanceCheck, type ExecutorConformanceSuite, ExecutorError, type ExecutorErrorCode, type ExecutorTestRegistrar, LedgerCorruptionError, type SubprocessCommandSpec, type SubprocessExecutorOptions, type SubprocessToolInit, type ToolEffectIntent, type ToolEffectLedger, type ToolEffectRecord, type TornLedgerArtifact, containerExecutor, executorConformance, hashArgs, jsonlEffectLedger, loadEffectLedger, memoryEffectLedger, parseToolResult, registerExecutorConformance, runChildProcess, subprocessExecutor, subprocessTool };