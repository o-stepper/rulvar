import { CreateEngineOptions, Engine, JournalStore, KeyDeriver, LeasableStore, ModelRef, RunHandle, RunMeta, RunOutcome, Usage, Workflow, WorkflowEvent, WorkflowRegistry } from "@rulvar/core";

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
declare const HELP: string;
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
  /** rulvar kb sweep configuration (M11-T05). */
  kbSweep?: KbSweepCliConfig;
}
/**
* The kb sweep config: a FIXED pool (sweep volume is never authorized
* by proposal volume) plus the cases per taskClass. Structural sweep
* shapes only: the CLI's static dependency stays @rulvar/core and
* @rulvar/evals loads dynamically at command time (the plan-command
* precedent), so graders and cases are typed by the config module.
*/
interface KbSweepCliConfig {
  /** The dedicated committer identity recorded on gates and authors. */
  committerId: string;
  /** The fixed pool; falsification UNIONS in the store's negative-claim and re-measure subjects. */
  models: Array<{
    model: `${string}:${string}`;
    effort?: string;
  }>;
  /** Eval cases tagged by taskClass (constructed with @rulvar/evals inside the config module). */
  cases: Array<{
    taskClass: string;
    case: unknown;
  }>;
  thresholds?: {
    strength?: number;
    weakness?: number;
  };
  /** Optional canary probes run per pool member BEFORE the sweep; drift flips stale. */
  canary?: {
    agentType: string;
    prompts: string[];
  };
  /** Default: kb-sweep-<observedAt ISO>. */
  reportId?: string;
  /** Per-member engine override; default: engineOptions with loop/extract routed at the member. */
  engineFor?: (member: {
    model: `${string}:${string}`;
    effort?: string;
  }) => unknown;
  /**
  * Immutable per-run ceilings and the aggregate debit-only envelope
  * (v1.16.2 review P1-2). A sweep multiplies paid runs: pool members
  * times cases for targets, one judge run per judge-grader call, one
  * canary run per probe per member, and the falsification union can
  * grow the pool past the configured models. Per-run ceilings alone do
  * not bound that product, so maxTotalUsd is the hard aggregate ceiling
  * every target, judge, and canary run authorizes against BEFORE it
  * starts. Required unless allowUnbounded is set: a sweep is never
  * silently unbounded.
  */
  budgets?: {
    /** Immutable ceiling B0 of every eval target run. */targetUsd: number; /** Immutable ceiling of every judge run. */
    judgeUsd: number; /** Immutable ceiling of every canary probe run. */
    canaryUsd: number; /** The debit-only envelope over the WHOLE sweep (targets, judges, canary). */
    maxTotalUsd: number;
  };
  /**
  * Explicitly waive the ceilings and run every target, judge, and
  * canary run unbounded (the pre-v1.16.2 behavior). A sweep with
  * neither budgets nor this flag set fails loudly: an unbounded paid
  * matrix is never the silent default.
  */
  allowUnbounded?: boolean;
}
/** Loads `rulvar.config.mjs`/`.js` from cwd; absent config is fine. */
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
declare const DEFAULT_STORE_DIR = ".rulvar";
interface AssembledCli {
  engine: Engine;
  store: JournalStore;
  workflows: WorkflowRegistry;
  /** The journal-fold price function (table wins over caps). */
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
  io: CliIo; /** Original run arguments: not journaled in v1, the host re-supplies them. */
  args?: unknown;
}): Promise<RunOutcome<unknown>>;
/** Renders the settled outcome; returns the process exit code. */
declare function reportOutcome(outcome: RunOutcome<unknown>, io: CliIo): number;
//#endregion
//#region src/server.d.ts
interface CreateServerOptions {
  engine: Engine;
  /** The explicit, first-class registry. */
  workflows: WorkflowRegistry;
  /**
  * Prices the journal fold behind GET /runs/:id/cost for runs without a
  * settled in-process outcome (the host assembles pricing exactly as it
  * does for the CLI); absent means those usages surface as `unpriced`,
  * never a silent zero.
  */
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /**
  * Opt-in retention (OQ-20 executed at M8-T04): evaluated
  * when a tracked run settles terminally; a true verdict applies
  * engine.deleteRun (transcript cascade, then the journal) and
  * untracks the run. Absent means everything persists indefinitely.
  */
  retention?: (meta: RunMeta) => boolean;
}
interface RulvarServer {
  fetch(req: Request): Promise<Response>;
}
declare function createServer(options: CreateServerOptions): RulvarServer;
//#endregion
//#region src/worker.d.ts
/** Appendix A: the committed reference lease ttl. */
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
  * bound). Default: the Appendix A reference 60000 ms.
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
  /**
  * Opt-in retention (OQ-20 executed at M8-T04): evaluated
  * during sweeps over SETTLED runs (terminal meta); a true verdict
  * applies engine.deleteRun under a briefly held lease. Absent means
  * everything persists indefinitely.
  */
  retention?: (meta: RunMeta) => boolean;
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
/**
* Renders one event to a line, or undefined for silent event types. The
* composed line is sanitized so an untrusted provider/tool/log string
* cannot inject a control sequence or a second physical line (v1.21.0
* review P2-1).
*/
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
export { type AssembledCli, type CliConfig, type CliIo, type CommandContext, type CreateServerOptions, type CreateWorkerOptions, DEFAULT_STORE_DIR, DEFAULT_WORKER_TTL_MS, HELP, type RulvarServer, type SpanLike, type ToOtelOptions, type TracerLike, type Worker, assembleEngine, attachProgress, createServer, createWorker, driveRun, inspectCommand, loadCliConfig, loadWorkflowModule, looksLikeFile, processIo, renderEventLine, reportOutcome, resumeCommand, runCli, runCommand, runsLsCommand, toOtel };