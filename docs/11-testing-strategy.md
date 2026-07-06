# Testing strategy

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: the test pyramid and its policies: the mandatory content of every task-level test, the FakeAdapter unit tier, the store and adapter conformance kits, frozen journal fixtures, VCR cassette recording and redaction rules with the live contract-test cadence, replay-strict regression gates, eval-CI determinism, coverage expectations, property-based testing targets, and the per-milestone exit criteria.

This document is the testing policy companion to 09-observability-testing-spec.md, which owns the normative test harness APIs (section "Test harness three tiers") and the canonical cassette catalog (section "Mandatory defect cassette catalog"). Tooling choices (Vitest 4, CI shape) are committed in 13-toolchain-repo.md, section "Committed toolchain". Milestone and version references follow the map in 10-implementation-plan.md, section "Milestone-version table".

## 1. Pyramid and tooling

The pyramid has six tiers, cheapest and most numerous at the bottom:

1. Unit tier: FakeAdapter-driven tests of public behavior; zero network (section 2).
2. Conformance tier: executable kits for stores and adapters (section 3).
3. Frozen journal fixtures: hashVersion and identity golden tests (section 4).
4. Cassette tier: VCR record/replay at the adapter boundary, plus cron-scheduled live contract tests (section 5).
5. Replay-strict tier: deterministic re-execution of journals with zero live calls (section 6).
6. Eval CI: quality measurement through @lurker/evals, deterministic via cassettes (section 7).

Tooling rules:

- All tests run under Vitest 4.x. There MUST be exactly one root `vitest.config.ts` using `test.projects` with a `packages/*` glob; per-package Vitest configs are forbidden. A single `vitest run` at the repository root executes every project.
- The default CI test job MUST perform zero network I/O. Live traffic is confined to the scheduled contract-test workflow (section 5.3) and scheduled eval sweeps (section 7).
- Property-based tests SHOULD use fast-check as a dev-only dependency; it MUST NOT appear in any published package's dependency tree.

### 1.1 What every task-level test must cover

Every implementation task Mx-Tyy (10-implementation-plan.md, section "Per-milestone task breakdowns") MUST ship tests satisfying all of the following before the task is done:

- Each acceptance criterion of the task is exercised through public API only. Tests MUST NOT reach into module internals; if a behavior cannot be observed through public API plus the event stream plus the journal, the spec is missing a surface and MUST be amended first.
- The tests run with zero network, using FakeAdapter or cassette replay.
- If the task touches journaled state, the test MUST assert the journal shape (entry kinds, stored statuses, seq ordering, scope paths and ordinals where relevant) and then re-run the same scenario under replay-strict, asserting zero live calls (JournalMissError on any miss).
- If the task implements DEF-n normative content, the named defect cassettes for that DEF-n (09-observability-testing-spec.md, section "Mandatory defect cassette catalog") MUST be implemented and green in the same task or an explicitly declared successor task within the same milestone.
- If the task changes identity derivation, replay semantics, or the kinds/statuses registry, the frozen fixtures of section 4 apply: a failing frozen fixture MUST NOT be regenerated; it means the change is a hashVersion bump and falls under the release discipline of 12-release-versioning.md, section "hashVersion release discipline".
- Budget-touching tasks MUST include at least one `toStayUnderBudget` assertion and one exhaustion-path test (outcome `exhausted`, never null; see 06-execution-spec.md, section "Three-layer budget").

## 2. Unit tier: FakeAdapter

The unit tier runs entirely against FakeAdapter from @lurker/testing (M1). FakeAdapter resolves responses by pattern over agentType, label, or a prompt regex, and is fully typed:

```ts
const engine = createTestEngine({
  agents: {
    reviewer: (call) => ({ verdict: 'pass' }),
    '*': 'stub text',
  },
});
```

Rules:

- Unit tests MUST NOT import provider SDKs and MUST NOT open sockets. The lint setup enforces the determinism rules of eslint-plugin-lurker on workflow modules (no bare Date.now, Math.random, new Date, fetch, or process.env; no Promise.all over ctx calls).
- Unit tests SHOULD use the shipped matchers (available for Vitest and Jest):

```ts
expect(run).toHaveCalledAgent('reviewer', { times: 3 });
expect(run).toStayUnderBudget({ usd: 5 });
```

