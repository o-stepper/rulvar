# @rulvar/planner

The flagship Rulvar hybrid mode: a planner model writes a workflow
script against the sanctioned `ctx` dialect; the package lints and
repairs it from structured diagnostics, compiles it with an import
allowlist, and executes it deterministically in the worker sandbox with
seeded, journaled globals. Exports `plan`, `runPlanned`, `compileScript`,
`WorkerSandboxRunner`, and `apiCard`.

The one-line mnemonic against its sibling: `@rulvar/planner` plans
before the run (it writes the script); `@rulvar/plan` replans during the
run (it revises the task plan).

Part of [Rulvar](https://rulvar.com), an embeddable TypeScript engine
for durable, budget-bounded multi-agent LLM workflows, where a completed
LLM call is never paid for twice. Full documentation:
[docs.rulvar.com](https://docs.rulvar.com).

## Install

```bash
pnpm add @rulvar/core @rulvar/planner
```

## Documentation

- [The planner](https://docs.rulvar.com/guide/planner)
- [Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes)
- [API reference](https://docs.rulvar.com/api/%40rulvar/planner/)

## License

[Apache-2.0](https://github.com/o-stepper/rulvar/blob/main/LICENSE)
