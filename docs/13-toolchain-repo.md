# Toolchain and repository

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: the committed toolchain with per-item rationale, the monorepo layout, the package.json and tsconfig templates, the repo bootstrap checklist that M0 executes, the canonical naming risk note, the risk register with revisit triggers, and the contributor workflow.

The toolchain below is committed by the doc architect on the basis of the July 2026 toolchain research, per the founder decision that the toolchain is recorded here with rationale. Deviating from a committed item requires amending this document first (spec-first rule, README.md, section "Docs versioning and amendment process"). Release policy built on this toolchain lives in 12-release-versioning.md; test policy in 11-testing-strategy.md.

## 1. Committed toolchain

### 1.1 Summary table

| Area | Commitment |
|---|---|
| Runtime baseline | Node.js `engines: >=22.12.0`; developed and released on Node 24 (Active LTS); CI matrix 22.x and 24.x, 26.x optional non-blocking |
| Module format | ESM-only for all 14 packages; `type: module`; exports map with types-then-default; no CJS artifacts |
| Package manager | pnpm 11.x workspaces; pinned via `packageManager`; `workspace:*` internal deps; catalogs for shared external versions |
| Language | TypeScript 6.0, required range `>=6.0 <8`; nodenext module and resolution; target es2023; strict; verbatimModuleSyntax; isolatedDeclarations; erasableSyntaxOnly |
| Build | tsdown (single bundler for all packages); `tsc --noEmit` for typechecking only |
| Tests | Vitest 4.x, one root config with `test.projects` over `packages/*` (policy: 11-testing-strategy.md) |
| Lint and format | ESLint 9 flat config plus typescript-eslint v8 (`projectService: true`, recommendedTypeChecked); Prettier owns formatting |
| Versioning and release | @changesets/cli 2.x in fixed mode (policy: 12-release-versioning.md, section "Lockstep policy") |
| Package correctness | publint plus @arethetypeswrong/cli on packed tarballs in CI; api-extractor deliberately omitted; SPI drift via committed rolled-up .d.ts diffs |
| CI orchestration | GitHub Actions; pnpm/action-setup plus setup-node (pnpm cache); Turborepo 2.x as a removable layer; `pnpm -r run` as the documented fallback |
| Publishing | npm trusted publishing (OIDC, `id-token: write`, automatic provenance); one trusted-publisher entry per package |

### 1.2 Runtime: Node >=22.12.0, developed on Node 24

Node 20 reached end of life on 2026-04-30 and MUST NOT be a support target. Node 22 is Maintenance LTS (EOL 2027-04-30); Node 24 is Active LTS (EOL 2028-04-30); Node 26 is Current and becomes LTS in October 2026. The floor is 22.12.0 specifically because it is the first 22.x with unflagged `require(esm)`, which the module-format decision below depends on. Development and releases run on Node 24; CI tests on 22.x and 24.x, with 26.x as an optional non-blocking job.

### 1.3 Module format: ESM-only

All 14 packages publish ESM only: `"type": "module"`, an exports map with `types` before `default`, no CJS artifacts, no legacy `main`/`module` fields beyond the exports map.

Rationale, and why this is a correctness rule rather than a style preference: with the >=22.12.0 baseline, CJS consumers can `require()` an ESM package natively, so dual publishing solves nothing. Meanwhile dual publishing reintroduces the dual-package hazard, which is actively dangerous for lurker specifically: if a host application loaded two module instances (one CJS, one ESM), the journal and registry singleton state would be duplicated, per-engine registries would fork, and content-addressed replay identity would silently break, violating I1 and I5 (00-overview.md, section "Invariants"). ESM-only removes the hazard by construction.

Repo rule: no top-level await in package entry modules (it would break synchronous `require(esm)` consumption).

### 1.4 Package manager: pnpm 11.x workspaces

pnpm-workspace.yaml declares the `packages/*` glob; the exact pnpm version is pinned via the root `packageManager` field; the 13 internal cross-dependencies use the `workspace:*` protocol (rewritten to real semver ranges at pack time); shared external versions are pinned once via pnpm catalogs (the `catalog:` protocol), so 14 package.json files cannot drift apart on a shared dependency.

Caveat: early pnpm 11.0.x had an OIDC trusted-publishing 404 regression; CI and the release workflow MUST require a recent, known-good 11.x (section 8, risk register). Selection rule (M0-T01): pin the newest 11.x that passes the M0-T06 release dry-run including OIDC trusted publishing, and record the chosen pin alongside the naming outcomes in section 6.

