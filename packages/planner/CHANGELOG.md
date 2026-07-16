# @rulvar/planner

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - eslint-plugin-rulvar@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0
  - eslint-plugin-rulvar@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - eslint-plugin-rulvar@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - eslint-plugin-rulvar@1.7.0

## 1.6.0

### Patch Changes

- da4dbad: Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
  documentation site now capitalize the brand. Identifiers keep their exact casing, so
  package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
  the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
  only; no runtime behaviour changes.
- Updated dependencies [da4dbad]
- Updated dependencies [487da86]
- Updated dependencies [df416fc]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/core@1.6.0
  - eslint-plugin-rulvar@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - eslint-plugin-rulvar@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - eslint-plugin-rulvar@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - eslint-plugin-rulvar@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - eslint-plugin-rulvar@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2
  - eslint-plugin-rulvar@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1
  - eslint-plugin-rulvar@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - eslint-plugin-rulvar@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - eslint-plugin-rulvar@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0
  - eslint-plugin-rulvar@1.1.0

## 1.0.0

### Patch Changes

- Updated dependencies [0e0b569]
- Updated dependencies [b28b7a3]
- Updated dependencies [b53a89e]
- Updated dependencies [4454175]
- Updated dependencies [6599ca8]
- Updated dependencies [6649e5f]
- Updated dependencies [fd2f83b]
- Updated dependencies [01d6b2d]
- Updated dependencies [9a20dbb]
- Updated dependencies [0fbe7ea]
- Updated dependencies [ebe0abc]
- Updated dependencies [a3079d0]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0
  - eslint-plugin-rulvar@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - eslint-plugin-rulvar@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies [85d55cf]
- Updated dependencies [b88c9e3]
- Updated dependencies [f3c4613]
- Updated dependencies [a41c20f]
- Updated dependencies [f4e70be]
- Updated dependencies [75d1646]
- Updated dependencies [0627413]
- Updated dependencies [55c0f87]
- Updated dependencies [fd33871]
- Updated dependencies [e70e7f4]
- Updated dependencies [bc9c903]
  - @rulvar/core@0.8.0
  - eslint-plugin-rulvar@0.8.0

## 0.7.0

### Minor Changes

- dc1c182: M6-T01: compileScript and the CompiledWorkflow surface. `compileScript(source, { allowImports })` validates planner-generated source (syntax over the exact sandbox global set; import/require/export scanning with a literal-specifier allowlist defaulting to none) and compiles it into the core `CompiledWorkflow` data form (errorPolicy 'lenient'); any violation throws the typed `ScriptRejected` carrying machine-readable `ScriptDiagnostic[]` for the plan() self-repair loop. Exports `SANDBOX_GLOBALS` (the docs/06 8.2 curated list) and `scriptDiagnosticsOf`. The closure Workflow and CompiledWorkflow forms stay mutually unassignable by type.
- fd1d06c: M6-T02: WorkerSandboxRunner and the sandbox contract. `@rulvar/planner` gains `WorkerSandboxRunner` (accepts CompiledWorkflow ONLY; worker_threads with the exact curated 12-global scope; timeoutMs 300000 / memoryMb 512 breaches terminate the worker with the new typed `SandboxError`, code `sandbox_limit`). Core gains the public host half, `createSandboxBridge`: proxied primitives (agent, step, workflow, awaitExternal, parallel, pipeline, phase, budget) served against the canonical run ctx with worker thunks executing under host-allocated scope tokens; the worker's SYNC seeded now/random/uuid (and the Date.now/Math.random replacements) mirror-journal as ordinary kind `rand` entries with match-first resume semantics; a busy-state protocol keeps suspension and quiescence behavior identical to in-process runs. `createEngine` gains `runners.sandbox`; `engine.run`/`engine.resume` accept CompiledWorkflow, persist the source blob plus workflowSourceRef/workflowHash at start, and `resume(runId)` with no workflow rehydrates the hash-pinned source (a differing supplied source is a typed ConfigError). New `FileTranscriptStore` makes compiled runs resumable across processes. The sandbox dialect exposes async `budget.spent()/remaining()`; import/fetch/process are absent from the worker scope.
- 6fcf296: M6-T04: profileCard and the API card. Core gains `profileCard(profiles)`: the one agent vocabulary both orchestration modes speak, feeding the planner prompt (mode b) and spawn_agent agentType guidance (mode c) with IDENTICAL text; pure function of the registry, sorted, byte-stable, rendering only model-agnostic fields (name, description, tool names, taskClass, estCost, escalation opt-in; models are never named). The planner gains `apiCard()`: the byte-stable card teaching exactly the curated 12-global sandbox dialect (schema literals only, tools by profile name, onError throw|null, async budget, no imports, the opts.key repeat rule) with usage patterns distilled from the examples corpus.
- dcc97a9: M6-T05: the plan agent and the self-repair loop (mode b). `plan(engine, goal, { model?, profiles?, repairRounds? })` asks a planner model under role `plan` to write a script against the API card plus the engine's profile card, lints it (eslint-plugin-rulvar preset + compileScript), self-repairs up to repairRounds (default 3) from the machine-readable JSON diagnostics, and returns `{ source, workflow, lint }`. The planner conversation is an ordinary journaled run with a goal-derived deterministic runId, so re-planning the same goal replays the unchanged prefix free; exhausting the rounds throws a typed ScriptRejected carrying the last diagnostics. `runPlanned(engine, goal, args?)` composes plan-then-sandbox-run (async by amendment). Core gains `AgentOpts.role` (`'loop' | 'plan' | 'orchestrate'`, the primary invocation role threading through resolution, effort defaults, floors, cost buckets, and events) and the narrow `Engine.profileCard(names?)` accessor rendering the registered profiles through the public API.
- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [4aaf2d5]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0
  - eslint-plugin-rulvar@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - eslint-plugin-rulvar@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - eslint-plugin-rulvar@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [dfe03b5]
- Updated dependencies [d2089a7]
- Updated dependencies [3f60234]
- Updated dependencies [f668890]
- Updated dependencies [16d7aa6]
- Updated dependencies [6513ce8]
- Updated dependencies [7dad493]
- Updated dependencies [2bbf180]
  - @rulvar/core@0.4.0
  - eslint-plugin-rulvar@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - eslint-plugin-rulvar@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0
  - eslint-plugin-rulvar@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @rulvar/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @rulvar/core@0.1.0
  - eslint-plugin-rulvar@0.1.0
