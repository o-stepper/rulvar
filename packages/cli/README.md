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
