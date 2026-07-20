# @rulvar/evals

## 1.26.0

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0
  - @rulvar/testing@1.26.0

## 1.25.0

### Patch Changes

- @rulvar/core@1.25.0
- @rulvar/testing@1.25.0

## 1.24.1

### Patch Changes

- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1
  - @rulvar/testing@1.24.1

## 1.24.0

### Patch Changes

- Updated dependencies [2b033e8]
- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0
  - @rulvar/testing@1.24.0

## 1.23.0

### Minor Changes

- 1f9c272: PlanRunner spawn telemetry, the missing evals export, and the conformance kit's new meta field (v1.22.0 review P2-5, P2-6, P1-2).

  - `@rulvar/plan`: PlanRunner journals every admission INSIDE a carrying entry (decomposition rows in escalation decisions, ladder-verdict respawns, reuse and graft links, revision admissions) and emitted no `spawn:admitted`/`spawn:rejected` at all; a live PlanRunner run with admitted roots showed an event count of zero. Every embedded admission row now announces through one formatter, identically on the live path and on replay absorb, with `replayed: true` on recovered rows, `entryRef` on the journaled carrying entry, and `agentType` resolved from the landed specs.
  - `@rulvar/evals`: `agentTypeRuleHolds` joins the package root next to `rungRuleHolds`, exactly as the v1.21.0 changelog had already announced; a public-API test now imports the checkpoint quartet from the root. The evals guide gains a full measured-value checkpoint section (ladder/pool/cell/arm vocabulary, both criteria, the vacuous-pass guard, cost discipline, a runnable example).
  - `@rulvar/store-conformance`: the meta round-trip case now also pins the new optional `RunMeta.segments` field, which the engine bumps durably at every resume to keep event `seq`/`spanId` unique per run.

### Patch Changes

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0
  - @rulvar/testing@1.23.0

## 1.22.0

### Patch Changes

- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0
  - @rulvar/testing@1.22.0

## 1.21.0

### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0
  - @rulvar/testing@1.21.0

## 1.20.0

### Patch Changes

- 9367030: `SpendEnvelope` rejects amounts at or above 2^49 micro-USD (about $562,949,953.42). The 4-ULP representation-noise window grows with magnitude and reaches half a micro-USD at that boundary, where the nearest integer stops being unique: a ceil debit could snap DOWN and admit an aggregate whose raw requests sum above the ceiling (the v1.19.0 review reproduced a sub-micro overshoot at a $570M cap). Out-of-domain caps and ceilings now throw a typed `ConfigError` that debits nothing. The class documents the exact input interpretation (a double within the noise window of an integer micro value IS that integer) and the honest raw-double bound (at most half a micro per admitted amount, the finest distinction double precision carries at the top of the domain); boundary and adversarial ULP-neighbor properties pin both.
- Updated dependencies [9367030]
  - @rulvar/core@1.20.0
  - @rulvar/testing@1.20.0

## 1.19.0

### Patch Changes

- 8cc9a9c: `SpendEnvelope` directed rounding survives dollar magnitudes and rejects out-of-domain amounts. The previous conservative-rounding fix snapped to the nearest integer micro-USD within a RELATIVE 1e-6 tolerance, which already reaches half a micro at $0.50 and turns directed rounding into round-to-nearest: two $0.5000004 authorizations (true sum $1.0000008) both fit a $1 cap, a $0.5000006 cap admitted a $0.500001 debit, and a `Number.MAX_VALUE` cap overflowed to `Infinity` micro where every authorization is admitted and `remainingUsd` is `NaN`. The snap window now scales with the ULP of `usd * 1e6`, so only genuine IEEE-754 representation noise snaps (0.1 + 0.2 against a 0.3 envelope stays a fit) while real sub-micro fractions keep the conservative floor (caps) or ceil (debits), and after conversion both the cap and every ceiling must be safe integers in micro-USD (at most $9007199254.740991), rejected otherwise with a typed `ConfigError` that debits nothing. Property tests now cover dollar magnitudes and the domain edges.
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0
  - @rulvar/testing@1.19.0

