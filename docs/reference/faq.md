---
title: FAQ
description: Honest answers to the questions rulvar users actually ask, covering comparisons with graph frameworks and workflow engines, storage, budgets, local models, replay, the security posture, runtime support, and licensing.
---

# FAQ

## What is rulvar in one sentence?

rulvar is an embeddable TypeScript library for durable, budget-bounded, testable multi-agent LLM workflows: it lives inside your application, needs no server and no database, and guarantees that a completed LLM call is never paid for twice.

## How is rulvar different from LangGraph?

LangGraph, in common-knowledge terms, builds agent applications as explicit graphs: you declare nodes and edges, and a checkpointer persists state so runs can pause and resume. rulvar makes a different set of bets, and it is worth knowing them before you choose:

- **No graph core.** A rulvar workflow is an ordinary async TypeScript function over an injected `ctx`; there is no node/edge DSL and no YAML, deliberately. See [Workflows](/guide/workflows).
- **Durability at the LLM-call level.** The [journal](/guide/journal) is a content-addressed memo of completed calls. Resume replays every paid call byte-identically at zero cost, and there is no workflow versioning API: edit the code and resume, unchanged calls replay by content, and inserting one new call costs exactly one live call.
- **Budget as an invariant.** A run carries an immutable dollar ceiling enforced in [three layers](/guide/budgets), not a callback you remember to wire.
- **A closed topology.** Exactly three [orchestration modes](/guide/orchestration-modes), all call-and-return.

If you want maximal topological freedom and a large ecosystem of prebuilt integrations, a graph framework may serve you better. rulvar trades that freedom for deterministic replay, exact cost attribution, and [testability](/guide/testing).

## How is rulvar different from Temporal and other workflow engines?

Durable-execution platforms such as Temporal run a server (or hosted cluster) that persists an event-sourced history per workflow, with worker processes re-executing code against it. They are excellent at general-purpose reliability at fleet scale. rulvar solves a narrower problem with a smaller footprint:

- **Library, not platform.** No server, no control plane, no mandatory database: the engine runs in your process, and the durable option for the journal is plain JSONL files, no daemon. Optional [CLI, server, and queue-worker shells](/guide/cli) exist, built strictly on the public API.
- **Memoization, not event sourcing.** A journal entry is identified by its structural scope path, a content key over the call itself, and an ordinal. Matching is scoped and forward, so editing a workflow between resumes never invalidates the paid prefix. See [Durability and resume](/guide/durability).
- **The durability unit is the paid LLM call.** Budget accounting, usage, and replay all hang off the same entries, so "never pay twice" and "never exceed the ceiling" are one mechanism, not two systems to reconcile.

If your problem is fleet-scale durable execution across many services, a workflow engine is the right tool. If your problem is long, expensive, crash-prone LLM work inside an application you already own, rulvar is built for exactly that, and the two are not mutually exclusive.

## Do I need a database?

No. The engine defaults to `InMemoryStore` (resume disabled, with a loud warning), and one line swaps in the JSONL file store for real durability with no daemon:

```ts
import { createEngine, JsonlFileStore, FileTranscriptStore } from '@rulvar/core';
import { anthropic } from '@rulvar/anthropic';

const engine = createEngine({
  adapters: [anthropic()],
  stores: {
    journal: new JsonlFileStore({ dir: './runs' }),
    transcripts: new FileTranscriptStore({ dir: './runs/blobs' }),
  },
});
```

SQLite is optional: `@rulvar/store-sqlite` implements the same five-method contract plus leases with fencing epochs for multi-process queue mode. See [Stores](/guide/stores).

## What happens when the budget runs out?

The run ends with honest partial results, never a bare `null` and never a hang. The ceiling you pass as `budgetUsd` is immutable after start: no API, including human-in-the-loop decisions, can top it up. Enforcement is three-layered: admission blocks new spawns, a guard checks before every agent turn, and on a ceiling crossing live streams are cut with their partial usage journaled as approximate. Overshoot is bounded by at most one turn per in-flight agent, because providers bill severed streams; no tighter bound is possible.

```ts
const handle = engine.run(reviewAll, { prs }, { budgetUsd: 5 });
const outcome = await handle.result;

if (outcome.status === 'exhausted') {
  outcome.cost.totalUsd;   // what was actually spent (byModel, byPhase, byRole break it down)
  outcome.dropped;         // the calls the ceiling cost you, with full errors
  outcome.value;           // undefined: the workflow body did not finish
}
```

See [Budgets and termination](/guide/budgets) for the full mechanism.

## Can I use local models?

Yes. Anything that speaks the OpenAI-compatible dialect (Ollama, vLLM, LM Studio, gateways) registers through the `openaiCompatible` factory with an explicit adapter id:

```ts
import { openaiCompatible } from '@rulvar/openai';

const ollama = openaiCompatible({
  id: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});
```

Models on that adapter are addressed as `'ollama:qwen3:8b'` and route like any other. For providers with their own SDKs, `bridgeAiSdk` in `@rulvar/bridge-ai-sdk` wraps a Vercel AI SDK `LanguageModelV4` as an adapter (other spec versions are rejected with a typed error). Local models usually have no price table entry; their usage is reported in `CostReport.unpriced` rather than counted as a silent zero. See [Providers](/guide/providers).

## Why are handoffs rejected?

