import { CreateEngineOptions, Engine, JournalStore, KeyDeriver, LeasableStore, ModelRef, RunHandle, RunMeta, RunOutcome, Usage, Workflow, WorkflowEvent, WorkflowRegistry } from "@lurker/core";

//#region src/io.d.ts
interface CliIo {
  out(line: string): void;
  err(line: string): void;
  /**
  * Asks one question and resolves with the answer line, or undefined
  * when input is exhausted (EOF): the caller leaves the run suspended.
  */
  prompt(question: string): Promise<string | undefined>;
  /** TTY-aware renderers may switch between live and plain output. */
  isTTY: boolean;
}
/** The process-backed io the bin entry uses. */
declare function processIo(): CliIo;
//#endregion
//#region src/cli-main.d.ts
declare const HELP = "lurker: durable multi-agent workflows (docs/06, section 10.5)\n\n  lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]\n  lurker resume <runId>  [--store PATH]\n  lurker runs ls         [--store PATH]\n  lurker inspect <runId> [--store PATH]\n  lurker plan \"<goal>\"   [--dry-run]\n\nEngine assembly: adapters, defaults, and the workflow registry come from\nlurker.config.mjs in the working directory (default export\n{ engineOptions?, workflows? }) or from the workflow module's named\nexports. --store selects the JsonlFileStore directory (default .lurker).\nplan asks the planner model (role plan) to write a workflow script,\nlints and self-repairs it, then runs it in the worker sandbox; --dry-run\nprints the accepted script without running. Requires @lurker/planner\ninstalled. kb commands arrive with M10.";
declare function runCli(argv: string[], options: {
  cwd: string;
  io: CliIo;
}): Promise<number>;
//#endregion
//#region src/commands.d.ts
interface CommandContext {
  cwd: string;
  io: CliIo;
}
declare function runCommand(argv: string[], context: CommandContext): Promise<number>;
declare function resumeCommand(argv: string[], context: CommandContext): Promise<number>;
declare function runsLsCommand(argv: string[], context: CommandContext): Promise<number>;
declare function inspectCommand(argv: string[], context: CommandContext): Promise<number>;
//#endregion
//#region src/config.d.ts
/** The shape both the config module and a workflow module may export. */
interface CliConfig {
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
}
/** Loads `lurker.config.mjs`/`.js` from cwd; absent config is fine. */
declare function loadCliConfig(cwd: string): Promise<CliConfig>;
interface LoadedWorkflowModule {
  workflow?: Workflow<never, unknown>;
  engineOptions?: Partial<CreateEngineOptions>;
  workflows?: WorkflowRegistry;
}
/** Imports a workflow module given on the command line. */
declare function loadWorkflowModule(file: string, cwd: string): Promise<LoadedWorkflowModule>;
/** True when the `run` target names a file rather than a registry entry. */
declare function looksLikeFile(target: string): boolean;
//#endregion
//#region src/engine-assembly.d.ts
declare const DEFAULT_STORE_DIR = ".lurker";
interface AssembledCli {
  engine: Engine;
  store: JournalStore;
  workflows: WorkflowRegistry;
  /** The journal-fold price function (table wins over caps; docs/04, section 10). */
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
}
declare function assembleEngine(options: {
  config: CliConfig;
  module?: LoadedWorkflowModule;
  storePath?: string;
  profile?: string;
  cwd: string;
}): AssembledCli;
//#endregion
//#region src/drive.d.ts
/**
* Drives a handle to a terminal outcome, resolving suspensions
* interactively and resuming until the run settles or input runs dry.
*/
declare function driveRun(options: {
  engine: Engine;
  workflow: Workflow<never, unknown>;
  first: RunHandle<unknown>;
  io: CliIo; /** Original run arguments: not journaled in v1, the host re-supplies them (docs/14). */
  args?: unknown;
}): Promise<RunOutcome<unknown>>;
/** Renders the settled outcome; returns the process exit code. */
declare function reportOutcome(outcome: RunOutcome<unknown>, io: CliIo): number;
//#endregion
//#region src/server.d.ts
interface CreateServerOptions {
  engine: Engine;
  /** The explicit, first-class registry (docs/06, section 10.4). */
  workflows: WorkflowRegistry;
  /**
  * Prices the journal fold behind GET /runs/:id/cost for runs without a
  * settled in-process outcome (the host assembles pricing exactly as it
  * does for the CLI); absent means those usages surface as `unpriced`,
  * never a silent zero (docs/04, section 10).
  */
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
}
interface LurkerServer {
  fetch(req: Request): Promise<Response>;
}
declare function createServer(options: CreateServerOptions): LurkerServer;
//#endregion
//#region src/worker.d.ts
/** Appendix A: the committed reference lease ttl (docs/06). */
declare const DEFAULT_WORKER_TTL_MS = 6e4;
interface CreateWorkerOptions {
  /**
  * The LeasableStore to lease runs from; MUST be the same journal the
  * engine writes (Engine.stores.journal), or the fencing epoch would
  * protect a store nobody appends to. Verified at start.
  */
  store: LeasableStore;
  /** Appendix A: leased runs per worker process; default 1. */
  concurrency?: number;
  /** Lease owner id; defaults to a per-process identity. */
  owner?: string;
  /**
  * The store's lease ttl; the worker renews at ttl/3 (the normative
  * bound, docs/03 12.3). Default: the Appendix A reference 60000 ms.
  * MUST match the store's configured ttl.
  */
  ttlMs?: number;
  /** Idle sweep cadence for start(); default 1000 ms. */
  pollMs?: number;
  /**
  * The OQ-21 interim channel: original in-process run arguments are not
  * journaled in v1, so the host re-supplies them per run. Absent means
  * args resume as undefined (fully replayed prefixes never notice).
  */
  argsFor?: (meta: RunMeta) => unknown;
  /** DEF-6 window extension, in lockstep with the engine assembly. */
  extraDerivers?: KeyDeriver[];
  /** Observability hook for per-run failures; never throws into the loop. */
  onError?: (runId: string, error: unknown) => void;
}
interface Worker {
  /** Begins sweeping on the poll cadence. Idempotent. */
  start(): void;
  /**
  * One sweep: lease and resume eligible runs up to the concurrency
  * cap. Returns the number of runs picked up. Exposed so hosts and
  * tests can drive the worker deterministically without timers.
  */
  sweep(): Promise<number>;
  /** Stops sweeping, cancels in-flight runs, releases held leases. */
  stop(): Promise<void>;
  /** runIds currently held by this worker. */
  active(): string[];
}
declare function createWorker(engine: Engine, options: CreateWorkerOptions): Worker;
//#endregion
//#region src/tui.d.ts
/** Renders one event to a line, or undefined for silent event types. */
declare function renderEventLine(event: WorkflowEvent): string | undefined;
/** Attaches the renderer to a handle's event stream; returns a detach. */
declare function attachProgress(handle: RunHandle<unknown>, io: CliIo): () => void;
//#endregion
//#region src/otel.d.ts
/** The tiny subset of the OTel Tracer/Span API the exporter uses. */
interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setStatus(status: {
    code: number;
    message?: string;
  }): void;
  end(endTime?: number): void;
}
interface TracerLike {
  startSpan(name: string, options?: {
    startTime?: number;
    attributes?: Record<string, string | number | boolean>;
  }, context?: unknown): SpanLike;
}
/** Minimal OTel context surface (setSpan/with) for parentage. */
interface OtelContextApi {
  active(): unknown;
  with<T>(context: unknown, fn: () => T): T;
}
interface ToOtelOptions {
  /** OTel context API for parentage; when absent, spans are flat but attributed. */
  contextApi?: OtelContextApi;
  /** trace.setSpan(context, span) equivalent; required with contextApi. */
  setSpan?: (context: unknown, span: SpanLike) => unknown;
}
/**
* Exports one settled run's event stream onto a tracer. The run's
* events are consumed in seq order; span openers start spans, the
* matching closers end them, and payload-only events attach as span
* events on the innermost open span. Returns the number of spans
* created.
*/
declare function toOtel(run: {
  runId: string;
  events: AsyncIterable<WorkflowEvent>;
  result: Promise<RunOutcome<unknown>>;
}, tracer: TracerLike, options?: ToOtelOptions): Promise<number>;
//#endregion
export { type AssembledCli, type CliConfig, type CliIo, type CommandContext, type CreateServerOptions, type CreateWorkerOptions, DEFAULT_STORE_DIR, DEFAULT_WORKER_TTL_MS, HELP, type LurkerServer, type SpanLike, type ToOtelOptions, type TracerLike, type Worker, assembleEngine, attachProgress, createServer, createWorker, driveRun, inspectCommand, loadCliConfig, loadWorkflowModule, looksLikeFile, processIo, renderEventLine, reportOutcome, resumeCommand, runCli, runCommand, runsLsCommand, toOtel };