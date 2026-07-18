---
title: Installation
description: Install the @rulvar/rulvar umbrella package or compose individual @rulvar packages. Node.js 22.12 or newer, ESM only, TypeScript recommended.
---

# Installation

Rulvar is published on the npm registry as a set of scoped packages under `@rulvar/*` (Apache-2.0). All packages release in **lockstep** at the same version, currently <!-- version:lockstep -->1.18.0<!-- /version -->; the single exception is `@rulvar/compat`, which is versioned independently so that frozen compatibility profiles never force a release of everything else.

::: tip One line install
`pnpm add @rulvar/rulvar` gives you everything most applications need: the engine, the Anthropic and OpenAI adapters, the JSONL file store, and the terminal progress renderer, behind one import path.
:::

## Requirements

- **Node.js 22.12.0 or newer.** Every package declares `engines: { "node": ">=22.12.0" }`. The floor is exactly 22.12.0 because it is the first 22.x release where `require(esm)` works without a flag, which the module format below relies on.
- **ESM only.** All packages ship `"type": "module"` with no CommonJS artifacts. ESM projects `import` them; CommonJS projects on Node 22.12 or newer can plain `require()` them and receive the same module instance. Rulvar deliberately never dual publishes: two module instances of the engine would fork the per engine registries and break content addressed replay identity, so the hazard is removed by construction. Note the scope of that CJS statement: it covers consuming the packages from existing CommonJS code. The runnable examples in these docs (including the [quickstart](/guide/quickstart)) use top-level `await`, so the project that runs them must itself be ESM: set `"type": "module"` in your `package.json` or use `.mts` files.
- **TypeScript recommended.** The API is typed end to end and every package ships rolled up `.d.ts` files; plain JavaScript works, but workflow signatures, tool schemas, and budget options lose their compile time checks. Types resolve through the `exports` map only (there is no legacy `types` field), so set `moduleResolution` to `nodenext`, `node16`, or `bundler` in your `tsconfig.json`.

Any of pnpm, npm, or yarn installs the published packages; the examples below use pnpm first.

## The umbrella package

For applications, install the batteries included umbrella:

```bash
pnpm add @rulvar/rulvar
```

```bash
npm install @rulvar/rulvar
```

```bash
yarn add @rulvar/rulvar
```

One import path then covers the common surface:

| Surface | What you get |
|---|---|
| Everything from `@rulvar/core` | `createEngine`, `defineWorkflow`, the journal kernel, the agent runtime, the model router, the tool system, the orchestrator, `InMemoryStore` and `JsonlFileStore` |
| `anthropic()`, `ANTHROPIC_MODELS` | The Anthropic adapter and its model catalog |
| `openai()`, `OPENAI_MODELS` | The OpenAI adapter and its model catalog |
| `renderProgress()` | Terminal progress renderer over a run's event stream |
| `recommendedDefaults` | Routing defaults and quality floors that pin orchestrate and plan work to strong models |

`recommendedDefaults` is data, not engine semantics, and it lives here on purpose: `@rulvar/core` never names a concrete model. Drop it into `createEngine` and override freely; see [Model routing](/guide/model-routing).

One thing the umbrella deliberately does not pass through is the `openaiCompatible` factory. If you target an OpenAI compatible endpoint (Ollama, vLLM, a gateway), add `@rulvar/openai` as a direct dependency and import the factory from there; see [Providers](/guide/providers).

## Picking individual packages

If you would rather not carry adapters you never construct, compose the pieces yourself. The minimum useful set is the core plus one adapter:

```bash
pnpm add @rulvar/core @rulvar/anthropic
```

This works because the dependency rules are strict: `@rulvar/core` has zero provider SDK dependencies, adapters import only core types and never each other, and every other package builds exclusively on the public API. Mixing and matching cannot pull in a provider SDK you did not ask for.

When you mix individual packages, keep every `@rulvar/*` dependency at the same version. They release in lockstep, and cross package contracts are only exercised at identical versions.

## The full package list

| Package | One line |
|---|---|
| `@rulvar/rulvar` | The umbrella: the full core API plus the Anthropic and OpenAI adapters, the file store, and the terminal progress renderer. The single install path. |
| `@rulvar/core` | The engine: journal kernel, ctx primitives, agent runtime, model router, tool system and MCP bus, dynamic orchestrator, `InMemoryStore` and `JsonlFileStore`, the event stream. Zero provider SDK dependencies. |
| `@rulvar/anthropic` | Anthropic adapter over `@anthropic-ai/sdk`: thinking block replay with signatures, cache hints, typed refusal outcomes, usage normalization. |
| `@rulvar/openai` | OpenAI adapter over the Responses API (reasoning items, strict JSON schema output) plus the `openaiCompatible` factory for Chat Completions style endpoints. |
| `@rulvar/bridge-ai-sdk` | Wraps any Vercel AI SDK `LanguageModelV4` in a `ProviderAdapter` for the long tail of providers. |
| `@rulvar/store-sqlite` | `SqliteStore`: a journal store with worker leasing and fencing epochs on the `node:sqlite` driver built into Node. The reference for community stores. |
| `@rulvar/store-conformance` | Executable conformance kit for store authors: atomicity, ordering, fencing, and the decide once oracle, runnable under Vitest. |
| `@rulvar/compat` | Frozen key derivation profiles that let a current engine read journals written under retired hash versions. The one package outside lockstep. |
| `@rulvar/plan` | Plan and execute orchestration: the `planRunner` extension factory, the run ledger, escalation extensions, model ladder configuration. |
| `@rulvar/planner` | The flagship hybrid: a plan agent that writes workflow scripts, `compileScript` with an import allowlist, and the `WorkerSandboxRunner`. |
| `@rulvar/testing` | `createTestEngine`, `FakeAdapter`, VCR cassettes with secret redaction, replay strict runs, matchers for Vitest and Jest. |
| `@rulvar/evals` | Eval cases, golden outputs, rubric and judge graders through the engine, matrix sweeps, the canary fingerprint. |
| `@rulvar/cli` | The `rulvar` binary: run, resume, runs, inspect, plan, and kb commands, TUI progress, `createServer` and `createWorker`, the OpenTelemetry exporter. |
| `eslint-plugin-rulvar` | Determinism lint rules for workflow modules, with structured JSON diagnostics. Lockstep despite the unscoped name npm requires for ESLint plugins. |

