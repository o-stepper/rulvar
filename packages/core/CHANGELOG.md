# @lurker/core

## 0.4.0

### Minor Changes

- dfe03b5: M3-T11 gating cassettes and the v0.4.0 BREAKING release notes.

  BREAKING (pre-1.0 convention, docs/12): `AgentStatus` now produces
  `'escalated'` at runtime and `AgentResult` carries the optional
  `escalation: EscalationReport` field (present if and only if the status
  is escalated). This is the third kernel amendment of the replay
  predicate (escalated-replays-as-ok, DEF-1) whose table row shipped
  frozen in M2; the producers ship here. Migration: add an `escalated`
  branch to every switch over `AgentStatus`; consumers not adopting the
  protocol are advised to map `escalated` to `limit` (paid partial work,
  output null, the report stays available for logs). `isEscalated` and
  `EscalatedResult` are exported for narrowing. Status production stays
  gated by opt-in: workflows that never pass `escalation` options cannot
  observe the new status at runtime.

  Cassettes: the DEF-1 live set (escalate-replay,
  crash-between-report-and-decision, flavor-b-timeout) is recorded through
  the live runtime and replayed strict; the M2 synthetic DEF-1 subset is
  re-recorded (memoize-classifier fully live; abandon-subtree through the
  kernel write APIs with a realistic escalated child report and an
  authorizing owner cancel decision; both re-record again with the
  orchestrator producers in M7). FakeAdapter gains fakeToolCalls and
  fakeWireError responder markers; replayRun gains the onEscalation
  pass-through so replay tests can prove the hook stays cold. The
  deliberate fixture regeneration updates fixtures.sha256 in the same
  change (the identity profile is UNCHANGED; this is the docs/10 M3-T11
  ordered re-record, not an identity-pipeline revision).

- d2089a7: M3-T02 turn-boundary checkpoints. The runtime writes a canonical-history
  checkpoint into TranscriptStore at every turn boundary where the loop
  continues (tool boundaries and schema re-prompts), at a deterministic ref
  derived from the dispatch seq; the terminal entry records checkpointRef.
  A dangling-dispatch resume (kill-and-resume) re-enters at the last
  boundary with zero re-paid turns, restored usage folds into the terminal
  exactly once, and an unreadable or unknown-format blob falls back to a
  full redispatch (tools stay at-least-once between execution and the
  checkpoint write). The blob format is engine-internal with a leading
  format byte; replayed agents recover their turn count from the checkpoint
  and re-emit tool:start/tool:end with the replay marker.
- 3f60234: M3-T07 terminal escalated status and EscalationProtocol producers (the
  BREAKING section for v0.4.0 rides the milestone release notes). Typed
  EscalationKind/EscalationReport/EscalationDecision/EscalationOptions;
  the escalate tool registers under escalation opt-in of either flavor
  through the same path as any tool (opting in changes toolsetHash by
  design) and is engine-intercepted after the permission chain. Status
  production is gated: without opt-in the escalate tool does not exist and
  'escalated' is physically unproducible. Flavor A terminates the worker
  with a runtime-completed report (costToDate and salvage are never
  model-authored; the request schema rejects them; the full report is
  validated BEFORE append; usage/costUsd/turns/transcriptRef as for ok,
  output null). Flavor B suspends on the approval machinery with a
  journaled deadlineAt (explicit deadlineMs required); a live decision and
  the deadline timer race through the ResolutionArbiter first-closing-wins
  (timeout applies defaultDecision, default accept); dispose collects the
  worktree patch into salvage BEFORE destruction; the terminal escalated
  entry and the authoritative escalation-decision entry follow strictly
  after, with countsAgainstLimit derived once (true iff scope_bigger).
  Replays synthesize the byte-identical report with zero adapter calls and
  read the owner's decision from the decision entry (a crash between
  report and decision pays the decision live exactly once). In ctx.parallel
  an escalated child is a settled outcome that never aborts siblings; a
  plain value-form call opting in requires the onEscalation hook
  (ConfigError before any LLM call otherwise). The in-run minSpend gate
  (M3-T09) rejects early scope_bigger escalations with a bounded "keep
  working" re-prompt; scope_different and blocked_with_evidence are
  exempt and never debit the counter.