### 1.5 Language: TypeScript 6.0

TypeScript 6.0 is the final JS-based compiler release and the designated bridge to the Go-native 7.0 (tsgo). The repo requires `>=6.0 <8` and keeps tsconfig free of options deprecated in 6.0, so the 7.0 switch is mechanical; the compiler pin is revisited at the first milestone after TS 7 GA (expected around August 2026). Committed compiler options and their reasons:

- `module`/`moduleResolution: nodenext`: the correct setting for libraries shipping to Node; requires explicit `.js` extensions in relative imports, which is also the committed authoring rule.
- `target: es2023`: safe for the Node 22 floor.
- `strict: true`.
- `verbatimModuleSyntax: true`: forces `import type` discipline and prevents emit-form surprises for consumers.
- `isolatedDeclarations: true`: keeps every public API explicitly typed (which is exactly what SPI-seam freezing needs) and enables tsdown's fast .d.ts generation.
- `erasableSyntaxOnly: true`: keeps source runnable via Node 24 native type stripping for dev scripts; forbids enums and namespaces, a good API-design constraint in its own right.

### 1.6 Build: tsdown, typecheck via tsc

tsdown is the single bundler for all 14 packages. Rationale: it is the designated tsup successor with tsup-compatible options; its core is Rolldown, stable at 1.0 since 2026-05-07 (API locked under semver, and the engine under Vite 8); it generates .d.ts fast via isolated declarations; it can generate the exports map; and it has built-in publint and arethetypeswrong validation hooks, which the repo wires on in addition to the explicit CI gates. `tsc --noEmit` is the typecheck gate; tsdown never typechecks as a gate.

Documented fallback path: tsdown is younger than tsup; because its options are tsup-compatible, the fallback is tsup, or plain tsc for packages that need no bundling. The fallback trigger is in the risk register (section 8).

### 1.7 Tests, lint, format

- Vitest 4.x with exactly one root config using `test.projects` over `packages/*`; a single `vitest run` executes everything. Vitest 4's minimum Node (20.19+/22.12+) matches the baseline exactly. Policy, tiers, and gates: 11-testing-strategy.md.
- ESLint 9 flat config (single root `eslint.config.js`) with typescript-eslint v8: `projectService: true` plus recommendedTypeChecked; projectService auto-locates each file's nearest tsconfig, so one config covers all packages with typed linting and no ESLint-specific tsconfigs.
- Prettier owns formatting; formatting rules MUST NOT be duplicated into ESLint.
- eslint-plugin-lurker (a product package, also consumed in-repo) enforces workflow determinism: bans bare Date.now, Math.random, new Date, fetch, and process.env in workflow modules, and bans Promise.all over ctx calls; its diagnostics are structural JSON so the planner self-repair loop can consume them (06-execution-spec.md, section "Script runners").

### 1.8 Versioning, publishing, package correctness

- @changesets/cli 2.x in fixed mode implements founder lockstep exactly; the group, the @lurker/compat exemption, and the Version Packages PR flow via changesets/action are specified in 12-release-versioning.md, sections "Lockstep policy" and "Release pipeline".
- Publishing uses npm trusted publishing (OIDC): `permissions: id-token: write` in the release workflow, no long-lived tokens, automatic provenance, npm >= 11.5.1 or a recent pnpm 11.x, one trusted-publisher entry per package. Provenance activates only once the repository is public.
- Package correctness gates: publint and @arethetypeswrong/cli run in CI against packed tarballs (`pnpm pack` output), never against source trees. api-extractor is deliberately omitted: its two historical jobs (rolled-up types, API reports) are covered by tsdown .d.ts bundling plus isolatedDeclarations; SPI drift for the 1.0 seam freeze is tracked by diffing committed rolled-up .d.ts files in PRs. api-extractor is revisited only if formal API reports prove necessary before 1.0.

### 1.9 CI orchestration: Turborepo as a removable layer

GitHub Actions with pnpm/action-setup (version from the `packageManager` field) then actions/setup-node with `cache: 'pnpm'`, then `pnpm install --frozen-lockfile`. Build, typecheck, and lint are orchestrated by Turborepo 2.x (`build` dependsOn `^build`), which gives input-hash caching across the 14 packages. Turborepo is a thin, removable layer over pnpm scripts: `pnpm -r run <task>` (topological by default) is the documented fallback, and nothing in the repo may depend on turbo-specific behavior. Vitest runs once at the root, outside per-package caching.