- Determinism shims (ctx now/random/uuid) make time and randomness assertable: unit tests over control flow that consumes them MUST pin them through the journal (kind `rand`), never through global monkey-patching.

## 3. Conformance tier

Two executable kits. Both are products, not just internal suites: they are the acceptance bar for community implementations (guides land in M9).

### 3.1 Store conformance kit (@lurker/store-conformance)

Origin: DEF-4. The kit is an executable suite parameterized by a store factory; a store implementation passes or it is not a lurker store. It MUST cover, at minimum:

- A1 atomicity: an append is all-or-nothing; a torn write is never observable.
- A2 total per-run order: seq is a total order per run; concurrent appenders never interleave into an ambiguous order.
- A3 read-your-writes: an append acknowledged to the writer is visible to an immediately following load by the same process.
- A4 opaque payload: the store persists entry bytes without interpretation; unknown fields and unknown kinds round-trip byte-exactly.
- Fencing: an append bearing a stale fencing epoch is rejected AND is invisible to subsequent loads.
- Lease contract: `acquire` on a held lease MUST reject with the typed LeaseHeldError; the renew cadence MUST be at most ttl/3 (03-journal-spec.md, section "Storage SPI").
- Golden fold-state fixtures: the kit ships fixture journals; folding them through the kernel MUST produce fold states whose canonical hashes are identical across every store implementation. A store cannot influence replay semantics.
- End-to-end decide-once oracle: a scripted race drives multiple concurrent resolution attempts at one suspended entry; the oracle asserts exactly one applied classification (first-closing-wins fold plus ResolutionArbiter), all attempts journaled, and then re-runs the journal under replay-strict asserting the same winner with zero live calls.
- Abandon fixture: a journal with an abandoned branch replays with zero live calls inside the skipped subtree (derived skipped status is never stored, never re-executed).

Required store matrix: InMemoryStore and JsonlFileStore (M2), @lurker/store-sqlite including LeasableStore with fencing epoch (M5), community stores via the published guide (M9). The multi-process soak of M8 re-runs the fencing and lease sections under real process concurrency.

### 3.2 Adapter conformance suite

Provider adapters are validated by a cassette-driven contract suite in @lurker/testing, run two ways: against recorded cassettes in every CI run, and against live APIs on the cron cadence of section 5.3. The suite asserts the normative wire surface of 04-model-layer-spec.md: ChatEvent union shape and ordering, the Usage invariant, canonical id bijection between wire ids and engine-minted ULIDs, typed refusal outcomes, stop-reason mapping, retry-relevant error classification (SDK autoretries disabled; the core owns retries), and effort mapping per the per-adapter table. Community adapters run the same suite (M9 guide).

## 4. Frozen journal fixtures

These fixtures are the compatibility contract of DEF-6 made executable. They are frozen: regenerating them to make a test pass is forbidden by policy (section 1.1).

- One frozen fixture set per hashVersion profile. The v1 fixture is a frozen JSONL journal in the round-1 wire format (kinds agent, step, rand, external, approval; legacy field `v: 1`).
- KeyDeriver contract tests: every profile in the registry (and every profile shipped by @lurker/compat) is immutable after release and MUST pass contract tests against its frozen fixtures on every CI run: `project` results (including `incomparable` for features not expressible in that version), `deriveKey`, `schemaHash`, `toolsetHash`, the frozen disposition table, and `foldDefaults` (v1: effort medium, memoizeOutcome false, budgetAccount root).
- Mixed-version scenarios MUST include at least: matching each entry under the key computed with that entry's own version; the ordinal-space split (two repeats paid under v1 as ordinals 0 and 1, a third goes live and is written with hashVersion 2 and ordinal 0 in its own (hashVersion, key) space; later resumes match all three, zero overpayment); forward-cursor resolution when one live call matches both a v1 entry and a later v2 entry (first unconsumed matching entry in journal order wins); and cross-version resolution of a suspended v1 entry by a v2 superseding append referenced by seq.
- Compatibility lemma test: on the domain of v1 entries (no escalated, no derived skipped, no memoizeOutcome) the v1 and v2 disposition tables MUST agree, making mixed journals deterministic.
- Never-pay-twice-through-upgrade lemma test: for any fixture journal whose versions all lie in the support window, with an unchanged workflow, replay on the current engine performs zero live calls.