- f668890: M3-T05 worktree isolation and M3-T06 openaiCompatible. GitWorktreeProvider
  implements the IsolationProvider seam: acquire creates a detached
  worktree from HEAD or a given ref (non-git host is a typed ConfigError),
  tools receive cwd inside the tree, collect() snapshots changed files and
  a binary patch, dispose removes the tree with keepOnError retention
  under the shared maxPinnedWorktrees cap (default 4). ctx.agent resolves
  isolation call-over-profile into spawn identity, stores the collected
  patch in TranscriptStore, and surfaces it as a kind 'patch' Artifact on
  AgentResult.artifacts and the terminal journal entry, so replays
  reconstruct artifacts with zero live calls; applying the patch stays
  with the caller. isolation 'readonly' is accepted as a declaration (its
  compiled deny rule ships with risk presets in M5).

  @lurker/openai gains openaiCompatible({ id, baseURL, apiKey?, caps? })
  for Ollama, vLLM, and gateways: the Chat Completions dialect by
  construction, explicit ids so several endpoints coexist (duplicate id
  stays a ConfigError at createEngine), and the most conservative caps
  when unprobed (prompt-tier structured output, no parallel tools, no
  pricing; supplied caps merge over the floor).

- 16d7aa6: M3-T04 MCP ToolSource. `mcp(cfg)` imports Model Context Protocol tools
  over stdio, streamable-http, or an in-process server instance (pinned
  SDK line @modelcontextprotocol/sdk ^1.29; the v2 migration is the
  logged post-M3 task M5-T10). tools/list is fetched with cursor
  pagination until exhaustion and cached per session; a listChanged
  notification invalidates the cache for subsequently spawned agents only
  (a spawn's toolset snapshot stays immutable). allow/deny filters apply
  to pre-prefix names with deny winning; `prefix` namespaces collisions;
  `approval` maps to needsApproval per tool; host-supplied `risk` labels
  feed the permission presets. inputSchema becomes bare-JSON-Schema
  parameters (form 3); outputSchema validates structuredContent;
  isError maps to an error tool result surfaced to the model, never a
  protocol error; MCP tools hash version as absent, so provider-side
  contract drift re-keys new spawns by design.
- 6513ce8: M3-T08 no-progress abort class and M3-T10 UsageLimits completion. The
  engine-defined detector implements the committed docs/06 Appendix A
  interim rule (N consecutive turns without tool calls or artifact deltas,
  N = 3, configurable via the new UsageLimits.noProgressTurns knob): the
  abort journals as the agent's terminal entry with status 'limit', the
  dedicated 'no-progress' class marker in the error payload
  (AgentResult.abortClass), and memoizeOutcome stamped by the ENGINE on
  the terminal entry, so it replays on every resume without a live rerun
  regardless of the user's dispatch-time memoize policy (the predicate's
  entry-read consults the terminal stamp first; docs/03 section 6.6
  amendment). Tool-calling turns reset the streak: a working agent never
  trips. UsageLimits is complete: maxTurns, maxToolCalls,
  maxOutputTokensPerTurn, timeoutMs, streamIdleTimeoutMs, noProgressTurns,
  and the run-level deadline each independently produce their documented
  outcome, with per-limit tests including the memoized-limit
  replay/unmemoized rerun predicate integration. The M3-T09 minSpend gate
  gains the accumulation path test (scope_bigger passes once spend crosses
  minSpendUsd).
