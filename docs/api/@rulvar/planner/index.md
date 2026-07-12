[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/planner

# @rulvar/planner

The flagship rulvar hybrid mode: a planner model writes a workflow
script against the sanctioned `ctx` dialect; the package lints and
repairs it from structured diagnostics, compiles it with an import
allowlist, and executes it deterministically in the worker sandbox with
seeded, journaled globals. Exports `plan`, `runPlanned`, `compileScript`,
`WorkerSandboxRunner`, and `apiCard`.

The one-line mnemonic against its sibling: `@rulvar/planner` plans
before the run (it writes the script); `@rulvar/plan` replans during the
run (it revises the task plan).

Part of [rulvar](https://rulvar.com), an embeddable TypeScript engine
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

## Classes

| Class | Description |
| ------ | ------ |
| [WorkerSandboxRunner](/api/@rulvar/planner/classes/WorkerSandboxRunner.md) | Accepts CompiledWorkflow ONLY: feeding a closure is a type error. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [CompileScriptOptions](/api/@rulvar/planner/interfaces/CompileScriptOptions.md) | @rulvar/planner: rulvar flagship hybrid mode: plan agent, compileScript, WorkerSandboxRunner, self-repair loop (https://docs.rulvar.com/guide/planner). The surface lands across M6. |
| [M6CassetteFixture](/api/@rulvar/planner/interfaces/M6CassetteFixture.md) | The cassette file shape shared with the M3 sets. |
| [PlanDiagnostic](/api/@rulvar/planner/interfaces/PlanDiagnostic.md) | One repair-loop diagnostic: lint and compile findings share the shape. |
| [PlanOptions](/api/@rulvar/planner/interfaces/PlanOptions.md) | - |
| [PlanResult](/api/@rulvar/planner/interfaces/PlanResult.md) | - |
| [ScriptDiagnostic](/api/@rulvar/planner/interfaces/ScriptDiagnostic.md) | One machine-readable compileScript diagnostic (carried by ScriptRejected). |
| [WorkerSandboxRunnerOptions](/api/@rulvar/planner/interfaces/WorkerSandboxRunnerOptions.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_SANDBOX\_MEMORY\_MB](/api/@rulvar/planner/variables/DEFAULT_SANDBOX_MEMORY_MB.md) | - |
| [DEFAULT\_SANDBOX\_TIMEOUT\_MS](/api/@rulvar/planner/variables/DEFAULT_SANDBOX_TIMEOUT_MS.md) | - |
| [SANDBOX\_DETERMINISM\_RUN\_ID](/api/@rulvar/planner/variables/SANDBOX_DETERMINISM_RUN_ID.md) | - |
| [SANDBOX\_DETERMINISM\_SOURCE](/api/@rulvar/planner/variables/SANDBOX_DETERMINISM_SOURCE.md) | A script exercising agents, parallel, step, and every seeded shim. |
| [SANDBOX\_GLOBALS](/api/@rulvar/planner/variables/SANDBOX_GLOBALS.md) | The exact curated sandbox global set, in canonical order. The worker binds the ctx methods as bare globals under these names and the API card teaches exactly this list. |
| [SELF\_REPAIR\_BAD\_DRAFT](/api/@rulvar/planner/variables/SELF_REPAIR_BAD_DRAFT.md) | The failing first draft: bare Date.now trips rulvar/no-bare-date. |
| [SELF\_REPAIR\_GOAL](/api/@rulvar/planner/variables/SELF_REPAIR_GOAL.md) | - |
| [SELF\_REPAIR\_GOOD\_DRAFT](/api/@rulvar/planner/variables/SELF_REPAIR_GOOD_DRAFT.md) | The repaired draft the fake planner returns once diagnostics arrive. |
| [SELF\_REPAIR\_RUN\_ID](/api/@rulvar/planner/variables/SELF_REPAIR_RUN_ID.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [apiCard](/api/@rulvar/planner/functions/apiCard.md) | Renders the sandbox-dialect API card; pure and byte-stable. |
| [compileScript](/api/@rulvar/planner/functions/compileScript.md) | @rulvar/planner: rulvar flagship hybrid mode: plan agent, compileScript, WorkerSandboxRunner, self-repair loop (https://docs.rulvar.com/guide/planner). The surface lands across M6. |
| [extractScript](/api/@rulvar/planner/functions/extractScript.md) | The model may fence the script; the extractor takes the first fenced block when one exists, else the whole reply, and is deterministic. |
| [lintScript](/api/@rulvar/planner/functions/lintScript.md) | Lints a script BODY with the workflows preset plus compileScript. The body is wrapped in an async function for parsing (top-level return/await are legal in the dialect); reported lines shift back so they index into the body source. |
| [normalizeCassetteEntries](/api/@rulvar/planner/functions/normalizeCassetteEntries.md) | The M3-convention cassette normalization: wall clock and spans only. |
| [plan](/api/@rulvar/planner/functions/plan.md) | - |
| [planRunIdOf](/api/@rulvar/planner/functions/planRunIdOf.md) | The deterministic planner runId: one goal, one journal. |
| [runPlanned](/api/@rulvar/planner/functions/runPlanned.md) | plan-then-run in one call (amended during M6-T05: the composition is async because planning itself is a run). |
| [runPlannerSelfRepair](/api/@rulvar/planner/functions/runPlannerSelfRepair.md) | One planner-self-repair run: the first draft fails lint, the JSON diagnostics ride the repair prompt, the second draft compiles. Returns the normalized planning journal plus the plan result. |
| [runSandboxDeterminism](/api/@rulvar/planner/functions/runSandboxDeterminism.md) | One fresh sandbox-determinism run on a fresh store; two invocations with the same worker produce byte-identical normalized journals (the cassette assertion). The adapter factory keeps @rulvar/testing out of the planner's dependency graph. |
| [scriptDiagnosticsOf](/api/@rulvar/planner/functions/scriptDiagnosticsOf.md) | @rulvar/planner: rulvar flagship hybrid mode: plan agent, compileScript, WorkerSandboxRunner, self-repair loop (https://docs.rulvar.com/guide/planner). The surface lands across M6. |
