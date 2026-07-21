# @rulvar/rulvar

## 1.37.0

### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0
  - @rulvar/anthropic@1.37.0
  - @rulvar/openai@1.37.0

## 1.36.0

### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0
  - @rulvar/anthropic@1.36.0
  - @rulvar/openai@1.36.0

## 1.35.0

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0
  - @rulvar/anthropic@1.35.0
  - @rulvar/openai@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0
  - @rulvar/anthropic@1.34.0
  - @rulvar/openai@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/anthropic@1.33.0
- @rulvar/openai@1.33.0
- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/anthropic@1.32.0
- @rulvar/openai@1.32.0
- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- Updated dependencies [df6b8f8]
  - @rulvar/openai@1.31.0
  - @rulvar/anthropic@1.31.0
  - @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- Updated dependencies [87ce985]
- Updated dependencies [87ce985]
  - @rulvar/openai@1.30.0
  - @rulvar/anthropic@1.30.0
  - @rulvar/core@1.30.0

## 1.29.0

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0
  - @rulvar/openai@1.29.0
  - @rulvar/anthropic@1.29.0

## 1.28.0

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0
  - @rulvar/openai@1.28.0
  - @rulvar/anthropic@1.28.0

## 1.27.0

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0
  - @rulvar/anthropic@1.27.0
  - @rulvar/openai@1.27.0

## 1.26.0

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0
  - @rulvar/anthropic@1.26.0
  - @rulvar/openai@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/anthropic@1.25.0
- @rulvar/core@1.25.0
- @rulvar/openai@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1
  - @rulvar/anthropic@1.24.1
  - @rulvar/openai@1.24.1

## 1.24.0

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0
  - @rulvar/anthropic@1.24.0
  - @rulvar/openai@1.24.0

## 1.23.0

### Patch Changes

