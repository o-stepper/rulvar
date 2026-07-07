# @lurker/core

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