DEF-6 cassettes (test IDs; canonical catalog in 09-observability-testing-spec.md):

| Cassette ID | Asserts |
|---|---|
| resume-v1-on-engine-v2 | Frozen round-1 JSONL fixture resumes on the v2 engine under replay-strict: zero live calls, every entry consumed under the v1 predicate, normalization does not rewrite the store (DEF-6) |
| resume-v1-with-inserted-call | Same journal, workflow with one inserted call mid-body: exactly one live call via FakeAdapter, the new entry carries hashVersion 2 and a correct ordinal, all v1 neighbors forward-match with zero overpayment (DEF-6) |
| suspended-v1-resolves-on-v2 | Suspended v1 awaitExternal resolved on the v2 engine: superseding append of version 2 referencing by seq, schema validation at consumption, zero repeated LLM calls (DEF-6) |
| reject-version-too-old | Synthetic fixture with hashVersion 0 outside the window: JournalCompatibilityError HASH_VERSION_TOO_OLD with zero live calls, zero appends, zero admission reserves; a second run with the matching deriver supplied via EngineOptions.extraDerivers resumes normally (DEF-6) |
| reject-version-from-future | Fixture containing a hashVersion 3 entry on the v2 engine: HASH_VERSION_TOO_NEW at load, and separately at lease acquire in queue mode; no side effects (DEF-6) |
| effort-defaults-shift | v1 fixture recorded without effort while v2 config sets new role effort defaults: all v1 entries still match (the v1 predicate is effort-insensitive), pricing and ladder-statistics folds read legacy effort as medium via foldDefaults, new entries carry real effort in identity (DEF-6) |

## 5. Cassette tier (VCR)

### 5.1 Recording and replay

VCR cassettes sit at the adapter boundary (@lurker/testing, tooling GA in M5):

```ts
record({ adapters, cassette, redact? });
replay({ cassette, onMiss: 'throw' | 'passthrough' });
```

- CI MUST run cassette replay with `onMiss: 'throw'`; `passthrough` is a local-development convenience only.
- Cassettes MUST record the hashVersion of the fixtures they embed (DEF-6), so a cassette recorded under one profile fails loudly rather than silently drifting.
- Cassette names are test IDs and MUST match the catalog in 09-observability-testing-spec.md, section "Mandatory defect cassette catalog", verbatim. A renamed cassette is a docs amendment, not a test refactor.

### 5.2 Redaction rules

- Redaction happens at record time; secrets MUST never reach the committed cassette bytes. The `redact` hook is applied to requests and responses before serialization.
- The default redaction policy MUST at minimum mask API keys and authorization headers and strings matching key-like patterns. The broader L0 serialization redaction hook is a pre-1.0 gap tracked in 14-open-questions.md (redaction defaults); until it lands, VCR redaction is the only shipped redaction surface and reviewers MUST treat any committed cassette as public data.
- Recording against live providers requires real keys; keys MUST come from the environment, never from checked-in config, and recorded cassettes MUST be reviewed for residual sensitive payloads before merge.

### 5.3 Live contract tests (cron)

Recorded cassettes are additionally re-run in CI on a cron schedule against live provider APIs as adapter contract tests, so provider drift is caught before users hit it. Rules:

- The cron workflow is separate from PR CI, is non-blocking for merges, and MUST page (open an issue or alert) on failure rather than silently rerecording.
- A contract-test failure means either provider drift (fix the adapter, rerecord deliberately) or a flaky provider surface (document and quarantine); automatic rerecording is forbidden.
- Live contract tests cost real money monthly and require key ownership. Budget, key custody, and spend limits are a founder decision tracked in 14-open-questions.md, section "Founder-only decisions" (live contract-test and eval sweep budget pool). Until decided, the cron cadence is weekly per first-class adapter, and the workflow ships disabled until M5.

## 6. Replay-strict tier

Replay-strict is the regression backbone (NFR determinism, 01-requirements.md):

```ts
replayRun(wf, args, { journal, mode: 'strict' }); // throws JournalMissError on any live call
```

