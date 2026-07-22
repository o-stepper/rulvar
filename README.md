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

[rulvar.com](https://rulvar.com) · [Documentation](https://docs.rulvar.com) · [Quickstart](https://docs.rulvar.com/guide/quickstart) · [Landing source](https://github.com/o-stepper/rulvar-landing)

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

Rulvar predates Build Week; everything from v1.4.0 through v1.39.0 shipped inside the
submission window (July 13-21, 2026), and the collaboration below is the part of that
work done with Codex.

**Codex was the project's independent QA engineer.** Twenty three times during the week, the
freshly shipped release was handed to Codex (session
`019f65d7-4599-7d93-97dc-9dd4a5dc66f9`). Each round, Codex ran the full offline matrix
plus live end-to-end orchestrations against real GPT-5.6 (Sol orchestrating; Luna,
later Terra, executing), hunted the billing and durability paths for defects, and
wrote a fix specification with reproductions and acceptance criteria. The maintainer
implemented each specification and shipped the next release, which went back to Codex
for re-audit.

The twenty three rounds, verbatim in this repository's history:

| Codex audited | Fix commit                                                                                        | Shipped as |
| ------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| v1.17.0       | 943962d (#202): priced siblings, executable toolset names, conservative envelope                  | v1.18.0    |
| v1.18.0       | 8cc9a9c (#205): instructed finalize, cache write accounting, corrected prices, ULP envelope       | v1.19.0    |
| v1.19.0       | 9367030 (#207): cache subset accounting, byRole phase attribution, envelope domain                | v1.20.0    |
| v1.20.0       | 7ee42a0 (#209): usage-telemetry hardening plus the live terminal progress view                    | v1.21.0    |
| v1.21.0       | 77b554f (#211): terminal control-character sanitization, progress option validation               | v1.22.0    |
| v1.22.0       | 1f9c272 (#214): resume ordinal identity, segment-durable telemetry counters, event parity         | v1.23.0    |
| v1.23.0       | 2b033e8 (#216): card toolset semantics, resume args binding, RunMeta docs truth, testing barrel   | v1.24.0    |
| v1.24.0       | 0bb14db (#219): resume args gate overflow bypass, argsHash secrecy honesty                        | v1.24.1    |
| v1.24.1       | 74851ed (#222): CLI diagnostics value withholding and sanitation, worker execArgv isolation       | v1.25.0    |
| v1.25.0       | a4fc757 (#226): linear event drain, exact reference checkpoint pruning, scale safe stores         | v1.26.0    |
| v1.26.0       | 884a433 (#231): drained SSE terminal close, per client pending bound, validated caps              | v1.27.0    |
| v1.27.0       | d98eb0b (#235): fail closed truncated streams, terminal stop consumption, abort and CLI guards    | v1.28.0    |
| v1.28.0       | 621d566 (#238): interruptible retry backoff, validated retry delays, VCR row and band guards      | v1.29.0    |
| v1.29.0       | 87ce985 (#241): ordered VCR occurrences, retry policy validation, strict retry delay grammar      | v1.30.0    |
| v1.30.0       | df6b8f8 (#244): replayed provenance stamps, deep cassette validation, OWS retry delay padding     | v1.31.0    |
| v1.31.0       | e366d64 (#247): passthrough provenance agreement, caller order occurrences, deep event shapes     | v1.32.0    |
| v1.32.0       | 3f0f5e8 (#250): seeded appending record sessions, duplicate occurrence refusal, replay order gate | v1.33.0    |
| v1.33.0       | f1505ec (#253): MCP source close lifecycle, VCR occurrence ceiling, auth retry docs gate          | v1.34.0    |
| v1.34.0       | d4ac3bf (#256): numeric intake validation, abort aware scheduler, sliced deadline timers          | v1.35.0    |
| v1.35.0       | 101795b (#259): abort aware escalation waits, executable fail run policies, option intake gates   | v1.36.0    |
| v1.36.0       | e6b1481 (#262): contained transcript refs, validated persisted knowledge snapshots                | v1.37.0    |
| v1.37.0       | 3e2d591 (#265): banned dynamic code generation in the planner sandbox dialect                     | v1.38.0    |
| v1.38.0       | 0cff035 (#268): one AST codegen policy across compile and lint, worker taming for dynamic keys    | v1.39.0    |

Highlights Codex caught: GPT-5.6 Luna billed at Sol prices (about 5x) through prefix
matching; OpenAI cache writes double-billed for a 73.6 percent overreport on a live
cache scenario (the wording survives in the body of commit 9367030); a budget-ceiling
bypass through hostile usage telemetry (negative, fractional, or NaN counts); control-character injection into terminal renderers from untrusted provider output; resumes
re-minting duplicate journal identities for identical operations (ordinal 0), corrupting
sibling binding on later replays; a resume args gate a JSON numeric overflow could
slip past, silently re-paying every args-dependent call; a sandbox worker
inheriting launch flags from its host process, so a correct compiled workflow died at
worker boot whenever the embedding host ran as ESM from stdin or `--eval`; a scale
audit that found the run event stream buffering quadratically on a late reader,
checkpoint pruning stranding blobs whenever one checkpoint ref was a prefix of another,
and every point lookup scanning the whole run catalog; a deep SSE audit that
caught the HTTP shell closing a connected event stream before the delivery pump had
drained the terminal tail, and every connection growing an unbounded queue the moment
its consumer stopped reading; a fault matrix that proved a provider stream cut
mid generation settled as a successful result with the truncated text journaled as
durable run truth, across the core and all three first party wire paths at once; a
retry path audit that found backoff sleeps ignoring cancellation, deadlines, and budget
ceilings (one more paid provider call was possible after an abort), provider retry
delays flowing unvalidated into timers as NaN or overflow, and a reversed eval
threshold able to commit a failing cell as recorded model strength; and a deep replay
audit that caught the VCR cassette layer collapsing repeated identical requests into
their last recorded exchange (a recorded retry replayed as an instant success, hiding
the error branch from cassette based regression suites), retry policies reaching a
paid dispatch unvalidated, and empty rate limit headers turning into instant retries; and a provenance audit that found VCR replay dropping the usage semantics stamp from replayed journals (an honest replayed total could be flagged and miscorrected as a legacy record by the cache write audit), cassette reading trusting nested structures it never validated, and retry delay parsing padded by whitespace no HTTP field value carries; and a replay fidelity audit that caught passthrough replay journaling live responses under stale recorded provenance declarations (dropped entirely for live only adapters), concurrent identical calls receiving each other's recorded responses on replay because rows persist in completion order while replay serves caller order, and three constrained nested event fields the documented deep validation never checked; and an appending session audit that caught a second record() session on an existing cassette restarting the occurrence numbering at zero, so replay silently served the appended exchange before earlier ones, duplicate occurrence numbers accepted without complaint, and two guides stating two different replay orders for one public function; and a lifecycle audit that caught the stdio MCP child outliving its finished workflow (a one shot host settled ok and then never exited, with no public API to release the child), the recorder's own numbering able to reach the float ceiling and corrupt a valid cassette after paying the provider, and the troubleshooting guide promising a retry backoff the engine never performs on authentication failures; and a boundary audit that caught a NaN concurrency cap parking a run in the scheduler queue beyond the reach of cancel(), a negative cost hint shrinking the committed reserve total so a sibling passed a budget ceiling it did not fit, run deadlines and suspensions beyond the 24.8 day Node timer maximum firing immediately instead of waiting, and a malformed deadline string cancelling the run only after the first paid provider call; and a cancellation audit that caught a parked flavor B escalation ignoring every cancellation channel until its own deadline (cancel, host abort, run deadline, and failed sibling aborts all hung for days under a far valid deadline), both declared fail run policies journaling their label and then finishing with the partial anyway, and a sweep of the remaining public numeric options where a NaN spawn cap admitted every spawn, a negative finalize reserve widened the budget boundary, a zero lease ttl let a second worker seize a held lease immediately, and an infinite repair round count turned the planner limiter into an unbounded paid loop; and a security audit that caught the file transcript store letting a parent directory ref escape its configured root on read, write, delete, and listing (reachable end to end because a compiled run persists its source under a caller chosen run id before the journal name guard runs), and the model knowledge store trusting a persisted snapshot whose forged version and hash never matched its claims, so a null claim crashed the card render as an untyped error instead of a typed refusal; and a sandbox hardening audit that caught the planner dialect banning static imports while leaving dynamic code generation open, so a machine script could reach the Function constructor through any function value, compile a dynamic import the literal token scan never saw, and recover the import allowlist and, through `node:child_process`, arbitrary host command execution at run status ok (now rejected at compile as `no-eval`, `no-function-constructor`, and `no-constructor-access`, carried into the workflows lint preset, and unbound in the worker as defense in depth); and a codegen parity audit that caught that fresh `.constructor` ban matching only the dotted form, so a bracket or folding computed key (`fn["constructor"]`, `fn["con"+"structor"]`) still cleared compile while the lint flagged some of them, and a key assembled only at runtime cleared both gates and reached the Function constructor every function value still exposes (now one shared AST policy decides `.constructor`, `["constructor"]`, folding computed keys, `{ constructor: x }` destructuring, and `Reflect.get` identically across compile and lint, and the worker replaces the constructor slot on all four Function family prototypes with a thrower, so an accepted script cannot reconstruct the constructor at run time).

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
