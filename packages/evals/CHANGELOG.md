# @rulvar/evals

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