- Every defect cassette in the docs/09 catalog MUST run under replay-strict with zero live calls. This includes the DEF-1 through DEF-8 sets (for example the DEF-5 set: graft-partial-subtree, crash-between-link-and-root, oscillation-guard-trip, worktree-disposed-degrade, claim-exclusivity-and-chain; and the DEF-6 set of section 4) and the round-2 set: revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung.
- Any production or dogfood journal is replayable as a deterministic integration test: the recommended triage flow for a field bug is to import the journal, reproduce under replay-strict, and commit the minimized journal as a new fixture.
- Live-versus-replay equivalence: for scenarios that exercise races (resolution arbitration, first-closing-wins, reuse chain drain order), the suite MUST assert that the replay-strict pass reproduces exactly the outcome the live pass journaled, in the same order.

## 7. Eval CI (@lurker/evals)

@lurker/evals (M9) measures quality on top of public APIs: `EvalCase = { workflow, args, graders[] }` with golden-output, rubric, and LLM-judge graders.

Determinism rule: the judge grader runs through the engine itself with the judge role, so judge calls are journaled, budgeted, and VCR-recorded. Consequently eval CI is deterministic: PR-triggered eval runs MUST execute entirely from cassettes with zero live calls. Live matrix sweeps (workflow by model by taskClass), the eval-committer identity for eval-measured claims, canary fingerprints, and falsification sweeps (`lurker kb sweep`) run only in scheduled jobs under the founder budget pool (14-open-questions.md), and their outputs feed ModelKnowledge phases (05-model-knowledge-spec.md) at M11.

Config-matrix comparisons (profile versus profile, cheap workers versus premium, reviewer on or off) report pass-rate, cost, and latency from existing AgentResult usage and costUsd; no new measurement machinery exists. Failure clustering and any vector-store dependency are excluded (EXC registry, 01-requirements.md).

## 8. Per-milestone exit criteria matrix

Planning rule (10-implementation-plan.md, section "Planning rules"): every milestone exits with its cassette set green under replay-strict CI. The matrix below is the gating view; cassette IDs cite the docs/09 catalog, and the synthetic-fixture rule of that catalog applies: a cassette whose live producers ship later gates as a hand-authored journal fixture and is re-recorded in the producers' milestone (gating detail: 10-implementation-plan.md, section "Gating cassette sets per milestone"). Defect cassettes are journal-plus-FakeAdapter scenarios and do not require the VCR tooling of M5.

| Milestone | Version | Suites that MUST be green to exit | Cassettes added to the gate |
|---|---|---|---|
| M0 | v0.1.0 | typecheck, lint, per-package unit smoke, publint + attw pack gates | none |
| M1 | v0.2.0 | FakeAdapter unit tier over ctx primitives, structured-output tiers, matchers; zero-network CI proven | none |
| M2 | v0.3.0 | store-conformance full suite on InMemoryStore and JsonlFileStore; hashVersion frozen fixtures and KeyDeriver contract tests; replay-strict harness operational; decide-once oracle; abandon fixture | DEF-1 synthetic-fixture subset (abandon-subtree, memoize-classifier, v1-journal-on-v2; the live DEF-1 set follows at M3); DEF-4 set as synthetic fixtures (live producers re-record at M7); DEF-6 set incl. the six IDs of section 4 (effort-defaults-shift synthetic until M4) |
| M3 | v0.4.0 | tool system and permission chain suites (ask suspension, turn checkpoint resume); compile-time fixtures for terminal escalated status; worktree isolation lifecycle | escalation-status scenarios of the DEF-1 set |
| M4 | v0.5.0 | adapter conformance suite over roles, failover, pricing, HistoryProjector; hash-v2 identity golden fixtures with canonical effort | effort-defaults-shift revalidated with full effort semantics |
| M5 | v0.6.0 | VCR record/replay with redaction; cron live contract tests enabled for @lurker/anthropic and @lurker/openai; store-conformance on @lurker/store-sqlite | adapter contract cassettes |
| M6 | v0.7.0 | WorkerSandboxRunner boundary contract, compileScript and self-repair loop, admission and structural limit suites, WakeDigest coalescing | sandbox-determinism, planner-self-repair, orchestrator-crash-resume (docs/09, M6/M8 substrate and soak set) |
| M7 | v0.8.0 | PlanRunner rebase, guards, ladder, termination, lineage, reuse suites; property suites of section 10 complete | full round-2 set (revise-mid-run, crash-during-revision, park-unpark, oscillation-freeze, half-escalated-ladder, budget-denied-rung) plus DEF-2, DEF-3, DEF-5, DEF-7 (minus queue-failover-during-forced-finish), DEF-8 sets; DEF-4 set re-recorded live |
| M8 | v0.9.0 | multi-process seam soak: fencing and lease conformance under real concurrency; hashVersion check at lease acquire | queue-failover-during-forced-finish; multi-process-fencing-soak (docs/09, M6/M8 substrate and soak set); reject-version-from-future in queue mode |
| M9 | v1.0.0 | complete defect cassette catalog green under replay-strict (1.0 release gate, 12-release-versioning.md, section "The 1.0 gate"); @lurker/evals suite; conformance kits published as community guides | full catalog |
| M10 | v1.1.0 | KB phase 1: kb_pinned and kb_repinned determinism, pure card render | KB pin/repin scenarios |
| M11 | v1.2.0 | eval-measured claims, deterministic matrix sweeps via cassettes, canary fingerprint | sweep and canary scenarios |
| M12 | unassigned | kb_propose, inbox, human gate suites (behind the measured-value checkpoint) | phase 3 scenarios |