## 1.18.0

### Minor Changes

- 943962d: `SpendEnvelope` is now provably conservative at the representation boundary. Nearest rounding on both the cap and the debits let any positive ceiling below $0.0000005 round to a zero debit, admitting an unbounded number of authorizations past `maxTotalUsd`. Accounting stays integer micro-USD, but the cap now converts down (floor), every debit converts up (ceil, minimum one micro-USD), and a `maxTotalUsd` below $0.000001 is rejected as a `ConfigError`, so for any admitted sequence the sum of the original ceilings can never exceed `maxTotalUsd` and no positive ceiling ever debits zero. Amounts that are integer micro-USD up to float noise stay exact (0.1 + 0.2 against 0.3 remains a fit). Migration: an envelope constructed with a sub-micro cap now throws instead of admitting everything, and sub-micro ceilings now consume a full micro-USD each.
- 943962d: Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

  Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

  Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0
  - @rulvar/testing@1.18.0

## 1.17.0

### Minor Changes

- 7909b6b: Budget surfaces for sweeps and the canary (the v1.16.2 review P1-2).

  - New `SpendEnvelope(maxTotalUsd)`: the debit-only aggregate bound over a whole sweep. Every target, judge, and canary run authorizes its immutable per-run ceiling against it BEFORE starting (integer micro-USD accounting, so exact fits pass); a refusal throws the new `SweepBudgetError` before any provider work, and authorizations are never returned, not on completion, not on replay, not on CAS retries.
  - `runEvalCase`, `runEvalSuite`, and `runSweepMatrix` accept `envelope`; an envelope requires the matching per-run ceiling (`budgetUsd`, and `judgeBudgetUsd` once a grader judges), because an unbounded run under an aggregate envelope would be unaccountable.
  - Sweep cells now separate measurement from budget artifacts: a cell the envelope refused reports `envelopeExhausted`, a cell whose target runs hit their own ceiling reports `exhaustedRuns`, and neither emits a claim, so a budget-starved measurement can never become a false weakness belief about the model.
  - New `runCanary(engine, probes, { budgetUsd?, envelope? })` returns `{ fingerprint, allOk, probes }`: each probe run carries the optional immutable ceiling, and `allOk` is the drift-flip gate, because a non-`ok` probe fingerprints differently without the model having drifted. `canaryFingerprint` stays exported (now accepting the same options) for fingerprint-only callers.

### Patch Changes

- @rulvar/core@1.17.0
- @rulvar/testing@1.17.0

## 1.16.2

### Patch Changes

- @rulvar/core@1.16.2
- @rulvar/testing@1.16.2

## 1.16.1

### Patch Changes

- @rulvar/core@1.16.1
- @rulvar/testing@1.16.1

## 1.16.0

### Patch Changes

- Updated dependencies [5f76cf2]
  - @rulvar/testing@1.16.0
  - @rulvar/core@1.16.0

## 1.15.0

### Patch Changes

- Updated dependencies [4aee1f3]
  - @rulvar/testing@1.15.0
  - @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- Updated dependencies [6073226]
  - @rulvar/testing@1.14.0
  - @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- Updated dependencies [c28c4c0]
  - @rulvar/testing@1.13.0
  - @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0
  - @rulvar/testing@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
- Updated dependencies [0c70c5e]
  - @rulvar/testing@1.11.0
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0
  - @rulvar/testing@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [7577f8e]
- Updated dependencies [3a53383]
  - @rulvar/testing@1.9.0
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0
  - @rulvar/testing@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0
  - @rulvar/testing@1.7.0

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
  - @rulvar/testing@1.6.0

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2
  - @rulvar/testing@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1
  - @rulvar/testing@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0
  - @rulvar/testing@1.5.0

## 1.4.0

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0
  - @rulvar/testing@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2
  - @rulvar/testing@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1
  - @rulvar/testing@1.3.1

## 1.3.0

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0
  - @rulvar/testing@1.3.0

## 1.2.0

### Patch Changes

