[**Rulvar API reference**](../../index.md)

***

[Rulvar API reference](/api/index.md) / @rulvar/cli

# @rulvar/cli

The Rulvar ops shell: the `rulvar` binary (`run`, `resume`, `runs`,
`inspect`, `plan`, `kb`), TUI progress, the embeddable HTTP server with
SSE events and external-input resolution (`createServer`), the queue
worker over any leasable store (`createWorker`), and the OpenTelemetry
exporter (`toOtel`).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
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
| [KbSweepCliConfig](/api/@rulvar/cli/interfaces/KbSweepCliConfig.md) | The kb sweep config: a FIXED pool (sweep volume is never authorized by proposal volume) plus the cases per taskClass. Structural sweep shapes only: the CLI's static dependency stays @rulvar/core and @rulvar/evals loads dynamically at command time (the plan-command precedent), so graders and cases are typed by the config module. |
| [LoadedWorkflowModule](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md) | - |
| [OtelContextApi](/api/@rulvar/cli/interfaces/OtelContextApi.md) | Minimal OTel context surface (setSpan/with) for parentage. |
| [RulvarServer](/api/@rulvar/cli/interfaces/RulvarServer.md) | - |
| [SpanLike](/api/@rulvar/cli/interfaces/SpanLike.md) | The tiny subset of the OTel Tracer/Span API the exporter uses. |
| [ToOtelOptions](/api/@rulvar/cli/interfaces/ToOtelOptions.md) | - |
| [TracerLike](/api/@rulvar/cli/interfaces/TracerLike.md) | - |
| [Worker](/api/@rulvar/cli/interfaces/Worker.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_MAX\_PENDING\_EVENTS\_PER\_CLIENT](/api/@rulvar/cli/variables/DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT.md) | The default per-connection pending-frame bound: generous enough that a reading consumer never notices (a normal reader keeps the queue near empty), small enough that a consumer that stopped reading cannot grow process memory past a few megabytes per connection. |
| [DEFAULT\_STORE\_DIR](/api/@rulvar/cli/variables/DEFAULT_STORE_DIR.md) | - |
| [DEFAULT\_WORKER\_TTL\_MS](/api/@rulvar/cli/variables/DEFAULT_WORKER_TTL_MS.md) | Appendix A: the committed reference lease ttl. |
| [HELP](/api/@rulvar/cli/variables/HELP.md) | @rulvar/cli: the Rulvar shell (https://docs.rulvar.com/guide/cli). M5 surface: run/resume/runs ls/inspect over the canonical grammar, TUI progress on the event stream, interactive resolution of suspended approvals and externals. plan/kb commands land M6+/M10; createServer/createWorker land M8; the OTel exporter lands M5-T08. |

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
| [renderEventLine](/api/@rulvar/cli/functions/renderEventLine.md) | Renders one event to a line, or undefined for silent event types. The composed line is sanitized so an untrusted provider/tool/log string cannot inject a control sequence or a second physical line (v1.21.0 review P2-1). |
| [reportOutcome](/api/@rulvar/cli/functions/reportOutcome.md) | Renders the settled outcome; returns the process exit code. Error messages, suspension keys, model refs, and phase names originate from providers, tools, and workflow authors, so each is sanitized before it reaches a terminal line, matching the TUI renderer (v1.24.1 review P2-1). Values print as JSON, which escapes control bytes on its own. |
| [resumeCommand](/api/@rulvar/cli/functions/resumeCommand.md) | - |
| [runCli](/api/@rulvar/cli/functions/runCli.md) | @rulvar/cli: the Rulvar shell (https://docs.rulvar.com/guide/cli). M5 surface: run/resume/runs ls/inspect over the canonical grammar, TUI progress on the event stream, interactive resolution of suspended approvals and externals. plan/kb commands land M6+/M10; createServer/createWorker land M8; the OTel exporter lands M5-T08. |
| [runCommand](/api/@rulvar/cli/functions/runCommand.md) | - |
| [runsLsCommand](/api/@rulvar/cli/functions/runsLsCommand.md) | - |
| [strictExitCode](/api/@rulvar/cli/functions/strictExitCode.md) | `--strict` (the v1.40.0 improvement plan's completion contract): a settled ok run whose orchestration acceptance envelope reports a completion other than 'complete' exits nonzero, with the degraded reasons printed. Outcomes without an acceptance envelope (a workflow that never opted into orchestrate acceptance) and nonzero exit codes pass through unchanged, so the flag never masks the ordinary status exit and never bites a plain workflow. |
| [toOtel](/api/@rulvar/cli/functions/toOtel.md) | Exports one settled run's event stream onto a tracer. The run's events are consumed in seq order; span openers start spans, the matching closers end them, and payload-only events attach as span events on the innermost open span. Returns the number of spans created. |