## 9. Package quality gates

Run in CI on every PR (toolchain rationale in 13-toolchain-repo.md, section "Committed toolchain"):

- publint and @arethetypeswrong/cli MUST run against packed tarballs (`pnpm pack` output), not source trees, for every publishable package.
- `tsc --noEmit` is the typecheck gate; tsdown owns emit and never typechecks as a gate.
- SPI drift gate: rolled-up .d.ts files for the public surfaces are committed, and their diffs are reviewed in every PR. After the 1.0 seam freeze, any diff to a frozen seam's .d.ts is a release blocker unless the change passes the deprecation policy of 12-release-versioning.md. api-extractor is deliberately not used; revisit only if formal API reports prove necessary before 1.0.

Coverage expectations (repo policy, adjustable only by amending this document):

- Repo-wide line coverage SHOULD be at least 80 percent, enforced through the root Vitest config (V8 provider).
- The L2 kernel modules of @lurker/core (journal identity, forward-matching, replay predicate, folds, budget ledger) SHOULD hold at least 90 percent branch coverage; this is the code where an untested branch is a paid-twice LLM call.
- Provider adapters are measured under cassette replay; live-only branches (transport errors, 529, retry-after) are covered by fault-injection cassettes, not excluded.

## 10. Property-based testing targets

Property tests complement the fixture suites on the three mechanisms where example-based tests are structurally insufficient:

- Folds (first-closing-wins resolution fold, budget ledger fold, TerminationAccount fold, lineage fold): the fold result MUST be a pure function of the journal prefix; properties assert determinism across repeated folds, prefix monotonicity (folding a longer prefix never rewrites already-derived facts, only extends them), and live/replay equivalence on generated journals.
- Rebase (the plan_revise rebase algorithm and its per-op conflict table, 07-adaptive-orchestration-spec.md): generated op sequences assert that non-conflicting ops commute, conflicting ops resolve exactly as the table states, rebase is deterministic for a fixed (base, ops) pair, and the planHash chain never forks under replay.
- Key derivation (03-journal-spec.md, section "Identity model"): RFC 8785 canonicalization properties: object key order never changes a derived key; semantically identical IdentityInputs derive identical keys; excluded fields (label, phase, onError, retry, replay, memoizeOutcome, lineage, spanId) never influence the key; schema canonicalization is stable under annotation stripping and local $ref inlining; and per-profile stability against the golden vectors of section 4.

## 11. Examples corpus

The examples/ corpus (landed no later than M5) is triple-purpose by design: reference implementations of the documented patterns, integration tests, and the teaching corpus for the planner API card (@lurker/planner). Rules: every example MUST run in CI under FakeAdapter or cassettes with zero live calls; every example is a runnable file, not a snippet; and an example that stops compiling fails CI like any test. When the API card and an example disagree, the example is the bug.