- 5ac56b4: Criterion 2 of the measured-value checkpoint gains the quality branch per the founder's OQ-09 amendment (2026-07-12): the card-informed arm passes by matching the baseline pass rate at no more than 105 percent of its cost, OR by beating it by at least 15 points at no more than 115 percent. The reopened gate measured plus 40 and plus 20 points at 107.9 and 106.6 percent: the baseline fails cheaply, so the flat cost bar tightened exactly when the card won on quality. The vacuous-pass guard stands unchanged; the rule now lives in the exported agentTypeRuleHolds next to rungRuleHolds.
- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0
  - @rulvar/testing@1.2.0

## 1.1.0

### Minor Changes

- 00f1ab5: M12-T01: the measured-value checkpoint harness (docs/05, section "Phases and placement"; the OQ-09 criteria). `runValueCheckpoint` executes the M12 gate as two A/B experiments under one fixed pool: criterion 1 (rung selection) runs every eval case per (ladder, taskClass) cell at the ladder's default start tier versus the tier recommended by `compileVerifiedLayer` over the store's claims, judging each recommended cell by the OQ-09 rule (equal-or-better pass rate at 90 percent of the cost, or five points better at cost) with unrecommended cells neutral for the majority but included in the pooled aggregate; criterion 2 (agentType selection) runs the same orchestrate-role cases with and without the knowledge store and requires the card-informed arm to match or beat the baseline pass rate within 105 percent of its cost. The checkpoint passes only when both hold; `renderCheckpointReport` produces the docs-ready record, and an unmeasured criterion 2 honestly counts as failed. The fixed mixed corpus (extraction, code-edit, judging; a seeded LCG keeps it byte-stable; the seed/eval split prevents leakage into the treatment arm) and the budget-guarded live Anthropic runner ship as repo scripts.

### Patch Changes

- 63b2c01: Two defects the first live M12 checkpoint run surfaced. The Anthropic capability table lacked a Haiku 4.5 entry, so the dated id fell through to the current-generation default and the adapter sent adaptive thinking, which that model rejects with a live 400 (every haiku run died at zero cost): `claude-haiku-4-5` (and its dated snapshots by the prefix rule) now resolves to the enabled-budget thinking form with real haiku pricing, meaning the default wire omits thinking entirely. And the checkpoint's criterion 2 could pass vacuously when both arms scored zero at zero cost (zero satisfies "at least equal at no more cost"): the card-informed arm must now win something real (nonzero n and pass rate) before the criterion can hold.
- 42050b5: The checkpoint's orchestrated arms take their own suite options (`orchestratedSuite`, defaulting to `suite`): the third live run showed the shared per-case budget starving the orchestrator cap math (a $0.10 run ceiling cannot host the default finalize reserve, so every orchestrate-role run died at OrchestratorCapConfigError before the first model call, at zero cost).
- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0
  - @rulvar/testing@1.1.0

## 1.0.0

### Minor Changes

- 6649e5f: M11-T01: the eval-committer identity activates eval-measured claims (docs/05, sections "Data model" and "Commit discipline", amended with the dedicated `eval-committer` GateRecord variant, distinct from the v2-reserved eval-confirmed proposal auto-gate).

  - Commit validation is now GATE-DRIVEN and the coherence square is schema-enforced in both directions: an eval-committer-gated op MUST carry class eval-measured, author kind eval-pipeline, and the metrics block; a human-gated op MUST NOT carry any of the three (a human-authored op with metrics keeps rejecting). Observational data never carries metrics and never auto-promotes.
  - `@rulvar/evals` ships the pipeline side: `evalMeasuredClaim` (the docs/05 TTL table applied by polarity: strength 90 days, weakness 30) and `commitEvalMeasured` with the documented CAS-rebase recipe against any ModelKnowledgeStore.