- 1f9c272: The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

  - `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
  - Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
  - `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
  - `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

- Updated dependencies [1f9c272]
- Updated dependencies [1f9c272]
  - @rulvar/anthropic@1.23.0
  - @rulvar/core@1.23.0
  - @rulvar/openai@1.23.0

## 1.22.0

### Patch Changes

- 77b554f: Harden the terminal progress renderers (v1.21.0 review). Both `progress` (its lines mode and the tty state, plus the `title` option) and the minimal `renderProgress` now pass every untrusted field through the shared `sanitizeTerminalText` sanitizer, so control characters and ANSI escape sequences in provider/tool/log strings can no longer clear the screen, recolor to forge text, or inject extra lines (P2-1). `progress` geometry and timing options are normalized to finite positive integers: a non-finite or below-minimum `fps`, `width`, `maxRows`, `sink.columns`, or `sink.rows` falls back instead of breaking the clip or creating a NaN-interval timer, the width clip now holds every rendered line strictly under the terminal width for every width (including 1 to 3), and a NaN or backward clock reading renders a zero timer rather than `NaN` (P3-2). The clock JSDoc is corrected to `performance.now`, and every dynamic field is read defensively so a recognized event missing a required field degrades a row instead of stopping the view.
- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0
  - @rulvar/anthropic@1.22.0
  - @rulvar/openai@1.22.0

## 1.21.0

### Minor Changes

- 7ee42a0: New live terminal progress view: `progress(source, options)` renders a claude-workflows-style tree over the WorkflowEvent stream with one row per agent (status glyph, running timer, token counts, USD), per-role sub-timings when one call spans several invocation phases, the run header with spend against the ceiling, banners for pending approvals and externals, and a final summary including the per-role dollar split from `RunOutcome.cost.byRole`. Accepts a `RunHandle` (subscribes via `on()`, leaving `handle.events` free), a promise of one, or a raw event iterable (the gapless resume path). TTY mode repaints in place at a bounded rate; pipes and CI degrade to append-only lines; `NO_COLOR`, injectable sink and clock, and stderr-only output keep it deterministic and clean. The minimal `renderProgress` is unchanged.

### Patch Changes

- Updated dependencies [7ee42a0]
- Updated dependencies [7ee42a0]
- Updated dependencies [7ee42a0]
  - @rulvar/anthropic@1.21.0
  - @rulvar/core@1.21.0
  - @rulvar/openai@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
- Updated dependencies [9367030]
  - @rulvar/core@1.20.0
  - @rulvar/openai@1.20.0
  - @rulvar/anthropic@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0
  - @rulvar/openai@1.19.0
  - @rulvar/anthropic@1.19.0

## 1.18.0

### Minor Changes

- 943962d: `recommendedDefaults.floors` now admits `openai:gpt-5.6-sol` and its published exact alias `openai:gpt-5.6` for the `orchestrate` and `plan` roles. The allowlists had fallen behind the product recommendation: the rulvar.com quickstart routes the orchestrator at Sol, but a configuration combining that recommendation with the recommended floors was rejected before any provider call with a quality-floor violation. The weaker family siblings Terra and Luna stay deliberately floored out of the control-plane roles; worker roles (`loop`, `extract`) remain unfloored.

### Patch Changes

- Updated dependencies [943962d]
- Updated dependencies [943962d]
  - @rulvar/core@1.18.0
  - @rulvar/openai@1.18.0
  - @rulvar/anthropic@1.18.0

## 1.17.0

### Patch Changes

- @rulvar/anthropic@1.17.0
- @rulvar/core@1.17.0
- @rulvar/openai@1.17.0

## 1.16.2

### Patch Changes

- Updated dependencies [9f07130]
  - @rulvar/anthropic@1.16.2
  - @rulvar/core@1.16.2
  - @rulvar/openai@1.16.2

## 1.16.1

### Patch Changes

- Updated dependencies [fac1ecc]
  - @rulvar/anthropic@1.16.1
  - @rulvar/core@1.16.1
  - @rulvar/openai@1.16.1

## 1.16.0

### Patch Changes

- Updated dependencies [5f76cf2]
  - @rulvar/anthropic@1.16.0
  - @rulvar/openai@1.16.0
  - @rulvar/core@1.16.0

## 1.15.0

### Patch Changes

- Updated dependencies [4aee1f3]
- Updated dependencies [4aee1f3]
  - @rulvar/anthropic@1.15.0
  - @rulvar/openai@1.15.0
  - @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/anthropic@1.14.0
- @rulvar/openai@1.14.0
- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/anthropic@1.13.0
- @rulvar/core@1.13.0
- @rulvar/openai@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0
  - @rulvar/anthropic@1.12.0
  - @rulvar/openai@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0
  - @rulvar/anthropic@1.11.0
  - @rulvar/openai@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - @rulvar/anthropic@1.10.0
  - @rulvar/openai@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [7577f8e]
- Updated dependencies [3a53383]
  - @rulvar/anthropic@1.9.0
  - @rulvar/openai@1.9.0
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - @rulvar/anthropic@1.8.0
  - @rulvar/openai@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - @rulvar/anthropic@1.7.0
  - @rulvar/openai@1.7.0

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
- Updated dependencies [886d065]
- Updated dependencies [a737810]
- Updated dependencies [9eb66b4]
  - @rulvar/anthropic@1.6.0
  - @rulvar/core@1.6.0
  - @rulvar/openai@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - @rulvar/anthropic@1.5.2
  - @rulvar/openai@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - @rulvar/anthropic@1.5.1
  - @rulvar/openai@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - @rulvar/anthropic@1.5.0
  - @rulvar/openai@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - @rulvar/anthropic@1.4.0
  - @rulvar/openai@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/anthropic@1.3.2
  - @rulvar/core@1.3.2
  - @rulvar/openai@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/anthropic@1.3.1
  - @rulvar/core@1.3.1
  - @rulvar/openai@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - @rulvar/anthropic@1.3.0
  - @rulvar/openai@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - @rulvar/anthropic@1.2.0
  - @rulvar/openai@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [f2253cb]
- Updated dependencies [63b2c01]
- Updated dependencies [99dc3ed]
- Updated dependencies [d16b04a]
  - @rulvar/anthropic@1.1.0
  - @rulvar/core@1.1.0
  - @rulvar/openai@1.1.0

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
  - @rulvar/anthropic@1.0.0
  - @rulvar/openai@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - @rulvar/anthropic@0.9.0
  - @rulvar/openai@0.9.0

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
  - @rulvar/anthropic@0.8.0
  - @rulvar/openai@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0
  - @rulvar/anthropic@0.7.0
  - @rulvar/openai@0.7.0

## 0.6.0

### Minor Changes

- fa05007: M5-T01 workflow registry and the @rulvar/cli base.

  - `@rulvar/core` gains the per-engine `WorkflowRegistry` type and
    `defaults.workflows` on createEngine (docs/06 section 10.4): an
    explicit first-class value, no module-level registry; shells resolve
    by-name runs against it (ctx.workflow's string form arrives M6, the
    queue worker M8).
  - Spec-conformance fix: the M4-T09 quality floors option moves from the
    createEngine top level to its canonical home `defaults.roleFloors`
    (docs/06 section 10.1). Update `createEngine({ floors })` call sites
    to `createEngine({ defaults: { roleFloors } })`.
  - `@rulvar/cli` ships its first real surface: the canonical grammar
    `rulvar run <file|name> [--args JSON] [--store PATH] [--budget-usd N]`,
    `rulvar resume <runId> [--args JSON] [--store PATH]`,
    `rulvar runs ls [--store PATH]`, `rulvar inspect <runId> [--store
PATH]` (no aliases), a line-oriented TUI progress renderer over the
    event stream, and interactive resolution of suspended approvals and
    externals (EOF leaves the run suspended, never errors). Engine
    assembly follows the host-config convention: `rulvar.config.mjs`
    default-exports `{ engineOptions?, workflows? }`, a workflow module
    may export `workflow`/`engineOptions`/`workflows`, and --store selects
    the JsonlFileStore directory (default `.rulvar`), so the CLI itself
    depends only on @rulvar/core. The `rulvar` bin is included; the
    resume/inspect grammar amendment (--args re-supply, --store symmetry)
    is recorded in docs/06 section 10.5.

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - @rulvar/anthropic@0.6.0
  - @rulvar/openai@0.6.0

## 0.5.0

### Minor Changes

- b840aba: M4-T08 canonical effort completion and M4-T09 role quality floors.

  - Effort semantics are complete: the role effort defaults and the
    per-adapter mapping tables (Anthropic passthrough including max,
    OpenAI max downmapped to xhigh and recorded in providerMetadata,
    provider none only via namespaced providerOptions) shipped earlier
    milestones; this change completes VISIBLE scrubbing everywhere it was
    still silent: the summarize invocation surfaces its scrubs at fire
    time and a failover takeover surfaces the fallback's scrubs the
    moment it starts serving. Scrubbed effort is never mapped into
    max_tokens.
  - The effort-defaults-shift cassette is now RECORDED through the live
    runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
    the way an operator would, resumes live under explicit high effort
    with the completed semantics; every v1 entry matches and the one new
    spawn carries canonical effort in v2 identity. The recorder output is
    pinned byte-for-byte by the frozen-drift suite and the fixture lock
    now covers 18 files.
  - Quality floors (`model/floors.ts`, M4-T09): per-role and
    per-declared-taskClass allow/deny lists supplied via
    `createEngine({ floors })`, enforced INSIDE the router at resolution,
    before any live call and before any journal entry, for every
    invocation the chain produces (primaries, failover fallbacks, and the
    summarize fallback alike). `AgentProfile.taskClass` declares the
    class; unclassified profiles see only byRole floors. A violation is a
    typed ConfigError.
  - The umbrella `rulvar` package now ships floors opinions next to its
    strong routing defaults: `recommendedDefaults.floors` pins orchestrate
    and plan to strong named models. The core itself ships no named model
    strings, and the umbrella suite enforces that with a source scan.

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - @rulvar/anthropic@0.5.0
  - @rulvar/openai@0.5.0

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
  - @rulvar/openai@0.4.0
  - @rulvar/anthropic@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - @rulvar/anthropic@0.3.0
  - @rulvar/openai@0.3.0

## 0.2.0

### Minor Changes

- c24228d: M1-T10/T11: the WorkflowEvent envelope and M1 catalog (per-run telemetry
  seq distinct from JournalEntry.seq, span hierarchy run > phase > agent),
  the per-run EventBus feeding RunHandle.events and on(), RunOutcome with
  exhausted-overrides-error precedence and the normative CostReport
  (byModel/byPhase/byAgentType/byRole, the all-zero orchestrator block,
  unpriced evidence); createEngine with per-engine registries and
  engine.run over the ScriptRunner seam; InProcessRunner with the dev-mode
  bare-Date.now/Math.random warnings; run cancellation (host signal,
  handle.cancel, run deadline) and RunMeta run-to-definition binding
  fields. The umbrella ships the minimal terminal progress renderer
  (renderProgress) and re-exports the core surface.
- 5c4fc32: M1-T14/T15: @rulvar/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@rulvar/testing/matchers') and the
  completed umbrella (re-exports of @rulvar/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'rulvar' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

### Patch Changes

- Updated dependencies [527c9b4]
- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/anthropic@0.2.0
  - @rulvar/openai@0.2.0
  - @rulvar/core@0.2.0

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
  - @rulvar/anthropic@0.1.0
  - @rulvar/core@0.1.0
  - @rulvar/openai@0.1.0