- 7dad493: M3-T03 permission chain and ask suspensions. The normative layered chain
  (hooks -> deny rules -> ask rules -> canUseTool -> terminal default) is
  the single approval surface for every tool dispatch; hooks run in
  deterministic registration order with modifiedInput substitution; rules
  never yield allow; an explicit canUseTool allow is decisive including
  over needsApproval; argv/domain rules and presets fail early until M5.
  Engine-wide defaults.permissions merges under profile permissions;
  inheritPermissions is carried as data for subagent spawning (mode c).
  An ask verdict journals a suspended approval entry (kind 'approval',
  identity {toolName, post-hook input}, agent child scope) together with
  the turn checkpoint; the run settles 'suspended' with the synthesized
  approval:<seq> key; RunHandle.resolveExternal validates
  { decision: 'allow' | 'deny' } and a denial surfaces to the model as an
  error tool result carrying the reason. An approval round-trip across
  process exit resumes the SAME turn: executed tool results are reused
  from the checkpoint, the resolved decision applies without
  re-suspension, and only post-approval turns are paid live.
- 2bbf180: M3-T01 tool system core plus the M3 entry-gate docs amendment. `tool()`
  definitions over the three SchemaSpec forms with definition-time
  validation (name pattern, schema projection, recursive/remote ref
  rejection); the ToolSource SPI seam types (ToolDef, ToolRisk, ToolContext,
  ToolSourceSession); per-spawn toolset resolution with duplicate-name and
  executor fail-early ConfigErrors; toolsetHash derived from contracts only
  (editing an execute body never re-keys a journal, bumping `version` does)
  and wired into spawn identity; agent-loop tool dispatch with argument
  validation, bounded ModelRetry conversion, NonSerializableValueError
  surfacing, maxToolCalls expiry as terminal `limit`, and tool:start /
  tool:end telemetry. The docs/06 Appendix A knob "no-progress detector N"
  is committed at 3 consecutive turns without tool calls or artifact deltas
  (consumed by M3-T08).

## 0.3.0

### Minor Changes

- 43444f6: M2-T11/T12: the executable store conformance kit and the M2 gating
  cassettes with frozen fixtures.

  @lurker/store-conformance ships its first real API: journalStoreConformance
  (A1 append atomicity, A2 total per-run order, A3 read-your-writes, A4
  opaque payload with read-side-only normalization, meta separation, the
  golden fold-state fixture with a frozen reference hash, the decide-once
  oracle, and the abandon-derived-skip fixture) and leasableStoreConformance
  (typed LeaseHeldError on held acquire, monotonic fencing epochs,
  stale-epoch appends rejected and invisible, released leases fenced from
  renew and append, optional ttl/renew-cadence timing checks), plus
  registerConformance for Vitest/Jest and the stableStringify fold-state
  hasher. InMemoryStore and JsonlFileStore pass; deliberately broken stores
  (reordering, normalizing, tearing, fencing-less) fail loudly.

  @lurker/core kernel closes three DEF-1/DEF-4 gaps the cassettes gate: an
  abandon-covered hanging dispatch derives skipped instead of redispatching,
  abandon-covered operations contribute a zero ledger increment, the resume
  report lists covered entries as skipped (never orphaned), and an abandon
  over an already-resolved suspension folds to a noop with already_resolved
  (first-closing-wins per target, both closer kinds).

  @lurker/testing ships the M2 cassette suite over committed frozen
  fixtures: the DEF-1 synthetic subset (abandon-subtree, memoize-classifier,
  v1-journal-on-v2), the DEF-4 set (timeout-vs-live-race,
  class-decision-fanout, abandon-then-crash-then-resume,
  abandon-vs-resolution-race, offline-invalid-then-valid,
  double-abandon-idempotent), the DEF-6 six IDs (resume-v1-on-engine-v2,
  resume-v1-with-inserted-call, suspended-v1-resolves-on-v2,
  reject-version-too-old via deriverV0Synthetic, reject-version-from-future,
  effort-defaults-shift), the mandatory mixed-version scenarios
  (ordinal-space split, forward-cursor preference, cross-version
  resolution, the compatibility and never-pay-twice-through-upgrade
  lemmas), and KeyDeriver contract tests against the frozen v2 golden
  identities including the docs/03 worked example. Fixture regeneration is
  deliberate: scripts/record-m2-cassettes.mjs rebuilds, and CI write
  protection (scripts/check-frozen-fixtures.mjs plus fixtures.sha256)
  fails any fixture diff shipped without the explicit bump token (the
  hyphenated compound of hashVersion and bump) in a changeset.