Because they destroy the two properties everything else stands on. The single cross-agent primitive is agent-as-tool: invoke a specialist, get its result back. Handoffs that transfer control, chat rooms, and blackboard coordination make budget attribution ambiguous (whose sub-account pays the next turn?) and break scope identity (a call's structural position in the run, which is how the journal knows what to replay). This is a design principle, not a missing feature; there is no flag to turn it on.

The collaboration patterns people reach for handoffs to get, adversarial panels, judge panels, critic loops, ship as ordinary call-and-return [recipes](/guide/examples). See [Invariants](/guide/invariants) and [Orchestration modes](/guide/orchestration-modes).

## Can two processes share a run?

Not concurrently: a run has one writer at a time, and the lease mechanism enforces it. A store with the lease capability hands out a lease with a fencing epoch; every journal append of a resume carries it, and a stale worker's appends are rejected and never become visible, so split-brain is excluded by construction:

```ts
import { createEngine } from '@rulvar/core';
import { SqliteStore } from '@rulvar/store-sqlite';
import { anthropic } from '@rulvar/anthropic';

// The leasable store must be the engine's journal store: the engine
// carries the lease on every journal append, and that is what fences.
const store = new SqliteStore({ path: './runs.db' });
const engine = createEngine({ adapters: [anthropic()], stores: { journal: store } });

const lease = await store.acquire(runId, 'worker-7');
const handle = engine.resume(runId, reviewAll, { args: { prs }, lease });
```

Sequential handover is the normal case: any process (on any machine) that can reach the store can resume a run the previous process abandoned. The queue worker in `@rulvar/cli` wraps this acquire-resume-renew loop for you. See [Stores](/guide/stores) and [Durability and resume](/guide/durability).

## What does replay cost?

Zero live calls. Replaying a completed run's journal contacts no provider; that property is CI-enforced over the entire cassette catalog, and `replayRun` in `@rulvar/testing` lets you assert it for your own journals. Resuming a partial run pays only for genuinely unfinished work, and you can preview exactly what would go live before spending anything:

```ts
const handle = engine.resume(runId, reviewAll, { args: { prs }, dryRun: true });
const preview = await handle.preview; // hit/miss/orphan accounting, zero live calls
```

Under `dryRun` the first would-be-live call throws a typed `JournalMissError` instead of dispatching. See [Determinism](/guide/determinism) and [Testing](/guide/testing).

## Is the worker sandbox a security boundary?

No, and rulvar says so on purpose. The `worker_threads` sandbox that executes planner-written scripts is a determinism and blast-radius boundary: seeded, journaled globals, an import allowlist, and no ambient engine access. It is not hostile-code containment, and you should not feed it code you would not review. Actual effect control lives in the permission chain, the single approval surface every tool call passes through regardless of mode. Subprocess and container executors for genuine containment are declared capabilities whose specification is documented as a plan, not a shipped guarantee. See [Planner](/guide/planner) and [Tools](/guide/tools).

## How do I pin model versions?

Put the exact id in the `ModelRef`. Refs are strictly `'adapterId:model'` and the model half is passed to the provider verbatim, so when a provider publishes dated snapshot ids, pinning is just using them:

```ts
await ctx.agent('Classify this ticket.', { model: 'anthropic:claude-sonnet-5' });
```

Pinning buys replay stability too: the requested model spec (including effort) is part of journal identity, so the same ref replays and a changed ref is a new content key, which means one live call. What pinning cannot fix is a provider silently re-pointing an alias behind an unchanged id; the optional canary fingerprint in the model knowledge layer exists to detect exactly that drift. See [Model routing](/guide/model-routing) and [Model knowledge](/guide/model-knowledge).

## Does rulvar phone home?

No. Constructing an engine performs no network calls, and the only outbound traffic a run produces goes to the providers behind adapters you explicitly registered, plus whatever your own tools do. `@rulvar/core` has zero provider SDK dependencies and exactly one external runtime dependency, the official MCP SDK (`@modelcontextprotocol/sdk`), which serves the [MCP bus](/guide/mcp); the JSON Schema mini-validator and the ULID generator are vendored into the package rather than pulled from the registry. There is no telemetry endpoint: the [event stream](/guide/observability) is delivered to your process, and OTel export is opt-in and points at your collector.

## Is it TypeScript only?

Yes: TypeScript on Node.js, ESM only, Node 22.12.0 or newer. The floor is exactly 22.12.0 because it is the first 22.x release where `require(esm)` works without a flag, so CommonJS hosts can plain `require()` the packages and receive the same module instance. No support statement ships for Bun, Deno, or edge runtimes (one may be added later as a tested claim), and no Python port is planned. See [Installation](/guide/installation).

## What is the license and release status?

Apache-2.0, with contributions accepted under the DCO. The current release line is v<!-- version:lockstep -->1.5.1<!-- /version -->; the core SPI seams froze at 1.0 and the packages follow semver from there, with journal compatibility governed by an explicit hashVersion support window. See [Versioning](/reference/versioning), the [Changelog](/reference/changelog), and the [Contributing guide](/contributing/).

## Where can I get help?

- [Troubleshooting](/guide/troubleshooting) for the typed errors you will actually see, and the [Glossary](/reference/glossary) for the vocabulary.
- Issues on the [repository](https://github.com/o-stepper/rulvar/issues) for bug reports and feature requests.
