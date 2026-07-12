# rulvar

[![npm](https://img.shields.io/npm/v/%40rulvar%2Frulvar)](https://www.npmjs.com/package/@rulvar/rulvar)
[![CI](https://github.com/o-stepper/rulvar/actions/workflows/ci.yml/badge.svg)](https://github.com/o-stepper/rulvar/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

An embeddable TypeScript engine for durable, budget-bounded multi-agent
LLM workflows. Your workflow is an ordinary async function, your
infrastructure is a directory of JSONL files (or SQLite), and the core
invariant holds through crashes, edits, and redeploys: **a completed LLM
call is never paid for twice**. No server, no database, no control plane
required.

Official site: [rulvar.com](https://rulvar.com). Documentation:
[docs.rulvar.com](https://docs.rulvar.com); start with the ten-minute
[quickstart](https://docs.rulvar.com/guide/quickstart).

## Why rulvar

- **Never pay twice.** Every effect is appended to a content-addressed
  journal. Crash mid-run, kill the process, add a step, resume: completed
  calls replay from disk with zero live requests and zero new spend, and
  inserting, reordering, or deleting steps never invalidates unrelated
  completed work. See [Durability](https://docs.rulvar.com/guide/durability)
  and [The journal](https://docs.rulvar.com/guide/journal).
- **Hard budgets, not hints.** `budgetUsd` is an immutable per-run ceiling
  enforced by a three-layer budget (admission control, per-turn guard,
  abort ceiling). Every run settles with a full cost report broken down by
  model, phase, agent type, and role; exhaustion is a typed outcome, never
  a bare null. See [Budgets](https://docs.rulvar.com/guide/budgets).
- **Vendor-neutral by construction.** First-class Anthropic and OpenAI
  adapters, an `openaiCompatible` factory for Ollama, vLLM, and gateways,
  and a bridge that wraps any Vercel AI SDK model. Models are addressed as
  `'adapterId:model'` strings, so one engine can route each role to a
  different vendor. See [Providers](https://docs.rulvar.com/guide/providers)
  and [Model routing](https://docs.rulvar.com/guide/model-routing).
- **Orchestration at every altitude.** Hand-written TypeScript over `ctx`
  primitives (`ctx.agent`, `ctx.parallel`, `ctx.pipeline`, `ctx.step`), an
  adaptive plan runner with model-ladder escalation, and the flagship
  planner mode, where a plan agent compiles a typed orchestration script,
  runs it in a worker sandbox, and self-repairs from structured lint
  diagnostics. All modes share one runtime, one journal, one budget. See
  [Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes).
- **Testable to the byte.** VCR cassettes, a deterministic `FakeAdapter`,
  replay-strict runs, and an executable conformance kit for custom stores.
  The engine holds itself to the same bar: every entry of its normative
  defect cassette catalog replays in CI with zero live calls. See
  [Testing](https://docs.rulvar.com/guide/testing).
- **Observable from the first run.** A typed event stream per run
  (`run:start`, `agent:stream`, `budget:update`, ...), a terminal progress
  renderer, TUI progress and run inspection in the CLI, and an OpenTelemetry
  exporter. See [Observability](https://docs.rulvar.com/guide/observability).
- **Typed end to end.** Agent outputs and tool parameters validate against
  any [Standard Schema](https://standardschema.dev) library (Zod, ArkType,
  Valibot); a schema on `ctx.agent` makes the resolved value typed and
  validated at runtime.

## Sixty seconds to the first run

Requires Node.js 22.12.0 or newer, ESM only (your project's `package.json` needs `"type": "module"`; `npm pkg set type=module` adds it).

```bash
pnpm add @rulvar/rulvar zod
```

`@rulvar/rulvar` is the umbrella package: the core engine plus both
first-class adapters, recommended model defaults, and the progress
renderer. The unscoped alias `rulvar` re-exports it and is republished
to match the umbrella's version each release, so `npm install rulvar`
works for a quick try; projects should depend on the scoped
`@rulvar/rulvar` in `package.json`.

```ts
import { z } from 'zod';
import {
  createEngine,
  defineWorkflow,
  anthropic,
  recommendedDefaults,
  JsonlFileStore,
  FileTranscriptStore,
  renderProgress,
  type Ctx,
} from '@rulvar/rulvar';

const engine = createEngine({
  adapters: [anthropic()], // reads ANTHROPIC_API_KEY from the environment
  stores: {
    journal: new JsonlFileStore({ dir: '.rulvar/journal' }),
    transcripts: new FileTranscriptStore({ dir: '.rulvar/transcripts' }),
  },
  defaults: {
    routing: {
      ...recommendedDefaults.routing,
      loop: 'anthropic:claude-sonnet-5',
      // Schema-bearing ctx.agent calls resolve the extract role, whose
      // recommended default targets OpenAI; this engine registers only
      // the anthropic adapter, so route extract to it explicitly.
      extract: { model: 'anthropic:claude-sonnet-5', effort: 'low' },
    },
    roleFloors: recommendedDefaults.floors,
  },
});

const verdictSchema = z.strictObject({ score: z.number(), rationale: z.string() });

const panel = defineWorkflow(
  { name: 'judge-panel' },
  async (ctx: Ctx, args: { question: string }) => {
    const judged = await ctx.parallel(
      ['practical', 'skeptical', 'creative'].map((angle) => async () => {
        const attempt = String(
          await ctx.agent(
            `Answer from a strictly ${angle} point of view, in one paragraph: ${args.question}`,
            { label: `attempt-${angle}` },
          ),
        );
        const verdict = await ctx.agent(
          `Score this answer from 0 to 10 for the question "${args.question}".\n\n${attempt}`,
          { schema: verdictSchema, label: `judge-${angle}` }, // typed, validated result
        );
        return { angle, attempt, score: verdict.score };
      }),
    );
    return [...judged].sort((a, b) => b.score - a.score)[0];
  },
);

const handle = engine.run(
  panel,
  { question: 'Should a five-person startup adopt a monorepo?' },
  { runId: 'panel-1', budgetUsd: 2 }, // hard ceiling: no API can raise it after start
);
void renderProgress(handle.events); // live progress lines on stderr

const outcome = await handle.result;
console.log(outcome.status, outcome.value, outcome.cost.totalUsd);
```

Resume the same `runId` later, after a crash or a redeploy or an edit,
and the journal does the work:

```ts
const resumed = engine.resume('panel-1', panel, {
  args: { question: 'Should a five-person startup adopt a monorepo?' },
});
const outcome2 = await resumed.result;
const replay = await resumed.preview; // replay accounting, resolves at settle
console.log(replay.hits, replay.misses); // 6 hits, 0 misses: zero new spend
```

The full walk-through, including the OpenAI variant and the crash and
edit-and-rerun scenarios, is the
[quickstart](https://docs.rulvar.com/guide/quickstart).

## Packages

Fifteen published packages: thirteen released in lockstep at a single
version, `@rulvar/compat` versioned independently, and the unscoped
`rulvar` alias tracking the umbrella. The full package map with the
dependency graph is at
[docs.rulvar.com/reference/packages](https://docs.rulvar.com/reference/packages);
versioning policy at
[docs.rulvar.com/reference/versioning](https://docs.rulvar.com/reference/versioning).

| Package                     | What it is                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@rulvar/rulvar`            | Batteries-included umbrella: re-exports the core, both first-class adapters, recommended model defaults, and the progress renderer     |
| `rulvar`                    | Unscoped alias of the umbrella, so the bare name resolves to the real thing                                                            |
| `@rulvar/core`              | The engine: journal kernel, `ctx` primitives, agent runtime, model router, tool system, dynamic orchestrator, reference stores, events |
| `@rulvar/anthropic`         | First-class provider adapter over `@anthropic-ai/sdk`                                                                                  |
| `@rulvar/openai`            | First-class adapter for the OpenAI Responses API, plus the `openaiCompatible` factory                                                  |
| `@rulvar/bridge-ai-sdk`     | Wraps any Vercel AI SDK `LanguageModelV4` as a provider adapter                                                                        |
| `@rulvar/store-sqlite`      | SQLite `JournalStore` and `LeasableStore` with a fencing epoch                                                                         |
| `@rulvar/store-conformance` | Executable conformance kit for custom store implementations                                                                            |
| `@rulvar/testing`           | `createTestEngine`, `FakeAdapter`, VCR cassettes, replay-strict runs, matchers                                                         |
| `@rulvar/evals`             | Eval cases, golden outputs, rubric and judge graders, matrix sweeps, canary fingerprints                                               |
| `@rulvar/plan`              | Adaptive orchestration: the `planRunner` extension factory, the run ledger, escalation extensions, model ladder configuration          |
| `@rulvar/planner`           | Flagship hybrid mode: plan agent, `compileScript`, `WorkerSandboxRunner`, self-repair loop                                             |
| `@rulvar/cli`               | The `rulvar` shell: run, resume, runs, inspect, plan, and kb commands, TUI progress, `createServer`, `createWorker`, OTel exporter     |
| `@rulvar/compat`            | Frozen `KeyDeriver` profiles for hash versions outside the support window                                                              |
| `eslint-plugin-rulvar`      | Determinism lint rules with structural JSON diagnostics for the planner self-repair loop                                               |

## Documentation

Built from [docs/](docs/README.md) in this repository and published at
[docs.rulvar.com](https://docs.rulvar.com). Good entry points:

- [Quickstart](https://docs.rulvar.com/guide/quickstart) and
  [Installation](https://docs.rulvar.com/guide/installation)
- [Architecture](https://docs.rulvar.com/guide/architecture)
- [Example patterns](https://docs.rulvar.com/guide/examples), with runnable
  sources in [examples/](examples/README.md)
- [Stores](https://docs.rulvar.com/guide/stores),
  [Tools](https://docs.rulvar.com/guide/tools),
  [MCP](https://docs.rulvar.com/guide/mcp),
  [Evals](https://docs.rulvar.com/guide/evals),
  [CLI](https://docs.rulvar.com/guide/cli)
- [API reference](https://docs.rulvar.com/api/%40rulvar/core/), generated
  from the sources

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Requires Node >= 22.12.0 and
pnpm 11 (pinned via `packageManager`); `pnpm install`, then `pnpm build`,
`pnpm test`, `pnpm lint`.

## License

[Apache-2.0](LICENSE). Every published package carries the LICENSE file;
contributions are accepted under the DCO (`git commit -s`).
