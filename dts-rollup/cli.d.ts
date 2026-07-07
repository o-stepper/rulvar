import { CreateEngineOptions, Engine, JournalStore, RunHandle, RunOutcome, Workflow, WorkflowEvent, WorkflowRegistry } from "@lurker/core";

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
declare const HELP = "lurker: durable multi-agent workflows (docs/06, section 10.5)\n\n  lurker run <file|name> [--args JSON] [--store PATH] [--budget-usd N]\n  lurker resume <runId>  [--store PATH]\n  lurker runs ls         [--store PATH]\n  lurker inspect <runId> [--store PATH]\n\nEngine assembly: adapters, defaults, and the workflow registry come from\nlurker.config.mjs in the working directory (default export\n{ engineOptions?, workflows? }) or from the workflow module's named\nexports. --store selects the JsonlFileStore directory (default .lurker).\nplan and kb commands arrive in later milestones.";
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
}
declare function assembleEngine(options: {
  config: CliConfig;
  module?: LoadedWorkflowModule;
  storePath?: string;
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
//#region src/tui.d.ts
/** Renders one event to a line, or undefined for silent event types. */
declare function renderEventLine(event: WorkflowEvent): string | undefined;
/** Attaches the renderer to a handle's event stream; returns a detach. */
declare function attachProgress(handle: RunHandle<unknown>, io: CliIo): () => void;
//#endregion
export { type AssembledCli, type CliConfig, type CliIo, type CommandContext, DEFAULT_STORE_DIR, HELP, assembleEngine, attachProgress, driveRun, inspectCommand, loadCliConfig, loadWorkflowModule, looksLikeFile, processIo, renderEventLine, reportOutcome, resumeCommand, runCli, runCommand, runsLsCommand };