- eaacdeb: M11-T02: matrix sweeps (docs/05, section "Grounding and decay"). `runSweepMatrix` measures a FIXED pool (workflow x model x taskClass; sweep volume is never authorized by proposal volume) through the ordinary engine, sequentially in declaration order for deterministic cassette consumption, and aggregates per (model, taskClass) cell.

  - Threshold-crossing cells emit eval-measured claims (strength at or above 0.9, weakness at or below 0.5 by default; the mid band emits nothing): typed statement templates, metrics {passRate, n, graderId}, EvidenceRef eval reports with the case ids, confidence from n, the docs/05 TTL table from observedAt, and deterministic report-scoped claim ids.
  - With a store given, claims commit through the eval-committer identity (the M11-T01 gate); the sweep e2e records against fake adapters and replays hermetically from the cassette with zero live calls, byte-identical reports.

- 01d6b2d: M11-T04: modelEpoch capture and the canary fingerprint (docs/05, section "Grounding and decay"; OQ-06 CLOSED with the committed design).

  - Core: `modelEpochOf`/`capsHashOf` build the honestly coarse epoch signal (registry version, pricing version, caps hash; silent alias re-pointing stays a documented uncaught case absent probes). The ClaimOp union gains `mark_stale` (docs/05 amended): section 6 requires status stale at fingerprint drift and the closed op set could not produce it; active flips to stale, already-stale is an idempotent noop, terminals never revive.
  - Evals: `canaryFingerprint(engine, probes)` runs the FIXED caller-versioned probe set sequentially through the ordinary engine and hashes NFC-normalized, whitespace-collapsed outputs (the probe count prefixes the hash so probe-set edits never collide with drift). `flipStaleOnCanaryDrift` flips the model's active eval-measured claims whose recorded fingerprint differs, in one CAS-rebased command; claims without a baseline stay untouched. Sweeps stamp the epoch per pool member via `modelEpochFor`.

- e679c6e: M9-T02: the @rulvar/evals base (docs/09 section 7; docs/11 "Eval CI"; FR-5xx). First real public surface of @rulvar/evals, built strictly on the public APIs (L6).

  - `EvalCase = { workflow, args, graders[] }` exactly as documented, with `runEvalCase` and `runEvalSuite` runners: the target workflow runs as its own journaled run; latency is derived from run:start and run:end event timestamps (no separate measurement channel); duplicate workflow names disambiguate by ordinal.
  - Three grader families: `goldenGrader` (deep JSON equality with diff evidence), `rubricGrader` (named pure criteria, per-criterion verdicts, fraction score against a pass threshold), and `judgeGrader` (an LLM verdict against a schema). The judge runs THROUGH the engine via `GraderContext.judge` as an ordinary journaled, budgeted invocation, so judge calls are VCR-recordable and eval CI replays them deterministically with zero live calls. @rulvar/evals ships NO default judge model: weak judge defaults are forbidden by the router quality floors, so `model` is required. Judge invocations are skipped deterministically when the target run did not settle ok.
  - `runEvalMatrix` compares configuration cells (profile vs profile, cheap workers vs premium, reviewer on or off): each cell supplies its own engine and the report carries pass-rate, cost, and latency per cell from the existing usage and cost fields. No failure clustering, no vector dependency (EXC registry).
  - Acceptance held in-suite: a suite recorded through the VCR adapters replays byte-deterministically (latency excluded as the one wall-clock measurement) from the cassette under onMiss 'throw', and the cassette carries its hashVersion header (DEF-6).

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
- Updated dependencies [807d1f9]
- Updated dependencies [596a39b]
- Updated dependencies [464ab6e]
  - @rulvar/core@1.0.0
  - @rulvar/testing@1.0.0

## 0.9.0

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0
  - @rulvar/testing@0.9.0

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
  - @rulvar/testing@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
- Updated dependencies [10b45f1]
  - @rulvar/core@0.7.0
  - @rulvar/testing@0.7.0

## 0.6.0

### Patch Changes

- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [638d9a1]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0
  - @rulvar/testing@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0
  - @rulvar/testing@0.5.0

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
  - @rulvar/testing@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0
  - @rulvar/testing@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @rulvar/core@0.2.0
  - @rulvar/testing@0.2.0

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
  - @rulvar/testing@0.1.0
