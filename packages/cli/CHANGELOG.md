# @rulvar/cli

## 1.43.0

### Patch Changes

- Updated dependencies [71b7181]
  - @rulvar/core@1.43.0

## 1.42.0

### Patch Changes

- Updated dependencies [9b70f27]
  - @rulvar/core@1.42.0

## 1.41.0

### Minor Changes

- be589ec: Add the orchestrate acceptance policy and the CLI --strict flag (the v1.40.0 improvement plan's completion contract)

  Run status ok proves that finish validated, and nothing more: the model may
  call finish after any mix of child outcomes, so ok alone never proves the
  children succeeded. The new opt in OrchestrateOptions.acceptance turns that
  into a checked contract. childPolicy 'all-ok' requires every spawned child to
  have settled ok when finish validates (a child still running counts against
  it); { minSuccessful: N } tolerates failures beyond the first N successes.
  The verdict is journaled as one decision entry, so a resume rolls the same
  verdict forward, immune to drift of the live options. An accepted result
  becomes the acceptance envelope { result, completion, childStatusCounts,
  degradedReasons }; a violated policy fails the run with the typed
  FailRunError (code fail_run, data.source 'orchestrator_acceptance') instead
  of settling ok. Without acceptance nothing changes: the result value stays
  the raw finish payload and no new journal entry is written.

  The CLI pairs with the envelope: rulvar run --strict and rulvar resume
  --strict exit nonzero when a settled ok value reports completion 'partial',
  printing the degraded reasons (strictExitCode is exported for hosts). The
  guides also now state the adjacent contracts plainly: await_any and await_all
  return truncated TaskDigests rather than full child reports, cost totals are
  price registry estimates with usageApprox marking estimated usage, the
  fencing epoch covers journal appends while RunMeta and transcript blobs stay
  advisory projections, and data protection at rest is owned by the host.

### Patch Changes

- Updated dependencies [be589ec]
  - @rulvar/core@1.41.0

## 1.40.0

### Minor Changes

- cf33550: Fence the offline resolution append and surface approximate usage (v1.39.0 review)

  The CLI server's offline resolution path acquired a store lease but never
  threaded it into the Replayer, so the resolution append ran unfenced: if the
  process stalled past its lease ttl and a queue worker took the run over, the
  stale append could land alongside the new owner's writes. The append now
  carries the acquired lease, so a superseded owner is rejected with
  LeaseHeldError (HTTP 409) instead of racing the current owner.

  Approximate usage is now visible where the run is reported. usageApprox rides
  the agent:end and run:end events and the CostReport, and the CLI cost line
  marks an estimated total, so a total that includes usage estimated after a
  transport cut, a ceiling that severed a stream, or an abort is never shown as
  though it were the exact provider charge. The field is present only when true,
  so every exact usage report and event is byte for byte unchanged.

### Patch Changes

- Updated dependencies [cf33550]
  - @rulvar/core@1.40.0

## 1.39.0

### Patch Changes

- @rulvar/core@1.39.0

## 1.38.0

### Patch Changes

- @rulvar/core@1.38.0

## 1.37.0

### Patch Changes

- Updated dependencies [e6b1481]
- Updated dependencies [e6b1481]
  - @rulvar/core@1.37.0

## 1.36.0

### Minor Changes

- 101795b: Validate `createWorker` timers and make the TTL match promise executable (v1.35.0 review P2). `ttlMs` and `pollMs` must be integers between 1 and 2147483647 ms, refused typed at construction (an overflow or non finite cadence collapsed to the 1 ms interval floor and stormed the store). A store exposing the optional `leaseTtlMs` capability is verified against the worker ttl, a mismatch is a `ConfigError`, and an omitted `ttlMs` adopts the store's value.

### Patch Changes

- Updated dependencies [101795b]
  - @rulvar/core@1.36.0

## 1.35.0

### Patch Changes

- Updated dependencies [d4ac3bf]
  - @rulvar/core@1.35.0

## 1.34.0

### Patch Changes

- Updated dependencies [f1505ec]
  - @rulvar/core@1.34.0

## 1.33.0

### Patch Changes

- @rulvar/core@1.33.0

## 1.32.0

### Patch Changes

- @rulvar/core@1.32.0

## 1.31.0

### Patch Changes

- @rulvar/core@1.31.0

## 1.30.0

### Patch Changes

- Updated dependencies [87ce985]
  - @rulvar/core@1.30.0

## 1.29.0

### Patch Changes

- Updated dependencies [621d566]
  - @rulvar/core@1.29.0

## 1.28.0

### Minor Changes

- d98eb0b: The documented spaced syntax of numeric flags now reaches the canonical validation for negative values: `rulvar run wf --budget-usd -1` reports `--budget-usd must be a positive number` instead of the generic parseArgs ambiguity error (v1.27.0 review P3). The fold applies only to strictly numeric negative tokens after a numeric flag (`--budget-usd`, `--planning-budget-usd`); unknown option, duplicate flag, and missing value diagnostics are unchanged.

### Patch Changes

- Updated dependencies [d98eb0b]
  - @rulvar/core@1.28.0

## 1.27.0

### Minor Changes

- 884a433: The HTTP shell's SSE delivery is now complete and bounded per connection (v1.26.0 deep E2E review). A terminal settle closes connected streams only AFTER the segment's event pump has drained, so a client that keeps reading receives the full tail including the terminal `run:end` instead of a clean close that silently swallowed the backlog; when the pump itself failed, the close is preceded by an SSE comment saying the stream may be incomplete. New `maxPendingEventsPerClient` option (default 10000) bounds what any single SSE connection can accumulate unread, independently of the replay buffer: a consumer that stopped reading is unhooked at the bound and closed with an SSE comment naming it, the frames already queued stay readable, and the standard `Last-Event-ID` reconnect resumes strictly after the last frame the client consumed; a replay longer than the bound is delivered the same way, in bounded chunks across reconnects, so pending memory per connection is O(bound) while delivery stays at least once. `createServer` now validates its numeric caps at construction with a typed `ConfigError` (`maxTrackedRuns` accepts non negative safe integers, `maxBufferedEventsPerRun` and `maxPendingEventsPerClient` accept positive safe integers): `NaN` used to silently mean unbounded, `Infinity` looked like a cap without capping, and negative or fractional values produced policies nobody asked for. The barrel additionally exports `DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT` and the referenced types `KbSweepCliConfig`, `LoadedWorkflowModule`, and `OtelContextApi`, so every public signature resolves in the API docs.

### Patch Changes

- Updated dependencies [884a433]
  - @rulvar/core@1.27.0

## 1.26.0

### Minor Changes

- a4fc757: The HTTP shell decouples process memory from durable retention (v1.25.0 scale review): new `memoryRetention` predicate and `maxTrackedRuns` cap release a settled run's tracked state (args, outcome, handle, SSE buffer) while the journal and transcripts stay, and new `maxBufferedEventsPerRun` bounds each run's SSE replay buffer (oldest events dropped in chunks and counted; a replay that lost events carries an `x-rulvar-events-dropped` header, and a client whose cursor predates the retained window gets a leading SSE comment naming the first retained seq). The `Last-Event-ID` cursor is now a binary search over the seq ordered buffer and the replay streams by index (no buffer copy); a cursor seq the buffer does not hold replays everything strictly after it instead of re-flooding the whole buffer, which remains at least once. The queue worker sweeps candidates only (`listRuns({ statuses: ['running', 'suspended'] })`, widened to the full catalog only when durable `retention` needs terminal metas), never overlaps sweeps, keys its suspended skip cache and its poison set to the run's generation (`RunMeta.genesis`) so a `deleteRun` and recreate of the same runId is picked instead of skipped, and drops skip and poison entries for runIds that left the candidate set. Point lookups in `resume`, `inspect`, the kb gate, and the server status path go through the store's exact lookup capability when present.

### Patch Changes

- Updated dependencies [a4fc757]
  - @rulvar/core@1.26.0

## 1.25.0

### Patch Changes

- 74851ed: CLI diagnostics stop echoing `--args` values and sanitize every dynamic value they embed. The invalid-JSON and non-canonical-JSON refusals now name the failure class and the way out without repeating the supplied value (workflow args may carry private data, and stderr routinely lands in CI logs). Every typed CLI error prints through one site that strips terminal control sequences, and the plain-output run renderers (outcome reports, dry-run previews, suspension prompts, resume warnings, plan lint diagnostics) sanitize untrusted text the same way the live TUI already does, so a hostile runId, suspension key, provider error message, or model ref cannot recolor, retitle, or rewrite the terminal. Exit semantics are unchanged.
  - @rulvar/core@1.25.0

## 1.24.1

### Patch Changes

- 0bb14db: Close a resume args-gate bypass through JSON numeric overflow (v1.24.0 review P2-1). A `--args` value that overflowed JavaScript's finite range (`1e400` parses to `Infinity`) could not be canonicalized, so genesis recorded the args binding with `argsProvided` but no hash, and a later `resume` supplying entirely different args slipped past the gate with only a warning, silently changing the logical run and re-paying every args-dependent call. `rulvar run` and `rulvar resume` now reject non-finite (non-JCS) `--args` at parse time, before any config, store, or adapter loads. Independently, when a run recorded `argsProvided` without a verifiable hash (an in-process host that started it with genuinely non-JCS args), a `resume` supplying args is now a typed refusal unless you pass `--allow-args-change`, instead of the previous soft warning. Core engine policy is unchanged: in-process hosts may still pass non-JCS args and record presence without a hash.
- Updated dependencies [0bb14db]
  - @rulvar/core@1.24.1

## 1.24.0

### Minor Changes

- 2b033e8: Make `rulvar resume` safe against forgotten or changed args and add a `--dry-run` preview (the v1.23.0 review: a resume without `--args` silently changed the logical run and paid again). The resume grammar gains `--dry-run` and `--allow-args-change`. Before the engine starts, the CLI verifies the supplied args against the genesis binding recorded in `RunMeta`: forgetting `--args` on a run started with them, adding them to a run started without them, or supplying a different value is a typed refusal naming `--allow-args-change` as the deliberate override; runs recorded before v1.24.0 carry no binding and demand explicit `--args` or the override. `--dry-run` passes the engine's replay-strict mode through and prints the resume preview (hits, misses, reruns, skipped, orphaned effect roots, invalid resolutions) plus what the run would settle as, with zero journal or meta writes and zero adapter calls; a preview that reaches work needing a live call reports the stopping point and exits 0. `rulvar inspect` now prints the args binding.

### Patch Changes

- Updated dependencies [2b033e8]
  - @rulvar/core@1.24.0

## 1.23.0

### Patch Changes

- 1f9c272: The renderers' remaining unsanitized paths and the malformed-event gaps (v1.22.0 review P2-2, P2-3).

  - `progress()`: the error text surfaced when the SOURCE fails (a rejected `RunHandle.result`, a rejected `Promise<RunHandle>`, a throwing iterable) went to the sink raw; a crafted rejection could inject ANSI, forge lines, and leak a key-shaped fragment. Every catch path now routes through one helper that secret-masks FIRST (the thrown value never crossed the event masking boundary) and terminal-sanitizes second; lines mode prints the notice as its own sanitized line instead of dropping it.
  - Malformed recognized events from a raw iterable can no longer stop a view: every dynamic field in the `progress()` reducer, its lines formatter, `renderProgress`, and the CLI `renderEventLine` is read through typed guards (a hostile object with a throwing `toString` included), a backstop catch skips a bad event with a bounded diagnostic carrying no untrusted data, and the stream continues. The v1.22.0 claim of full defensive reads was narrower in reality (`agent:stream` without `delta` or `phase:start` without `phase` stopped the raw-iterable view); it is true now and pinned by a table-driven test over every consumed type.
  - `posIntOption` wording: a below-minimum value CLAMPS to the minimum (only non-finite values fall back to the default); the JSDoc said "falls back" for both.
  - `@rulvar/cli` build config migrates the deprecated tsdown `external` option to `deps.neverBundle`; the packed dist keeps the companion specifiers external, byte-for-same behavior.

- Updated dependencies [1f9c272]
  - @rulvar/core@1.23.0

## 1.22.0

### Patch Changes

- 77b554f: Sanitize the CLI event line renderer (`renderEventLine`, used by `attachProgress`): every composed line passes through the shared `sanitizeTerminalText` before it reaches the terminal, so an untrusted provider/tool/log string in an event can no longer inject a control sequence or a second physical line into CLI output (v1.21.0 review P2-1). Clean lines stay byte-identical.
- Updated dependencies [77b554f]
  - @rulvar/core@1.22.0

## 1.21.0

### Patch Changes

- Updated dependencies [7ee42a0]
  - @rulvar/core@1.21.0

## 1.20.0

### Patch Changes

- Updated dependencies [9367030]
  - @rulvar/core@1.20.0

## 1.19.0

### Patch Changes

- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
- Updated dependencies [8cc9a9c]
  - @rulvar/core@1.19.0

## 1.18.0

### Minor Changes

- 943962d: Sweep and suite reports are now monotone: paid evidence survives every budget refusal. Previously `runSweepMatrix` caught the envelope's `SweepBudgetError` around a whole cell and replaced it with an empty `envelopeExhausted` row, erasing already completed targets and their cost; a judge refused by the envelope erased the paid successful target the same way; and a judge run that hit its own per-run ceiling threw `EvalJudgeError` out of the entire matrix, losing every accumulated cell.

  Now: `runEvalSuite` returns partial results with `plannedN`, `completedN`, and a typed `refusal` marker instead of throwing when the envelope refuses a target; a judge budget event (per-run ceiling exhaustion or envelope refusal) normalizes into the owning `EvalCaseResult` as `incomplete: { reason: 'judge-exhausted' | 'judge-refused' }` with the failing judge run's actual cost counted, while non-budget grader errors still throw; `SweepCellReport` gains `plannedN`, `judgeIncompleteRuns`, `incompleteReason`, and `refusedRunLabel`, and any incomplete cell (n < plannedN, exhausted targets, unfinished judges, or an envelope refusal) emits no claim; `runCanary` records an envelope-refused probe as `status: 'refused'` and keeps walking, so completed probe evidence survives and `allOk` stays the drift-flip gate; `EvalJudgeError` carries `costUsd`. The `kb sweep` human renderer prints incomplete cells explicitly (`INCOMPLETE: envelope refused ... after N of M case(s)`, unfinished-judge counts, refused-probe counts) instead of pretending nothing ran.

  Migration: `runSweepMatrix` and `runEvalSuite` no longer throw `SweepBudgetError` for refused targets or judges; read `EvalSuiteResult.refusal`, `EvalCaseResult.incomplete`, and the new cell fields instead. Cells now always carry `plannedN`.

### Patch Changes

- Updated dependencies [943962d]
  - @rulvar/core@1.18.0

## 1.17.0

### Minor Changes

- 7909b6b: Every paid CLI surface is now budget-bounded, and the grammar ignores nothing (the v1.16.2 review P1-1, P1-2, P2-1, P3-1).

  - `rulvar plan` gained separate immutable ceilings for its two paid runs: `--planning-budget-usd N` freezes as the planning run's B0 at its journal's genesis (`PlanOptions.run.budgetUsd`) and `--budget-usd N` caps the execution run exactly like `rulvar run`. A machine-written workflow never runs unbounded silently: missing ceilings fail loudly unless `--allow-unbounded` waives them explicitly, and `--dry-run` beside `--budget-usd` is a contradiction, not an ignorable leftover.
  - `rulvar kb sweep` requires `kbSweep.budgets` (`{ targetUsd, judgeUsd, canaryUsd, maxTotalUsd }`) or an explicit `kbSweep.allowUnbounded: true`: every target, judge, and canary run carries an immutable per-run ceiling, the whole sweep authorizes against the debit-only `maxTotalUsd` envelope (falsification pool growth included), the worst-case authorized spend prints before the first provider call, and envelope-refused or ceiling-exhausted cells report honestly and emit no claim. Canary drift flips claims stale only when every probe settled `ok`, so a budget-starved or transiently failing probe can never blame the model.
  - The canonical grammar is one data structure now: `--help`, every per-command usage error, and the documented grammar block render from it and are locked together by tests. Nothing accepted is ignored: `resume` rejects `--budget-usd` and `--profile` at parse time (the ceiling is immutable from genesis by the documented budget invariant), every command enforces exact positional arity, duplicate value flags fail, and unknown options report as ConfigError usage lines instead of raw parseArgs stack traces. All rejections happen before any config, store, or adapter loads, with zero provider calls and byte-identical journals.

### Patch Changes

- @rulvar/core@1.17.0

## 1.16.2

### Patch Changes

- 9f07130: The published CLI now actually loads its command-local optional companions. The build had been inlining `@rulvar/planner`, `@rulvar/plan`, and `@rulvar/evals` into local chunks, so the packed `rulvar plan` failed with a false "install @rulvar/planner" even with the planner installed (the inlined eslint broke at load time and a bare catch reported it as missing), while `rulvar kb inbox` ran without `@rulvar/plan` installed, against the documented dependency contract. The three companions are external again (dist keeps the real `import("@rulvar/...")` specifiers, the planner's worker sandbox loads from the installed package, and the CLI dist shrinks from megabytes to about 82 kB), and import failures are classified: only a genuine module-not-found for the requested companion produces the install hint, while an installed companion that fails to initialize surfaces its own error with the cause preserved. A packed-consumer E2E matrix (`scripts/cli-smoke.mjs`) now gates releases on exactly this behavior.
  - @rulvar/core@1.16.2

## 1.16.1

### Patch Changes

- fac1ecc: Mark eslint's optional TypeScript-config loader `jiti` as external in the CLI bundle. The bundled eslint (pulled in through @rulvar/planner's programmatic `Linter`) lazily imports `jiti` only on its config-file loading path, which the CLI never executes; the import now stays an import instead of producing UNRESOLVED_IMPORT build warnings. No runtime behavior change.
  - @rulvar/core@1.16.1

## 1.16.0

### Patch Changes

- @rulvar/core@1.16.0

## 1.15.0

### Patch Changes

- @rulvar/core@1.15.0

## 1.14.0

### Patch Changes

- @rulvar/core@1.14.0

## 1.13.0

### Patch Changes

- @rulvar/core@1.13.0

## 1.12.0

### Patch Changes

- Updated dependencies [46edcc0]
  - @rulvar/core@1.12.0

## 1.11.0

### Patch Changes

- Updated dependencies [0c70c5e]
  - @rulvar/core@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [0e8d78e]
  - @rulvar/core@1.10.0

## 1.9.0

### Patch Changes

- Updated dependencies [3a53383]
  - @rulvar/core@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies [25724b5]
- Updated dependencies [57ea1de]
- Updated dependencies [7884ec5]
- Updated dependencies [52db30d]
  - @rulvar/core@1.8.0

## 1.7.0

### Patch Changes

- Updated dependencies [45285aa]
- Updated dependencies [2f20d1d]
- Updated dependencies [22f65a8]
- Updated dependencies [2ddfa29]
- Updated dependencies [2abd9c2]
- Updated dependencies [1c1175d]
  - @rulvar/core@1.7.0

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

## 1.5.2

### Patch Changes

- Updated dependencies [54936a0]
  - @rulvar/core@1.5.2

## 1.5.1

### Patch Changes

- Updated dependencies [6c6d56f]
  - @rulvar/core@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [4fba3c7]
- Updated dependencies [8655c0f]
  - @rulvar/core@1.5.0

## 1.4.0

### Minor Changes

- c4f563d: Production readiness fixes from the July 2026 full audit.

  - The `budgetUsd` ceiling now survives resume: the engine records it in `RunMeta.budgetUsd` and restores it on every resume, so the replayed spend counts against the original invocation's bound and `ResumeOptions` still exposes no way to raise it. Journals written before the field existed (or read through a store that drops optional `RunMeta` fields) resume uncapped, exactly as before; the conformance kit gains a round-trip check so custom stores cannot drop the field silently.
  - `spawn:rejected` and `resolution:applied` / `resolution:superseded` are now emitted: live admission rejections carry the rejection `code`, `agentType`, and the journaled decision `entryRef` (absent only for pre-admission config gates), and live resolution attempts report winning or losing the first-closing-wins fold. `spawn:admitted` now carries the decision `entryRef` and the admitting `verdict` arm. The `orchestrator:budget` union member now types the two payload shapes actually emitted; `journal:compat` stays declared but unemitted (the scan runs before a run's event stream exists) and its TSDoc says so.
  - `toOtel` implements real parent-child span nesting when `contextApi` and `setSpan` are passed; without them spans stay flat but attributed.

  - `'readonly'` isolation now compiles a deny rule for tools declaring risk `write` or `destructive` into the spawn's permission chain, exactly as the tools guide documents; read tools and other isolation modes are unaffected.
  - VCR `replay()` refuses a cassette recorded outside the engine's hashVersion support window (`[CURRENT-1, CURRENT]`) with a typed `ConfigError` instead of silently drifting; in-window cassettes replay as before.
  - `InMemoryStore` accepts `{ quiet: true }` to opt out of the durability warning, and the warning text now states the precise truth: nothing survives a process exit and cross-process resume is impossible (same-process resume of a kept instance works). `createTestEngine` constructs its store quietly, so the blessed offline tier no longer prints a misleading warning.
  - The bare `Date.now()` / `Math.random()` development warnings no longer blame workflow code for calls that originate in library internals (the engine's own retry jitter, provider SDKs): the retry jitter uses a natively captured `Math.random`, and the in-process guard skips callers that live under `node_modules`.
  - `rulvar run --profile` now applies the profile's per-role effort hints: entries in `defaults.routing` that carry no effort are seeded from `RunProfile.effortByRole` (an explicit host effort always wins; ladder entries and unrouted roles stay untouched).
  - `rulvar --help` documents the shipped `kb inbox` and `kb gate` subcommands.
  - The unscoped `rulvar` pointer package ships TypeScript declarations (`index.d.ts` with a `types` export condition), so strict TypeScript projects can import the bare name; the install smoke gate now packs and checks the pointer alongside the umbrella.

### Patch Changes

- Updated dependencies [c4f563d]
  - @rulvar/core@1.4.0

## 1.3.2

### Patch Changes

- ddef383: Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
- Updated dependencies [ddef383]
  - @rulvar/core@1.3.2

## 1.3.1

### Patch Changes

- 7d1552e: Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
- Updated dependencies [7d1552e]
  - @rulvar/core@1.3.1

## 1.3.0

### Minor Changes

- 969974f: rulvar kb inbox (M12-T03): aggregates kb_propose-born proposals from finished runs through the RunLedger fold behind the LedgerExport seam. Matching (subject, taskClass, polarity) triples group for display ONLY (the command writes nothing, authorizes no spend and schedules no sweeps); each proposal renders with full provenance (initiating run identity, proposal entryRef, lineage, tier, trigger, evidence refs) plus the typed template statement a gated claim would carry; proposals of runs finished more than fourteen days ago expire out of the view. This is the human review surface, so the quarantined note and concrete model names render here verbatim, exactly like kb list.
- 64aff88: rulvar kb gate (M12-T04, the closing task of ModelKnowledge phase 3): the human gate flow turning one inbox proposal into a human-editorial claim. The attribution attestation is mandatory by construction (without --ruled-out over the closed checklist the GateRecord does not assemble and nothing is written; contrast evidence rides --contrast-run or --contrast-eval); the born claim carries the typed template statement (never the quarantined note), origin provenance back to the proposing run and entry, evidence resolving into that run's journal, and the editorial TTL. The commit is CAS against the per-project rulvar.models.json, whose git review is the authenticating gate. Non-proposal entries, expired proposals (fourteen days from the run's terminal updatedAt), running runs and already-gated proposals reject with typed errors.

### Patch Changes

- Updated dependencies [7d1a287]
  - @rulvar/core@1.3.0

## 1.2.0

### Patch Changes

- 154507b: TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
- Updated dependencies [3bfaec0]
- Updated dependencies [890f42c]
- Updated dependencies [154507b]
  - @rulvar/core@1.2.0

## 1.1.0

### Patch Changes

- Updated dependencies [d16b04a]
  - @rulvar/core@1.1.0

## 1.0.0

### Minor Changes

- 93eae2c: M10-T04: `rulvar kb list` (docs/05, section "Read path"; docs/06, section 10.5). The second consumption path: claims of the per-project store (./rulvar.models.json) render with full provenance for the humans who author ladders, floors, and profiles: author and gate identity, evidence refs (journal seqs and eval reports), metrics when present, supersede chains, proposal origin, and the TTL state (holds or EXPIRED) per the docs/05 decay table. No run and no pin are involved, so the maintenance view names models verbatim; only in-run cards are nameless. The grammar members `kb inbox` (phase 3, M12) and `kb sweep` (phase 2, M11) fail loudly naming their phases until they ship.
- fef6263: M11-T05: `rulvar kb sweep` (docs/05, section "Grounding and decay"). Falsification sweeps run manually, from CI, or from a user cron, never engine-scheduled, configured by the `kbSweep` section of rulvar.config.mjs (committerId, the FIXED model pool, taskClass-tagged eval cases, optional thresholds and canary probes; @rulvar/evals loads dynamically like @rulvar/planner does for plan).

  - The falsification guarantee: the matrix is the configured pool UNIONED with every model carrying an active, unexpired negative claim, plus the re-measurement queue (expired active eval claims); the pool renders with each member's origin.
  - With canary probes configured, every pool member fingerprints BEFORE measurement and drift flips its eval claims to stale in place; the sweep then re-measures and commits threshold-crossing claims through the eval-committer identity, reporting cells, emitted claims, and the committed store version.

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

## 0.9.0

### Minor Changes

- 65c7b2c: M8-T01: createServer, the HTTP shell (docs/02 section 8.2; FR-702), plus the Engine.stores seam it stands on (docs/06 10.2, M8 entry amendment).

  - `@rulvar/cli`: `createServer({ engine, workflows })` returns `{ fetch(req: Request): Promise<Response> }` with the five canonical routes: POST /runs (start a registered workflow), GET /runs/:id (status and outcome), GET /runs/:id/events (SSE; Last-Event-ID maps to the event seq, replay is at-least-once and consumers deduplicate on `replayed`), POST /runs/:id/external/:key (programmatic resolution, `by: 'external'`; a run that settled suspended in-process auto-resumes; a run not live in this process gets the documented offline append under a lease where the store is leasable, and resumes on a worker), GET /runs/:id/cost (the settled in-process CostReport, or the pure journal fold priced by the optional `priceUsd`). Authentication stays host middleware (docs/14, OQ-16).
  - `@rulvar/core`: the Engine interface gains the readonly `stores` accessor exposing the configured journal and transcript stores; exactly the instances createEngine received (or defaulted), no store contract widens.
  - `@rulvar/testing`: `createTestEngine` forwards the new `stores` accessor.

- a2a3243: M8-T02: createWorker, the queue shell (docs/02 section 8.3; FR-703), plus the two queue seams it stands on (docs/06 10.2 and docs/03 12.3, M8 entry amendment).

  - `@rulvar/cli`: `createWorker(engine, { store: LeasableStore, concurrency? })` leases resumable and suspended runs via acquire/renew/release with fencing epochs (renew cadence ttl/3; Appendix A reference ttl 60000 ms; concurrency default 1). A store without lease capability is a typed ConfigError at start, never a silent split-brain; leasing a store other than `engine.stores.journal` is equally a ConfigError. DEF-6 repeats at acquire: a journal outside the hashVersion window releases the lease and poisons the run for this worker. Stateless workers call bare `engine.resume` with the lease; unchanged suspended runs are skipped until their journal grows; queue semantics stay honestly at-least-once with deduplication by the journal. The OQ-21 residual (original in-process args are not journaled) is bridged by the optional `argsFor` hook.
  - `@rulvar/core`: `ResumeOptions.lease` carries the worker's lease through the kernel's single append site, so a stale writer's appends are rejected by the fencing epoch and never become visible (lease theft impossible by construction); bare `engine.resume(runId)` now falls back from the persisted CompiledWorkflow source to `defaults.workflows[workflowName]` (the registry the queue worker resolves through, docs/06 10.4); the Replayer accepts the lease option.

- f920013: M8-T03: the multi-process seam soak and the queue-failover-during-forced-finish cassette (the DEF-7 final cassette; docs/09 sections 6.9 and 6.10; docs/10 section 3.9 exit criteria).

  - `@rulvar/plan`: the public `runQueueFailoverDuringForcedFinish` cassette runner: worker A loses its lease strictly between the cap decision and the final wake; worker B reclaims with a bumped fencing epoch and rolls the forced finish forward. The stale writer's appends are rejected and invisible, exactly one cap decision exists, finalization is paid once. The LeasableStore is injected (`QueueFailoverDeps.makeStore`) so the package stays core-only; the replay test and the record script supply the reference SqliteStore.
  - `@rulvar/cli`: the multi-process-fencing-soak harness: two workers over one SqliteStore file with kill/failover across the suspension, plan-revision, and forced-finish boundaries; every round asserts zero split-brain and zero double pay. Worker hardening: a failed renew now frees the concurrency slot immediately (a stale run whose landings all reject may never settle; fencing, not the stale process's cooperation, protects the journal).
  - Repo: `cassettes/queue-failover-during-forced-finish.json` recorded and frozen (double-run agreement; `scripts/record-m8-cassettes.mjs`); the queue-mode limitation stays documented (no distributed cross-process rate limiter, EXC-14/OQ-17).

- ebc8101: M8-T04: the redaction and retention interim rules executed (docs/14 OQ-20 and OQ-22; docs/09 section 8 rewritten to the executed state; docs/03 12.4 and 12.8; docs/06 10.1 and 10.2 amendments).

  - `@rulvar/core`: the L0 SerializationHook (`createEngine({ serialization })`): redact/encrypt at the append/put boundaries, symmetric on load/get, applied by wrapping the stores so `Engine.stores` exposes the one policy point; kernel ordering fields are drift-checked with a loud ConfigError. Default key masking at the telemetry boundary: every emitted WorkflowEvent passes `maskSecrets` (provider keys, PATs, bearer tokens, JWTs, private-key blocks become `[masked-secret]`); opt out via `redaction: { maskEvents: false }`; never touches the journal. Retention: `TranscriptStore.delete(ref)` joins the SPI (missing ref is a no-op; InMemory and File stores implement it), `Engine.deleteRun(runId)` cascades blob deletion before the journal (no orphan transcripts), and `Engine.pruneRun(runId)` deletes checkpoint blobs of ok-terminal attempts that nothing else references (parked, cancelled, escalated, and hanging attempts keep theirs).
  - `@rulvar/cli`: `createServer` and `createWorker` take the opt-in `retention` predicate over RunMeta (the server applies it at terminal settles, the worker during sweeps under a brief lease); the OTel exporter masks string span attributes with the same policy, defense in depth over the already conservative attribute content policy.
  - `@rulvar/testing`: `createTestEngine` forwards `deleteRun`/`pruneRun`.

### Patch Changes

- Updated dependencies [84f94d4]
- Updated dependencies [65c7b2c]
- Updated dependencies [a2a3243]
- Updated dependencies [ebc8101]
  - @rulvar/core@0.9.0

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

## 0.7.0

### Minor Changes

- 10b45f1: M6-T11: the rulvar plan command and the M6 gating cassettes. `rulvar plan "<goal>" [--dry-run]` (the canonical grammar) loads @rulvar/planner DYNAMICALLY (the CLI's static dependency stays @rulvar/core; a missing install is a clear error), plans against the host-config engine, prints the accepted script plus its advisory diagnostics, and runs it in the worker sandbox unless --dry-run. The three docs/09 6.10 gating cassettes are recorded on the FakeAdapter and committed under the frozen-fixture lock with exported scenario builders shared by the recorder script and the replay tests: sandbox-determinism (two fresh runs of one CompiledWorkflow produce byte-identical normalized journals matching the cassette), planner-self-repair (the failing draft round-trips through the JSON-diagnostics repair, re-planning from the committed journal is free, and the accepted script executes deterministically in the sandbox), and orchestrator-crash-resume (the committed pre-crash journal plus boundary checkpoints resume with zero re-paid spawns, no duplicate spawn decisions, and byte-stable handles).

### Patch Changes

- 9f000a7: Drop the @rulvar/planner peer declaration from the CLI: the plan command loads the planner DYNAMICALLY and reports a clear error when it is not installed, and a workspace peer dependency would major-cascade the whole fixed group on every planner bump under the changesets peer-dependents rule (0.6.0 would have released as 1.0.0 instead of 0.7.0).
- Updated dependencies [fd1d06c]
- Updated dependencies [6fcf296]
- Updated dependencies [dcc97a9]
- Updated dependencies [434dc83]
- Updated dependencies [03173c1]
- Updated dependencies [11c0afc]
  - @rulvar/core@0.7.0

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

- 9234dc8: M5-T03 cost reports. The CostReport builder moves to its own module
  (`engine/cost-report.ts`) and report totals become the LEDGER FOLD
  totals at settle: RunOutcome.usage and cost.totalUsd are computed from
  the journal's terminal entries (the same summation the kernel budget
  seed uses), so report totals equal ledger fold totals exactly, live and
  across resume, by construction. The new `costReportFromJournal(entries,
priceUsd)` is the pure fold for STORED runs: byModel and totals from
  terminal servedBy with abandoned subtrees contributing zero; phase,
  agentType, and role attribution are live-run facts that entries do not
  carry (byRole and the orchestrator block complete in M7 per DEF-7).
  Unpriced models keep surfacing, never as silent zeros. `rulvar inspect`
  gains the cost view (total, byModel, unpriced) over the config-assembled
  price function (table wins over caps.pricing), and live run output
  prints the byModel/byPhase buckets.
- 8a41656: M5-T07 RunProfile presets and M5-T08 OTel exporter.

  - `engine/run-profiles.ts`: `RUN_PROFILES` (fast/standard/deep/ultra) and
    `runProfile(name)` ship the presets as pure DATA, bundles of per-role
    effort hints, per-run concurrency, budget, permission preset, and
    spawn limits, with no functions and no named model strings (named
    strong defaults stay in the umbrella). They are never engine
    semantics: a source-scan test asserts the engine has zero branches
    keyed on profile names. `rulvar run --profile <name>` applies the
    chosen profile UNDER the host's own engine options (host always wins;
    the engine then sees only ordinary options), compiling the profile's
    permission preset into the engine deny/ask layers as data.
  - `@rulvar/cli` gains `toOtel(run, tracer)`: it maps a settled run's
    spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
    child), with rulvar.* and gen_ai.* attributes, start/end timestamps
    from the lifecycle events, and payload-only events attached as span
    events. Prompts, completions, and tool payloads are NEVER exported;
    replayed events never create duplicate spans. `@opentelemetry/api`
    ^1.9 is an optional peer dependency and the exporter is typed against
    a minimal structural TracerLike, so an absent OTel package never
    breaks the CLI.

### Patch Changes

- 5c8865d: M5 exit criterion coverage: prove the CLI works end to end against
  SqliteStore, not only JsonlFileStore (docs/10, section 3.6). A host
  config that supplies a SqliteStore as `engineOptions.stores.journal` is
  honored by the CLI's engine assembly (JsonlFileStore is only the default
  fallback), so run/suspend, runs ls, resume, and inspect all round-trip
  against sqlite through the same command paths. Added as a CLI e2e test.
- Updated dependencies [fa05007]
- Updated dependencies [9234dc8]
- Updated dependencies [644512c]
- Updated dependencies [8a41656]
- Updated dependencies [02f7f7a]
  - @rulvar/core@0.6.0

## 0.5.0

### Patch Changes

- Updated dependencies [ac274f4]
- Updated dependencies [5735d92]
- Updated dependencies [46ca98e]
- Updated dependencies [8ae129e]
- Updated dependencies [d1c4525]
- Updated dependencies [b840aba]
  - @rulvar/core@0.5.0

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

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @rulvar/core@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
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
  - @rulvar/core@0.1.0