- 279881b: M2-T05/T06: the hashVersion mechanism and the canonical replay predicate.
  Frozen KeyDeriver profiles (v2 current; v1 with the effort-stripping
  projection, round-1 disposition table, and foldDefaults), the per-engine
  deriver registry with extraDerivers validation as the only window
  extender, the side-effect-free compatibility scan raising
  JournalCompatibilityError with sub-codes and hints, versioned matching
  through the registry KeyRing (live calls projected DOWN, incomparable is
  a guaranteed non-match, keys memoized per call and version); the single
  canonical replayDisposition with the three kernel amendments
  (memoizeOutcome on task-class failures via classifyAgentError,
  abandon-derived skipped through the append-order AbandonFold with
  transitive child-scope coverage, escalated-replays-as-ok), version
  dispatch by the entry's own profile, and the invalidate/retry unpinning
  API. @lurker/compat ships the extraDerivers plumbing plus the synthetic
  hashVersion 0 deriver (manually versioned 0.1.0 per the lockstep
  exemption).
- 9fd0966: M2-T03/T04: scoped forward-matching and the kinds/grammar freeze. The
  JournalMatcher (per-scope insertion-stable cursors, first unconsumed
  match wins, cache/never per-call modes, orphan reporting) integrated into
  the Replayer with seeded seq/ordinal spaces and the resume ledger fold;
  ctx.agent/step/now/random/uuid replay journaled results byte-identically
  with zero adapter calls, dangling running entries redispatch with the
  terminal referencing the original dispatch, and replayed lifecycle events
  carry replayed: true. Kinds registry v2 payload validators enforce the
  docs/03 shapes on engine-written entries; the scope grammar gains a
  parser with round-trip guarantees. The interim disposition is round-1;
  the full DEF-1 table plugs in with M2-T06.
- 24ebadf: M2-T07/T08: suspension machinery (DEF-4). Strict ResolutionPayload and
  AbandonPayload with the normative by-source mapping; the
  first-closing-wins ResolutionFold (schema validation at consumption
  against the schema pinned inside the suspended entry, invalid offline
  resolutions never close, abandon coverage with transitive child
  scope-prefix and the AbandonFold projection consumed by the replay
  predicate); the per-target FIFO ResolutionArbiter (classify, durable
  append, settle exactly once; losing attempts are journaled noops); rule
  O2 hard errors on forward or dangling refs; Replayer
  resolveSuspended/abandonBranch/suspensionState; ctx.awaitExternal (NO
  deadline in v1, duplicate key in scope is a typed error) with run
  outcome 'suspended' plus pending[] on quiescence; and
  RunHandle.resolveExternal returning ResolutionOutcome, validating live
  payloads BEFORE append and journaling nothing on InvalidResolutionError.
- a1b35d3: M2-T09/T10: engine.resume under the run-to-definition binding contract
  (wf required for in-process runs, name mismatch is a typed ConfigError,
  body-hash mismatch warns loudly and proceeds; the compatibility scan
  runs strictly before any side effect; the resumed run seeds the budget
  from the ledger fold, re-emits open suspensions, and reports
  ResumePreview hits/misses/reruns/orphans plus invalid offline
  resolutions), the dryRun option (replay-strict matching: the first
  would-be-live call settles the run with the typed journal_miss error and
  zero live calls), and @lurker/testing replayRun (tier 3: strict replay
  of any journal with JournalMissError on ANY live call; suspended
  journals finish suspended with zero live calls).
