[**rulvar API reference**](../../index.md)

***

[rulvar API reference](/api/index.md) / @rulvar/core

# @rulvar/core

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [StandardJSONSchemaV1](/api/@rulvar/core/namespaces/StandardJSONSchemaV1/index.md) | - |
| [StandardSchemaV1](/api/@rulvar/core/namespaces/StandardSchemaV1/index.md) | - |

## Classes

| Class | Description |
| ------ | ------ |
| [AdmissionController](/api/@rulvar/core/classes/AdmissionController.md) | - |
| [AdmissionRejectedError](/api/@rulvar/core/classes/AdmissionRejectedError.md) | A structural admission rejection (maxDepth, maxChildrenPerNode, maxTotalSpawns) from the AdmissionController (docs/07, section "AdmissionController"; M6-T06). The rejection verdict is embedded in the carrying spawn-admission decision entry and replays identically; the error surfaces the embedded AdmitRejectReason in `data` to the caller (a typed tool error for orchestrators) and MUST NOT tear down the run. Budget-code rejections throw BudgetExhaustedError instead, keeping the docs/06 5.7 exhaustion semantics. |
| [AgentCallError](/api/@rulvar/core/classes/AgentCallError.md) | The rejection carrier of ctx.agent value-form calls: a real Error that structurally satisfies the typed AgentError (docs/06, section "ctx.agent and AgentOpts") and carries the full AgentResult for Settled mapping. Deliberately not a RulvarError: AgentError is not in the closed code registry (docs/02, section "Error taxonomy"). |
| [BudgetExhaustedError](/api/@rulvar/core/classes/BudgetExhaustedError.md) | The run budget ceiling blocked further work. The budget guard denial is a decision entry; ctx primitives throw this as AgentError kind 'budget'; the run reports outcome 'exhausted', overriding 'error' (docs/06, section "Three-layer budget"). |
| [ConfigError](/api/@rulvar/core/classes/ConfigError.md) | Construction- and definition-time misconfiguration: duplicate adapterId, non-git host for worktree isolation, worker over a non-leasable store, failed schema projection. Never journaled; raised before any run effect. |
| [DedupIndex](/api/@rulvar/core/classes/DedupIndex.md) | The DedupIndex: a pure fold over spawn roots, severing abandons, and node.link entries. Prices fold from journal facts (servedBy, usage) through the injected price function; on replay the embedded verdict values are authoritative and this fold serves integrity only. |
| [EventBus](/api/@rulvar/core/classes/EventBus.md) | The per-run event bus. seq is strictly increasing in emission order; `iterate()` yields events from subscription onward; `on()` is the callback form over the same stream and the same seq values. |
| [ExternalRegistry](/api/@rulvar/core/classes/ExternalRegistry.md) | Per-run registry of open external suspensions plus the run's activity counter: when every in-flight branch is blocked on suspensions (activity zero, waiters open), the run quiesces into outcome 'suspended' (docs/06, section 2.7). |
| [FileModelKnowledgeStore](/api/@rulvar/core/classes/FileModelKnowledgeStore.md) | The SPI seam (docs/05, section "Data model"). commit performs CAS on the monotonic snapshot version, mirroring the fencing-epoch discipline of LeasableStore; concurrent maintenance commits serialize through CAS rejection and rebase. commit is UNREACHABLE from the runtime: runs hold ModelKnowledgeHandle. |
| [FileTranscriptStore](/api/@rulvar/core/classes/FileTranscriptStore.md) | File-backed TranscriptStore (M6-T02): blobs (transcripts, checkpoints, persisted CompiledWorkflow sources) as one file per ref under `dir`, so compiled runs resume across processes (docs/06, 10.2). Refs follow the `<runId>/<name>` convention; each path segment is checked filesystem-safe and nested segments become directories. |
| [GitWorktreeProvider](/api/@rulvar/core/classes/GitWorktreeProvider.md) | The shipped git worktree lifecycle. A non-git host is a typed ConfigError at acquire (docs/08, section 8.3, rule 1). |
| [InMemoryStore](/api/@rulvar/core/classes/InMemoryStore.md) | - |
| [InMemoryTranscriptStore](/api/@rulvar/core/classes/InMemoryTranscriptStore.md) | In-memory TranscriptStore. Refs follow the `<runId>/<name>` convention so list(runId) can filter without a side index. |
| [InProcessRunner](/api/@rulvar/core/classes/InProcessRunner.md) | The mode (a) runner for human-authored closures. Determinism is enforced by convention, lint, and the ctx shims, NOT by a VM: only the sequence of keys must be stable. Dev mode (NODE_ENV !== 'production') patches Date.now and Math.random for the duration of execute to emit one warning per run pointing at ctx.now()/ctx.random(); the patch preserves behavior and restores the prior functions on exit (nesting-safe by capturing the prior value; concurrent runs may lose the warning, never correctness). |
| [InvalidResolutionError](/api/@rulvar/core/classes/InvalidResolutionError.md) | A resolution attempt against an already-closed suspension, rejected under the first-closing-wins fold; appends no entry (docs/03, section "Suspension and resolutions"; producers ship in M2). |
| [JournalCompatibilityError](/api/@rulvar/core/classes/JournalCompatibilityError.md) | Refusal to open a journal whose hashVersion falls outside the engine's support window (docs/03, section "hashVersion"; producers ship in M2). The registry code is 'journal_compat'; the docs/03 sub-codes live on `subCode` and in `data`. |
| [JournalMatcher](/api/@rulvar/core/classes/JournalMatcher.md) | The matching engine over a loaded journal. Consumption is per logical operation (running/terminal pairs count once); candidates are consumed in journal order, first unconsumed match wins (this also resolves cross-version double matches deterministically). |
| [JournalMissError](/api/@rulvar/core/classes/JournalMissError.md) | A replay-strict run encountered a call that would go live (@rulvar/testing; producers ship in M2). |
| [JournalOrderViolation](/api/@rulvar/core/classes/JournalOrderViolation.md) | A breach of the total per-run append order: an unfenced concurrent writer or a store violating contract A2 (docs/03, section "Storage SPI"). |
| [JsonlFileStore](/api/@rulvar/core/classes/JsonlFileStore.md) | - |
| [KeyedLimiter](/api/@rulvar/core/classes/KeyedLimiter.md) | - |
| [KnowledgeCasError](/api/@rulvar/core/classes/KnowledgeCasError.md) | commit() on a ModelKnowledgeStore against a snapshot version that is no longer current. Retryable by contract: re-read current(), rebase the ops, commit again, mirroring the lease fencing discipline (docs/05, section "Commit discipline"). |
| [LeaseHeldError](/api/@rulvar/core/classes/LeaseHeldError.md) | acquire() on a currently held lease. Retryable by contract: retry after the lease ttl elapses or the holder releases (docs/03, section "Storage SPI"). |
| [LineageIndex](/api/@rulvar/core/classes/LineageIndex.md) | The incremental lineage fold: attempts, escalation debits, stall streaks, single-live-attempt, and legacy canonization, computed from journal entries only. `absorb` is idempotent by seq cursor; every read accepts an optional `uptoSeq` pin so renders stay snapshot-stable (docs/03, 10.4; docs/07, 8.3). |
| [ModelRetry](/api/@rulvar/core/classes/ModelRetry.md) | - |
| [NonSerializableValueError](/api/@rulvar/core/classes/NonSerializableValueError.md) | A value failed the journal append JSON-serializability check. Never journaled; thrown at the call site whose value failed the check. |
| [NoProgressDetector](/api/@rulvar/core/classes/NoProgressDetector.md) | Counts consecutive progress-free turns. A turn with at least one tool call (or, later, an artifact delta) resets the streak; a turn with neither lengthens it; the detector trips when the streak reaches the threshold AND the loop would otherwise continue. |
| [OrchestratorCapConfigError](/api/@rulvar/core/classes/OrchestratorCapConfigError.md) | Invalid orchestrator cap and finalize-reserve configuration, thrown before the first LLM call (docs/06, section "Three-layer budget", DEF-7; producers ship in M6/M7). |
| [ParallelSiteCounter](/api/@rulvar/core/classes/ParallelSiteCounter.md) | Allocates parallel site numbers per enclosing scope: a monotonic counter in execution order, not source position. Because every scope body is sequential by construction (I3), allocation order is deterministic and identical on every replay. |
| [PlanInvariantError](/api/@rulvar/core/classes/PlanInvariantError.md) | PlanRunner plan-invariant rejection (docs/07; producers ship in M7). |
| [Replayer](/api/@rulvar/core/classes/Replayer.md) | Per-run journal kernel front end. Everything is per instance: no module state anywhere (docs/02, section "Dependency rules"). |
| [ReplayPlanHashMismatch](/api/@rulvar/core/classes/ReplayPlanHashMismatch.md) | Raised at resume when the refolded plan state disagrees with the journaled planHash chain (docs/07; producers ship in M7). |
| [ResolutionArbiter](/api/@rulvar/core/classes/ResolutionArbiter.md) | Per-run, per-target FIFO serializer of resolution/abandon attempts (docs/03, section 8.5): classification against the in-memory fold -> durable append -> settle exactly once; losing attempts are ALSO appended and become journaled noops by fold classification. Winner effects run strictly after the critical section (the caller's job). Cross-process protection remains the LeasableStore fencing epoch. |
| [ResolutionFold](/api/@rulvar/core/classes/ResolutionFold.md) | The first-closing-wins fold over a loaded journal: one pass by seq, bit-identical on every store returning the same entries. Resolution values are validated at consumption against the schema pinned INSIDE the suspended entry payload (canonical bare JSON Schema); a schema-invalid offline resolution classifies invalid and does NOT close the target. Abandon coverage is the target seq plus the transitive child scope-prefix; the AbandonFold consumed by the replay predicate is a projection of THIS fold (docs/03, section 6.2: not a separate pass). |
| [RulvarError](/api/@rulvar/core/classes/RulvarError.md) | Base class for all engine-raised errors. "Retryable" means the engine's own retry machinery (RetryPolicy under the journal, docs/04) MAY retry; it never means a provider SDK autoretry, which is disabled. |
| [RunBudget](/api/@rulvar/core/classes/RunBudget.md) | The per-run budget account tree. All spend accounting is per instance; the journal remains the durable source (the root is seeded by the ledger fold on resume, M2; sub-account reserves are recovered from spawn-admission decision entries, M6). |
| [SandboxError](/api/@rulvar/core/classes/SandboxError.md) | A WorkerSandboxRunner resource-limit breach (docs/06, section 8.2; M6-T02): crossing timeoutMs or memoryMb terminates the worker and the run completes with outcome 'error' carrying this error's WireError projection; `data` records { reason: 'timeout' | 'memory', limit }. The class itself is never journaled as an entry of its own. |
| [ScriptRejected](/api/@rulvar/core/classes/ScriptRejected.md) | compileScript rejected planner-generated source. Never journaled as its own entry; surfaced as diagnostics to the plan() self-repair loop (producers ship in M6). |
| [Semaphore](/api/@rulvar/core/classes/Semaphore.md) | - |
| [SpanRegistry](/api/@rulvar/core/classes/SpanRegistry.md) | Spans form a tree per run; spanId values are engine-minted opaque strings, unique per run, pure telemetry, never identity (docs/09, section "Span hierarchy"). |
| [TerminationAccount](/api/@rulvar/core/classes/TerminationAccount.md) | The single per-run TerminationAccount (docs/07, 11.5): debit ONLY. No credit operation exists by construction; reclaim never replenishes anything (DEF-5 interaction, docs/07 7.3). Live: the engine debits the in-memory account, writes the carrying entry with the balance-after, then applies effects. Resume state is rebuilt by TerminationFold from the journal, never from live config. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AbandonedSpendView](/api/@rulvar/core/interfaces/AbandonedSpendView.md) | The abandoned-spend ledger fold (docs/03, 9.7). |
| [AbandonFold](/api/@rulvar/core/interfaces/AbandonFold.md) | - |
| [AdmissionDecision](/api/@rulvar/core/interfaces/AdmissionDecision.md) | The full admission decision embedded in the carrying entry. |
| [AdmissionStatsBefore](/api/@rulvar/core/interfaces/AdmissionStatsBefore.md) | Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3). |
| [AdmitLineage](/api/@rulvar/core/interfaces/AdmitLineage.md) | The lineage block every non-reject verdict carries (DEF-3). |
| [AdmitSpec](/api/@rulvar/core/interfaces/AdmitSpec.md) | What the admission point needs to know about one spawn. |
| [AgentIdentityInput](/api/@rulvar/core/interfaces/AgentIdentityInput.md) | Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent'). |
| [AgentOpts](/api/@rulvar/core/interfaces/AgentOpts.md) | Per-spawn options (docs/06, section "ctx.agent and AgentOpts"). The identity split is normative: agentType, model/routing/effort (the requested modelSpec), schema (schemaHash), and key enter the content key; everything else is policy or telemetry and never re-keys entries. Fields whose machinery lands later (tools, isolation, escalation, lineage, ladder, retry) arrive with their milestones. |
| [AgentProfile](/api/@rulvar/core/interfaces/AgentProfile.md) | The canonical, complete AgentProfile shape (docs/06, section "AgentProfile"); M1 honors description, model, routing, effort, limits, and estCost. A profile never carries a prompt or a schema. |
| [AgentProfilePermissions](/api/@rulvar/core/interfaces/AgentProfilePermissions.md) | Profile-level permissions (docs/08, section "Subagent inheritance"). inheritPermissions governs SUBAGENT inheritance (mode c orchestrators, M6+): children get their own config only unless explicitly opted in. It is carried as data here and consumed by the spawning layers. |
| [AgentResult](/api/@rulvar/core/interfaces/AgentResult.md) | - |
| [AgentResultMeta](/api/@rulvar/core/interfaces/AgentResultMeta.md) | The consumer-facing reuse mark on results (docs/03, 9.9). |
| [ApproachSignatureInputs](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md) | The identity inputs of the coarse signature (prompt prose excluded). |
| [ApprovalDecision](/api/@rulvar/core/interfaces/ApprovalDecision.md) | The resolution value shape of a tool-approval suspension (M3-T03). |
| [ApprovalIdentityInput](/api/@rulvar/core/interfaces/ApprovalIdentityInput.md) | Tool-approval suspensions (kind 'approval'). |
| [Artifact](/api/@rulvar/core/interfaces/Artifact.md) | Artifact: the normative shape of AgentResult.artifacts entries (docs/06, section 2.1). |
| [BriefOpts](/api/@rulvar/core/interfaces/BriefOpts.md) | Options of ctx.brief (docs/06, 2.8; amended during M6-T10 with the concrete shape): the content to distill plus an optional instruction; the invocation resolves role 'summarize', so it needs defaults.routing.summarize, a profile, or the explicit model. |
| [BudgetAccountView](/api/@rulvar/core/interfaces/BudgetAccountView.md) | Read-only projection of one account (docs/06, section 5.4). |
| [BudgetDefaults](/api/@rulvar/core/interfaces/BudgetDefaults.md) | - |
| [BudgetHooks](/api/@rulvar/core/interfaces/BudgetHooks.md) | Budget hooks bound by the three-layer budget (docs/06, section "Three-layer budget"). |
| [BudgetReserve](/api/@rulvar/core/interfaces/BudgetReserve.md) | Layer-1 reservation embedded in the carrying decision entry. |
| [CacheHint](/api/@rulvar/core/interfaces/CacheHint.md) | Provider-neutral declaration of intended prompt-cache boundaries. Transport-level cost optimization only: MUST NOT enter IdentityInput and MUST NOT change response semantics (docs/04, section "cacheHint"). |
| [CanonicalLadderSpec](/api/@rulvar/core/interfaces/CanonicalLadderSpec.md) | LadderSpec after canonicalization: every rung's effort resolved to an explicit value. |
| [ChatRequest](/api/@rulvar/core/interfaces/ChatRequest.md) | The provider-neutral chat request. Sampling parameters (temperature, top_p, top_k) are deliberately absent from the first-class surface: both first-class providers reject them on current reasoning models; where a target legitimately supports them they travel through the adapter's providerOptions namespace, subject to caps scrubbing (docs/04, section "ChatRequest"). |
| [CheckpointState](/api/@rulvar/core/interfaces/CheckpointState.md) | The canonical-history snapshot at a turn boundary. |
| [ChildIdentityInput](/api/@rulvar/core/interfaces/ChildIdentityInput.md) | Nested workflow spawns: ctx.workflow (kind 'child'). |
| [ClaimValidationOptions](/api/@rulvar/core/interfaces/ClaimValidationOptions.md) | - |
| [CollectedTurn](/api/@rulvar/core/interfaces/CollectedTurn.md) | One collected model turn, assembled from the stream by the agent loop. |
| [CollectOpts](/api/@rulvar/core/interfaces/CollectOpts.md) | - |
| [CompactionConfig](/api/@rulvar/core/interfaces/CompactionConfig.md) | Per-profile compaction config (docs/06, section 6, AgentProfile). |
| [CompiledPermissionChain](/api/@rulvar/core/interfaces/CompiledPermissionChain.md) | - |
| [CompiledWorkflow](/api/@rulvar/core/interfaces/CompiledWorkflow.md) | Source-backed workflow admissible to the worker sandbox; produced by compileScript (M6). Declared now so the ScriptRunner seam is shaped once; feeding a closure to the sandbox stays impossible by types. |
| [CostAttribution](/api/@rulvar/core/interfaces/CostAttribution.md) | Per-run cost attribution buckets consumed by CostReport (M1-T10/T11). |
| [CostReport](/api/@rulvar/core/interfaces/CostReport.md) | docs/09, section "CostReport". |
| [CreateEngineOptions](/api/@rulvar/core/interfaces/CreateEngineOptions.md) | - |
| [Ctx](/api/@rulvar/core/interfaces/Ctx.md) | The canonical Ctx interface, M1 members (docs/06, section "Canonical Ctx interface"). |
| [DeclaredLadder](/api/@rulvar/core/interfaces/DeclaredLadder.md) | One declared ladder of the run, named by its agentType. |
| [DedupNote](/api/@rulvar/core/interfaces/DedupNote.md) | Telemetry for a SpawnKey match admitted fresh (docs/03, 9.9). |
| [DonorCandidate](/api/@rulvar/core/interfaces/DonorCandidate.md) | One donor candidate surfaced by the DedupIndex fold (docs/03, 9.3). |
| [DonorRef](/api/@rulvar/core/interfaces/DonorRef.md) | The rich donor descriptor embedded in reuse verdicts (docs/03, 9.9). |
| [DroppedItem](/api/@rulvar/core/interfaces/DroppedItem.md) | docs/06, section "Error policy and dropped results". |
| [EffectiveUsageLimits](/api/@rulvar/core/interfaces/EffectiveUsageLimits.md) | - |
| [Engine](/api/@rulvar/core/interfaces/Engine.md) | - |
| [EngineDefaults](/api/@rulvar/core/interfaces/EngineDefaults.md) | - |
| [EscalationDigest](/api/@rulvar/core/interfaces/EscalationDigest.md) | docs/07 section 5: the escalation block of a digest. |
| [EscalationLimits](/api/@rulvar/core/interfaces/EscalationLimits.md) | Lineage limits, monotonically consumed and never replenished (DEF-3). |
| [EscalationOptions](/api/@rulvar/core/interfaces/EscalationOptions.md) | - |
| [EscalationReport](/api/@rulvar/core/interfaces/EscalationReport.md) | - |
| [EscalationRequest](/api/@rulvar/core/interfaces/EscalationRequest.md) | The model-facing request: the report minus the runtime-filled fields. |
| [ExtensionAppendInput](/api/@rulvar/core/interfaces/ExtensionAppendInput.md) | One append into an extension-owned sequential scope. |
| [ExtensionDispatchSpec](/api/@rulvar/core/interfaces/ExtensionDispatchSpec.md) | A child dispatch under an explicit scope (plan/NodeId). |
| [ExternalIdentityInput](/api/@rulvar/core/interfaces/ExternalIdentityInput.md) | External inputs: ctx.awaitExternal (kind 'external'). |
| [ExtractNecessityInput](/api/@rulvar/core/interfaces/ExtractNecessityInput.md) | The inputs of the extract-necessity rule (docs/04, section 8.3, extract row). |
| [FailoverTarget](/api/@rulvar/core/interfaces/FailoverTarget.md) | One resolved failover target (docs/04, section 11.2 rich form). |
| [FallbackField](/api/@rulvar/core/interfaces/FallbackField.md) | The degenerate fallback field: one agent-level second attempt. |
| [FileModelKnowledgeStoreOptions](/api/@rulvar/core/interfaces/FileModelKnowledgeStoreOptions.md) | - |
| [GateAudit](/api/@rulvar/core/interfaces/GateAudit.md) | The ctx-side verdict for one dispatch, produced by the permission chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the pending state FIRST, then suspend() journals the approval entry (or re-matches an existing one) and parks until a resolution closes it. |
| [GitWorktreeProviderOptions](/api/@rulvar/core/interfaces/GitWorktreeProviderOptions.md) | - |
| [GraftBoot](/api/@rulvar/core/interfaces/GraftBoot.md) | Graft bootstrap payload (docs/03, 9.9). |
| [IsolationProvider](/api/@rulvar/core/interfaces/IsolationProvider.md) | - |
| [JournalOperation](/api/@rulvar/core/interfaces/JournalOperation.md) | One logical journaled operation: its dispatch entry plus its terminal, when present. |
| [JournalSerializationHook](/api/@rulvar/core/interfaces/JournalSerializationHook.md) | - |
| [JournalStore](/api/@rulvar/core/interfaces/JournalStore.md) | - |
| [KeyDeriver](/api/@rulvar/core/interfaces/KeyDeriver.md) | - |
| [KeyRing](/api/@rulvar/core/interfaces/KeyRing.md) | - |
| [KnowledgeSnapshot](/api/@rulvar/core/interfaces/KnowledgeSnapshot.md) | - |
| [LadderSpec](/api/@rulvar/core/interfaces/LadderSpec.md) | The author-facing ladder declaration. This is the SINGLE declaration of the ladder family: docs/07 references it and never redeclares (runtime semantics land in M7). |
| [LeasableStore](/api/@rulvar/core/interfaces/LeasableStore.md) | Lease capability: acquire on a held lease MUST reject with a typed LeaseHeldError; renew MUST run at an interval of at most ttl/3; an append carrying a stale epoch MUST be rejected and never appear in load (docs/03, section "LeasableStore"). |
| [Ledger](/api/@rulvar/core/interfaces/Ledger.md) | - |
| [LineageCounters](/api/@rulvar/core/interfaces/LineageCounters.md) | - |
| [LineageRef](/api/@rulvar/core/interfaces/LineageRef.md) | The computed lineage record of one spawn-authorizing decision entry. |
| [LineageStats](/api/@rulvar/core/interfaces/LineageStats.md) | The pure lineage fold rendered in plan_view and WakeDigest, always pinned to a snapshot (`uptoSeq`), never a live read inside a turn. `approaches` groups settled history by approachSig; a group whose attempts have not settled yet is omitted (there is no outcome to learn from), while `attemptsUsed` still counts every authorized attempt. |
| [McpConfig](/api/@rulvar/core/interfaces/McpConfig.md) | - |
| [MechanicalGateVerdict](/api/@rulvar/core/interfaces/MechanicalGateVerdict.md) | The verdict of one mechanical acceptance gate evaluation (docs/07, section 10). |
| [ModelChoice](/api/@rulvar/core/interfaces/ModelChoice.md) | - |
| [ModelClaim](/api/@rulvar/core/interfaces/ModelClaim.md) | - |
| [ModelEpochInputs](/api/@rulvar/core/interfaces/ModelEpochInputs.md) | - |
| [ModelKnowledgeStore](/api/@rulvar/core/interfaces/ModelKnowledgeStore.md) | The SPI seam (docs/05, section "Data model"). commit performs CAS on the monotonic snapshot version, mirroring the fencing-epoch discipline of LeasableStore; concurrent maintenance commits serialize through CAS rejection and rebase. commit is UNREACHABLE from the runtime: runs hold ModelKnowledgeHandle. |
| [Msg](/api/@rulvar/core/interfaces/Msg.md) | - |
| [NodeLinkValue](/api/@rulvar/core/interfaces/NodeLinkValue.md) | The node.link entry value (docs/03, 9.5): an ordinary content-keyed effect entry. |
| [OrchestrateOptions](/api/@rulvar/core/interfaces/OrchestrateOptions.md) | docs/06 9.3: orchestrate(engine, goal, o?). |
| [OrchestratorBudgetSpec](/api/@rulvar/core/interfaces/OrchestratorBudgetSpec.md) | docs/06 5.5; the cap machinery (reserves, freeze) completes in M7 (DEF-7). |
| [OrchestratorExtension](/api/@rulvar/core/interfaces/OrchestratorExtension.md) | The extension contract. PlanRunner implements it in @rulvar/plan; the mode (c) orchestrator hosts it. Everything is optional except the toolset: an extension that adds no tools has no reason to exist. |
| [OrchestratorExtensionIO](/api/@rulvar/core/interfaces/OrchestratorExtensionIO.md) | The per-run IO the extension closes over (engine-owned effects). |
| [OrchestratorRuntime](/api/@rulvar/core/interfaces/OrchestratorRuntime.md) | The engine seam the spawn tools close over (never on ToolContext). |
| [PendingExternal](/api/@rulvar/core/interfaces/PendingExternal.md) | Suspensions still open at settle time; producers arrive with M2. |
| [PendingToolTurn](/api/@rulvar/core/interfaces/PendingToolTurn.md) | Mid-turn suspension state (M3-T03): the turn's already-executed tool results plus the call awaiting an approval resolution, so resume continues the SAME turn without re-running executed tools. |
| [PermissionConfig](/api/@rulvar/core/interfaces/PermissionConfig.md) | Host-side permission configuration (engine defaults.permissions). |
| [PhaseTarget](/api/@rulvar/core/interfaces/PhaseTarget.md) | One serving target of a phase: the primary or a failover fallback. |
| [PipelineCollected](/api/@rulvar/core/interfaces/PipelineCollected.md) | Pipeline results plus the dropped evidence, returned by onItemError: 'collect'. |
| [PipelineOpts](/api/@rulvar/core/interfaces/PipelineOpts.md) | - |
| [PriceTable](/api/@rulvar/core/interfaces/PriceTable.md) | - |
| [Pricing](/api/@rulvar/core/interfaces/Pricing.md) | Per-model pricing in USD per million tokens (docs/04, section "Pricing"). The registry's versioned price table wins over adapter- reported caps.pricing, which is a fallback only. |
| [ProviderAdapter](/api/@rulvar/core/interfaces/ProviderAdapter.md) | - |
| [QualityFloors](/api/@rulvar/core/interfaces/QualityFloors.md) | - |
| [RandIdentityInput](/api/@rulvar/core/interfaces/RandIdentityInput.md) | Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand'). |
| [RefEntryAppender](/api/@rulvar/core/interfaces/RefEntryAppender.md) | The append surface the arbiter drives (implemented by the Replayer). |
| [RefusalInfo](/api/@rulvar/core/interfaces/RefusalInfo.md) | - |
| [ResolutionLayer](/api/@rulvar/core/interfaces/ResolutionLayer.md) | One layer's contribution to the resolution merge. |
| [ResolvedInvocation](/api/@rulvar/core/interfaces/ResolvedInvocation.md) | The resolved, scrubbed result of one invocation's resolution. |
| [ResolvedToolset](/api/@rulvar/core/interfaces/ResolvedToolset.md) | The spawn's frozen toolset snapshot plus its identity hash. |
| [ResumeHandle](/api/@rulvar/core/interfaces/ResumeHandle.md) | - |
| [ResumeOptions](/api/@rulvar/core/interfaces/ResumeOptions.md) | - |
| [ResumePreview](/api/@rulvar/core/interfaces/ResumePreview.md) | Resume-time hit/miss/orphan accounting (docs/03, section 11.3). |
| [ResumeReport](/api/@rulvar/core/interfaces/ResumeReport.md) | - |
| [RetryPolicy](/api/@rulvar/core/interfaces/RetryPolicy.md) | - |
| [ReuseConfig](/api/@rulvar/core/interfaces/ReuseConfig.md) | The reuse block of AdmissionConfig (docs/03, 9.9). |
| [RunAgentOptions](/api/@rulvar/core/interfaces/RunAgentOptions.md) | - |
| [RunEventSink](/api/@rulvar/core/interfaces/RunEventSink.md) | Span-aware event sink: bodies are stamped into the WorkflowEvent envelope by the per-run EventBus (M1-T10); spanId defaults to the run root span when omitted. |
| [RunHandle](/api/@rulvar/core/interfaces/RunHandle.md) | - |
| [RunInternals](/api/@rulvar/core/interfaces/RunInternals.md) | Everything one run's ctx needs; created per run by the engine (M1-T11). |
| [RunOptions](/api/@rulvar/core/interfaces/RunOptions.md) | - |
| [RunProfile](/api/@rulvar/core/interfaces/RunProfile.md) | - |
| [RuntimeEventSink](/api/@rulvar/core/interfaces/RuntimeEventSink.md) | Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10. |
| [SandboxBridge](/api/@rulvar/core/interfaces/SandboxBridge.md) | - |
| [SandboxBridgeOptions](/api/@rulvar/core/interfaces/SandboxBridgeOptions.md) | - |
| [ScriptRunner](/api/@rulvar/core/interfaces/ScriptRunner.md) | - |
| [ScrubNote](/api/@rulvar/core/interfaces/ScrubNote.md) | A scrub performed by the router; surfaced as a warning-level event by the engine. |
| [SerializationHook](/api/@rulvar/core/interfaces/SerializationHook.md) | createEngine({ serialization }): absent means identity, no wrapping. |
| [ShellPatternRules](/api/@rulvar/core/interfaces/ShellPatternRules.md) | - |
| [ShellSegment](/api/@rulvar/core/interfaces/ShellSegment.md) | Argv-parsing shell matcher (M5-T06; docs/08, section 5): shell allow/ask/deny is matched through a real argv parser, never a string prefix. The composition rule is the entire point: for a compound command the verdict is the strictest across segments, and any unmatched segment yields ask, never a silent allow: `npm test; rm -rf /` MUST yield ask (or deny when rm patterns are denied) even when `npm test` is allow-listed. |
| [SinglePhaseAppend](/api/@rulvar/core/interfaces/SinglePhaseAppend.md) | - |
| [SpanMinter](/api/@rulvar/core/interfaces/SpanMinter.md) | Mints span ids in the run > phase > agent > tool > child hierarchy. |
| [SpawnAdmissionValue](/api/@rulvar/core/interfaces/SpawnAdmissionValue.md) | The journaled spawn-admission payload the runtime writes and recovers. |
| [SpawnAgentParams](/api/@rulvar/core/interfaces/SpawnAgentParams.md) | The spawn parameters as validated JSON (docs/07 4.1 TaskSpec subset). |
| [SpawnLineage](/api/@rulvar/core/interfaces/SpawnLineage.md) | The value-part lineage block embedded in decision entries: the computed LineageRef plus the normalized tag (docs/03, 10.6: the request part holds the RAW proposal; the value part holds what was COMPUTED and is reused byte-exact on replay). |
| [SpawnLineageOpt](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) | The spawn-options lineage block (ctx.agent, ctx.workflow, spawn_agent, add_task). |
| [SpawnRecord](/api/@rulvar/core/interfaces/SpawnRecord.md) | One spawned child tracked by the orchestrator runtime. |
| [StandardJSONSchemaV1](/api/@rulvar/core/interfaces/StandardJSONSchemaV1.md) | The Standard JSON Schema interface. |
| [StandardSchemaV1](/api/@rulvar/core/interfaces/StandardSchemaV1.md) | The Standard Schema interface. |
| [StepIdentityInput](/api/@rulvar/core/interfaces/StepIdentityInput.md) | Journaled effectful steps: ctx.step (kind 'step'). |
| [SuspendedAppend](/api/@rulvar/core/interfaces/SuspendedAppend.md) | - |
| [TaskDigest](/api/@rulvar/core/interfaces/TaskDigest.md) | docs/07 section 5: the per-child digest handed to the orchestrator. |
| [TerminalPatch](/api/@rulvar/core/interfaces/TerminalPatch.md) | - |
| [TerminationAccountSnapshot](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md) | - |
| [TerminationDeniedValue](/api/@rulvar/core/interfaces/TerminationDeniedValue.md) | The value payload of a termination.denied entry (docs/07, 11.6). |
| [TerminationInitValue](/api/@rulvar/core/interfaces/TerminationInitValue.md) | The value payload of a termination.init entry (docs/07, 11.6). |
| [TerminationLimits](/api/@rulvar/core/interfaces/TerminationLimits.md) | The frozen limits vector written into termination.init (docs/07, 11.2). |
| [ToolCallRequest](/api/@rulvar/core/interfaces/ToolCallRequest.md) | One model-issued tool call as the loop dispatches it. |
| [ToolContext](/api/@rulvar/core/interfaces/ToolContext.md) | The context handed to execute (and to permission hooks and canUseTool). Deliberately exposes NO spawn primitives: tools are leaves of the call-and-return tree (invariant I3); all spawning flows through Ctx primitives (docs/08, section "ToolContext"). |
| [ToolContextSeed](/api/@rulvar/core/interfaces/ToolContextSeed.md) | - |
| [ToolContract](/api/@rulvar/core/interfaces/ToolContract.md) | The identity-bearing tool contract: exactly what the model sees and exactly what toolsetHash hashes. Never contains execute or any closure (docs/08, section "Tool definition and toolsetHash"). |
| [ToolDef](/api/@rulvar/core/interfaces/ToolDef.md) | A defined tool. The identity projection is the ToolContract { name, description, parameters, version }: exactly what the model sees and exactly what toolsetHash hashes; execute and every other non-contract field are excluded by construction (docs/08, section "tool() definition and ToolDef"). |
| [ToolInit](/api/@rulvar/core/interfaces/ToolInit.md) | - |
| [ToolRuntime](/api/@rulvar/core/interfaces/ToolRuntime.md) | The spawn's frozen toolset plus the per-call context factory, prepared by the ctx layer (M3-T01). The contracts are the canonical identity projection already hashed into the spawn's content key; the loop sends exactly them to the model. |
| [ToolSource](/api/@rulvar/core/interfaces/ToolSource.md) | The ToolSource seam: tools() yields the source's current ToolDefs. The toolset snapshot for a given agent spawn is captured at spawn time and hashed into the spawn's identity via toolsetHash; a mid-run change MUST NOT mutate an in-flight agent's toolset (docs/08, section "MCP bus"). |
| [ToolSourceSession](/api/@rulvar/core/interfaces/ToolSourceSession.md) | Session handle passed to ToolSource.tools (minimal in v1; audited at M9). |
| [TranscriptSerializationHook](/api/@rulvar/core/interfaces/TranscriptSerializationHook.md) | - |
| [TranscriptStore](/api/@rulvar/core/interfaces/TranscriptStore.md) | - |
| [UsageLimits](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits (M1-T06): normative limit vocabulary and the per-spawn merge. |
| [VerifiedRecommendation](/api/@rulvar/core/interfaces/VerifiedRecommendation.md) | One compiled start-tier recommendation of the verified layer. |
| [WakeBudgetBlock](/api/@rulvar/core/interfaces/WakeBudgetBlock.md) | Passive budget visibility in every digest (DEF-7; docs/07, 12.5). |
| [WakeDigest](/api/@rulvar/core/interfaces/WakeDigest.md) | The FINAL normative WakeDigest (docs/07 section 5): one coordinated schema change inside the hashVersion-2 profile (XF-12). The digest render enters the content key of orchestrator turns. In runs without the PlanRunner extension the termination, budget, and reuse blocks are all-zero and planHash is empty, mirroring the CostReport convention. |
| [Workflow](/api/@rulvar/core/interfaces/Workflow.md) | Closure-form workflow value; in-process only (docs/06, section "Execution model"). |
| [WorkflowCallOpts](/api/@rulvar/core/interfaces/WorkflowCallOpts.md) | Options of ctx.workflow; `key` replaces args in the child identity (docs/03, 1.2). |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [AbandonAttempt](/api/@rulvar/core/type-aliases/AbandonAttempt.md) | - |
| [AbandonPayload](/api/@rulvar/core/type-aliases/AbandonPayload.md) | Payload of abandon ref-entries (docs/03, section 8.6; DEF-4/DEF-5). |
| [AbortClass](/api/@rulvar/core/type-aliases/AbortClass.md) | The consumer-visible dedicated class marker (FR-424). |
| [AdaptiveEvents](/api/@rulvar/core/type-aliases/AdaptiveEvents.md) | docs/09 section 1.4, adaptive orchestration, resolutions, and accounting: emitted only by runs where the corresponding machinery is active (applicability per mode: docs/07, section 1). The types land as one closed catalog with M7-T03; emitters arrive with their tasks. |
| [AdmitRejectReason](/api/@rulvar/core/type-aliases/AdmitRejectReason.md) | The merged reject-code set (docs/07, section 7.2). |
| [AdmitVerdict](/api/@rulvar/core/type-aliases/AdmitVerdict.md) | The unified admission verdict (docs/07, section 7.2; XF-11). One union, closed now; every debit is atomic with its carrying decision entry and embeds the balance-after (DEF-2). |
| [AgentError](/api/@rulvar/core/type-aliases/AgentError.md) | The structured error value carried on AgentResult.error and journaled inside the agent terminal entry. Deliberately NOT a RulvarError subclass (docs/02, section "Error taxonomy"). |
| [AgentEvents](/api/@rulvar/core/type-aliases/AgentEvents.md) | docs/09 section 1.4, agent lifecycle. |
| [AgentStatus](/api/@rulvar/core/type-aliases/AgentStatus.md) | - |
| [AttemptOutcomeClass](/api/@rulvar/core/type-aliases/AttemptOutcomeClass.md) | Attempt outcome classes entering LineageStats (docs/03, 10.3). |
| [Bytes](/api/@rulvar/core/type-aliases/Bytes.md) | L0 byte-blob alias consumed by TranscriptStore and IsolationProvider. |
| [CacheTtl](/api/@rulvar/core/type-aliases/CacheTtl.md) | - |
| [CanonicalId](/api/@rulvar/core/type-aliases/CanonicalId.md) | Engine-minted ULID identifying a tool call across providers. The library, not the provider, mints tool-call ids; each adapter keeps a bijective map between canonical ids and wire ids (toolu_* / call_*) in both directions (docs/04, section "Canonical tool-call ids"). |
| [CanonicalIdentity](/api/@rulvar/core/type-aliases/CanonicalIdentity.md) | The projected, JCS-serializable identity under one profile. |
| [CanonicalModelSpec](/api/@rulvar/core/type-aliases/CanonicalModelSpec.md) | Identity-facing canonical form of a RESOLVED model request; the value that enters AgentIdentityInput.modelSpec (docs/03, section "Identity model"). providerOptions and fallbacks NEVER enter this form: they are delivery options, excluded from identity exactly like label, phase, onError, retry, and replay. `effort` is absent exactly when no layer of the chain and no role effort default resolves one (docs/04, section "Router and resolution chain"). |
| [CanUseTool](/api/@rulvar/core/type-aliases/CanUseTool.md) | - |
| [ChatEvent](/api/@rulvar/core/type-aliases/ChatEvent.md) | The single canonical stream-event vocabulary yielded by ProviderAdapter.stream. Adapters MUST emit exactly one terminal event per stream (finish or error) (docs/04, section "ChatEvent stream"). |
| [ClaimClass](/api/@rulvar/core/type-aliases/ClaimClass.md) | - |
| [ClaimOp](/api/@rulvar/core/type-aliases/ClaimOp.md) | - |
| [ClaimStatus](/api/@rulvar/core/type-aliases/ClaimStatus.md) | - |
| [CoreEvents](/api/@rulvar/core/type-aliases/CoreEvents.md) | docs/09 section 1.4, run lifecycle and core telemetry (M1 subset). |
| [DebitResult](/api/@rulvar/core/type-aliases/DebitResult.md) | - |
| [DerivedKey](/api/@rulvar/core/type-aliases/DerivedKey.md) | A derived key, or the guaranteed non-match marker. |
| [DeriverRegistry](/api/@rulvar/core/type-aliases/DeriverRegistry.md) | - |
| [DispositionRule](/api/@rulvar/core/type-aliases/DispositionRule.md) | Per-effective-status disposition rules; DATA on the profile, consumed only by the single canonical replayDisposition function (docs/03, section 4.2: there is NO replayAction method). |
| [DispositionTable](/api/@rulvar/core/type-aliases/DispositionTable.md) | - |
| [Effort](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort: exactly five levels, a string-literal union, never a TS enum (docs/04, section "Canonical effort"). OpenAI 'none' has no canonical equivalent and is reachable only via providerOptions. |
| [EntryKind](/api/@rulvar/core/type-aliases/EntryKind.md) | The single kinds registry v2 (docs/03, section "Kinds registry v2"). Readers MUST tolerate unknown kinds; stores pass them through byte-for-byte (obligation A4). |
| [EntryRef](/api/@rulvar/core/type-aliases/EntryRef.md) | The canonical EntryRef between entries is seq (docs/03, section "Full entry identity"). |
| [EntryStatus](/api/@rulvar/core/type-aliases/EntryStatus.md) | The stored status vocabulary, exactly. 'skipped' is DELIBERATELY absent: it is a derived fold status, never persisted (docs/03, section "Stored status vocabulary"). |
| [ErrorClass](/api/@rulvar/core/type-aliases/ErrorClass.md) | - |
| [ErrorCode](/api/@rulvar/core/type-aliases/ErrorCode.md) | The closed error-code registry (docs/02, section "Error taxonomy"). 'agent' is carried by the AgentError value projection, not by a RulvarError subclass. |
| [ErrorPolicy](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | - |
| [EscalatedResult](/api/@rulvar/core/type-aliases/EscalatedResult.md) | - |
| [EscalationDecision](/api/@rulvar/core/type-aliases/EscalationDecision.md) | - |
| [EscalationKind](/api/@rulvar/core/type-aliases/EscalationKind.md) | Closed in v1 (docs/07, section 6.3). |
| [EvidenceRef](/api/@rulvar/core/type-aliases/EvidenceRef.md) | entryRef is the journal entry seq (canonical EntryRef; XF ruling). |
| [FailoverTrigger](/api/@rulvar/core/type-aliases/FailoverTrigger.md) | Transport-level failover triggers; budget is explicitly excluded. |
| [FallbackTrigger](/api/@rulvar/core/type-aliases/FallbackTrigger.md) | The degenerate fallback triggers (docs/04, section 11.3). |
| [FinishInfo](/api/@rulvar/core/type-aliases/FinishInfo.md) | Typed finish outcomes. A refusal MUST surface as a typed finish outcome carrying the provider stop details; it MUST NOT be projected to a null output silently (docs/04, section "Finish outcomes and typed refusal"). |
| [Gate](/api/@rulvar/core/type-aliases/Gate.md) | Ladder acceptance gates. Spot-check sibling selection is strictly via ctx.random, never Math.random (docs/04, section "ModelLadder summary"). |
| [GateRecord](/api/@rulvar/core/type-aliases/GateRecord.md) | The write gate. The human variant carries the MANDATORY attribution attestation (ruledOut over the checklist prompt, tools, difficulty, transient-provider; recommended contrast evidence): rubber-stamping "evidence exists" is constructively impossible. The eval-confirmed variant is reserved for v2, outside the committed roadmap. |
| [HashVersion](/api/@rulvar/core/type-aliases/HashVersion.md) | Versions the ENTIRE identity and replay pipeline as one unit: canonical JSON algorithm, identity field sets, hash function, schema/toolset hash derivation, scope grammar and ordinal rules, replay predicate, fold defaults, and the kind/status vocabularies (docs/03, section "hashVersion"). |
| [HookVerdict](/api/@rulvar/core/type-aliases/HookVerdict.md) | - |
| [IdentityInput](/api/@rulvar/core/type-aliases/IdentityInput.md) | - |
| [InvocationRole](/api/@rulvar/core/type-aliases/InvocationRole.md) | - |
| [IsolationSpec](/api/@rulvar/core/type-aliases/IsolationSpec.md) | The canonical identity encoding of spawn isolation: this exact value domain enters spawn identity (docs/03, section "Identity model"). 'readonly' is a determinism and blast-radius declaration, not containment. |
| [Issue](/api/@rulvar/core/type-aliases/Issue.md) | The vendored Standard Schema issue shape (docs/06, section "Canonical Ctx interface"): validation issues carried on AgentError and surfaced to the model during bounded schema re-prompts. |
| [JournalCompatSubCode](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md) | Sub-code detail of JournalCompatibilityError (docs/03, section "hashVersion"). |
| [JournalEntry](/api/@rulvar/core/type-aliases/JournalEntry.md) | Final entry form (hashVersion 2; docs/03, section "JournalEntry form"). All journaled values MUST be JSON-serializable; a violation raises a typed NonSerializableValueError at the call site. append is serialized by a per-run queue. |
| [Json](/api/@rulvar/core/type-aliases/Json.md) | L0 JSON value domain. |
| [JsonSchema](/api/@rulvar/core/type-aliases/JsonSchema.md) | A JSON Schema document (draft 2020-12) as plain JSON data. Canonical serialization and hashing rules live with the KeyDeriver (docs/03, section "schemaHash and toolsetHash derivation"). |
| [Lease](/api/@rulvar/core/type-aliases/Lease.md) | Lease token for queue-mode ownership; epoch is the fencing token. |
| [LineageRelation](/api/@rulvar/core/type-aliases/LineageRelation.md) | The closed relation vocabulary of the minting and inheritance table. |
| [LogicalTaskId](/api/@rulvar/core/type-aliases/LogicalTaskId.md) | Logical-task identity across rebirths (DEF-3); engine-minted ULID. |
| [MatchResult](/api/@rulvar/core/type-aliases/MatchResult.md) | - |
| [MechanicalGateProfile](/api/@rulvar/core/type-aliases/MechanicalGateProfile.md) | A mechanical acceptance gate: an engine-registered NAMED pure function over AgentResult.artifacts (docs/04, section 12; docs/07, section 10). The registry is per engine like every other registry (docs/02); the ladder driver journals each evaluation as a decision entry, so the ladder fold consumes only journaled verdicts, never live re-evaluation. |
| [ModelCaps](/api/@rulvar/core/type-aliases/ModelCaps.md) | Capability facts the router consumes for tier selection and scrubbing. |
| [ModelKnowledgeHandle](/api/@rulvar/core/type-aliases/ModelKnowledgeHandle.md) | The runtime handle: with propose() deleted from the design and commit absent from this shape, a run has no write path into the cross-run medium at all (docs/05, section "Security", channel 3). |
| [ModelListConstraint](/api/@rulvar/core/type-aliases/ModelListConstraint.md) | An explicit allowlist and denylist; deny wins over allow. |
| [ModelRef](/api/@rulvar/core/type-aliases/ModelRef.md) | Strictly 'adapterId:model', no query parameters (docs/04, section "Registry and ModelRef"). |
| [ModelSpec](/api/@rulvar/core/type-aliases/ModelSpec.md) | What authors write wherever a model is configurable: a call override, an agent profile, a workflow default, or an engine default (docs/04, section "Router and resolution chain"). |
| [NodeId](/api/@rulvar/core/type-aliases/NodeId.md) | Plan-node identity; engine-minted ULID (docs/07, section 3.1). |
| [OnEscalation](/api/@rulvar/core/type-aliases/OnEscalation.md) | Escalation hook (docs/06, section 2.10): decides for value-form calls. |
| [OperationDisposition](/api/@rulvar/core/type-aliases/OperationDisposition.md) | - |
| [Out](/api/@rulvar/core/type-aliases/Out.md) | Inferred output type per form: the Standard Schema output type; the type-guard target of validate(); unknown for a bare JSON Schema (docs/08, section "Out&lt;S&gt; inference"). |
| [Part](/api/@rulvar/core/type-aliases/Part.md) | The canonical part union. provider-raw parts carry opaque provider blocks that must survive round trips (thinking blocks with signatures, reasoning items including encrypted_content). Retention is unconditional; dropping happens only in projection, never in retention (docs/04, section "Messages and parts"). |
| [PermissionGate](/api/@rulvar/core/type-aliases/PermissionGate.md) | - |
| [PermissionHook](/api/@rulvar/core/type-aliases/PermissionHook.md) | - |
| [PermissionPreset](/api/@rulvar/core/type-aliases/PermissionPreset.md) | - |
| [PermissionRule](/api/@rulvar/core/type-aliases/PermissionRule.md) | - |
| [PermissionVerdict](/api/@rulvar/core/type-aliases/PermissionVerdict.md) | - |
| [RandPayload](/api/@rulvar/core/type-aliases/RandPayload.md) | Rand-entry payload (docs/03, section "Normative payload schemas"). |
| [RefEntryClassification](/api/@rulvar/core/type-aliases/RefEntryClassification.md) | Fold classification of one ref-entry; NEVER persisted (docs/03, section 8.4). |
| [ReplayDisposition](/api/@rulvar/core/type-aliases/ReplayDisposition.md) | - |
| [ReplayMode](/api/@rulvar/core/type-aliases/ReplayMode.md) | - |
| [ResolutionAttempt](/api/@rulvar/core/type-aliases/ResolutionAttempt.md) | - |
| [ResolutionBy](/api/@rulvar/core/type-aliases/ResolutionBy.md) | The journaled by-source of a resolution (docs/03, section 8.6 mapping table). |
| [ResolutionOutcome](/api/@rulvar/core/type-aliases/ResolutionOutcome.md) | - |
| [ResolutionPayload](/api/@rulvar/core/type-aliases/ResolutionPayload.md) | Payload of resolution ref-entries (docs/03, section 8.6; DEF-4). |
| [RetryClass](/api/@rulvar/core/type-aliases/RetryClass.md) | - |
| [RiskRuleValue](/api/@rulvar/core/type-aliases/RiskRuleValue.md) | Declarative rule tables (no closures). `'undeclared'` in risk position matches every tool WITHOUT declared risk: presets treat the undeclared state conservatively (docs/08, section 4.3). Argv rules match through the real shell matcher (section 5); domain rules are ADVISORY outside the first-party fetch tool (section 4.4): they never change a verdict in M5, and matches surface in audit events. |
| [Role](/api/@rulvar/core/type-aliases/Role.md) | - |
| [RulvarErrorCode](/api/@rulvar/core/type-aliases/RulvarErrorCode.md) | docs/02 names the registry type RulvarErrorCode; both names are public. |
| [RunFilter](/api/@rulvar/core/type-aliases/RunFilter.md) | - |
| [RunMeta](/api/@rulvar/core/type-aliases/RunMeta.md) | Run-level metadata written by the ENGINE via putMeta as a separate record, so listRuns never parses payloads. The hashVersion range fields are advisory only; the journal is authoritative (docs/03, section "RunMeta"). |
| [RunOutcome](/api/@rulvar/core/type-aliases/RunOutcome.md) | - |
| [RunStatus](/api/@rulvar/core/type-aliases/RunStatus.md) | Adds 'running' for in-flight inspection (docs/06, section "Engine and ops API"). |
| [SandboxHostToWorker](/api/@rulvar/core/type-aliases/SandboxHostToWorker.md) | Host-to-worker protocol messages (JSON only). |
| [SandboxMethod](/api/@rulvar/core/type-aliases/SandboxMethod.md) | Methods a sandbox script may proxy to the host ctx (docs/06, 8.2). |
| [SandboxWorkerToHost](/api/@rulvar/core/type-aliases/SandboxWorkerToHost.md) | Worker-to-host protocol messages (JSON only). |
| [SchemaPair](/api/@rulvar/core/type-aliases/SchemaPair.md) | Form 2 of SchemaSpec: an explicit JSON Schema plus a runtime type guard. |
| [SchemaSpec](/api/@rulvar/core/type-aliases/SchemaSpec.md) | The L0 schema contract with exactly three accepted forms: a Standard Schema (Zod, ArkType, Valibot, ...), a { jsonSchema, validate } pair, or a bare JSON Schema literal (docs/08, section "The three forms"). |
| [SchemaValidationResult](/api/@rulvar/core/type-aliases/SchemaValidationResult.md) | Result of validating a value against a SchemaSpec. |
| [ScopeSegment](/api/@rulvar/core/type-aliases/ScopeSegment.md) | A parsed scope-path segment (docs/03, section 2.1). |
| [Settled](/api/@rulvar/core/type-aliases/Settled.md) | The discriminated union over AgentStatus carrying the underlying AgentResult where one exists (docs/06, section "ctx.parallel and Settled"). |
| [ShellVerdict](/api/@rulvar/core/type-aliases/ShellVerdict.md) | - |
| [SpawnKey](/api/@rulvar/core/type-aliases/SpawnKey.md) | Kernel contentHash of a spawn root entry (docs/03, 9.2). |
| [SpawnOrigin](/api/@rulvar/core/type-aliases/SpawnOrigin.md) | Every spawn origin routed through the single admission point (docs/07, 7.1). |
| [Spend](/api/@rulvar/core/type-aliases/Spend.md) | - |
| [Stage](/api/@rulvar/core/type-aliases/Stage.md) | - |
| [StructuredOutputTier](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) | - |
| [SuspensionState](/api/@rulvar/core/type-aliases/SuspensionState.md) | - |
| [TaskClass](/api/@rulvar/core/type-aliases/TaskClass.md) | Task-class vocabulary aligned with the role quality floors vocabulary (docs/04, section "Role quality floors"). Scopeless global statements are inexpressible: every claim binds a taskClass. |
| [TaskSpec](/api/@rulvar/core/type-aliases/TaskSpec.md) | Minimal TaskSpec stand-in: the full typed TaskSpec is owned by the PlanRunner surface (docs/07, section 4.1) and ships with M7; script modes carry proposals opaquely until then. |
| [TerminationDeniedWriter](/api/@rulvar/core/type-aliases/TerminationDeniedWriter.md) | Injected appender for termination.denied entries (engine-owned I/O). |
| [TerminationResource](/api/@rulvar/core/type-aliases/TerminationResource.md) | The countable resource vocabulary (docs/07, 11.5). |
| [ToolChoice](/api/@rulvar/core/type-aliases/ToolChoice.md) | - |
| [ToolEvents](/api/@rulvar/core/type-aliases/ToolEvents.md) | docs/09 section 1.4, tool lifecycle (emitters arrive with the tool system, M3). |
| [ToolExecutor](/api/@rulvar/core/type-aliases/ToolExecutor.md) | Where execute runs. A declared capability consumed by dispatch and policy; only 'inprocess' is enforced in v1, subprocess/container remain declared capability until the executor spec closes (docs/08, section "Executors"; OQ in docs/14). |
| [ToolRisk](/api/@rulvar/core/type-aliases/ToolRisk.md) | Declarative risk metadata on the tool contract. Policy input, not identity: it does NOT enter toolsetHash (docs/08, section "Risk metadata and permission presets"). |
| [ToolsOption](/api/@rulvar/core/type-aliases/ToolsOption.md) | The per-spawn tools option value domain (docs/06, section "ctx.agent and AgentOpts"). |
| [TriggerClass](/api/@rulvar/core/type-aliases/TriggerClass.md) | - |
| [TtlState](/api/@rulvar/core/type-aliases/TtlState.md) | The TTL state a maintenance view renders per claim. |
| [Usage](/api/@rulvar/core/type-aliases/Usage.md) | Usage under the Usage invariant: inputTokens is the FULL prompt size including cache reads and cache writes. Adapters MUST normalize provider-reported usage to satisfy this invariant, and the core verifies it at the adapter boundary (docs/04, section "Usage invariant"). |
| [WakeTrigger](/api/@rulvar/core/type-aliases/WakeTrigger.md) | The closed v1 trigger vocabulary (docs/07 4.8). |
| [WireError](/api/@rulvar/core/type-aliases/WireError.md) | JSON-serializable error projection stored in journal entries (JournalEntry.error) and sent across process boundaries (worker sandbox RPC, HTTP server). Raw Error objects never enter the journal. |
| [WorkflowEvent](/api/@rulvar/core/type-aliases/WorkflowEvent.md) | The envelope (docs/09 section 1.1): seq is an independent per-run telemetry counter, strictly increasing in emission order and DISTINCT from JournalEntry.seq (never compare or join the two; entryRef fields carry journal seqs explicitly). ts is wall clock, telemetry only. replayed is true only on re-emitted journal-backed lifecycle events (docs/09 section 1.5); stream deltas are never re-emitted. |
| [WorkflowEventBody](/api/@rulvar/core/type-aliases/WorkflowEventBody.md) | - |
| [WorkflowRegistry](/api/@rulvar/core/type-aliases/WorkflowRegistry.md) | The per-engine workflow registry (docs/06, section 10.4; M5-T01): an explicit, first-class value; no module-level registry exists. Shells resolve by-name runs against it; ctx.workflow's string form (M6) and the queue worker (M8) resolve against it too. CompiledWorkflow values join the union when they first exist (M6). |

## Variables

| Variable | Description |
| ------ | ------ |
| [AWAIT\_SCHEMA](/api/@rulvar/core/variables/AWAIT_SCHEMA.md) | docs/07 4.4: await_any and await_all share one parameter shape. |
| [BUDGET\_ABORT\_REASON](/api/@rulvar/core/variables/BUDGET_ABORT_REASON.md) | Reason marker distinguishing a budget-ceiling abort from host cancellation. |
| [CANCEL\_AGENT\_SCHEMA](/api/@rulvar/core/variables/CANCEL_AGENT_SCHEMA.md) | docs/07 4.5: cancel_agent. |
| [CHECKPOINT\_FORMAT\_V1](/api/@rulvar/core/variables/CHECKPOINT_FORMAT_V1.md) | Leading format byte of the v1 checkpoint blob. |
| [CLAIM\_STATEMENT\_MAX\_CHARS](/api/@rulvar/core/variables/CLAIM_STATEMENT_MAX_CHARS.md) | docs/05, section "Data model": statement <= 200 chars. |
| [CLAIM\_TTL\_DAYS](/api/@rulvar/core/variables/CLAIM_TTL_DAYS.md) | The asymmetric TTL table (docs/05, section "Grounding and decay"): a false negative is costlier through lock-in, so weaknesses expire sooner than strengths. |
| [COMPACTION\_SUMMARY\_PREFIX](/api/@rulvar/core/variables/COMPACTION_SUMMARY_PREFIX.md) | Deterministic marker opening every compaction summary message. |
| [CURRENT\_HASH\_VERSION](/api/@rulvar/core/variables/CURRENT_HASH_VERSION.md) | 1 = round 1; 2 = current. |
| [DEFAULT\_CHILD\_BUDGET\_FRACTION](/api/@rulvar/core/variables/DEFAULT_CHILD_BUDGET_FRACTION.md) | - |
| [DEFAULT\_COMPACTION\_THRESHOLD](/api/@rulvar/core/variables/DEFAULT_COMPACTION_THRESHOLD.md) | Appendix A: compaction threshold default, 0.8 of contextWindow. |
| [DEFAULT\_ESCALATION\_LIMITS](/api/@rulvar/core/variables/DEFAULT_ESCALATION_LIMITS.md) | - |
| [DEFAULT\_FLAT\_RESERVE\_USD](/api/@rulvar/core/variables/DEFAULT_FLAT_RESERVE_USD.md) | Last resort of the admission reserve formula (docs/06, Appendix A). |
| [DEFAULT\_MAX\_CHILDREN\_PER\_NODE](/api/@rulvar/core/variables/DEFAULT_MAX_CHILDREN_PER_NODE.md) | - |
| [DEFAULT\_MAX\_DEPTH](/api/@rulvar/core/variables/DEFAULT_MAX_DEPTH.md) | - |
| [DEFAULT\_MAX\_OSCILLATIONS\_PER\_KEY](/api/@rulvar/core/variables/DEFAULT_MAX_OSCILLATIONS_PER_KEY.md) | - |
| [DEFAULT\_MAX\_PINNED\_WORKTREES](/api/@rulvar/core/variables/DEFAULT_MAX_PINNED_WORKTREES.md) | docs/06 Appendix A: the shared pin cap (park/unpark and retainWorktree). |
| [DEFAULT\_MAX\_REVISIONS\_PER\_RUN](/api/@rulvar/core/variables/DEFAULT_MAX_REVISIONS_PER_RUN.md) | Appendix A committed defaults for the countable resources. |
| [DEFAULT\_MAX\_TOTAL\_SPAWNS](/api/@rulvar/core/variables/DEFAULT_MAX_TOTAL_SPAWNS.md) | - |
| [DEFAULT\_MAX\_TURNS](/api/@rulvar/core/variables/DEFAULT_MAX_TURNS.md) | - |
| [DEFAULT\_MODEL\_RETRY\_ATTEMPTS](/api/@rulvar/core/variables/DEFAULT_MODEL_RETRY_ATTEMPTS.md) | Bounded semantic retries per tool call chain (docs/06, Appendix A). |
| [DEFAULT\_NO\_PROGRESS\_TURNS](/api/@rulvar/core/variables/DEFAULT_NO_PROGRESS_TURNS.md) | docs/06 Appendix A: the committed no-progress detector N. |
| [DEFAULT\_PER\_RUN\_CONCURRENCY](/api/@rulvar/core/variables/DEFAULT_PER_RUN_CONCURRENCY.md) | FIFO semaphore; default per-run width is 12 (docs/06, Appendix A). |
| [DEFAULT\_RETRY\_POLICY](/api/@rulvar/core/variables/DEFAULT_RETRY_POLICY.md) | Appendix A committed defaults (M4 entry gate, PR #26). |
| [DEFAULT\_STREAM\_IDLE\_TIMEOUT\_MS](/api/@rulvar/core/variables/DEFAULT_STREAM_IDLE_TIMEOUT_MS.md) | - |
| [deriverV1](/api/@rulvar/core/variables/deriverV1.md) | The frozen v1 (round 1) profile: the projection removes effort from the requested modelSpec (the v1 predicate is effort-insensitive by construction); features outside the v1 domain are incomparable. |
| [deriverV2](/api/@rulvar/core/variables/deriverV2.md) | The current (hashVersion 2) frozen profile. |
| [EMIT\_RESULT\_TOOL](/api/@rulvar/core/variables/EMIT_RESULT_TOOL.md) | The synthesized forced-tool contract name. |
| [EMPTY\_SCHEMA\_HASH](/api/@rulvar/core/variables/EMPTY_SCHEMA_HASH.md) | The schemaHash used when no structured-output schema is declared: the hash of the canonical `true` schema (docs/03, section "schemaHash and toolsetHash derivation"). |
| [EMPTY\_TOOLSET\_HASH](/api/@rulvar/core/variables/EMPTY_TOOLSET_HASH.md) | The toolsetHash of an empty toolset: the hash of the canonical empty contract array. |
| [ESCALATE\_TOOL\_NAME](/api/@rulvar/core/variables/ESCALATE_TOOL_NAME.md) | - |
| [ESCALATION\_REPORT\_SCHEMA](/api/@rulvar/core/variables/ESCALATION_REPORT_SCHEMA.md) | The full-report schema applied BEFORE append (docs/03, section 5.4). |
| [ESCALATION\_REQUEST\_SCHEMA](/api/@rulvar/core/variables/ESCALATION_REQUEST_SCHEMA.md) | The exact tool schema of docs/07, section 4.9. costToDate and salvage MUST NOT appear here: additionalProperties false rejects model-authored values for them at argument validation. |
| [FINISH\_SCHEMA](/api/@rulvar/core/variables/FINISH_SCHEMA.md) | docs/07 4.11: finish; result validates against the declared output schema. |
| [FINISH\_TOOL\_NAME](/api/@rulvar/core/variables/FINISH_TOOL_NAME.md) | - |
| [INBOX\_PROPOSAL\_TTL\_DAYS](/api/@rulvar/core/variables/INBOX_PROPOSAL_TTL_DAYS.md) | Inbox proposals expire after 14 days (reserved for M12 phase 3). |
| [KB\_ACTIVE\_CLAIMS\_CAP](/api/@rulvar/core/variables/KB_ACTIVE_CLAIMS_CAP.md) | docs/06, Appendix A: KB active-claims cap, default 8 per (model, taskClass). |
| [KB\_CARD\_RENDER\_BUDGET\_CHARS](/api/@rulvar/core/variables/KB_CARD_RENDER_BUDGET_CHARS.md) | docs/06, Appendix A: the KB card render budget (characters). |
| [LARGE\_VALUE\_WARN\_BYTES](/api/@rulvar/core/variables/LARGE_VALUE_WARN_BYTES.md) | docs/06 Appendix A: large-value soft warn threshold (committed for M2). |
| [LEGACY\_LTID\_PREFIX](/api/@rulvar/core/variables/LEGACY_LTID_PREFIX.md) | Deterministic LTIDs canonized onto legacy journals (docs/03, 10.7). |
| [LEGACY\_SIGNATURE\_INPUTS](/api/@rulvar/core/variables/LEGACY_SIGNATURE_INPUTS.md) | The deterministic signature inputs assigned to legacy spawns (journals written before lineage existed) and to attempts whose producers did not record signature inputs: stable constants, never wall-clock, so replay canonizes identically on every engine (docs/03, 10.7). |
| [LINEAGE\_SIG\_VERSION](/api/@rulvar/core/variables/LINEAGE_SIG_VERSION.md) | approachSig/approachSigCoarse derivation version (docs/03, 10.7). |
| [MASKED\_SECRET](/api/@rulvar/core/variables/MASKED_SECRET.md) | The replacement marker; deterministic and greppable. |
| [MAX\_DEPTH\_CEILING](/api/@rulvar/core/variables/MAX_DEPTH_CEILING.md) | - |
| [ORCHESTRATE\_WORKFLOW\_NAME](/api/@rulvar/core/variables/ORCHESTRATE_WORKFLOW_NAME.md) | - |
| [PARALLEL\_AGENTS\_SCHEMA](/api/@rulvar/core/variables/PARALLEL_AGENTS_SCHEMA.md) | docs/07 4.3: parallel_agents wraps the spawn_agent params. |
| [ROLE\_EFFORT\_DEFAULTS](/api/@rulvar/core/variables/ROLE_EFFORT_DEFAULTS.md) | Role effort defaults (docs/04, section "Invocation roles and firing protocol"): orchestrate and plan default to high; summarize and extract default to low. loop and finalize have NO role default: when the chain resolves nothing, the wire omits effort and identity records the spec with the effort member absent (docs/04, section "Router and resolution chain", as amended). |
| [ROOT\_ACCOUNT](/api/@rulvar/core/variables/ROOT_ACCOUNT.md) | The run-root account scope (docs/06, section 5.4 scope vocabulary). |
| [ROOT\_SCOPE](/api/@rulvar/core/variables/ROOT_SCOPE.md) | The root sequential body of the run is the empty path. |
| [RUN\_PROFILES](/api/@rulvar/core/variables/RUN_PROFILES.md) | The shipped presets (docs/06, section 11: fast / standard / deep / ultra "and similar"). Data only; a review-time assertion checks the engine has zero behavioral branches keyed on these names. |
| [SPAWN\_AGENT\_SCHEMA](/api/@rulvar/core/variables/SPAWN_AGENT_SCHEMA.md) | docs/07 4.2: the spawn_agent parameter schema (normative). |
| [TOOL\_NAME\_PATTERN](/api/@rulvar/core/variables/TOOL_NAME_PATTERN.md) | First-party provider tool-name constraint intersection (docs/08, section 1.1). |
| [WAIT\_FOR\_EVENTS\_SCHEMA](/api/@rulvar/core/variables/WAIT_FOR_EVENTS_SCHEMA.md) | docs/07 4.8: the wait_for_events parameter schema (normative). |
| [WAIT\_FOR\_EVENTS\_TOOL\_NAME](/api/@rulvar/core/variables/WAIT_FOR_EVENTS_TOOL_NAME.md) | - |
| [WAKE\_SUMMARY\_RENDER\_BUDGET\_CHARS](/api/@rulvar/core/variables/WAKE_SUMMARY_RENDER_BUDGET_CHARS.md) | The committed WakeDigest render budget (docs/06, Appendix A: 400 chars per outputSummary row, the character measure; committed at M10 entry by adopting the implemented distillation cap unchanged, the value frozen into every cassette since M6). One value serves both stages: the deterministic distillation cap here and the digest render default in orchestrate (renderBudgetChars). |

## Functions

| Function | Description |
| ------ | ------ |
| [admissionReserveUsd](/api/@rulvar/core/functions/admissionReserveUsd.md) | The admission reserve for a spawn (docs/06, section "Layer 1: admission before spawn"): opts.estCost, else profile.estCost, else price(countTokens(input) + caps.maxOutputTokens), else the engine flat default. |
| [agentErrorFromWire](/api/@rulvar/core/functions/agentErrorFromWire.md) | Reads an AgentError back from its WireError projection. Throws a ConfigError when the wire code is not 'agent'. |
| [agentErrorToWire](/api/@rulvar/core/functions/agentErrorToWire.md) | Projects an AgentError to its WireError form: code 'agent', with kind, retryAfterMs, and issues carried in data (docs/02, section "Error taxonomy"). Issue paths are flattened to JSON-safe segments. |
| [agentScope](/api/@rulvar/core/functions/agentScope.md) | Orchestrator handle spawns nest under the orchestrator's own spawn entry: `agent:<seq>`. |
| [applyClaimOps](/api/@rulvar/core/functions/applyClaimOps.md) | Applies one op batch to a claims array, mechanically (M10-T01). The editorial validators (attestation, caps, statement bounds) layer on top in M10-T02; referential integrity is enforced here because a dangling supersede or archive would corrupt the append-only chain. |
| [applyStructuredOutputTier](/api/@rulvar/core/functions/applyStructuredOutputTier.md) | Applies the selected tier to an outgoing request. Native rides ChatRequest.schema; forced-tool synthesizes a single emit_result tool with toolChoice pinned to it; prompt injects the schema into the last user message. |
| [approachSigCoarse](/api/@rulvar/core/functions/approachSigCoarse.md) | approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash, schemaHash, isolation })). Feeds the stall detector and the oscillation guard, which keys ACROSS LTID boundaries (docs/07, 3.8). |
| [approachSigOf](/api/@rulvar/core/functions/approachSigOf.md) | approachSig = sha256(JCS({ sigVersion, coarse, approachTag })); keys lessons. |
| [archiveDeprecatedModelOps](/api/@rulvar/core/functions/archiveDeprecatedModelOps.md) | Deprecation maintenance (docs/05: "deprecations, which archive claims, never delete them, so historical runs keep their audit trail"): archive ops for every non-terminal claim of the deprecated models. The caller commits them under its own gate-free archive ops. |
| [atCompactionThreshold](/api/@rulvar/core/functions/atCompactionThreshold.md) | The summarize trigger: the compaction threshold on the context window (docs/06, Appendix A: default 0.8). Pure predicate; the compaction pipeline that acts on it is M4-T03. |
| [buildAbandonFold](/api/@rulvar/core/functions/buildAbandonFold.md) | Builds the AbandonFold in ONE pass at load, in append order, pinned for the entire resume (DEF-1 ordering rule 4). Coverage is the target seq itself plus, transitively, every entry under the target's child scope-prefix (docs/03, sections 6.2 and 8.4). Repeated abandons over an already-covered target fold to noop. |
| [buildAdapterRegistry](/api/@rulvar/core/functions/buildAdapterRegistry.md) | Per-engine adapter registry: strictly per engine, no global mutable registry exists. A duplicate adapterId is a typed ConfigError (docs/04, section "Registry and ModelRef"). |
| [buildCostReport](/api/@rulvar/core/functions/buildCostReport.md) | Folds the per-run attribution buckets into the normative CostReport. |
| [buildDeriverRegistry](/api/@rulvar/core/functions/buildDeriverRegistry.md) | Builds the per-engine deriver registry: the shipped v1/v2 profiles plus EngineOptions.extraDerivers, the ONLY window extender (docs/03, section 4.5). A malformed extra deriver is a ConfigError before any run effect. |
| [buildOrchestratorTools](/api/@rulvar/core/functions/buildOrchestratorTools.md) | Builds the mode (c) toolset over the per-call runtime. profileCardText rides the spawn tools' descriptions so both modes speak one agent vocabulary (docs/06 9.3; M6-T04). |
| [buildTerminationInitValue](/api/@rulvar/core/functions/buildTerminationInitValue.md) | Builds the termination.init value payload (docs/07, 11.6). |
| [buildToolContext](/api/@rulvar/core/functions/buildToolContext.md) | Builds the per-call ToolContext; one fresh span per tool call. |
| [canonicalIsolationTag](/api/@rulvar/core/functions/canonicalIsolationTag.md) | The isolation string entering approachSigCoarse (docs/03, 10.3). |
| [canonicalizeLadder](/api/@rulvar/core/functions/canonicalizeLadder.md) | Canonicalizes a declared LadderSpec (docs/04, section 12): validates the shape once (FR-119 judge declaration included) and resolves every rung's effort to an explicit value. `chainEffort` is the effort the resolution chain would contribute at the declaring layer; a rung that resolves no effort at all is a ConfigError (the canonical form has no absent-effort member by declaration). |
| [canonicalizeSchema](/api/@rulvar/core/functions/canonicalizeSchema.md) | Canonical schema derivation (docs/03, section "schemaHash and toolsetHash derivation"): local fragment-only $ref inlined (recursion is a ConfigError), remote and dynamic references forbidden, annotation keywords stripped (format retained), reference infrastructure ($defs, definitions, $anchor) removed once inlined. The result feeds JCS serialization and sha256. |
| [canRideLoopTurn](/api/@rulvar/core/functions/canRideLoopTurn.md) | True when the given structured-output tier can ride the last loop turn. `native` and `prompt` coexist with tool availability; `forced-tool` pins toolChoice to the synthesized emit_result contract and therefore cannot ride while the agent's tools must remain available. For an agent with no tools every tier rides (the M1 behavior, unchanged). |
| [capIssues](/api/@rulvar/core/functions/capIssues.md) | The commit-time cap (docs/06, Appendix A): active claims per (model, taskClass) after the batch applies. Supersede chains keep only the head active by construction (applyClaimOps flips the prior to 'superseded'), so a supersede never grows the count. |
| [capsHashOf](/api/@rulvar/core/functions/capsHashOf.md) | Deterministic hash of a caps declaration (JCS + sha256). |
| [checkFloors](/api/@rulvar/core/functions/checkFloors.md) | Enforces the floors for one resolved invocation. `taskClass` is the profile-declared class; when absent (unclassified) only byRole floors apply. Throws a typed ConfigError on violation. |
| [checkpointRefFor](/api/@rulvar/core/functions/checkpointRefFor.md) | Deterministic checkpoint blob ref for an agent dispatch (running seq). |
| [childCoveragePrefix](/api/@rulvar/core/functions/childCoveragePrefix.md) | The child scope-prefix an abandon over `target` covers transitively. Agent spawns nest under agent:&lt;seq&gt; (docs/03, section 2.2); a child workflow's subtree runs under the wf:&lt;name&gt;:&lt;ordinal&gt; scope recorded in its dispatch payload (M6-T06). A child entry without the payload (foreign journals) degrades to the agent:&lt;seq&gt; convention, which covers nothing real and keeps the fold total. |
| [claimExpired](/api/@rulvar/core/functions/claimExpired.md) | True when the claim steers nothing at `at` (docs/05, read-path filters). |
| [claimExpiry](/api/@rulvar/core/functions/claimExpiry.md) | The docs/05 TTL applied to an observedAt ISO date. |
| [claimIssues](/api/@rulvar/core/functions/claimIssues.md) | Issues of one claim record (empty = valid). |
| [claimOpIssues](/api/@rulvar/core/functions/claimOpIssues.md) | Issues of one op (empty = valid). GATE-DRIVEN (M11-T01): the gate on the op decides which claim rules apply, so the identity is enforced by shape alone. Referential integrity stays with apply. |
| [classifyAgentError](/api/@rulvar/core/functions/classifyAgentError.md) | task-class: schema-mismatch, terminal, non-retryable tool. transport, rate-limit, and budget are never memoized (docs/03, section 6.4). |
| [classifyAttemptOutcome](/api/@rulvar/core/functions/classifyAttemptOutcome.md) | Classifies one settled root terminal into its attempt outcome class. |
| [collectDeclaredLadders](/api/@rulvar/core/functions/collectDeclaredLadders.md) | The ladders a run declares: every advertised profile whose model spec is a ladder (docs/04, section 12). The card is tier-relative to exactly these. |
| [compactMessages](/api/@rulvar/core/functions/compactMessages.md) | Applies a produced summary: everything after the first message (the spawn prompt) is replaced by ONE user-role summary message. Compaction fires at tool turn boundaries only, so the replaced span never splits a tool-call/tool-result pair. |
| [compilePermissionChain](/api/@rulvar/core/functions/compilePermissionChain.md) | Merges the engine-wide config and the profile config into one chain. Layers concatenate engine-first; since rules only deny or ask, ordering within a layer cannot change the verdict (docs/08, section 4.2). The profile's canUseTool wins over the engine's (a single slot by construction). A declared preset compiles INTO the same layers, after the host-authored rules, never as a fifth layer (M5-T05). |
| [compilePermissionPreset](/api/@rulvar/core/functions/compilePermissionPreset.md) | - |
| [compileVerifiedLayer](/api/@rulvar/core/functions/compileVerifiedLayer.md) | The verified-layer compiler (M11-T06; docs/05, sections "Read path" and "Composition with the model layer"): start-tier recommendations per (ladder, taskClass) compiled EXCLUSIVELY from eval-measured claims. A strength on a rung below the default votes down (start cheaper); a weakness on the default rung or below votes up. The net sign shifts EXACTLY one rung, bounded to the ladder (the clamp: the price of any false belief is one rung); ties hold the default and compile nothing. Editorial claims NEVER compile. Floors and ModelCaps stay hard router constraints; budget is touched only through the existing admission path. A deterministic pure function: the M12 consumers read THIS, never the card text. |
| [costReportFromJournal](/api/@rulvar/core/functions/costReportFromJournal.md) | The pure journal fold: byModel and totals from terminal entries, the same summation the kernel ledger uses (terminal usage exactly once, priced per servedBy, abandoned subtrees contribute zero). |
| [countsAgainstLimit](/api/@rulvar/core/functions/countsAgainstLimit.md) | countsAgainstLimit derivation (docs/07, section 6.3, XF-06): true iff scope_bigger; scope_different and blocked_with_evidence are exempt and never debit the escalation counter. |
| [createCanonicalIdMinter](/api/@rulvar/core/functions/createCanonicalIdMinter.md) | Returns a per-engine minter of CanonicalId values. Monotonic within the factory instance; never a module-level singleton (docs/02, section "Dependency rules": no module state). |
| [createCtx](/api/@rulvar/core/functions/createCtx.md) | Creates the per-run Ctx bound to `internals`. The current scope travels through AsyncLocalStorage so parallel branches and pipeline stages keep one ctx object while journaling under their own scope paths (I3: structure from call-and-return only). |
| [createEngine](/api/@rulvar/core/functions/createEngine.md) | - |
| [createSandboxBridge](/api/@rulvar/core/functions/createSandboxBridge.md) | - |
| [currentOnlyKeyRing](/api/@rulvar/core/functions/currentOnlyKeyRing.md) | - |
| [decodeCheckpoint](/api/@rulvar/core/functions/decodeCheckpoint.md) | Decodes a checkpoint blob. Returns undefined for an empty blob or an unknown format byte: a resume never trusts a checkpoint it cannot parse; the dangling dispatch reruns from the top instead (at-least-once is the documented floor). |
| [defineWorkflow](/api/@rulvar/core/functions/defineWorkflow.md) | - |
| [deriveContentKey](/api/@rulvar/core/functions/deriveContentKey.md) | key = sha256(JCS(IdentityInput)) (docs/03, section "Content key"). |
| [digestOf](/api/@rulvar/core/functions/digestOf.md) | Folds one settled child into its digest (spawn-ordinal ordering is the caller's). |
| [dispositionHook](/api/@rulvar/core/functions/dispositionHook.md) | Adapts the predicate to the matcher's disposition hook: two-phase operations dispatch on their terminal, single-phase on themselves. |
| [emptyDigestBlocks](/api/@rulvar/core/functions/emptyDigestBlocks.md) | The all-zero blocks of runs without the PlanRunner extension. |
| [emptyToolset](/api/@rulvar/core/functions/emptyToolset.md) | The empty toolset (no tools declared anywhere). |
| [encodeCheckpoint](/api/@rulvar/core/functions/encodeCheckpoint.md) | Serializes a checkpoint to its blob: format byte then UTF-8 JSON. |
| [escalateTool](/api/@rulvar/core/functions/escalateTool.md) | The engine opt-in tool (docs/08, section 6.6): registered through the same path as any tool under escalation opt-in of EITHER flavor (the worker's only authoring channel for a report), never available without opt-in, and dispatched through the same permission chain. The loop intercepts accepted calls; execute is unreachable by construction. |
| [evaluatePermission](/api/@rulvar/core/functions/evaluatePermission.md) | Evaluates the chain for one dispatch, or OFFLINE against a hypothetical call by tool name (the dry-run API of docs/08, section 4.5: nothing executes; shells and tests read the verdict, the deciding layer, and the matched rule). Hooks run in deterministic registration order; { modifiedInput } substitutes the input and continues; the first decisive verdict wins. The returned input is what execute receives and what the approval identity hashes (docs/03, section 1.2: post hook modification). Advisory domain-rule matches ride every verdict for the audit payload (docs/08, 4.4). |
| [evaluateReuse](/api/@rulvar/core/functions/evaluateReuse.md) | The four-outcome verdict evaluation on a SpawnKey match (docs/03, 9.4), computed once live at the fold head and embedded into the deciding entry; replay never re-evaluates. |
| [executeWorkflow](/api/@rulvar/core/functions/executeWorkflow.md) | Runs a workflow body against a fresh ctx: the engine core that engine.run wraps with RunHandle, events, and outcome assembly (M1-T11). Validates args against the declared schema, then executes single-pass. |
| [exhaustionCodeOf](/api/@rulvar/core/functions/exhaustionCodeOf.md) | The typed error code surfaced after a denied debit (docs/07, 11.3). |
| [extractCandidate](/api/@rulvar/core/functions/extractCandidate.md) | Extracts the structured-output candidate from a collected turn per tier. Returns `undefined` when the turn carries no candidate (for example the model answered prose without the forced tool call). |
| [failoverTriggerOf](/api/@rulvar/core/functions/failoverTriggerOf.md) | Maps a retry class to its failover trigger once retries exhaust. Overloaded (529) is transport-class for failover purposes; a non-retryable error never fails over. |
| [fallbackTriggerOf](/api/@rulvar/core/functions/fallbackTriggerOf.md) | Classifies a terminal agent outcome for the degenerate fallback (docs/04, 11.3 as amended): schema-mismatch errors are 'schema-exhausted'; any other error is 'error'; limit terminals (the no-progress abort included) are 'limit'; cancelled, escalated, and skipped never trigger. |
| [filterClaimsForRun](/api/@rulvar/core/functions/filterClaimsForRun.md) | The admission filter (docs/05, 4.1): status active, unexpired at `now`, and the subject reachable through the run's declared ladders after the role-floor filter. |
| [finalizeFires](/api/@rulvar/core/functions/finalizeFires.md) | The finalize firing rule: only if configured in routing, and only after tools stop, which presupposes a non-empty toolset. A no-tools agent's single loop turn is already its synthesis (docs/04, section 8.4 as amended in M4-T01). The caller additionally gates on the loop having ended without an abort: a limit/error/cancelled/escalated loop never reaches synthesis. |
| [foldTermination](/api/@rulvar/core/functions/foldTermination.md) | The replay fold (docs/07, 11.6): rebuilds the account from termination.init and the debiting decision entries, asserting every embedded balance-after against the recomputation. A divergence raises the typed journal-integrity error at exactly the diverging entry; denials are re-issued from termination.denied with zero live calls. |
| [formatRePrompt](/api/@rulvar/core/functions/formatRePrompt.md) | The bounded re-prompt message sent back to the model on a validation miss. |
| [formatScopePath](/api/@rulvar/core/functions/formatScopePath.md) | Serializes parsed segments back to the canonical path (round-trip). |
| [hashWorkflowBody](/api/@rulvar/core/functions/hashWorkflowBody.md) | Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). |
| [hashWorkflowSource](/api/@rulvar/core/functions/hashWorkflowSource.md) | Content hash of a compiled workflow source (run-to-definition binding, docs/06 10.2). |
| [identityJcs](/api/@rulvar/core/functions/identityJcs.md) | The JCS form of an IdentityInput under the hashVersion 2 profile. |
| [isEscalated](/api/@rulvar/core/functions/isEscalated.md) | - |
| [isSchemaPairSpec](/api/@rulvar/core/functions/isSchemaPairSpec.md) | Form-2 guard: an explicit { jsonSchema, validate } pair. |
| [isStandardSchemaSpec](/api/@rulvar/core/functions/isStandardSchemaSpec.md) | Form-1 guard: the value implements the Standard Schema interface. Some libraries expose callable schemas (ArkType types are functions), so both object- and function-typed values qualify. |
| [isStrictCompatibleSchema](/api/@rulvar/core/functions/isStrictCompatibleSchema.md) | Strict-schema compatibility as both first-class providers define it: every object node declares `additionalProperties: false` and lists every property in `required` (docs/04, section 5.2). Boolean schemas and non-object shapes are trivially compatible. |
| [kMaxOf](/api/@rulvar/core/functions/kMaxOf.md) | kMax: the maximum declared ladder length across the registry snapshot. |
| [knowledgeHash](/api/@rulvar/core/functions/knowledgeHash.md) | Deterministic content hash of the claims array (JCS + sha256). |
| [ladderLengthOf](/api/@rulvar/core/functions/ladderLengthOf.md) | Reads the declared ladder length of one agent profile. Ladders are declared through the profile's ModelSpec (`model: { ladder }`, or the loop-role routing entry; docs/04, section 12). The reader is defensive so the snapshot is total over every registry shape (an undeclared ladder has length 1: the single implicit rung). |
| [ladderRungChoice](/api/@rulvar/core/functions/ladderRungChoice.md) | The concrete ModelChoice of one rung attempt: each attempt is an ordinary agent scope whose CanonicalModelSpec is that rung's `{ kind: 'model' }` form (docs/04, section 8.2). |
| [lexShellCommand](/api/@rulvar/core/functions/lexShellCommand.md) | Lexes a command into segments per the docs/08 5.2 algorithm. Quotes and escapes are honored; nothing is expanded; `$(`, backticks, `<(`, `>(`, and `<<` (outside single quotes) poison their segment. |
| [liftRetainedParts](/api/@rulvar/core/functions/liftRetainedParts.md) | Lifts the adapter-shipped retention payload of one finished turn into provider-raw parts (docs/04, section 2.3 retention transport). Reads providerMetadata[&lt;adapter id&gt;].retainedParts and tags each block with the adapter's provider family. Returns [] when the adapter shipped nothing. |
| [lineageWeightOf](/api/@rulvar/core/functions/lineageWeightOf.md) | C = E0 + kMax: the per-spawn weight of the variant function. |
| [makeOrchestratorWorkflow](/api/@rulvar/core/functions/makeOrchestratorWorkflow.md) | Builds the orchestrator workflow: ONE implementation behind both surfaces. The body wires the spawn tools over the per-call runtime, recovers spawn records from the journal on resume, and runs the orchestrator agent with the finish terminal tool. |
| [maskSecrets](/api/@rulvar/core/functions/maskSecrets.md) | Masks credential-shaped substrings in one string. |
| [maskSecretsDeep](/api/@rulvar/core/functions/maskSecretsDeep.md) | Deep-masks every string value in a JSON tree; non-strings pass through. Returns the input identity when nothing matched, so the default-on policy costs no allocation on clean events. |
| [maskSecretsJson](/api/@rulvar/core/functions/maskSecretsJson.md) | Convenience for hosts: masks a Json value (alias of the deep walk). |
| [matchArgvPattern](/api/@rulvar/core/functions/matchArgvPattern.md) | Pattern grammar (5.1): literal words match one identical token; `*` matches exactly one token; `**` matches zero or more remaining tokens and may appear only as the final word. A pattern matches only if it consumes the segment's ENTIRE argv. |
| [matchShellCommand](/api/@rulvar/core/functions/matchShellCommand.md) | The strictest-across-segments composition (5.3): deny if ANY segment denies; otherwise ask if ANY segment asks or fails to match an allow pattern; otherwise allow. |
| [mcp](/api/@rulvar/core/functions/mcp.md) | Imports MCP tools as a ToolSource. The client connects lazily on the first tools() call; tools/list is fetched with cursor pagination until exhaustion and cached per session; a listChanged notification invalidates the cache, affecting subsequently spawned agents only (a spawn's toolset snapshot is immutable by construction; docs/08 6.3). |
| [mergeUsageLimits](/api/@rulvar/core/functions/mergeUsageLimits.md) | Limits merge per spawn: AgentOpts.limits over profile limits over engine defaults.limits (docs/06, section "UsageLimits"). |
| [modelEpochOf](/api/@rulvar/core/functions/modelEpochOf.md) | Builds the optional modelEpoch block; empty inputs give undefined. |
| [modelKnowledgeCard](/api/@rulvar/core/functions/modelKnowledgeCard.md) | The deterministic card render (docs/05, 4.3). Pure: same filtered claims and ladders give byte-identical text. The render budget is docs/06 Appendix A (4096 chars); over it, the OLDEST-observed notes withhold first behind an explicit marker. |
| [modelSpecIdentity](/api/@rulvar/core/functions/modelSpecIdentity.md) | The identity projection of a CanonicalModelSpec. For the plain-model kind the projection is `{ model, effort? }` WITHOUT the kind discriminant, exactly as fixed by the docs/03 section 1.5 worked example; `effort` is omitted when unresolved. The ladder embedding lands with ladder execution (M7). |
| [needsSeparateExtract](/api/@rulvar/core/functions/needsSeparateExtract.md) | The completed extract-necessity rule: a separate final structured-output invocation fires only when a schema is set AND (routing directs extract to a different model OR the loop model's caps cannot serve the required tier OR finalize is routed, in which case the schema never rides a loop or synthesis turn). Otherwise the schema rides the last loop turn with no extra call (docs/04, sections 8.3 and 8.4 as amended in M4-T01). |
| [nextFailover](/api/@rulvar/core/functions/nextFailover.md) | The next target index past `from` that serves `trigger`, or undefined when the chain is exhausted. Index 0 is the primary; the chain never moves backwards (sticky failover). |
| [nodeLinkKey](/api/@rulvar/core/functions/nodeLinkKey.md) | node.link identity (docs/03, 9.5): sha256 of {kind, spawnKey, donorScope, targetNodeId}; targetNodeId is deterministic on replay because NodeIds are assigned inside plan.revision. |
| [normalizeApproachTag](/api/@rulvar/core/functions/normalizeApproachTag.md) | Approach-tag normalization (docs/03, 10.2): NFC, lowercase, runs of non-alphanumerics collapse into a hyphen, truncate to 32 characters; an empty value canonicalizes to 'default'. Prompt prose never enters any signature: rephrasings collide by construction, not by heuristic. |
| [normalizeEntry](/api/@rulvar/core/functions/normalizeEntry.md) | Round-1 normalization: hashVersion is taken from `hashVersion`, else from the legacy `v` field, else 1. Stores are never rewritten; normalization happens at read (docs/03, section "The single versioning mechanism"). |
| [normalizeFallbacks](/api/@rulvar/core/functions/normalizeFallbacks.md) | Normalizes the author-facing ModelChoice.fallbacks list (docs/04, 8.1). |
| [orchestrate](/api/@rulvar/core/functions/orchestrate.md) | Top-level surface: creates a run (docs/06 9.3). |
| [parallelScope](/api/@rulvar/core/functions/parallelScope.md) | Branch `branch` of parallel site `site`: `par:<site>:<branch>`. |
| [parseModelRef](/api/@rulvar/core/functions/parseModelRef.md) | ModelRef is strictly 'adapterId:model', no query parameters. The wire model id may itself contain colons (for example ollama tags), so only the FIRST colon splits. |
| [parseScopePath](/api/@rulvar/core/functions/parseScopePath.md) | Parses a scope path against the frozen grammar (M2-T04): |
| [phiInitialOf](/api/@rulvar/core/functions/phiInitialOf.md) | Phi0 = V0 + C * S0, finite and fixed in termination.init (docs/07, 11.4). |
| [pipelineScope](/api/@rulvar/core/functions/pipelineScope.md) | Stage `stage` processing source item `item`: `pipe:<stage>:<item>`. |
| [planNodeScope](/api/@rulvar/core/functions/planNodeScope.md) | PlanRunner node scopes: `plan/<NodeId>` (NodeIds are engine-minted ULIDs). |
| [priceUsdOf](/api/@rulvar/core/functions/priceUsdOf.md) | Dollars from normalized usage against one pricing row (docs/04, section 1.6: the adapter normalized the usage; inputTokens is the full prompt). Cache writes price at the 5m premium rate; the 1h rate applies where a provider distinguishes it in usage, which the canonical Usage does not yet carry (docs/04, section 10). |
| [profileCard](/api/@rulvar/core/functions/profileCard.md) | Renders the registry into the shared agent vocabulary card. Sorted, deterministic, byte-stable; an empty registry renders explicitly so the planner never guesses at unregistered agentTypes. |
| [profileRegistrySnapshotHash](/api/@rulvar/core/functions/profileRegistrySnapshotHash.md) | The deterministic profile-registry snapshot hash frozen inside termination.init: profile names mapped to their declared ladder lengths, canonical JSON, sha256 (docs/07, 11.6). |
| [projectHistory](/api/@rulvar/core/functions/projectHistory.md) | Projects the canonical history into the target provider's view: provider-raw parts of a DIFFERENT provider are omitted; everything else (text, images, tool calls, tool results, compaction content) passes through untouched. Messages whose parts all belong to another provider vanish entirely rather than ride as empty messages. |
| [projectIdentity](/api/@rulvar/core/functions/projectIdentity.md) | The canonical identity object of an IdentityInput under the hashVersion 2 profile: what JCS serializes and sha256 hashes. The agent kind projects modelSpec through modelSpecIdentity; every other kind serializes its fields verbatim. Fields not listed for a kind are never included (the types make them unrepresentable). |
| [projectToJsonSchema](/api/@rulvar/core/functions/projectToJsonSchema.md) | Derives the JSON Schema of a SchemaSpec (docs/08, section "JSON Schema derivation and acceptance rules"). Form 1 projects via the StandardJSONSchemaV1 input() converter, target draft 2020-12 with draft-07 fallback; a library without the projection is a typed ConfigError at definition time, never at first call. Transforming schemas therefore project their INPUT type. Forms 2 and 3 are taken verbatim. |
| [providerOf](/api/@rulvar/core/functions/providerOf.md) | The provider family of an adapter: `provider` when set, else `id`. |
| [readTerminationInit](/api/@rulvar/core/functions/readTerminationInit.md) | Reads a termination.init entry's payload; undefined when malformed. |
| [registryKeyRing](/api/@rulvar/core/functions/registryKeyRing.md) | KeyRing over the registry: the live call is projected DOWN into the profile of the stored entry; there is no upward canonization (docs/03, section 4.7). |
| [remeasureQueue](/api/@rulvar/core/functions/remeasureQueue.md) | The re-measurement queue (docs/05, section "Grounding and decay"): expired eval-measured claims that are still ACTIVE. Just a status filter: the next sweep re-measures these subjects; nothing archives them (archiving would empty the queue and hide the decay). |
| [replayDisposition](/api/@rulvar/core/functions/replayDisposition.md) | The single canonical predicate, dispatched on the entry's own hashVersion (compatibility lemma: on the v1 domain the tables coincide). Suspended entries are outside the table (the DEF-4 fold consumes them); the alias column (DEF-5) activates with node.link producers in M7: a skipped entry WITHOUT an incoming alias is always skipped. |
| [resolveModelInvocation](/api/@rulvar/core/functions/resolveModelInvocation.md) | Resolution runs on every model invocation, not once per agent: a layered merge of { model, effort, providerOptions, fallbacks } in the order call override > agent profile > workflow defaults > engine defaults, with the invocation role attached as a tag (docs/04, section "Resolution chain"). After resolution the router reads ModelCaps and scrubs illegal parameters visibly: unsupported effort is removed from the wire but kept in identity; sampling params rejected by the model are removed from the adapter's namespace, never silently sent. |
| [resolvePricing](/api/@rulvar/core/functions/resolvePricing.md) | Resolves the pricing for a model: the versioned table wins; the adapter-reported caps.pricing is the fallback; undefined means unpriced (the CostReport surfaces it, never a silent zero). |
| [resolveToolset](/api/@rulvar/core/functions/resolveToolset.md) | Expands sources, validates every tool name and duplicate names across the whole toolset (ConfigError at spawn time; docs/08 sections 1.1 and 6.4), and computes the toolsetHash over contracts sorted by name. |
| [retryClassOf](/api/@rulvar/core/functions/retryClassOf.md) | Classifies a WireError for the retry engine. Task-class failures are never retryable by construction: adapters mark them retryable: false and this returns undefined. The kind travels in WireError.data.kind (docs/04, section 4.9); anything retryable without a specific kind is transport. |
| [retryDelayMs](/api/@rulvar/core/functions/retryDelayMs.md) | The delay before retry number `retryIndex` (0-based: the delay after the first failed attempt has index 0). A provider-supplied retryAfterMs REPLACES the computed delay (Appendix A). Jitter is equal-jitter: half the backoff is deterministic, half random, so a jittered delay never collapses to zero. |
| [roleConfiguredInRouting](/api/@rulvar/core/functions/roleConfiguredInRouting.md) | True when any resolution layer configures the given role in its routing map. This is the finalize TRIGGER: firing is decided by the presence of a routing entry at any layer; the model it fires ON still resolves through the full chain (a higher layer's all-roles `model` may override the routed choice per docs/04, section 8.2). |
| [roundOneDisposition](/api/@rulvar/core/functions/roundOneDisposition.md) | The round-1 interim disposition; replaced by replayDisposition (M2-T06). |
| [runAgent](/api/@rulvar/core/functions/runAgent.md) | Runs one agent to a typed AgentResult. Never throws past policy: every failure mode becomes a typed status on the result. |
| [runProfile](/api/@rulvar/core/functions/runProfile.md) | Looks up a shipped RunProfile by name; undefined for unknown names. |
| [scanJournalCompatibility](/api/@rulvar/core/functions/scanJournalCompatibility.md) | The one compatibility scan: immediately after load, strictly BEFORE any live call, any append, and any admission reserve; repeated at lease acquire in queue mode (docs/03, section 4.5). Side-effect free. |
| [schemaHash](/api/@rulvar/core/functions/schemaHash.md) | schemaHash = sha256(JCS(canonicalize(schema))). Accepts the derived JSON Schema (or a boolean schema); pass undefined for "no schema declared". |
| [schemaHashOfSpec](/api/@rulvar/core/functions/schemaHashOfSpec.md) | Derives and hashes a SchemaSpec in one step (identity path for spawns). |
| [selectStructuredOutputTier](/api/@rulvar/core/functions/selectStructuredOutputTier.md) | Tier selection (docs/04, section 8.4): the model's declared ceiling bounds the tier; the native tier additionally requires a strict-compatible canonical schema (docs/04, section 5.2: relying on silent server-side fallback is forbidden), degrading to forced-tool. Prefill is not a tier. |
| [shouldCompact](/api/@rulvar/core/functions/shouldCompact.md) | The threshold check (docs/06, M4-T03 committed semantics): the context estimate is the last loop turn's inputTokens + outputTokens; the Usage invariant makes inputTokens the full prompt, and the turn's output joins the next prompt. |
| [spawnDepthOf](/api/@rulvar/core/functions/spawnDepthOf.md) | Nesting depth of a child scope: its workflow, agent, and plan-node segments. |
| [summarizeInstruction](/api/@rulvar/core/functions/summarizeInstruction.md) | The instruction message appended to the projected transcript for the summarize invocation. Deterministic wording; the response text becomes the summary message body. |
| [summarizeOutput](/api/@rulvar/core/functions/summarizeOutput.md) | The M6 outputSummary: a deterministic truncation of the child's output (or error message), identical live and on replay (docs/07 section 2, clause 3: distillation lives with the child, ordered by spawn ordinal; the LLM distillation upgrade is M7 territory). |
| [terminationConfigDrift](/api/@rulvar/core/functions/terminationConfigDrift.md) | Config-drift detection at resume (docs/07, 11.2): the journaled vector always wins; every differing field is reported for the `termination:config-drift` event. Dynamic budget top-up via restart is excluded by construction. |
| [tierWithinCaps](/api/@rulvar/core/functions/tierWithinCaps.md) | True when `tier` is at or below the model's declared ceiling. |
| [toApprovalDecision](/api/@rulvar/core/functions/toApprovalDecision.md) | Normalizes a resolution value into an ApprovalDecision. Anything that is not an explicit allow is a deny: an approval never fails open. |
| [toJournalValue](/api/@rulvar/core/functions/toJournalValue.md) | Validates and snapshots a value for the journal: the returned value is a JSON round-trip clone, decoupled from later caller mutations, with undefined object members dropped. |
| [tool](/api/@rulvar/core/functions/tool.md) | Defines a tool. Definition-time failures are typed ConfigErrors, never first-call surprises: an illegal name, a Standard Schema without the JSON Schema projection, a recursive local $ref, or a remote/dynamic reference all fail here (docs/08, sections 1.1 and 2.3). |
| [toolContract](/api/@rulvar/core/functions/toolContract.md) | The identity projection: the contract tuple that enters toolsetHash. parameters is the canonicalized derived JSON Schema (docs/03, section "schemaHash and toolsetHash derivation"). |
| [toolsetHash](/api/@rulvar/core/functions/toolsetHash.md) | toolsetHash = sha256 over the JCS-canonical JSON array of per-tool contract tuples (name, description, canonical parameters, version) sorted by name. Tool description IS part of the contract; schema annotations inside parameters are not. An absent version participates as absent (docs/03, section "schemaHash and toolsetHash derivation"; docs/08, section "toolsetHash contract"). |
| [ttlState](/api/@rulvar/core/functions/ttlState.md) | - |
| [validateEditorialCommit](/api/@rulvar/core/functions/validateEditorialCommit.md) | The commit-batch validation: op shapes and gates first (GATE-DRIVEN since M11-T01: the human gate carries editorial claims, the eval-committer gate carries eval-measured claims with metrics), the post-apply cap second. Throws one ConfigError carrying every issue, so a maintenance caller fixes the batch in one round trip. |
| [validateEntryShape](/api/@rulvar/core/functions/validateEntryShape.md) | Validates the shape the engine is about to append. Returns issues; empty means valid. Unknown kinds are rejected here (the engine never writes them); stores still pass them through on read. |
| [validateEscalationLimits](/api/@rulvar/core/functions/validateEscalationLimits.md) | Validates a lineage-limits config record. The pre-rename knob name is rejected with a migration hint (XF-10): silently honoring it would change semantics (per logical task, not per node). |
| [validateEscalationReport](/api/@rulvar/core/functions/validateEscalationReport.md) | Validates the runtime-completed report BEFORE append; returns issues. |
| [validateSchemaSpec](/api/@rulvar/core/functions/validateSchemaSpec.md) | Runtime validation per form (docs/08, section "Runtime validation"): form 1 via the Standard Schema's own validate, form 2 via the pair's type guard, form 3 via the vendored draft 2020-12 validator. The same machinery backs the structured-output tiers of the Agent Runtime. |
| [validateTerminationLimits](/api/@rulvar/core/functions/validateTerminationLimits.md) | Validates a raw limits record into the frozen vector. The pre-rename escalation knob is rejected with a migration hint (XF-10); counters must be non-negative integers; kMax at least 1. |
| [workflowScope](/api/@rulvar/core/functions/workflowScope.md) | ctx.workflow child scope: `wf:<name>:<ordinal>` (ordinal counts invocations of that name). |
| [workflowSourceRef](/api/@rulvar/core/functions/workflowSourceRef.md) | TranscriptStore ref of the persisted CompiledWorkflow source blob. |
| [wrapJournalStore](/api/@rulvar/core/functions/wrapJournalStore.md) | Wraps a journal store with the hook; lease capability is preserved. |
| [wrapTranscriptStore](/api/@rulvar/core/functions/wrapTranscriptStore.md) | Wraps a transcript store with the hook. |