The [Packages reference](/reference/packages) expands each line; [Versioning](/reference/versioning) explains the lockstep policy and the `@rulvar/compat` exemption.

## Provider SDK dependencies

Installing an adapter package brings its provider SDK along as a regular dependency; there is nothing extra to install:

| Adapter | Provider SDK it installs | Key source when `apiKey` is omitted |
|---|---|---|
| `@rulvar/anthropic` | `@anthropic-ai/sdk` | `ANTHROPIC_API_KEY` |
| `@rulvar/openai` | `openai` | `OPENAI_API_KEY` |
| `@rulvar/bridge-ai-sdk` | `@ai-sdk/provider` (interface types only) | Whatever the wrapped model uses |

The bridge is the one case where you bring a package yourself: install the concrete AI SDK provider for your target (for example `@ai-sdk/google`) and hand its model object to the bridge. See [Providers](/guide/providers).

Both adapter factories accept `apiKey` and `baseURL` options, forward the SDK's other credential modes (bearer tokens, workload identity federation) through `sdkOptions`, and disable the SDK's internal retries: the engine owns retries, budgets, and wall clock. Structured Anthropic auth (`credentials`, `config`, `profile`) suppresses ambient environment keys, so a stray `ANTHROPIC_API_KEY` cannot silently outrank a configured token provider. Keys are created in the provider dashboards, the [Claude Console](https://platform.claude.com/settings/keys) and the [OpenAI API keys page](https://platform.openai.com/api-keys); [Authentication](/guide/providers#authentication) in the Providers guide covers how the adapters pick them up from the environment and the full credential-mode matrix (a consumer Claude or ChatGPT subscription is not among them; API accounts only).

Two smaller dependency notes:

- `@rulvar/store-sqlite` has no native driver dependency. It uses the `node:sqlite` module that ships with Node, so installs never compile anything. One version caveat: the engines floor stays 22.12.0, but `node:sqlite` is flag-free only from Node 22.13; on 22.12 it requires the `--experimental-sqlite` flag.
- `@rulvar/cli` declares `@opentelemetry/api` as an optional peer. Install it only if you use the OpenTelemetry exporter; every other command works without it.

## The unscoped npm name

::: warning Only a pointer
The bare npm name `rulvar` is a pointer package that re-exports `@rulvar/rulvar` and is republished to match the umbrella's version each release: it keeps the name from being squatted and lets `npm install rulvar` resolve to the real library for a quick try. Projects should depend on the scoped `@rulvar/rulvar` in `package.json`; the scoped packages are the real releases, and everything in this documentation refers to them.
:::

## Verifying the install

Create `verify.mjs` next to your `package.json`:

```js
// verify.mjs
import { createEngine, CURRENT_HASH_VERSION } from "@rulvar/rulvar";

const engine = createEngine({ adapters: [] });

console.log("engine ready:", typeof engine.run === "function");
console.log("journal hash version:", CURRENT_HASH_VERSION);
```

```bash
node verify.mjs
```

```text
engine ready: true
journal hash version: 2
```

No API key is required: constructing an engine performs no network calls, and an empty adapter list is valid right up until you route a model call.

::: tip Default store
An engine created without `stores.journal` runs on `InMemoryStore`: runs work, but nothing survives a process exit, so a restarted process cannot resume them, and the engine warns loudly. Configure `JsonlFileStore` or `@rulvar/store-sqlite` before you rely on durability; see [Stores](/guide/stores).
:::

From here, the [Quickstart](/guide/quickstart) takes you from this empty engine to a budgeted multi agent run in a few dozen lines. If an AI assistant writes your Rulvar code, hand it [Rulvar for LLMs](/guide/llms), the one-page orientation built for machine consumption.

## From source

For contributors to Rulvar itself:

```bash
git clone https://github.com/o-stepper/rulvar.git
cd rulvar
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

The workspace pins its pnpm version through the `packageManager` field, which `corepack enable` picks up automatically. The workspace toolchain needs Node 22.13.0 or newer (the pinned pnpm's own floor), development targets Node 24, and a dedicated CI job runs the full built suite on the exact 22.12.0 binary that the published packages promise as their runtime floor. See the [Contributing guide](/contributing/) for the full workflow.