- 18a5821: M2-T01/T02 groundwork: JsonlFileStore (one JSON entry per line, the
  journal doubles as an event log; torn-trailing-line tolerance and repair
  for A1 atomicity; atomic temp-plus-rename meta replace; listRuns without
  payload parsing; mid-file corruption is a hard JournalOrderViolation) and
  the committed large-value soft warn threshold (262144 bytes, docs/06
  Appendix A M2 entry gate) wired into the journal append path as a
  warning event, never an error.

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
- c50871e: M1-T04/T05: journal write path and model router core. JournalEntry form
  with the kinds registry v2 and hashVersion (written as 2 from day one),
  IdentityInput records per spawn kind with content-key derivation (sha256
  over RFC 8785 JCS; reproduces the docs/03 worked example byte-identically),
  the scope-path grammar, ordinal assignment, the per-run serialized append
  queue with the JSON-serializability check, the budget-ledger fold,
  JournalStore/LeasableStore/TranscriptStore SPI types, InMemoryStore (loud
  one-time resume-disabled warning) and InMemoryTranscriptStore; the
  per-engine adapter registry (duplicate adapterId is a ConfigError), strict
  ModelRef parsing, the per-invocation resolution chain with role effort
  defaults, CanonicalModelSpec canonicalization, visible caps scrubbing
  (effort and sampling parameters), and structured-output tier selection
  with the strict-compatibility predicate.
- 1af8fb9: M1-T01/T02/T03: L0 foundations. Wire contracts (Msg/Part with provider-raw,
  ChatRequest, the ChatEvent union with typed refusal finish outcomes, the
  Usage invariant, CanonicalId minting, cacheHint, canonical five-level
  Effort, the ModelSpec family declarations); the closed error taxonomy
  (LurkerError base, WireError projection, all named error classes, the
  AgentError value projection); SchemaSpec in its three forms with Out<S>
  inference, StandardJSONSchemaV1 projection (draft 2020-12 with draft-07
  fallback), canonical schema derivation (JCS, local $ref inlining,
  annotation stripping), schemaHash/toolsetHash, and runtime validation via
  the vendored draft 2020-12 validator.
- 1fe0249: M1-T06/T07/T08/T09: agent runtime v1 (single subagent loop, structured
  output in three tiers with client validation and the bounded re-prompt,
  typed AgentResult with the ok/error/limit/cancelled/skipped vocabulary,
  ModelRetry declaration, UsageLimits with the normative merge and defaults,
  typed refusal handling, Usage-invariant verification at the adapter
  boundary); ctx primitives (defineWorkflow with the errorPolicy literal
  generic, ctx.agent overloads including result: 'full', ctx.parallel with
  Settled and abortSiblings semantics, ctx.pipeline with up to six stages
  and onItemError drop/throw/collect, ctx.step with useMemo-style deps
  keying, ctx.phase cost attribution, ctx.log, ctx.budget, and the
  deterministic now/random/uuid shims journaled as rand entries); the
  per-run FIFO semaphore scheduler; and the three-layer budget (admission
  reserves, the per-turn guard, the AbortSignal ceiling with usageApprox,
  immutable B0, BudgetExhaustedError thrown uniformly by every ctx
  primitive, run.dropped evidence for every silent loss).
- 5c4fc32: M1-T14/T15: @lurker/testing tier 1 (FakeAdapter matching on
  agentType/label/prompt regex with a '*' fallback, honoring the selected
  structured-output tier, zero USD by construction; createTestEngine over
  the full real engine with recorded event streams; toHaveCalledAgent and
  toStayUnderBudget matchers at '@lurker/testing/matchers') and the
  completed umbrella (re-exports of @lurker/core and both first-class
  adapters, renderProgress, the umbrella-only recommendedDefaults strong
  model slots, the M1 exit-criteria example workflow, and the CI install
  smoke on packed tarballs). The core now populates the reserved
  providerOptions 'lurker' telemetry namespace on every request (docs/04
  section 1.8 as amended) and AgentResult carries errorMessage detail for
  journaled WireError fidelity.

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @lurker/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.
