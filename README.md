<div align="center">

<a href="https://rulvar.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/logo.dark.svg">
    <img src="docs/public/logo.svg" alt="Rulvar logo" width="180" height="180">
  </picture>
</a>

# Rulvar

**An embeddable TypeScript engine for durable, budget-bounded multi-agent LLM workflows.**

[![npm](https://img.shields.io/npm/v/%40rulvar%2Frulvar)](https://www.npmjs.com/package/@rulvar/rulvar)
[![CI](https://github.com/o-stepper/rulvar/actions/workflows/ci.yml/badge.svg)](https://github.com/o-stepper/rulvar/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

[rulvar.com](https://rulvar.com) · [Documentation](https://docs.rulvar.com) · [Quickstart](https://docs.rulvar.com/guide/quickstart)

</div>

Your workflow is an ordinary async function. Your infrastructure is a directory of JSONL
files (or SQLite). And through crashes, edits, and redeploys, one invariant holds:
**a completed LLM call is never paid for twice.** No server, no database, no control plane.

## Why Rulvar

- **Never pay twice.** Every effect is appended to a content-addressed journal. Crash the
  process, add a step, resume: completed calls replay from disk with zero live requests and
  zero new spend, and reordering steps never invalidates unrelated work.
  [Durability](https://docs.rulvar.com/guide/durability)
- **Immutable budgets with a stated bound.** `budgetUsd` is a per-run ceiling no API can raise,
  enforced by projected admission (a spawn whose reserve does not fit is denied before any
  dispatch), a per-turn guard that also clamps each request's output tokens to what the
  remaining budget buys, and live stream cuts on crossing. The residual overshoot is documented
  and provider-dependent: at most one in-flight turn per concurrent agent, because a provider
  bills tokens it has already generated. Exhaustion is a typed outcome with a full cost report,
  never a bare null. [Budgets](https://docs.rulvar.com/guide/budgets)
- **Any vendor, per role.** First-class Anthropic and OpenAI adapters, an `openaiCompatible`
  factory for Ollama, vLLM, and gateways, and a bridge for any Vercel AI SDK `LanguageModelV4`
  (other specification versions are rejected with a typed error at runtime). Models are
  `'adapterId:model'` strings, so one engine routes each role wherever it belongs.
  [Model routing](https://docs.rulvar.com/guide/model-routing)
- **Three orchestration modes, one runtime.** Hand-written TypeScript over `ctx` primitives, an
  adaptive plan runner with model-ladder escalation, and a planner agent that compiles a typed
  script, sandboxes it, and self-repairs from lint diagnostics.
  [Orchestration modes](https://docs.rulvar.com/guide/orchestration-modes)
- **Testable to the byte.** VCR cassettes, a deterministic `FakeAdapter`, replay-strict runs, and
  a conformance kit for custom stores. The engine holds itself to the same bar: its defect
  cassette catalog replays in CI with zero live calls.
  [Testing](https://docs.rulvar.com/guide/testing)

## Sixty seconds to the first run

Requires Node.js 22.12.0 or newer, ESM only.

```bash
pnpm add @rulvar/rulvar zod
```

```ts
import { z } from 'zod';
import {
  createEngine,
  defineWorkflow,
  anthropic,
  recommendedDefaults,
  JsonlFileStore,
  FileTranscriptStore,
  progress,
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
      extract: { model: 'anthropic:claude-sonnet-5', effort: 'low' }, // schema-bearing calls
    },
    roleFloors: recommendedDefaults.floors,
  },
});

const verdict = z.strictObject({ score: z.number(), rationale: z.string() });

const panel = defineWorkflow(
  { name: 'judge-panel' },
  async (ctx: Ctx, args: { question: string }) => {
    const judged = await ctx.parallel(
      ['practical', 'skeptical', 'creative'].map((angle) => async () => {
        const attempt = String(
          await ctx.agent(`Answer from a strictly ${angle} point of view: ${args.question}`),
        );
        const scored = await ctx.agent(`Score this answer from 0 to 10.\n\n${attempt}`, {
          schema: verdict, // typed at compile time, validated at runtime
        });
        return { angle, attempt, score: scored.score };
      }),
    );
    return [...judged].sort((a, b) => b.score - a.score)[0];
  },
);

const question = 'Should a five-person startup adopt a monorepo?';

const handle = engine.run(panel, { question }, { runId: 'panel-1', budgetUsd: 2 }); // immutable run ceiling
// Live terminal view on stderr: one row per agent with its status,
// running timer, token counts, and USD, plus spend against the ceiling;
// plain lines in pipes and CI.
progress(handle);

const outcome = await handle.result;
console.log(outcome.status, outcome.value, outcome.cost.totalUsd);
```

Now kill it, redeploy it, edit the workflow, then resume the same `runId`. The journal does
the rest:

```ts
const resumed = engine.resume('panel-1', panel, { args: { question } });
await resumed.result;

const replay = await resumed.preview;
console.log(replay.hits, replay.misses); // 6 hits, 0 misses: zero new spend
```

The full walk-through, with the OpenAI variant and the crash and edit-and-rerun scenarios, is the
[quickstart](https://docs.rulvar.com/guide/quickstart).

## Packages

`@rulvar/rulvar` is the batteries-included umbrella: the core engine, both first-class adapters,
recommended model defaults, and two terminal progress renderers (the live per-agent tree and the
minimal line printer). Fifteen packages ship in total, thirteen in
lockstep at a single version. Full map and dependency graph:
[reference/packages](https://docs.rulvar.com/reference/packages).

<details>
<summary>All fifteen packages</summary>

| Package                     | What it is                                                                     |
| --------------------------- | ------------------------------------------------------------------------------ |
| `@rulvar/rulvar`            | Umbrella: core, both adapters, recommended defaults, progress renderers        |
| `rulvar`                    | Unscoped alias of the umbrella, so the bare name resolves to the real thing    |
| `@rulvar/core`              | The engine: journal kernel, `ctx` primitives, router, tools, stores, events    |
| `@rulvar/anthropic`         | First-class adapter over `@anthropic-ai/sdk`                                   |
| `@rulvar/openai`            | First-class adapter for the OpenAI Responses API, plus `openaiCompatible`      |
| `@rulvar/bridge-ai-sdk`     | Wraps any Vercel AI SDK `LanguageModelV4` as a provider adapter                |
| `@rulvar/store-sqlite`      | SQLite `JournalStore` and `LeasableStore` with a fencing epoch                 |
| `@rulvar/store-conformance` | Executable conformance kit for custom store implementations                    |
| `@rulvar/testing`           | `createTestEngine`, `FakeAdapter`, VCR cassettes, replay-strict runs, matchers |
| `@rulvar/evals`             | Eval cases, rubric and judge graders, matrix sweeps, canary fingerprints       |
| `@rulvar/plan`              | Adaptive orchestration: `planRunner`, the run ledger, the model ladder         |
| `@rulvar/planner`           | Flagship mode: plan agent, `compileScript`, worker sandbox, self-repair loop   |
| `@rulvar/cli`               | The `rulvar` shell: run, resume, inspect, plan, kb, TUI, server, worker, OTel  |
| `@rulvar/compat`            | Frozen `KeyDeriver` profiles for hash versions outside the support window      |
| `eslint-plugin-rulvar`      | Determinism lint rules, with JSON diagnostics for the planner self-repair loop |

</details>

## Documentation

Built from [docs/](docs/README.md) and published at [docs.rulvar.com](https://docs.rulvar.com).

- [Quickstart](https://docs.rulvar.com/guide/quickstart) and
  [architecture](https://docs.rulvar.com/guide/architecture)
- [Example patterns](https://docs.rulvar.com/guide/examples), with runnable sources in
  [examples/](examples/README.md)
- [Tools](https://docs.rulvar.com/guide/tools), [MCP](https://docs.rulvar.com/guide/mcp),
  [stores](https://docs.rulvar.com/guide/stores), [evals](https://docs.rulvar.com/guide/evals),
  [CLI](https://docs.rulvar.com/guide/cli),
  [observability](https://docs.rulvar.com/guide/observability)
- [API reference](https://docs.rulvar.com/api/%40rulvar/core/), generated from the sources
- [Rulvar for LLMs](https://docs.rulvar.com/guide/llms): a one-page orientation for AI
  assistants, plus machine-readable exports at
  [llms.txt](https://docs.rulvar.com/llms.txt)

## OpenAI Build Week: how this project used Codex and GPT-5.6

Rulvar predates Build Week; everything from v1.4.0 through v1.23.0 shipped inside the
submission window (July 13-21, 2026), and the collaboration below is the part of that
work done with Codex.

**Codex was the project's independent QA engineer.** Six times during the week, the
freshly shipped release was handed to Codex (session
`019f65d7-4599-7d93-97dc-9dd4a5dc66f9`). Each round, Codex ran the full offline matrix
plus live end-to-end orchestrations against real GPT-5.6 (Sol orchestrating; Luna,
later Terra, executing), hunted the billing and durability paths for defects, and
wrote a fix specification with reproductions and acceptance criteria. The maintainer
implemented each specification and shipped the next release, which went back to Codex
for re-audit.

The six rounds, verbatim in this repository's history:

| Codex audited | Fix commit                                                                                  | Shipped as |
| ------------- | ------------------------------------------------------------------------------------------- | ---------- |
| v1.17.0       | 943962d (#202): priced siblings, executable toolset names, conservative envelope            | v1.18.0    |
| v1.18.0       | 8cc9a9c (#205): instructed finalize, cache write accounting, corrected prices, ULP envelope | v1.19.0    |
| v1.19.0       | 9367030 (#207): cache subset accounting, byRole phase attribution, envelope domain          | v1.20.0    |
| v1.20.0       | 7ee42a0 (#209): usage-telemetry hardening plus the live terminal progress view              | v1.21.0    |
| v1.21.0       | 77b554f (#211): terminal control-character sanitization, progress option validation         | v1.22.0    |
| v1.22.0       | 1f9c272 (#214): resume ordinal identity, segment-durable telemetry counters, event parity   | v1.23.0    |

Highlights Codex caught: GPT-5.6 Luna billed at Sol prices (about 5x) through prefix
matching; OpenAI cache writes double-billed for a 73.6 percent overreport on a live
cache scenario (the wording survives in the body of commit 9367030); a budget-ceiling
bypass through hostile usage telemetry (negative, fractional, or NaN counts); control-character injection into terminal renderers from untrusted provider output; and
resumes re-minting duplicate journal identities for identical operations (ordinal 0),
corrupting sibling binding on later replays.

**GPT-5.6 runs inside the product as well as behind Codex.** The OpenAI adapter
carries first-class GPT-5.6 Sol, Terra, and Luna support: per-sibling pricing with
long-context tiers, reasoning effort `max` passed to the wire unchanged, and
cache-token semantics pinned by an opt-in live contract test. The demo video's
workflow sends three GPT-5.6 Terra skeptics to attack a release claim under a
GPT-5.6 Sol judge, with an immutable fifty-cent budget.

## Development

Node.js 22.13.0 or newer for the workspace (the pinned pnpm 11 refuses to start below
that; the published packages themselves keep running on 22.12.0+): `pnpm install`, then
`pnpm build`, `pnpm test`, `pnpm lint`. Details in [CONTRIBUTING.md](CONTRIBUTING.md);
contributions are accepted under the DCO (`git commit -s`).

## License

[Apache-2.0](LICENSE). Every published package carries the LICENSE file.
