[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/cli

# @rulvar/cli

The rulvar ops shell: the `rulvar` binary (`run`, `resume`, `runs`,
`inspect`, `plan`, `kb`), TUI progress, the embeddable HTTP server with
SSE events and external-input resolution (`createServer`), the queue
worker over any leasable store (`createWorker`), and the OpenTelemetry
exporter (`toOtel`).

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/cli
pnpm exec rulvar --help
```

## Documentation

- [CLI](https://docs.rulvar.com/guide/cli)
- [Observability](https://docs.rulvar.com/guide/observability)
- [API reference](https://docs.rulvar.com/api/%40rulvar/cli/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AssembledCli](/api/@rulvar/cli/interfaces/AssembledCli.md) | - |
| [CliConfig](/api/@rulvar/cli/interfaces/CliConfig.md) | The shape both the config module and a workflow module may export. |
| [CliIo](/api/@rulvar/cli/interfaces/CliIo.md) | - |
| [CommandContext](/api/@rulvar/cli/interfaces/CommandContext.md) | - |
| [CreateServerOptions](/api/@rulvar/cli/interfaces/CreateServerOptions.md) | - |
| [CreateWorkerOptions](/api/@rulvar/cli/interfaces/CreateWorkerOptions.md) | - |
| [RulvarServer](/api/@rulvar/cli/interfaces/RulvarServer.md) | - |
| [SpanLike](/api/@rulvar/cli/interfaces/SpanLike.md) | The tiny subset of the OTel Tracer/Span API the exporter uses. |
| [ToOtelOptions](/api/@rulvar/cli/interfaces/ToOtelOptions.md) | - |
| [TracerLike](/api/@rulvar/cli/interfaces/TracerLike.md) | - |
| [Worker](/api/@rulvar/cli/interfaces/Worker.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_STORE\_DIR](/api/@rulvar/cli/variables/DEFAULT_STORE_DIR.md) | - |
| [DEFAULT\_WORKER\_TTL\_MS](/api/@rulvar/cli/variables/DEFAULT_WORKER_TTL_MS.md) | Appendix A: the committed reference lease ttl. |
| [HELP](/api/@rulvar/cli/variables/HELP.md) | @rulvar/cli: the rulvar shell (https://docs.rulvar.com/guide/cli). M5 surface: run/resume/runs ls/inspect over the canonical grammar, TUI progress on the event stream, interactive resolution of suspended approvals and externals. plan/kb commands land M6+/M10; createServer/createWorker land M8; the OTel exporter lands M5-T08. |

## Functions

| Function | Description |
| ------ | ------ |
| [assembleEngine](/api/@rulvar/cli/functions/assembleEngine.md) | - |
| [attachProgress](/api/@rulvar/cli/functions/attachProgress.md) | Attaches the renderer to a handle's event stream; returns a detach. |
| [createServer](/api/@rulvar/cli/functions/createServer.md) | - |
| [createWorker](/api/@rulvar/cli/functions/createWorker.md) | - |
| [driveRun](/api/@rulvar/cli/functions/driveRun.md) | Drives a handle to a terminal outcome, resolving suspensions interactively and resuming until the run settles or input runs dry. |
| [inspectCommand](/api/@rulvar/cli/functions/inspectCommand.md) | - |
| [loadCliConfig](/api/@rulvar/cli/functions/loadCliConfig.md) | Loads `rulvar.config.mjs`/`.js` from cwd; absent config is fine. |
| [loadWorkflowModule](/api/@rulvar/cli/functions/loadWorkflowModule.md) | Imports a workflow module given on the command line. |
| [looksLikeFile](/api/@rulvar/cli/functions/looksLikeFile.md) | True when the `run` target names a file rather than a registry entry. |
| [processIo](/api/@rulvar/cli/functions/processIo.md) | The process-backed io the bin entry uses. |
| [renderEventLine](/api/@rulvar/cli/functions/renderEventLine.md) | Renders one event to a line, or undefined for silent event types. |
| [reportOutcome](/api/@rulvar/cli/functions/reportOutcome.md) | Renders the settled outcome; returns the process exit code. |
| [resumeCommand](/api/@rulvar/cli/functions/resumeCommand.md) | - |
| [runCli](/api/@rulvar/cli/functions/runCli.md) | @rulvar/cli: the rulvar shell (https://docs.rulvar.com/guide/cli). M5 surface: run/resume/runs ls/inspect over the canonical grammar, TUI progress on the event stream, interactive resolution of suspended approvals and externals. plan/kb commands land M6+/M10; createServer/createWorker land M8; the OTel exporter lands M5-T08. |
| [runCommand](/api/@rulvar/cli/functions/runCommand.md) | - |
| [runsLsCommand](/api/@rulvar/cli/functions/runsLsCommand.md) | - |
| [toOtel](/api/@rulvar/cli/functions/toOtel.md) | Exports one settled run's event stream onto a tracer. The run's events are consumed in seq order; span openers start spans, the matching closers end them, and payload-only events attach as span events on the innermost open span. Returns the number of spans created. |
