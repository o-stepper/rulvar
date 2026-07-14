/**
 * @rulvar/cli: the Rulvar shell (https://docs.rulvar.com/guide/cli).
 * M5 surface: run/resume/runs ls/inspect over the canonical
 * grammar, TUI progress on the event stream, interactive resolution of
 * suspended approvals and externals. plan/kb commands land M6+/M10;
 * createServer/createWorker land M8; the OTel exporter lands M5-T08.
 *
 * The CLI builds exclusively from the public @rulvar/core API; adapters
 * and defaults come from the host's `rulvar.config.mjs` (or the
 * workflow module's exports), never from CLI dependencies.
 */
export { runCli, HELP } from './cli-main.js';
export {
  runCommand,
  resumeCommand,
  runsLsCommand,
  inspectCommand,
  type CommandContext,
} from './commands.js';
export { loadCliConfig, loadWorkflowModule, looksLikeFile, type CliConfig } from './config.js';
export { assembleEngine, DEFAULT_STORE_DIR, type AssembledCli } from './engine-assembly.js';
export { driveRun, reportOutcome } from './drive.js';
export { createServer, type CreateServerOptions, type RulvarServer } from './server.js';
export {
  createWorker,
  DEFAULT_WORKER_TTL_MS,
  type CreateWorkerOptions,
  type Worker,
} from './worker.js';
export { attachProgress, renderEventLine } from './tui.js';
export { processIo, type CliIo } from './io.js';
export { toOtel, type TracerLike, type SpanLike, type ToOtelOptions } from './otel.js';