### 1.10 Dependency baseline pins

| Dependency | Pin | Rationale and rules |
|---|---|---|
| StandardSchemaV1 types | vendored (never a runtime dep) | Tool-schema input contract; types-only, roughly 60 lines; vendoring keeps @lurker/core dependency-free (08-tools-permissions-spec.md, section "SchemaSpec") |
| StandardJSONSchemaV1 projection | vendored types; target draft-2020-12, fallback draft-07 | JSON Schema projection via `'~standard'.jsonSchema.input()`; supported by Zod 4.2+, ArkType 2.1.28+, Valibot 1.2+ |
| JSON Schema validator | vendored, @cfworker/json-schema lineage | Draft 2020-12 subset (no $dynamicRef, no remote $ref), eval-free and CSP-safe; the sole vendored RUNTIME dependency of @lurker/core (the StandardSchemaV1/StandardJSONSchemaV1 rows above are types only and do not count) |
| @ai-sdk/provider | ^4 (LanguageModelV4) | Bridge package only; exact-major pin with a runtime specificationVersion check; documented as the highest-churn package (04-model-layer-spec.md) |
| @modelcontextprotocol/sdk | ^1.29 | MCP bus; SDK v2 (scoped packages, spec 2026-07-28) migration is a logged post-M3 task; v1 keeps support only about 6 months after v2 ships |
| ULID | vendored, or zero-dep `ulid` 3.x | Engine-minted CanonicalIds; monotonic factory required for same-millisecond ordering |
| @opentelemetry/api | ^1.9, optional peer only | Libraries depend on the API, never an SDK; gen_ai.* semconv flagged unstable (09-observability-testing-spec.md, section "OpenTelemetry mapping") |
| fast-check | dev-only | Property-based tests (11-testing-strategy.md, section "Property-based testing targets"); never in a published dependency tree |

## 2. Repository layout

One repository, 14 publishable packages. Package purposes are the canon of 02-architecture.md, section "Package map"; the directory basename drops the scope.

```
lurker/                          (repo; org name per section 6)
  .changeset/
    config.json                  (fixed group; 12-release-versioning.md)
  .github/
    workflows/
      ci.yml                     (PR and main: build, typecheck, lint, test, pack gates)
      release.yml                (changesets/action, OIDC publish)
      contract-tests.yml         (cron: live adapter contract tests; enabled at M5)
  docs/                          (this canon; single source of truth)
  examples/                      (runnable corpus; integration tests and planner API-card corpus)
  packages/
    core/                        @lurker/core        L0 contracts, journal kernel, ctx, agent runtime, router, tools, orchestrator, InMemory and JSONL stores
    plan/                        @lurker/plan        PlanRunner, RunLedger, escalation extensions, ModelLadder config
    planner/                     @lurker/planner     flagship hybrid: plan agent, compileScript, WorkerSandboxRunner
    anthropic/                   @lurker/anthropic   first-class adapter over @anthropic-ai/sdk
    openai/                      @lurker/openai      Responses API adapter plus openaiCompatible factory
    bridge-ai-sdk/               @lurker/bridge-ai-sdk  LanguageModelV4 bridge for the provider long tail
    store-sqlite/                @lurker/store-sqlite   JournalStore plus LeasableStore with fencing epoch
    store-conformance/           @lurker/store-conformance  executable store conformance kit (DEF-4)
    compat/                      @lurker/compat      frozen out-of-window KeyDeriver profiles (DEF-6); outside lockstep
    testing/                     @lurker/testing     createTestEngine, FakeAdapter, VCR, replay-strict, matchers
    evals/                       @lurker/evals       eval cases, graders, sweeps, canary fingerprint
    cli/                         @lurker/cli         run/resume/runs/inspect/plan/kb, TUI, createServer, createWorker, OTel exporter
    eslint-plugin-lurker/        eslint-plugin-lurker  determinism lint rules with structural JSON diagnostics
    lurker/                      lurker              umbrella: re-exports core, both first-class adapters, file store, terminal renderer
  package.json                   (private: true; packageManager pin; root scripts)
  pnpm-workspace.yaml            (packages/* glob; catalogs)
  tsconfig.base.json
  eslint.config.js
  vitest.config.ts               (test.projects over packages/*)
  turbo.json
  .prettierrc
```

