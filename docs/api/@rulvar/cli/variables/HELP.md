[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / HELP

# Variable: HELP

```ts
const HELP: "rulvar: durable multi-agent workflows (docs/06, section 10.5)\n\n  rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]\n  rulvar resume <runId>  [--store PATH]\n  rulvar runs ls         [--store PATH]\n  rulvar inspect <runId> [--store PATH]\n  rulvar plan \"<goal>\"   [--dry-run]\n  rulvar kb <list | inbox | sweep>\n\nEngine assembly: adapters, defaults, and the workflow registry come from\nrulvar.config.mjs in the working directory (default export\n{ engineOptions?, workflows? }) or from the workflow module's named\nexports. --store selects the JsonlFileStore directory (default .rulvar).\nplan asks the planner model (role plan) to write a workflow script,\nlints and self-repairs it, then runs it in the worker sandbox; --dry-run\nprints the accepted script without running. Requires @rulvar/planner\ninstalled. kb list shows the per-project claim store\n(./rulvar.models.json) with full provenance. kb sweep runs the\nfalsification matrix from the kbSweep section of rulvar.config.mjs\n(fixed pool UNIONED with every model carrying an active negative claim\nplus the re-measure queue; optional canary probes flip drifted claims\nstale first; requires @rulvar/evals installed). kb inbox arrives with\nModelKnowledge phase 3.";
```

Defined in: [packages/cli/src/cli-main.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/cli-main.ts#L17)

@rulvar/cli: the rulvar shell (https://docs.rulvar.com/guide/cli).
M5 surface: run/resume/runs ls/inspect over the canonical
grammar, TUI progress on the event stream, interactive resolution of
suspended approvals and externals. plan/kb commands land M6+/M10;
createServer/createWorker land M8; the OTel exporter lands M5-T08.

The CLI builds exclusively from the public @rulvar/core API; adapters
and defaults come from the host's `rulvar.config.mjs` (or the
workflow module's exports), never from CLI dependencies.
