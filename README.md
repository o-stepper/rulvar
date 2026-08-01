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
**an LLM call the journal recorded as complete is never paid for twice.** No server, no
database, no control plane.

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
minimal line printer). Sixteen packages ship in total, fifteen in
lockstep at a single version. Full map and dependency graph:
[reference/packages](https://docs.rulvar.com/reference/packages).

<details>
<summary>All sixteen packages</summary>

| Package                     | What it is                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@rulvar/rulvar`            | Umbrella: core, both adapters, recommended defaults, progress renderers                                          |
| `rulvar`                    | Unscoped alias of the umbrella, so the bare name resolves to the real thing                                      |
| `@rulvar/core`              | The engine: journal kernel, `ctx` primitives, router, tools, stores, events                                      |
| `@rulvar/anthropic`         | First-class adapter over `@anthropic-ai/sdk`                                                                     |
| `@rulvar/openai`            | First-class adapter for the OpenAI Responses API, plus `openaiCompatible`                                        |
| `@rulvar/bridge-ai-sdk`     | Wraps any Vercel AI SDK `LanguageModelV4` as a provider adapter                                                  |
| `@rulvar/store-sqlite`      | SQLite `JournalStore` and `LeasableStore` with a fencing epoch                                                   |
| `@rulvar/store-postgres`    | PostgreSQL `JournalStore` and `LeasableStore` with a fencing epoch, for multi-process and multi-host deployments |
| `@rulvar/store-conformance` | Executable conformance kit for custom store implementations                                                      |
| `@rulvar/executor`          | Isolated tool executors: subprocess and container `ToolExecutorProvider` adapters, plus their conformance kit    |
| `@rulvar/testing`           | `createTestEngine`, `FakeAdapter`, VCR cassettes, replay-strict runs, matchers                                   |
| `@rulvar/evals`             | Eval cases, rubric and judge graders, matrix sweeps, canary fingerprints                                         |
| `@rulvar/plan`              | Adaptive orchestration: `planRunner`, the run ledger, the model ladder                                           |
| `@rulvar/planner`           | Flagship mode: plan agent, `compileScript`, worker sandbox, self-repair loop                                     |
| `@rulvar/cli`               | The `rulvar` shell: run, resume, inspect, plan, kb, TUI, server, worker, OTel                                    |
| `@rulvar/compat`            | Frozen `KeyDeriver` profiles for hash versions outside the support window                                        |
| `eslint-plugin-rulvar`      | Determinism lint rules, with JSON diagnostics for the planner self-repair loop                                   |

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

Rulvar predates Build Week; everything from v1.4.0 through v1.37.0 shipped inside the
submission window (July 13-21, 2026), the releases since then keep the same cadence,
and the collaboration below is the part of that work done with Codex.

**Codex was the project's independent QA engineer.** Sixty five times, the
freshly shipped release was handed to Codex (session
`019f65d7-4599-7d93-97dc-9dd4a5dc66f9`). Each round, Codex ran the full offline matrix
plus live end-to-end orchestrations against real GPT-5.6 (Sol orchestrating; Luna,
later Terra, executing), hunted the billing and durability paths for defects, and
wrote a fix specification with reproductions and acceptance criteria. The maintainer
implemented each specification and shipped the next release, which went back to Codex
for re-audit.

The one hundred twenty five rounds, verbatim in this repository's history:

| Codex audited | Fix commit                                                                                                                                                                                | Shipped as |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| v1.17.0       | 943962d (#202): priced siblings, executable toolset names, conservative envelope                                                                                                          | v1.18.0    |
| v1.18.0       | 8cc9a9c (#205): instructed finalize, cache write accounting, corrected prices, ULP envelope                                                                                               | v1.19.0    |
| v1.19.0       | 9367030 (#207): cache subset accounting, byRole phase attribution, envelope domain                                                                                                        | v1.20.0    |
| v1.20.0       | 7ee42a0 (#209): usage-telemetry hardening plus the live terminal progress view                                                                                                            | v1.21.0    |
| v1.21.0       | 77b554f (#211): terminal control-character sanitization, progress option validation                                                                                                       | v1.22.0    |
| v1.22.0       | 1f9c272 (#214): resume ordinal identity, segment-durable telemetry counters, event parity                                                                                                 | v1.23.0    |
| v1.23.0       | 2b033e8 (#216): card toolset semantics, resume args binding, RunMeta docs truth, testing barrel                                                                                           | v1.24.0    |
| v1.24.0       | 0bb14db (#219): resume args gate overflow bypass, argsHash secrecy honesty                                                                                                                | v1.24.1    |
| v1.24.1       | 74851ed (#222): CLI diagnostics value withholding and sanitation, worker execArgv isolation                                                                                               | v1.25.0    |
| v1.25.0       | a4fc757 (#226): linear event drain, exact reference checkpoint pruning, scale safe stores                                                                                                 | v1.26.0    |
| v1.26.0       | 884a433 (#231): drained SSE terminal close, per client pending bound, validated caps                                                                                                      | v1.27.0    |
| v1.27.0       | d98eb0b (#235): fail closed truncated streams, terminal stop consumption, abort and CLI guards                                                                                            | v1.28.0    |
| v1.28.0       | 621d566 (#238): interruptible retry backoff, validated retry delays, VCR row and band guards                                                                                              | v1.29.0    |
| v1.29.0       | 87ce985 (#241): ordered VCR occurrences, retry policy validation, strict retry delay grammar                                                                                              | v1.30.0    |
| v1.30.0       | df6b8f8 (#244): replayed provenance stamps, deep cassette validation, OWS retry delay padding                                                                                             | v1.31.0    |
| v1.31.0       | e366d64 (#247): passthrough provenance agreement, caller order occurrences, deep event shapes                                                                                             | v1.32.0    |
| v1.32.0       | 3f0f5e8 (#250): seeded appending record sessions, duplicate occurrence refusal, replay order gate                                                                                         | v1.33.0    |
| v1.33.0       | f1505ec (#253): MCP source close lifecycle, VCR occurrence ceiling, auth retry docs gate                                                                                                  | v1.34.0    |
| v1.34.0       | d4ac3bf (#256): numeric intake validation, abort aware scheduler, sliced deadline timers                                                                                                  | v1.35.0    |
| v1.35.0       | 101795b (#259): abort aware escalation waits, executable fail run policies, option intake gates                                                                                           | v1.36.0    |
| v1.36.0       | e6b1481 (#262): contained transcript refs, validated persisted knowledge snapshots                                                                                                        | v1.37.0    |
| v1.37.0       | 3e2d591 (#265): banned dynamic code generation in the planner sandbox dialect                                                                                                             | v1.38.0    |
| v1.38.0       | 0cff035 (#268): one AST codegen policy across compile and lint, worker taming for dynamic keys                                                                                            | v1.39.0    |
| v1.39.0       | cf33550 (#271): fenced offline resolution appends, surfaced approximate usage accounting                                                                                                  | v1.40.0    |
| v1.40.0       | be589ec (#274): opt in orchestration acceptance policy, strict CLI exits, contract docs sweep                                                                                             | v1.41.0    |
| v1.41.0       | 9b70f27 (#277): opt in child result evidence tools, paged full output and artifact reads                                                                                                  | v1.42.0    |
| v1.42.0       | 71b7181 (#280): deterministic finish validators, bounded repair turns, journaled verdicts                                                                                                 | v1.43.0    |
| v1.43.0       | 299f7d2 (#283): evidence preservation contract, child outputs in validation, fabrication guard                                                                                            | v1.44.0    |
| v1.44.0       | 248a19f (#288): atomic fence check and mutation in the sqlite store, fenced run state RFC                                                                                                 | v1.44.1    |
| v1.44.1       | b96305d (#291): fenced writes capability, lease on every run mutation, run match rule                                                                                                     | v1.45.0    |
| v1.45.0       | 865e7bf (#294): fenced transcript twin in the sqlite store, checkpoint blobs on the run lease                                                                                             | v1.46.0    |
| v1.46.0       | a3687fe (#297): journaled run settle, meta reconciler and stranded run probe, runs audit CLI                                                                                              | v1.47.0    |
| v1.47.0       | 96093ea (#300): multi-process soak in the conformance kit, sqlite concurrent boot retry                                                                                                   | v1.48.0    |
| v1.48.0       | bab7b2c (#303): paired invocation phase events, official telemetry reducer, otel leak fix                                                                                                 | v1.49.0    |
| v1.49.0       | e39a885 (#306): localized determinism warnings, strict error mode, replay verification gate                                                                                               | v1.50.0    |
| v1.50.0       | 11bf944 (#309): benchmark kit with verified repeats, nearest-rank percentiles, blind judging                                                                                              | v1.51.0    |
| v1.51.0       | e138df9 (#312): exploration guards, soft budget notices, repeat denial, no-new-evidence abort                                                                                             | v1.52.0    |
| v1.52.0       | b821bd1 (#315): synthesis role, routable post-fan-in invocation, critical-path reducer                                                                                                    | v1.53.0    |
| v1.53.0       | 3f6bc03 (#318): run:end completion lift, repository research toolset, incremental synthesis + claim dedup                                                                                 | v1.54.0    |
| v1.54.0       | e9b005b (#321): weighted tool limits, progress contract with structured terminal partials, partial-child salvage, profile templates                                                       | v1.55.0    |
| v1.55.0       | f26dba0 (#324): the QuotaLimiter SPI for distributed provider limiting, with in-memory and sqlite reference limiters                                                                      | v1.56.0    |
| v1.56.0       | 5897232 + dc6ef2c (#327, #329): the settled-ok limit replay, the SqliteQuotaLimiter class TSDoc, and the official PostgreSQL store                                                        | v1.57.0    |
| v1.57.0       | 4fa35ce (#331): data protection hooks (envelope encryption, redaction policy, export/import, salted digests, the audit trail)                                                             | v1.58.0    |
| v1.58.0       | 615dc90 (#334): the isolated tool executor reference: the ToolExecutorProvider seam plus subprocess and container adapters and the executable conformance kit                             | v1.59.0    |
| v1.59.0       | c127770 (#337): the external experiment review fixes: finite synthesize cost attribution, engine retry jitter provenance, the isolation docs caught up                                    | v1.59.1    |
| v1.59.1       | dd0e10f (#340): envelope encryption binds journal ciphertext to the full entry identity (runId and every clear field), closing the cross-run transplant gap                               | v1.59.2    |
| v1.59.2       | deaef36 (#343): the isolated-executor idempotency key binds the logical invocation (agent entry seq and call ordinal), so two intended effects never fold to one                          | v1.59.3    |
| v1.59.3       | c49d7a1 (#346): the genesis ownership protocol: every segment holds the run lease over a leasable store, so a worker sweep can no longer adopt a live fresh run                           | v1.59.4    |
| v1.59.4       | 59bbeaa (#349): the finalization reserve: a tool-budget expiry closes the batch tail explicitly and grants the model one bounded summary turn                                             | v1.60.0    |
| v1.60.0       | b4c1f1f (#352): durable provider reconciliation: the per-dispatch ledger with provider response ids, the gross/net cost split, and the invoice export                                     | v1.61.0    |
| v1.61.0       | fca5fd1 (#355): the preflight effective-limits estimator and effective-config linter: the admission projection, the first-bottleneck ordering, and rulvar preflight                       | v1.62.0    |
| v1.62.0       | 8a28aed (#358): the durable settlement acknowledgement and the fencing epoch tombstone: SettlementError, the meta-write skip, and delete/recreate monotonicity                            | v1.63.0    |
| v1.63.0       | 991f9b5 (#361): the preflight and live admission reserve unification: the two shared exported formulas, the two-gate orchestrate mirror, and the corrected findings                       | v1.64.0    |
| v1.64.0       | 0b6b859 (#364): terminal-output salvage: a limit child's validated finalization reserve output surfaces in the digest and salvages acceptance, opt-in                                     | v1.65.0    |
| v1.65.0       | 1b8987e (#367): the RunOutcome completion mirror: one lift computed once and spread onto both handle.result and run:end, on every path                                                    | v1.66.0    |
| v1.66.0       | 8e6006d (#370): the honest invoice: provider-id-present verdict, declared per-call pricing basis and non-additivity, additive allocatedUsd                                                | v1.67.0    |
| v1.67.0       | b227874 (#373): the machine-readable synthesis-skip reason: the causing journaled decision freezes it, typed error data and an info log carry it                                          | v1.68.0    |
| v1.68.0       | b21a681 (#376): the tool-cap-before-checkpoint preflight warning: the parallel-batch loss window named with the exact executed-call ceiling                                               | v1.69.0    |
| v1.69.0       | 29141ed (#379): the engine-level kill-point suite: SIGKILL around each durable write, resumed with the documented re-pay pinned per bracket                                               | v1.70.0    |
| v1.70.1       | 20d02e0 (#384): the quota planner run-ceiling projection: per-spawn turn ceilings, context-regrowth demand, and the beyond-wave quota findings                                            | v1.71.0    |
| v1.71.0       | 662e9e0 (#387): the unified output contract: one manifest generating validators and prompt, the construction golden self test, and the frozen bundle descriptor                           | v1.72.0    |
| v1.72.0       | 3e95bd1 (#390): the synthesis repair envelope: the bounded repairTurnReserve, the acceptance snapshot on synthesis failures, and the preflight synthesis projection                       | v1.73.0    |
| v1.73.0       | d94beab (#393): quota drift telemetry: normalized x-ratelimit capture in both wires, journaled quota_drift verdicts against declaredRules, the usageUnknown marker                        | v1.74.0    |
| v1.74.0       | c486de8 (#396): the provider output floor and the finish second chance: caps-declared minimum output, near-JSON recovery; 82bc0f0 (#398) took it terminal as v1.75.1                      | v1.75.0    |
| v1.75.1       | 22cba47 (#401): synthesis evidence symmetry and the draft gate: opt-in read tools and full context for synthesis, draftPolicy, the asymmetry preflight finding                            | v1.76.0    |
| v1.76.0       | 6aba271 (#404): contract turn feasibility findings, the generation-scoped fix-and-resume remedy, error-outcome parity with the schema-dead exchange counter                               | v1.77.0    |
| v1.77.0       | 941b6e1 (#407): the deep-frozen contract bundle, per-validator reject goldens, line-anchored headings, and fence-aware slicing                                                            | v1.78.0    |
| v1.78.0       | 85956ab (#410): terminal admission at the exhausted tool budget, the synthesis-terminal-tool-headroom and draft-gate-below-contract findings, the degradation mirror                      | v1.79.0    |
| v1.79.0       | 262e397 (#413): the synthesis budget reserve with the synthesis-reserve-unfunded finding, and the admission projection strict at exact fill for orchestrate children                      | v1.80.0    |
| v1.80.0       | ce4c392 (#416): the maxSpawns slot ledger of admitted children, the headingStructureValidator stock validator, and the durable schemaRecoveredFinishExchanges counter                     | v1.81.0    |
| v1.81.0       | c030982 (#419): the true outcome in the isolated-executor ledger (a protocol failure ledgers error, conformance e12), CRLF close fences, the package docs catch-up                        | v1.81.1    |
| v1.81.1       | 296885b (#422): the worker stop sweep race, the lost mid-fetch listChanged invalidation, and the empty-cursor pagination spin (the bus and worker review)                                 | v1.81.2    |
| v1.81.2       | 9cc5d66 (#425): the lease conformance expiry split (the CI flake root-caused), slot-independent worker retention, the single-flight MCP list                                              | v1.82.0    |
| v1.82.0       | ca9cf6c (#428): fail-closed eval measurements: nonOk sweep suppression, checkpoint arm contamination, the monotone benchmark refusal (the evals review)                                   | v1.83.0    |
| v1.83.0       | bc9105f (#431): first-class doctrine for the AI SDK bridge: honest error-finish billing, the unparsed second chance, retention fidelity, teardown                                         | v1.84.0    |
| v1.84.0       | 6932a9f (#434): the six-item sweep: typed-throw classification, sandbox ambient clocks, the server rejection zombie, the work budget and mutation gates                                   | v1.85.0    |
| v1.85.0       | 2f71894 (#437): the adaptive tool budget: headroom-funded tool-call grants at the cap, the pressure snapshot, extension-aware preflight projections                                       | v1.86.0    |
| v1.86.0       | c4c02b1 (#440): the finalization window with typed refusals over a reserved bookkeeping tail, the bare cap linter, the synthesis reserve lifecycle                                        | v1.87.0    |
| v1.87.0       | 3b339d9 (#443): the declared evidence floor against the tool cap, the exact-fill parity proof, the direct container protocol-ledger conformance                                           | v1.88.0    |
| v1.88.0       | f18b671 (#446): provider-id provenance parity across the bridge, the core, and the failed OpenAI response; the reserve lifecycle journaled on the rejection path                          | v1.89.0    |
| v1.89.0       | 9603940 (#449): incarnation-scoped exec idempotency keys via the versioned RunMeta derivation stamp                                                                                       | v1.90.0    |
| v1.90.0       | f93f5ca (#452): the two-phase intent ledger closing the post-effect crash window of external executor effects                                                                             | v1.91.0    |
| v1.91.0       | 351d1f5 (#455): the applied-pricing pin for historically stable invoices; honest executor ledger outcomes on pre-spawn failures                                                           | v1.92.0    |
| v1.92.0       | c62150a (#458): the mid-batch checkpoint boundary bounding the tool-cap-before-checkpoint re-payment window                                                                               | v1.93.0    |
| v1.93.0       | 426e57d (#461): the finite-by-default SSE replay buffer with the exported per-run bound and the explicit migration escape                                                                 | v1.94.0    |
| v1.94.0       | 2bda821 (#464): PostgresQuotaLimiter, the multi-host quota reference with admission serialized on a schema-wide advisory lock                                                             | v1.95.0    |
| v1.95.0       | 89fd032 (#467): attempt-exact effect-ledger identity, torn-tail repair with fail-closed corruption, audited workdir cleanup                                                               | v1.96.0    |
| v1.96.0       | 5c3b453 (#470): the per-request cost fold, per-segment pricing pins, and honest invoice additivity labels                                                                                 | v1.97.0    |
| v1.97.0       | 6c7fbd8 (#473): the whole-path quota admission deadline and the recorded rules fingerprint refusing drifted hosts                                                                         | v1.98.0    |
| v1.98.0       | 9e00888 (#476): binding evidence and acceptance floors, the refused empty citation pool, and the spawned-roster minimum                                                                   | v1.99.0    |
| v1.99.0       | ef08d73 (#479): the executor guarantee matrix and the claim sentinel holding docs and source comments to at-least-once wording                                                            | v1.99.1    |
| v1.99.1       | 9785bea (#483): durable tool-budget decisions restoring journaled extension grants and the window entry across crash, resume, and replay                                                  | v1.100.0   |
| v1.100.0      | 51b215c (#486): the conditional synthesis gate retiring the composing span when the draft already passes the declared finish contract                                                     | v1.101.0   |
| v1.101.0      | 3eb6515 (#489): durable tool-budget authorization landing before the granted call, the journaled cap anchoring a resumed ceiling, and the synthesis skip bound to its contract generation | v1.102.0   |
| v1.102.0      | f2b809e (#492): the symmetric per-model billing coverage key and the per-slice invoice residual refusing cross-model transfer                                                             | v1.103.0   |
| v1.103.0      | 3edecd8 (#495): cross-process ledger repair exclusion with the public writer contract, and the fail-closed scan validation                                                                | v1.104.0   |
| v1.104.0      | 531dc88 (#498): immutable quota rule snapshots, the canonical denial order, and rotation generations fencing stale hosts                                                                  | v1.105.0   |
| v1.105.0      | 9a4ce49 (#502): recovered child attempts alias by admission identity, so restored coordinator handles reach the reborn attempt                                                            | v1.106.0   |
| v1.106.0      | 9f5f6f6 (#505): fail-closed evidence intake, non-finite accounting refused, the normalized-prose claim sentinel and the honest guarantee matrix                                           | v1.107.0   |
| v1.107.0      | affa3d4 (#508): the stored consumers’ pin composition made exactly the engine’s, per-segment pricing provenance                                                                           | v1.108.0   |
| v1.108.0      | 85b1d39 (#511): the journal tail an accepted entry sat on can no longer be repaired away, and the exported live cost builder refuses non-finite reports                                   | v1.109.0   |
| v1.109.0      | 58afdb5 (#514): live and replayed telemetry dollars folded per provider request like the settled invoice, every money event naming its cost basis                                         | v1.110.0   |
| v1.110.0      | fd25169 (#517): a covered model's invoice rows are exactly its recorded calls, no phantom remainder double-counting tokens or siphoning allocation                                        | v1.111.0   |
| v1.111.0      | 00ae55b (#520): duplicate quota rules refused at construction in every reference limiter, one configuration can no longer admit differently per storage                                   | v1.112.0   |
| v1.112.0      | a60807a (#523): the composed pricing provenance names the current table that priced the tail, and the effect-ledger quarantine keeps the exact torn bytes                                 | v1.113.0   |
| v1.113.0      | 5759731 (#526): the fixed-window quota boundary pinned as a named compromise, and the final model can opt into a digest of the run's own observed policy facts                            | v1.114.0   |
| v1.114.0      | 63642ae (#530): the post-fan-in window decomposes by named phase in reduceCriticalPath, and an opt-in cap bounds concurrent dispatch exposure with a typed refusal                        | v1.115.0   |
| v1.115.0      | a213878 (#533): run:end, the kernel ledger, and the resume budget seed settle on the per-call billing fold, so no public money surface re-tiers a phase aggregate                         | v1.116.0   |
| v1.116.0      | c15b83a (#536): tool executions become real OTel child spans under a synthetic pair key, and the agent span survives to agent:end with its usage, cost, and exploration                   | v1.117.0   |
| v1.117.0      | f8341a3 (#539): provider statement reconciliation by machine: response-id coverage, per-component deltas, and implied rates naming the divergent rate-card line                           | v1.118.0   |
| v1.118.0      | 1e4ff3c (#542): the preflight run ceiling refuses NaN typed like the runtime, and a malformed checkpoint decodes to undefined instead of a TypeError mid-resume                           | v1.119.0   |
| v1.119.0      | d630c9e (#545): a refused fan-out returns the started handles typed, and the acceptance decision carries a per-child roster with evidence verdicts and waived-by-salvage                  | v1.120.0   |
| v1.120.0      | 3d67d41 (#548): pricing rows carry their verification date through preflight, pins, and the invoice, the documented rates audited weekly, README release SHAs gated reachable             | v1.121.0   |
| v1.121.0      | 8cf45c5 (#551): the coordination draft can be gated by the full contract and a failed skip pre-pass rides the synthesis prompt as named gaps instead of silence                           | v1.122.0   |
| v1.122.0      | 5c46468 (#554): a rejected finish repairs only its violated sections through a host splice, and synthesis reads a deterministic per-child evidence index instead of the whole pool        | v1.123.0   |
| v1.123.0      | 37fd1f2 (#557): the extension covers the declared evidence deficit before the cap, cache writes price by TTL, and a fault kit drives the never-observed fail-closed branches              | v1.124.0   |
| v1.124.0      | 109e9fa (#560): the Anthropic 1h write premium seeded at 2x input, the rates audit failing closed on page-only rates, and Terra/Luna carrying the provider's documented cut               | v1.125.0   |
| v1.125.0      | e5e9526 (#563): statement numbers that cannot be evidence refused typed at intake, and provider-reported token disagreements deciding the reconciliation verdict                          | v1.126.0   |
| v1.126.0      | b3b1805 (#566): the pre-dispatch token count admitted behind a zero-egress feasibility floor, honoring the abort signal, every count visible as a named log event                         | v1.127.0   |
| v1.127.0      | 27c4e38 (#569): pause_turn continuations accounted as wire units: the segment set on record and invoice, the quota window at the true count, the whole-set statement join                 | v1.128.0   |
| v1.128.0      | 1612439 (#573): the forced finish settles the completion envelope, partial unless the declared contract passed, validators binding the finalizer, run:end marking failed settlements      | v1.129.0   |
| v1.129.0      | d6bec7a (#576): every tool event names its model-minted call id, and the OTel exporter pairs tool spans exactly by id with the historical FIFO kept for old streams                       | v1.130.0   |
| v1.130.0      | 256cae1 (#580): the thirteenth plan closes: the fault kit gates every fixed defect fail closed, the rates comparator published to core, the three moneys named with their surfaces        | v1.131.0   |
| v1.131.0      | 2bec904 (#584): the fourteenth plan opens: the live budget prices the TTL split exactly like settlement, a between-readings ceiling severs the run, the kit gates parity live             | v1.132.0   |
| v1.132.0      | 2659f54 (#587): pause_turn survives end to end: the finish speaks for the whole logical turn, an invalid continuation cap refuses before the first wire, the kit drives the real adapter  | v1.133.0   |
| v1.133.0      | cb50ea0 (#590): a contradictory statement refuses at intake, totals decide beside components, settleable states the settlement composite, the kit seeds a real unknown-usage row          | v1.134.0   |
| v1.134.0      | cf75e22 (#593): the rates comparator names page-only tiers and NaN instead of passing them, and the checkpoint decoder answers undefined on a top-level null instead of throwing          | v1.135.0   |
| v1.135.0      | aa6ca71 (#596): a superseded segment refuses green everywhere: typed SupersededError, the distinct settledReason on the terminal event, and one authoritative successor settle            | v1.136.0   |
| v1.136.0      | 96f6788 (#599): importRun fails closed with rollback so a retry never bricks, opts.profiles becomes an enforced allowlist at dispatch, and a secret-shaped runId refuses at intake        | v1.137.0   |
| v1.137.0      | ed0c4fb (#602): opt-in pre-wire reservation admits each pause_turn continuation before egress, the fault kit refuses empty selections and reports its own counts, run-id surface exported | v1.138.0   |
| v1.138.0      | 03a2141 (#605): the live budget debits each provider call marginally against its accumulated price, so tier crossings read live == settled, with the marginal ladder pinned by the kit    | v1.139.0   |
| v1.139.0      | 3044838 (#608): release lands in both store limiters, a cancelled admission returns whole to the shared window from any process or host, legacy reservation rows migrate in place         | v1.140.0   |
| v1.140.0      | 4f12a62 (#611): one terminal envelope carries every run fact, assembled once at settlement and mirrored verbatim by the outcome, run:end, the HTTP status body, and the OTel span         | v1.141.0   |
| v1.141.0      | 473981a (#614): the conformance table drives every terminal path across the outcome, run:end, HTTP, and OTel surfaces; toOtel completes its export over rejecting terminals               | v1.142.0   |
| v1.142.0      | f412169 (#617): an unattended tool approval denies at its journaled opt-in deadline through the arbiter, and the docs draw the deployment boundary line                                   | v1.143.0   |
| v1.143.0      | c11bcd6 (#620): the detached resolver validates by the journaled suspension flavor; both deadline knobs gain the range ceiling and the typed corruption refusal                           | v1.144.0   |

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
paid dispatch unvalidated, and empty rate limit headers turning into instant retries; and a provenance audit that found VCR replay dropping the usage semantics stamp from replayed journals (an honest replayed total could be flagged and miscorrected as a legacy record by the cache write audit), cassette reading trusting nested structures it never validated, and retry delay parsing padded by whitespace no HTTP field value carries; and a replay fidelity audit that caught passthrough replay journaling live responses under stale recorded provenance declarations (dropped entirely for live only adapters), concurrent identical calls receiving each other's recorded responses on replay because rows persist in completion order while replay serves caller order, and three constrained nested event fields the documented deep validation never checked; and an appending session audit that caught a second record() session on an existing cassette restarting the occurrence numbering at zero, so replay silently served the appended exchange before earlier ones, duplicate occurrence numbers accepted without complaint, and two guides stating two different replay orders for one public function; and a lifecycle audit that caught the stdio MCP child outliving its finished workflow (a one shot host settled ok and then never exited, with no public API to release the child), the recorder's own numbering able to reach the float ceiling and corrupt a valid cassette after paying the provider, and the troubleshooting guide promising a retry backoff the engine never performs on authentication failures; and a boundary audit that caught a NaN concurrency cap parking a run in the scheduler queue beyond the reach of cancel(), a negative cost hint shrinking the committed reserve total so a sibling passed a budget ceiling it did not fit, run deadlines and suspensions beyond the 24.8 day Node timer maximum firing immediately instead of waiting, and a malformed deadline string cancelling the run only after the first paid provider call; and a cancellation audit that caught a parked flavor B escalation ignoring every cancellation channel until its own deadline (cancel, host abort, run deadline, and failed sibling aborts all hung for days under a far valid deadline), both declared fail run policies journaling their label and then finishing with the partial anyway, and a sweep of the remaining public numeric options where a NaN spawn cap admitted every spawn, a negative finalize reserve widened the budget boundary, a zero lease ttl let a second worker seize a held lease immediately, and an infinite repair round count turned the planner limiter into an unbounded paid loop; and a security audit that caught the file transcript store letting a parent directory ref escape its configured root on read, write, delete, and listing (reachable end to end because a compiled run persists its source under a caller chosen run id before the journal name guard runs), and the model knowledge store trusting a persisted snapshot whose forged version and hash never matched its claims, so a null claim crashed the card render as an untyped error instead of a typed refusal; and a sandbox hardening audit that caught the planner dialect banning static imports while leaving dynamic code generation open, so a machine script could reach the Function constructor through any function value, compile a dynamic import the literal token scan never saw, and recover the import allowlist and, through `node:child_process`, arbitrary host command execution at run status ok (now rejected at compile as `no-eval`, `no-function-constructor`, and `no-constructor-access`, carried into the workflows lint preset, and unbound in the worker as defense in depth); and a codegen parity audit that caught that fresh `.constructor` ban matching only the dotted form, so a bracket or folding computed key (`fn["constructor"]`, `fn["con"+"structor"]`) still cleared compile while the lint flagged some of them, and a key assembled only at runtime cleared both gates and reached the Function constructor every function value still exposes (now one shared AST policy decides `.constructor`, `["constructor"]`, folding computed keys, `{ constructor: x }` destructuring, and `Reflect.get` identically across compile and lint, and the worker replaces the constructor slot on all four Function family prototypes with a thrower, so an accepted script cannot reconstruct the constructor at run time); and a durability and telemetry audit that caught the server's offline resolution path acquiring a store lease and then appending without it, so a process stalled past its lease ttl could write a resolution alongside the owner that had taken the run over (the append now carries the lease and a superseded owner is refused as `lease_held` with nothing written), and the journaled approximate usage flag never reaching the report boundary, so a total that included usage estimated after a transport cut, a severed stream, or an abort read as an exact provider charge (now raised on `agent:end`, `run:end`, and the `CostReport`, and marked on the CLI cost line); and a completion contract audit that caught run status `ok` proving only that the model called `finish`, so an orchestrated run whose children ALL failed still read as a success with nothing in the outcome reporting it (an opt in acceptance policy now journals a per finish verdict over the folded child statuses, returns the counts and degraded reasons in an acceptance envelope, fails a violated policy as the typed `fail_run` error, and `rulvar run --strict` refuses a partial from the command line). Then a fan-in evidence audit that caught the orchestrator seeing only a 400 character digest of each child while the child's full report sat durable in the journal, unreachable (an opt in pair of pure read tools, `get_child_result` and `read_child_artifact`, now pages the full output and artifact contents in place, clamped so one read cannot flood the orchestrator context, off by default so the frozen toolset is unchanged).

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