Dependency rules between packages are owned by 02-architecture.md, section "Dependency rules" (core never imports plugins; plugins import only core types and never each other; shells build only on public APIs). @lurker/core has zero provider SDK dependencies; its only vendored runtime dependency is the JSON Schema mini-validator (vendored StandardSchemaV1 type declarations are types only and do not count).

### 2.1 turbo.json shape

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {},
    "pack-check": { "dependsOn": ["build"] }
  }
}
```

`test` is intentionally absent: Vitest runs once at the repository root.

### 2.2 CI workflow spec

ci.yml (pull requests and main):

1. Setup: pnpm/action-setup, setup-node (Node 24, `cache: 'pnpm'`), `pnpm install --frozen-lockfile`.
2. `turbo build` then `turbo typecheck` then `turbo lint` (once, on Node 24).
3. Changeset presence check on PRs (12-release-versioning.md, section "Release pipeline").
4. Test matrix: `vitest run` on Node 22.x and 24.x; an optional 26.x job MUST be non-blocking.
5. Pack gates: for every publishable package, `pnpm pack`, then publint and `attw --pack` on the tarball.
6. Rolled-up .d.ts drift: build regenerates the committed rollups; a dirty working tree fails CI, forcing the diff into the PR for review.

release.yml (push to main): changesets/action maintains the Version Packages PR and, on merge, publishes via OIDC (`permissions: id-token: write`); pnpm version pinned to a known-good 11.x. Details and checklist: 12-release-versioning.md, sections "Release pipeline" and "Release checklist".

contract-tests.yml (cron, enabled at M5): weekly per first-class adapter; replays recorded cassettes against live provider APIs; non-blocking for merges but MUST alert on failure; keys from repository secrets; spend governed by the founder budget item (14-open-questions.md, section "Founder-only decisions"). Policy: 11-testing-strategy.md, section "Live contract tests (cron)".

## 3. package.json template

Template for every publishable package (shown for @lurker/core):

```json
{
  "name": "@lurker/core",
  "version": "0.0.0",
  "type": "module",
  "license": "UNLICENSED",
  "engines": { "node": ">=22.12.0" },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "sideEffects": false,
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsdown": "catalog:",
    "typescript": "catalog:"
  }
}
```

Rules:

- `"license": "UNLICENSED"` is the placeholder for the founder decision "License: TBD (decided before first public release)" and MUST be replaced before the first public release (1.0 gate item; 12-release-versioning.md, section "The 1.0 gate"). No license text ships until then.
- No top-level `main`, `module`, or `types` fields: the exports map is the only entry surface, and the Node >=22.12.0 baseline makes node10-resolver fallbacks unnecessary (publint would flag them as redundant).
- Internal dependencies always use `"@lurker/<name>": "workspace:*"`; shared external versions always use `"catalog:"`.
- Packages with subpath surfaces (for example @lurker/cli exposing `createServer`/`createWorker`, or the umbrella re-exporting adapters) extend the exports map with subpath entries following the same types-then-default shape.
- The root package.json is `"private": true`, carries the `packageManager` pin and the repo-wide scripts, and is never published.

## 4. tsconfig template

tsconfig.base.json:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2023",
    "lib": ["es2023"],
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedDeclarations": true,
    "erasableSyntaxOnly": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Each package ships a two-line tsconfig extending the base with its `include` (src) and nothing else. Emit is owned by tsdown; `tsc --noEmit` is the typecheck command; relative imports MUST carry explicit `.js` extensions (nodenext requirement). Options deprecated in TS 6.0 are forbidden (no `ignoreDeprecations` escape hatch), keeping the TS 7/tsgo switch mechanical.

## 5. Repo bootstrap checklist (M0)

Everything below happens before the first feature commit; this is what M0 (v0.1.0) executes, tasked as M0-Tyy items in 10-implementation-plan.md, section "Per-milestone task breakdowns". Items 1-3 are the naming checklist and MUST be executed first, before any name freezes.

1. Attempt to claim the npm org/scope `@lurker`; record the outcome. If blocked, invoke the naming contingency (section 6) and record the decision.
2. Select and create the GitHub org variant (candidates: lurker-dev, lurkerjs, getlurker; section 6).
3. Record the trademark-search status and schedule formal USPTO/EUIPO clearance as the pre-1.0 gate (12-release-versioning.md, section "The 1.0 gate").
4. Create the repository: default branch `main`, branch protection (required CI checks, at least one review), squash-merge policy.
5. Scaffold the workspace: pnpm-workspace.yaml (`packages/*`, catalogs), private root package.json with the `packageManager` pin.
6. Create all 14 package directories per section 2 with the templates of sections 3 and 4 and stub `src/index.ts` files; land the L0 contracts skeleton in @lurker/core.
7. Commit tsconfig.base.json; verify `tsc --noEmit` passes repo-wide.
8. Add tsdown config per package; verify build output, .d.ts rollups, and the exports map on a packed tarball.
9. Root vitest.config.ts with `test.projects` over `packages/*`; one smoke test per package; verify a single `vitest run` executes all projects.
10. Root eslint.config.js (flat, typescript-eslint v8, projectService) and Prettier config; verify a clean lint run.
11. turbo.json per section 2.1; verify the `pnpm -r run build` fallback also works.
12. .changeset/config.json with the fixed group enumerating the thirteen lockstep packages explicitly by name (no globs, no negation patterns; 12-release-versioning.md, section "Lockstep policy"); add the CI repo check asserting the fixed list equals workspace packages minus @lurker/compat; verify with a dry-run `changeset version` on a throwaway branch.
13. Commit ci.yml, release.yml, and contract-tests.yml (the cron workflow ships disabled until M5).
14. Configure npm trusted-publisher entries, one per package; entries for packages not yet published are completed at the first publish (v0.1.0). Note: entries created after 2026-05-20 must explicitly select allowed actions; provenance activates only once the repo is public.
15. Land the docs/ canon (this document set) into the repository.
16. Commit the initial rolled-up .d.ts baseline for the SPI drift gate once the L0 skeleton builds.
17. Record the license placeholder state ("License: TBD, decided before first public release") in the repo README.

## 6. Naming risk note

This section is the canonical home of the naming risk; README.md and 00-overview.md point here. The founder decision stands: the library is named lurker and packages are @lurker/*; the collision risk is noted, not resolved.

- **Unscoped npm name.** `lurker` on npm is squatted by an abandoned 2014 GPLv3 RSS reader with zero downloads per month. The umbrella package name is therefore contingent on one of: an npm name dispute, a transfer from the current owner, or a fallback. Fallback candidates, in preference order: `lurkerjs`, `lurker-ai`, or shipping the umbrella as `@lurker/lurker` with no unscoped package at all.
- **GPLv3 residue.** Whatever the resolution, the old unscoped versions remain GPLv3 in the registry history; this is a noted risk (a version-range install against stale metadata could resolve to GPLv3 code) and one more reason install documentation never references the bare name.
- **npm scope and org.** The `@lurker` scope has zero published packages, but org availability is unverified; claiming the npm org is the first M0 checklist item (section 5) and MUST happen before any name freezes.
- **GitHub org.** `lurker` is unavailable (a personal account holds it since 2008); the repo org will be a variant: lurker-dev, lurkerjs, or getlurker.
- **Documentation rule.** Docs and install commands MUST reference packages uniformly as `@lurker/<name>` and MUST NOT write the bare name `lurker` in install commands; the umbrella is referenced by its final resolved name only after the contingency closes.
- **Trademark.** Informal searches show no live conflict in software classes; formal USPTO/EUIPO clearance is a pre-1.0 gate alongside the license decision (12-release-versioning.md, section "The 1.0 gate").
- **Resolution deadline.** The contingency MUST be resolved, or consciously carried with a written founder decision, before v1.0.0 ships.

### 6.1 Naming checklist execution record (M0-T07)

Status as of 2026-07-06 (M0 bootstrap). Items (a) through (e) require founder-held accounts (npmjs.com, github.com) and remain open founder actions; the local scaffold does not block on them. The umbrella package is named `@lurker/lurker` in the workspace per the rule in 10-implementation-plan.md, section "Planning rules" (rule 1.4.1), until the unscoped contingency closes.

| Item | Status | Notes |
|---|---|---|
| (a) npm org/scope claim for `@lurker` | Pending founder execution | First checklist item; MUST precede any name freeze and the first placeholder publish |
| (b) GitHub org variant selection | Pending founder decision | Candidates: lurker-dev, lurkerjs, getlurker; repository creation (branch protection, squash-merge) follows |
| (c) Trusted-publisher entries per package | Pending founder execution | One entry per package on npmjs.com; entries created after 2026-05-20 must explicitly select allowed actions; completed at first publish |
| (d) Placeholder publish of `@lurker/core` (and others as capacity allows) at v0.1.0 | Pending founder execution | All packages are `"private": true` in the workspace; flip a package to publishable as part of its placeholder publish (rule 1.4.6 in 10-implementation-plan.md) |
| (e) Unscoped `lurker` contingency status | Recorded, unresolved | Squatted 2014 GPLv3 package; paths: dispute, transfer, or fallback (lurkerjs / lurker-ai / `@lurker/lurker`); tracked as OQ-24 |
| pnpm pin selection (rule from section 1.4) | pnpm 11.10.0 pinned | Newest 11.x at bootstrap; passes the local M0-T06 release dry-run (identical fixed-group versions; workspace:* and catalog: ranges convert at pack time). OIDC trusted publishing remains to be verified at the first CI publish, after (a) and (c) |

## 7. Risk register

Accepted toolchain risks, each with its revisit trigger and fallback. Reviewing this register is part of every milestone exit.

| Risk | Exposure | Revisit trigger | Fallback |
|---|---|---|---|
| tsdown maturity | Younger than tsup (about 500k vs 6M weekly downloads, early 2026), though on stable Rolldown 1.0 | Any blocking build or .d.ts bug | tsup (config-compatible) or plain tsc; both documented in section 1.6 |
| TS 7 / tsgo timing | 7.0 RC as of 2026-06-18; not yet full parity | First milestone after TS 7 GA (about Aug 2026) | Stay on 6.x; tsconfig is kept 7-ready so the switch is mechanical |
| pnpm 11 OIDC regression history | Early 11.0.x broke trusted publishing (404) | Any pnpm bump in the release workflow | Pin known-good pnpm in release.yml; bump only after verifying a publish dry run |
| ESM-only consumer floor | Excludes consumers below Node 22.12 that cannot require(esm) | Adoption data contradicting the assumption | None planned; moot given Node 20 EOL (2026-04-30) |
| Turborepo lock-in | None by design: thin layer over pnpm scripts | CI maintenance burden exceeding its caching win | Remove turbo.json; `pnpm -r run` fallback verified at M0 |
| MCP SDK v2 migration | v2 stable targeted 2026-07-27; v1 supported about 6 months after | v2 stable release | Pin ^1.29; migration logged as a post-M3 task (10-implementation-plan.md) |
| @ai-sdk/provider churn | V2 to V4 within about 18 months | Any provider major | Bridge pins exact major with runtime specificationVersion check; highest-churn package by policy (04-model-layer-spec.md) |

## 8. Contributor workflow

- **Branching.** Trunk-based: short-lived feature branches off `main`, merged by PR; no long-lived release branches pre-1.0. Branch names reference the task ID where one exists (for example `m2-t04-ref-entries`).
- **Commits.** Imperative subject of at most 72 characters; the body cites the IDs the change implements or amends (Mx-Tyy, FR-xxx, DEF-n, OQ-nn). Conventional-commits prefixes are not required: changesets, not commit messages, drive versioning.
- **Changesets.** Every user-visible change carries a changeset; breaking changes carry a BREAKING section with a migration note (12-release-versioning.md, section "Changelog format and migration notes"). CI enforces changeset presence on PRs.
- **Spec-first rule.** A PR that changes normative behavior MUST include (or follow) the docs/ amendment; the docs are the single source of truth and code never leads spec.
- **PR checks (all required).** Build, typecheck, lint, test matrix (22.x/24.x), pack gates (publint, attw), changeset presence, rolled-up .d.ts drift clean or reviewed. Task-level test obligations apply per 11-testing-strategy.md, section "What every task-level test must cover"; changes in DEF-n areas MUST include or update the named defect cassettes.
- **Review gates.** At least one approving review; PRs touching frozen fixtures, KeyDeriver profiles, or (post-freeze) the six SPI seam .d.ts rollups require an explicit second review and a pointer to the amending docs PR.
- **Docs contributions** follow the conventions of README.md: RFC 2119 keywords, ASCII hyphen only, no emojis, one H1 per file, sentence-case headings.
