/**
 * Engine entry points (M1-T11): createEngine and engine.run over the
 * InProcessRunner. Every registry hangs off the engine instance; nothing
 * is module-global, so two engines in one process are fully isolated and
 * ctx is created per run. engine.resume lands with the journal
 * kernel in M2.
 */
import { createHash, createHmac } from 'node:crypto';
import {
  BudgetExhaustedError,
  ConfigError,
  JournalIntegrityError,
  LeaseHeldError,
  RulvarError,
  SettlementError,
  SupersededError,
  type WireError,
} from '../l0/errors.js';
import { setLongTimeout, type LongTimer } from '../l0/long-timer.js';
import { realNow } from '../l0/real-clock.js';
import { assertSafeRunId } from '../l0/run-id.js';
import {
  requireFraction,
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveInteger,
  validateEvidenceContract,
} from '../l0/validate-numbers.js';
import type { WorkflowEventBody } from '../l0/events.js';
import type { CachePolicy, InvocationRole, ModelRef, ModelSpec, Usage } from '../l0/messages.js';
import type { ExecutorRegistry } from '../l0/spi/executor.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';
import type { Pricing, ProviderAdapter } from '../l0/spi/provider.js';
import type { RunMeta, JournalStore, LeasableStore, Lease } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import {
  compileSecretMasker,
  maskSecretsDeep,
  wrapJournalStore,
  wrapTranscriptStore,
  type SerializationHook,
} from '../l0/serialization.js';
import { validateEntryShape } from '../journal/kinds.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { validateSchemaSpec, type SchemaSpec } from '../l0/schema.js';
import { jcsSerialize } from '../l0/jcs.js';
import { openWireIntentsOf } from './invoice.js';
import { validateToolsetAttestation, type ToolsOption } from '../tools/toolset-hash.js';
import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import { Replayer } from '../journal/replayer.js';
import {
  buildDeriverRegistry,
  deriverV2,
  registryKeyRing,
  scanJournalCompatibility,
} from '../journal/keyderiver.js';
import { lastRunSettle, RUN_SETTLE_DECISION_TYPE } from '../stores/reconcile.js';
import { dispositionHook } from '../journal/disposition.js';
import type { EscalationLimits } from '../journal/lineage.js';
import type { ResumeReport } from '../journal/matching.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import type { Bytes, Json } from '../l0/json.js';
import { readRunMeta } from '../stores/meta-lookup.js';
import { buildAdapterRegistry, parseModelRef } from '../model/router.js';
import type { EscalationDecision } from '../runtime/escalation.js';
import { CURRENT_EXEC_KEY_DERIVATION, type ExecKeyDerivation } from '../runtime/executor.js';
import type { EscalatedResult, MechanicalGateProfile } from '../runtime/agent-loop.js';
import type { PermissionConfig } from '../runtime/permission-chain.js';
import { validateUsageLimits, type UsageLimits } from '../runtime/usage-limits.js';
import { profileCard } from '../model/profile-card.js';
import { AdmissionController, MAX_DEPTH_CEILING } from '../orchestrator/admission.js';
import { RunBudget } from './budget.js';
import {
  AgentCallError,
  agentResultWire,
  createCtx,
  type AgentProfile,
  type RunInternals,
  type Workflow,
} from './ctx.js';
import { accountSpendFromJournal, costReportFromJournal } from './cost-report.js';
import { journalPricingSnapshot, snapshotJournalPricing } from './pricing-snapshot.js';
import { EVENT_SEGMENT_STRIDE, EventBus, SpanRegistry } from './events.js';
import { ExternalRegistry } from './external.js';
import {
  type AcceptanceChildSummary,
  type ChildrenAtFailure,
  type RejectedFinishCandidate,
  type SemanticPassesSummary,
  type PendingExternal,
  type RunHandle,
  type RunOutcome,
  type RunStatus,
} from './run-handle.js';
import { DEFAULT_PER_RUN_CONCURRENCY, Semaphore } from './scheduler.js';
import { terminalEnvelopeOf } from './terminal-envelope.js';
import { InProcessRunner, type CompiledWorkflow, type ScriptRunner } from '../runner/inprocess.js';
import {
  validateDeterminismConfig,
  withDeterminismDetection,
  type DeterminismConfig,
} from '../runner/determinism.js';
import { validateRetryPolicy, type RetryPolicy } from '../model/retry.js';
import { KeyedLimiter } from '../model/concurrency.js';
import {
  DEFAULT_MAX_QUOTA_DENIALS,
  validateEngineQuotaConfig,
  type EngineQuotaConfig,
  type EngineQuotaRuntime,
} from '../model/quota.js';
import { resolvePricing, priceUsdOf, type PriceTable } from '../model/pricing.js';
import type { QualityFloors } from '../model/floors.js';
import type { ModelKnowledgeHandle, ModelKnowledgeStore } from '../l0/spi/knowledge.js';

export type { RunStatus };

/**
 * The per-engine workflow registry (M5-T01): an
 * explicit, first-class value; no module-level registry exists. Shells
 * resolve by-name runs against it; ctx.workflow's string form (M6) and
 * the queue worker (M8) resolve against it too. CompiledWorkflow values
 * join the union when they first exist (M6).
 */
export type WorkflowRegistry = Record<string, Workflow<never, unknown>>;

export interface EngineDefaults {
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  /** The workflow registry for shells and by-name resolution (10.4). */
  workflows?: WorkflowRegistry;
  /** Registered SchemaSpec names for outputSchemaRef (M7-T05). */
  schemas?: Record<string, SchemaSpec>;
  /** Registered tool profile names for toolsetRef (M7-T05). */
  toolsets?: Record<string, ToolsOption>;
  /**
   * Registered mechanical gate profiles: named pure functions over
   * AgentResult.artifacts for ladder acceptance gates (M7-T10).
   */
  gates?: Record<string, MechanicalGateProfile>;
  limits?: UsageLimits;
  /** Engine-wide permission chain layers. */
  permissions?: PermissionConfig;
  /** The worktree lifecycle provider. */
  isolation?: IsolationProvider;
  /** Engine-wide transport RetryPolicy (M4-T05). */
  retry?: RetryPolicy;
  /** Hard per-role model constraints (M4-T09). */
  roleFloors?: QualityFloors;
  /**
   * The admission countTokens policy (RV1804). The pre-admission count
   * probe carries the FULL child prompt to the provider: egress exactly
   * like a dispatch, but billed to no invoice row. 'deny' forbids that
   * control wire engine-wide: the flat reserve admits instead, exactly
   * like an adapter without countTokens, and the refusal is visible as
   * a `control:wire` event with outcome 'denied'. Default 'allow'
   * (today's behavior); AgentProfile.countTokens overrides per profile.
   */
  countTokens?: 'allow' | 'deny';
  /**
   * The toolset attestation floor (RV4204, the sixth comparison
   * experiment): with this set, a spawn that resolves a NON-EMPTY
   * toolset must run under a profile whose `toolsetAttestation` pins
   * it, or it refuses typed at spawn time, before any provider call.
   * The pin already binds call-level tool overrides and registered
   * names for attested profiles (RV1514); what it could not bind was
   * a spawn riding a profile that declared no tools and no pin, with
   * the tools arriving per call. Off by default: every existing
   * config keeps its bytes. `compileRegulatedProfile` arms it.
   */
  requireToolsetAttestation?: boolean;
  /**
   * The engine-wide prompt-cache policy (RV2006). Absent means 'auto':
   * the agent loop attaches CacheHint breakpoints (after tools, after
   * system, and the sliding deepest message, TTL '5m') on every turn
   * served by an adapter that declares ModelCaps.promptCaching
   * 'explicit', and attaches nothing anywhere else, so wire traffic to
   * every other adapter stays byte identical. `{ mode: 'off' }` is the
   * opt-out; AgentProfile.cache and the per-call opts override in that
   * order. Transport-level cost optimization only: hints never enter
   * identity, journals, or cassette keys.
   */
  cache?: CachePolicy;
  /**
   * The receipt posture of the incremental billing seam (RV3405).
   * RV2008 journals every ProviderCallRecord the moment its wire call
   * settles, but the append is fire and forget: the loop never blocks
   * its dispatch path on journal IO, so the receipt most likely to
   * lose the race with a crash is exactly the wire being paid for at
   * the moment of death. `'awaited'` makes the loop await each receipt
   * append before the turn proceeds (the RV601 intent before effect
   * precedent), buying durable payment evidence for one journal IO
   * await per wire call; a failed append still degrades loudly to the
   * terminal lane (the RV2008 warning), never fails the run. Default
   * `'async'`: byte identical to RV2008. `'intent'` (RV4006, the
   * fifth comparison experiment's P0.5) goes one step further: every
   * dispatched wire attempt journals a `provider-intent` decision
   * BEFORE the provider could bill (awaited, intent before effect,
   * the executor ledger's own rule: a failed intent append refuses
   * the dispatch), receipts are awaited as under `'awaited'`, and a
   * resume that finds an intent with no receipt and no terminal
   * coverage refuses the blind retry typed unless
   * `ResumeOptions.acknowledgeOpenWireIntents` is passed, because the
   * provider may have billed a wire this process never heard back
   * from. The intent narrows the unknown-outcome window to the wire
   * itself; dispatch stays at-least-once with attempt binding, and
   * the invoice names every open intent in its `openIntents` lane.
   */
  billingReceipts?: 'async' | 'awaited' | 'intent';
}

export interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
  /**
   * Fraction of the parent remainder (minus the parent finalize reserve)
   * a child sub-account may take; default 0.3 (M6-T06).
   */
  childBudgetFraction?: number;
  /** AdmissionController nesting depth; default 1, hard ceiling 4. */
  maxDepth?: number;
  /**
   * Lineage limits (DEF-3): maxEscalationsPerLogicalTask
   * (default 2) and maxAttemptsPerLogicalTask (default 8), monotonically
   * consumed. The validator rejects the pre-rename knob name
   * maxEscalationsPerNode with a migration hint (XF-10).
   */
  lineage?: Partial<EscalationLimits>;
}

export interface CreateEngineOptions {
  adapters: ProviderAdapter[];
  stores?: {
    /** Default InMemoryStore (resume disabled, loud warning). */
    journal?: JournalStore;
    transcripts?: TranscriptStore;
    /**
     * The ModelKnowledge claim store (M10-T03). Optional and
     * OFF by default: an engine without it writes no kb entries at
     * all. The runtime only ever receives the current()-only handle.
     */
    modelKnowledge?: ModelKnowledgeStore;
  };
  defaults?: EngineDefaults;
  /**
   * Telemetry compat posture (RV1810). `quotaDeniedAgentError: true`
   * restores the legacy `agent:error` twin beside the primary
   * `quota:denied` event for recoverable pre-wire quota waits, for
   * consumers still keyed to the old type. Default off: healthy
   * throttling speaks its own type and never reads as failure.
   */
  telemetry?: { quotaDeniedAgentError?: boolean };
  budgetDefaults?: BudgetDefaults;
  concurrency?: {
    perRun?: number;
    /** Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). */
    perProvider?: Record<string, number>;
  };
  /**
   * The shared quota limiter (RV-215): a QuotaLimiter implementation
   * consulted before every live wire dispatch of every run, plus the
   * engine's tenant dimension and the limiter failure policy. Engines
   * and processes that share one limiter (or one limiter storage,
   * e.g. SqliteQuotaLimiter in @rulvar/store-sqlite over one database
   * file) enforce one global quota; a denial rides the provider-429
   * retry and failover machinery without paying a wire call. Absent =
   * no shared quota (Appendix A: an embeddable library must not
   * surprise-throttle hosts).
   */
  quota?: EngineQuotaConfig;
  /** Versioned price table; wins over caps.pricing (M4-T06). */
  pricing?: PriceTable;
  /**
   * Runner registrations beyond the built-in InProcessRunner (M6-T02).
   * `sandbox` executes CompiledWorkflow
   * values (WorkerSandboxRunner ships in @rulvar/planner); running or
   * resuming a compiled workflow without one is a typed ConfigError.
   */
  runners?: { sandbox?: ScriptRunner };
  /**
   * Isolated tool executors (RV-216): one ToolExecutorProvider per
   * non-inprocess `executor` tag. A tool declaring `executor: 'subprocess'`
   * or `'container'` dispatches through the matching provider, so its work
   * runs OUT of the engine process under host-owned isolation instead of
   * as an inprocess closure with full host capabilities. The shipped
   * reference adapters (subprocessExecutor, containerExecutor) live in
   * `@rulvar/executor`. Absent = only inprocess tools are accepted, and a
   * non-inprocess tag is a typed ConfigError at spawn time. In-process
   * tools stay ordinary function calls: never a sandbox for hostile or
   * model-generated code.
   */
  executors?: ExecutorRegistry;
  /**
   * The InProcessRunner escalation hook:
   * receives escalated results when the call form cannot carry them; the
   * returned decision is journaled as the authoritative
   * escalation-decision entry.
   */
  onEscalation?: (
    result: EscalatedResult<unknown>,
  ) => EscalationDecision | Promise<EscalationDecision>;
  /**
   * KeyDeriver registry extension (see
   * https://docs.rulvar.com/guide/journal-compatibility).
   * Plumbed now, consumed by the matching kernel from M2.
   */
  extraDerivers?: readonly unknown[];
  /**
   * Redact/encrypt at the append/put boundaries, symmetric on load/get
   * (M8-T04, OQ-22 executed).
   * Applied by wrapping the configured stores; Engine.stores exposes
   * the wrapped instances, so every reader passes one policy point.
   */
  serialization?: SerializationHook;
  /**
   * The masking policy at the telemetry boundary. Default ON:
   * key-shaped strings in every emitted WorkflowEvent are masked;
   * never touches the journal (lossless encryption via `serialization`
   * is the persistence-side tool). `patterns` adds host-defined
   * redaction on top of the default credential set (RV-217): RegExp or
   * pattern strings, compiled once at construction, applied to every
   * string in every emitted event body. Feed the same patterns to the
   * OTel exporter for trace parity.
   */
  redaction?: { maskEvents?: boolean; patterns?: ReadonlyArray<RegExp | string> };
  /**
   * Bare-nondeterminism detection over in-process workflow bodies
   * (RV-209): mode 'off' | 'warn' (default; detects outside production)
   * | 'error' (detects everywhere and rejects the run at the first
   * workflow-origin bare Date.now/Math.random with a typed
   * DeterminismError), plus the frame `allowlist` for confirmed-safe
   * callers and the `redact` hook for public telemetry. Workflow-origin
   * violations emit the structured `determinism:warning` event with the
   * caller frame and parsed file/line; installed dependencies and Node
   * runtime frames are classified exempt and stay silent.
   */
  determinism?: DeterminismConfig;
  /**
   * Metadata protection knobs (RV-217). `argsHashSalt` switches the
   * RunMeta.argsHash digest from plain sha256 to HMAC-SHA256 under the
   * salt: equal args stop correlating across deployments and
   * low-entropy args stop being recoverable from the digest. The salt
   * is deployment config, not a per-run secret: every engine (and the
   * CLI host config) resuming this store's runs must carry the SAME
   * salt, or the resume args gate refuses matching args. Runs recorded
   * before the salt keep their unsalted digests; the gate then simply
   * mismatches until forced, so introduce the salt on a fresh store or
   * accept --allow-args-change on legacy runs.
   */
  security?: { argsHashSalt?: string };
  /**
   * The genesis ownership protocol (P0.2): over a journal store with
   * the lease capability, a run or resume segment that was NOT handed
   * a lease acquires its own before its first durable mutation, renews
   * it at ttl/3 exactly like a queue worker, and releases it at
   * settle. Fresh start, in-process resume, and worker takeover then
   * share ONE owner/lease contract: at most one live driver per run
   * across processes, a second driver's acquire rejects with the typed
   * LeaseHeldError before any write or provider dispatch, and a
   * crashed owner's lease expires after the store ttl so a worker
   * sweep recovers the run. Default 'auto'. 'none' restores the
   * pre-1.59.4 behavior (no engine-acquired leases) for hosts that
   * coordinate ownership entirely outside the engine; a lease passed
   * via RunOptions.lease or ResumeOptions.lease always wins over both
   * modes (the caller owns acquire, renew, and release). Stores
   * without the lease capability are unaffected: the embedded
   * single-process default keeps the single-writer precondition.
   */
  ownership?: 'auto' | 'none';
}

export interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /**
   * An opaque host-declared identity over the config the workflow body
   * CLOSES OVER (RV3210, the honest answer to `hashWorkflowBody`'s
   * closure blindness: the body-text hash cannot see captured values,
   * so two byte-identical bodies over different closures pin
   * identically). Recorded in RunMeta at genesis and compared on every
   * resume that supplies one: a mismatch refuses the resume typed
   * BEFORE ownership, meta writes, and appends, because the host
   * itself asserted the identity; a recorded fingerprint the resume
   * does not supply warns (`RULVAR_RESUME_FINGERPRINT_UNCHECKED`), and
   * a supplied fingerprint the run never recorded warns
   * (`RULVAR_RESUME_FINGERPRINT_UNRECORDED`) instead of failing,
   * because absence means NOT RECORDED. The preferred pattern is still
   * to close over nothing and pass config through args; the
   * fingerprint is the pin for what must stay closed over. A non-empty
   * string of at most 512 characters.
   */
  configFingerprint?: string;
  /**
   * Run ceiling B0; immutable within a segment (RV2511): no API tops
   * up a live run's ceiling, and the ONE explicit door after genesis
   * is the validated, journaled `ResumeOptions.run` override (RV2208),
   * which takes effect only by opening a new segment. Enforced by
   * projected admission (a spawn whose reserve does not fit is denied
   * before any dispatch), the per-turn guard with a budget-derived
   * maxOutputTokens clamp, and live stream cuts on crossing; the
   * residual provider-dependent overshoot is bounded by one in-flight
   * turn per concurrent agent. Under {@link RunOptions.budgetPolicy}
   * 'immutable-lifetime' even the override door refuses typed.
   * Contract: https://docs.rulvar.com/guide/budgets.
   */
  budgetUsd?: number;
  /**
   * The ceiling-override posture of the run's whole life (RV3902, the
   * fourth comparison experiment). Default 'segment', today's behavior
   * byte for byte: B0 and the exposure cap are immutable WITHIN a
   * segment, and the explicit, validated, journaled
   * `ResumeOptions.run` override (RV2208) may change them by opening a
   * new segment. 'immutable-lifetime' welds that one door shut: the
   * posture is recorded in RunMeta at genesis and restored on every
   * resume, and a resume carrying ANY `ResumeOptions.run` value
   * refuses with a typed ConfigError BEFORE ownership, meta writes, or
   * any append, raise and lower alike; no journaled override exists in
   * this mode, and the emergency lever for a run that must stop
   * spending is cancel, not a ceiling edit. Degradation is honest: a
   * store that drops the optional RunMeta field resumes as 'segment'
   * (the override door works again), never as an invented refusal.
   * Declared at genesis only; the policy itself has no override.
   */
  budgetPolicy?: 'segment' | 'immutable-lifetime';
  /**
   * The bounded execution scope (RV4007): recorded at genesis into
   * RunMeta and a journal decision, immutable for the run's life (no
   * resume door), lifted onto the invoice header and carried by the
   * export bundle. Attribution only: the library never interprets it,
   * with one declared exception since RV4205: a quota config with
   * `tenantFrom: 'scope'` reads the scope's tenant into its
   * reservations.
   */
  scope?: ExecutionScope;
  /**
   * What an unknown scope field does (RV4205): 'drop' (the default,
   * the historical bytes, pinned) or 'reject' (typed refusal by
   * name). `compileRegulatedProfile` enforces 'reject'.
   */
  scopePolicy?: ScopePolicy;
  /**
   * The opt-in in-flight exposure cap (RV711): bounds spent money plus
   * the summed worst-case estimates of live dispatches. The per-turn
   * guard checks money already SPENT, so under `budgetUsd` alone N
   * concurrent turns each pass it before any settles and together can
   * cross the ceiling by up to one whole turn each (preflight's
   * 'overshoot-exposure' finding prices that hole). With the cap, the
   * admission holds each turn's own estimate (the prompt estimate plus
   * the request's output allowance, priced by the same rows as
   * settlement) from right before the provider call until the attempt
   * settles, and the dispatch whose estimate does not fit
   * spent + finalize/synthesis reserves + live estimates is refused
   * with a typed BudgetExhaustedError (data.reason
   * 'in-flight-exposure'). A plain agent settles the refusal as a
   * budget error; an orchestrate-owned root dispatch waits it out
   * (RV1902): it parks until a live hold releases, retries pre-wire,
   * and emits budget:exposure-wait, while a drained refusal settles
   * the documented forced-finish partial instead of tearing the run
   * down. Worst concurrent overshoot past the cap
   * is thereby the estimate error of the in-flight turns, not one
   * whole turn per agent. Absent by default: wire traffic, journals,
   * and hooks stay byte-identical. Recorded in RunMeta at genesis
   * (RV1504) and restored on every resume, the budgetUsd rule: the cap
   * used to be per-invocation and unrecorded, so a resumed segment
   * silently ran without the bound the original invocation declared
   * (the seventeenth comparison benchmark's top FinOps gap). A run
   * started without the cap stays uncapped for its whole life unless
   * a host changes the posture through the explicit, validated,
   * journaled ResumeOptions.run override (RV2208); nothing changes it
   * silently.
   */
  maxInFlightExposureUsd?: number;
  /**
   * Layer 2b against the exposure ceiling (RV2503), opt-in and
   * meaningful only beside `maxInFlightExposureUsd`. Armed, a dispatch
   * with NOTHING else in flight has its planned output clamped to the
   * tokens the remaining exposure room affords instead of being
   * refused outright, exactly as the budget ceiling has always clamped
   * it. The 1.226.0 comparison run is the case: nothing was live, the
   * budget still held 0.8642 USD, the mandatory repair turn's FULL
   * 18000 token plan priced 0.7066 USD against 0.5642 USD of room, and
   * the dispatch was refused before any provider call; the same work,
   * re-issued after an operator raised the ceiling, wrote 12840 output
   * tokens for 0.4788 USD. A refusal with nothing live buys nothing,
   * because no hold will ever release to fund the full plan.
   *
   * Deliberately scoped and deliberately off by default. With siblings
   * in flight the refusal is transient and the RV1902/RV2002 waits
   * park on it, so the wave keeps the full-length turn RV711 promised
   * and nothing here applies. When the room cannot even fund the
   * serving model's output floor, the clamp stands aside and the
   * dispatch refuses through the usual typed `in-flight-exposure`
   * path, so the drained-refusal terminals (RV1902, RV2002, RV2003)
   * keep their shapes. Absent, every byte of dispatch behavior is
   * historical. Like `strictPricing`, this is a per-segment posture: it
   * is not recorded in RunMeta and a resumed segment carries only what
   * its own options declare.
   */
  clampTurnToExposure?: boolean;
  /**
   * The opt-in strict pre-egress pricing gate (RV1508): every paid
   * dispatch must resolve a well-formed price row for its serving
   * model BEFORE the wire call, or the dispatch refuses typed
   * (ConfigError naming the model and the defect). `true` demands
   * presence and well-formedness; the object form adds
   * `maxRatesAgeDays` (a row must carry a fresh `ratesVerifiedAt`)
   * and `allowUnpriced` (exact model refs the host KNOWS are free,
   * the explicit exception). Recorded in RunMeta at genesis and
   * restored on every resume, the exposure cap's rule (RV1504): a
   * FinOps posture a resumed segment silently drops is not a posture
   * (and unlike the two ceilings, ResumeOptions.run has no field for
   * this gate: pricing hygiene is not a per-segment decision).
   * Absent by default: dispatch behavior stays byte identical, and an
   * unpriced model keeps debiting nothing, the documented ceiling
   * hole this mode exists to close.
   */
  strictPricing?: boolean | { maxRatesAgeDays?: number; allowUnpriced?: readonly string[] };
  /** Run-level defaults merged over engine defaults. */
  limits?: UsageLimits;
  /**
   * Run-level deadline: an ISO 8601 date-time with an explicit UTC
   * designator or offset (e.g. `2026-07-21T10:00:00Z` or
   * `2026-07-21T12:00:00+02:00`); crossing it cancels the run. Any
   * other string is a typed ConfigError thrown synchronously by
   * engine.run, before any journal entry or provider dispatch (v1.34.0
   * review P2-1). A deadline already in the past cancels immediately:
   * a crossed deadline is a valid deadline. Deadlines beyond the Node
   * timer maximum are honored through sliced timers, never truncated
   * (v1.34.0 review P2-2).
   */
  deadlineAt?: string;
  name?: string;
  tags?: string[];
  /** Host-initiated cancellation. */
  signal?: AbortSignal;
  /**
   * A lease the caller already holds for this run (the genesis side of
   * the ResumeOptions.lease contract): the engine carries it on EVERY
   * durable mutation of the fresh segment (every journal append, every
   * putMeta, every transcript blob write) and never acquires, renews,
   * or releases it itself; lifecycle stays with the caller. Passing it
   * disables the engine's own ownership acquisition for this run
   * regardless of the `ownership` mode. Hosts that admit runs through
   * an external queue acquire the lease at admission time and hand it
   * here, so admission and the first dispatch are covered by ONE
   * fencing epoch.
   */
  lease?: Lease;
}

/**
 * The accepted RunOptions.deadlineAt grammar: an ISO 8601 calendar
 * date-time with minute precision at least, optional seconds and
 * fractional seconds, and a MANDATORY UTC designator or numeric offset.
 * Date.parse would accept far more (and would read an offset-less
 * date-time in the host's local zone, so the same string would mean a
 * different instant on different hosts); the grammar pins one meaning.
 */
const DEADLINE_AT_GRAMMAR =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Typed refusal of a malformed deadlineAt (v1.34.0 review P2-1). The
 * calendar day is range-checked explicitly: V8's Date.parse silently
 * ROLLS an impossible ISO day into the next month (2026-02-30 parses as
 * 2026-03-02), so the finite check alone would accept a date the host
 * never wrote and cancel the run at a different instant.
 */
function parseDeadlineAt(value: string): number {
  const parsed = Date.parse(value);
  const match = DEADLINE_AT_GRAMMAR.exec(value);
  const refuse = (): never => {
    throw new ConfigError(
      'RunOptions.deadlineAt must be an ISO 8601 date-time with an explicit UTC designator ' +
        `or offset (e.g. 2026-07-21T10:00:00Z or 2026-07-21T12:00:00+02:00); got '${value}'`,
    );
  };
  if (match === null || !Number.isFinite(parsed)) {
    refuse();
  }
  const year = Number(match?.[1]);
  const month = Number(match?.[2]);
  const day = Number(match?.[3]);
  // Date.UTC(year, month, 0) with a 1-based month is the last day OF
  // that month, so this bounds the day without a lookup table (and
  // handles leap years through the platform calendar).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    refuse();
  }
  return parsed;
}

/** Resume-time hit/miss/orphan accounting. */
export interface ResumePreview extends ResumeReport {
  invalidResolutions: Array<{ seq: number; detail: string }>;
}

export interface ResumeOptions {
  /**
   * The run's original arguments: not journaled for in-process workflows
   * in v1, so the host supplies them (resume binding residuals).
   */
  args?: unknown;
  /**
   * What an in-process body-hash mismatch does (RV3001). The default
   * 'warn' keeps the historical design: the mismatch emits the loud
   * `RULVAR_RESUME_HASH_MISMATCH` warning and the resume proceeds,
   * because the journal decides replay versus live per content keys
   * and reports orphans honestly. 'refuse' turns the same mismatch
   * into a typed ConfigError BEFORE ownership, meta writes, or any
   * append: the pin for hosts that treat an edited body as a
   * different workflow. The vocabulary is
   * {@link EvidenceContract.enforce}'s. Name mismatches and compiled
   * source mismatches are hard errors regardless, exactly as before.
   */
  bodyHash?: 'warn' | 'refuse';
  /**
   * The scope assertion (RV4007), the configFingerprint semantics: a
   * supplied scope that differs from the recorded one refuses the
   * resume typed before ownership; a supplied scope over a run that
   * recorded none warns (absence means NOT RECORDED); a recorded
   * scope resumes verbatim whether or not it is re-asserted. The
   * comparison normalizes the supplied scope under the RECORDED
   * normalization table first (RV4302), so a host that re-supplies
   * the same raw values it started with asserts successfully.
   */
  scope?: ExecutionScope;
  /**
   * The scope policy assertion (RV4302). The recorded normalization
   * table is the journal's, never this option's: a supplied
   * `normalize` table is compared against the recorded one by
   * canonical bytes, and a conflict refuses typed before ownership
   * (the args-binding rule: recorded at genesis, asserted on resume).
   * A table supplied over a run that recorded none warns and is NOT
   * applied (applying it would let a resume move the recorded
   * identity). `unknown` applies to the supplied copy's own intake
   * only.
   */
  scopePolicy?: ScopePolicy;
  /**
   * The unknown-outcome acknowledgment (RV4006): a run under the
   * 'intent' receipt posture that crashed between a wire's journaled
   * intent and its receipt holds wires whose outcome this process
   * never learned; the provider may have billed them, and a blind
   * redispatch could pay twice, so resume refuses typed. Passing true
   * acknowledges the risk explicitly (reconcile the invoice's
   * `openIntents` lane against the provider statement first) and the
   * new segment journals the acknowledgment, so the override is as
   * durable as the intents it waves through.
   */
  acknowledgeOpenWireIntents?: boolean;
  /**
   * The host's asserted config identity for this resume (RV3210),
   * compared against the RunMeta-recorded
   * {@link RunOptions.configFingerprint} BEFORE ownership, meta
   * writes, or any append. Both present and unequal is a typed
   * ConfigError always, no posture knob: supplying the fingerprint IS
   * the assertion. A recorded fingerprint the resume does not supply
   * warns (`RULVAR_RESUME_FINGERPRINT_UNCHECKED`); a supplied one the
   * run never recorded warns (`RULVAR_RESUME_FINGERPRINT_UNRECORDED`),
   * because absence means NOT RECORDED, never a verdict.
   */
  configFingerprint?: string;
  /**
   * Dry-run: replay-strict matching; the first would-be-live call throws
   * JournalMissError and the run settles with that typed error, zero live
   * calls performed.
   */
  dryRun?: boolean;
  /** invalidate/retry: entries to unpin before matching. */
  invalidate?: number[];
  /**
   * Queue mode: the worker's lease. The engine carries it on EVERY
   * durable mutation of this resume: every journal append (the kernel's
   * single append site; M8 entry amendment; DEF-6; FR-703), every
   * putMeta, and every transcript blob write (checkpoints, compaction
   * summaries, worktree patches, workflow sources). Over a store
   * declaring the fencedWrites capability a stale worker's writes are
   * ALL rejected by the fencing epoch and never become visible; over a
   * store without the marker the journal stays fenced as always and the
   * meta/blob surfaces remain advisory (the fenced run state RFC).
   */
  lease?: Lease;
  /**
   * Ceiling overrides for the resumed segment and the run's remaining
   * life (RV2208). The RV1504 rule stands: the RunMeta-recorded
   * posture is what a bare resume restores; this field is the ONE
   * explicit way to change that posture after genesis. Each supplied
   * value is validated exactly like its RunOptions counterpart,
   * applied to this segment's budget, written back by the segment's
   * first meta write (a LATER bare resume restores the overridden
   * posture, not the genesis one), and journaled as a
   * `run_budget_override` decision naming the recorded and applied
   * values and the settled spend it was judged against. A `budgetUsd`
   * below the journal's settled spend refuses typed before ownership,
   * meta, or any append: such a ceiling would exhaust the segment
   * before its first turn and read like a fresh money death. Absent
   * fields keep the recorded values; an absent object keeps the
   * historical behavior byte for byte. Under a recorded
   * {@link RunOptions.budgetPolicy} 'immutable-lifetime' (RV3902) any
   * applying override refuses typed before ownership, raise and lower
   * alike: the door this field is exists only under the 'segment'
   * posture.
   */
  run?: { budgetUsd?: number; maxInFlightExposureUsd?: number };
}

export interface ResumeHandle<R> extends RunHandle<R> {
  /** Resolves at settle with the replay accounting. */
  preview: Promise<ResumePreview>;
}

export interface Engine {
  run<A, R>(wf: Workflow<A, R> | CompiledWorkflow, args: A, opts?: RunOptions): RunHandle<R>;
  /**
   * Rebinds a journal to a workflow definition and resumes. Requires wf
   * for in-process workflows;
   * a name mismatch is a typed ConfigError; a body-hash mismatch warns
   * loudly and proceeds (the journal decides replay per content keys),
   * unless {@link ResumeOptions.bodyHash} is 'refuse', which makes it
   * a typed ConfigError before any durable mutation (RV3001).
   * A compiled run resumes WITHOUT wf: the engine rehydrates the
   * persisted source pinned by workflowHash; supplying a compiled wf
   * whose source hash differs from the recorded one is a typed
   * ConfigError (M6-T02). ResumeOptions.run (RV2208) overrides the
   * recorded budget ceilings for the run's remaining life, with a
   * journaled decision and a typed floor at the settled spend; under
   * a recorded budgetPolicy 'immutable-lifetime' (RV3902) any applying
   * override refuses typed before ownership instead.
   */
  resume<A, R>(
    runId: string,
    wf?: Workflow<A, R> | CompiledWorkflow,
    options?: ResumeOptions,
  ): ResumeHandle<R>;
  /**
   * Renders the registered agent profiles into the shared vocabulary
   * card, optionally filtered to `names`; the registry itself stays
   * private to the engine (M6-T05 amendment). Unknown names are ignored.
   */
  profileCard(names?: readonly string[]): string;
  /**
   * The engine's configured stores, exposed for shells and hosts
   * (M8 entry amendment: the journal store comes from the engine).
   * Exactly the
   * instances createEngine received, or the defaults it built; no store
   * contract widens through this accessor. With a serialization hook
   * configured these are the HOOKED wrappers, so every reader passes
   * the one policy point (M8-T04).
   */
  readonly stores: { journal: JournalStore; transcripts: TranscriptStore };
  /**
   * Retention (OQ-20 executed at M8-T04): deletes every
   * blob transcripts.list(runId) returns, then the journal; no orphan
   * blobs survive. The caller owns the decision that the run is done.
   * A caller holding the run's lease passes it via `opts.lease` (the
   * queue worker's retention path does), so a fencedWrites store
   * refuses the cascade from a superseded holder; without a lease the
   * deletes assert the single-writer precondition as before.
   */
  deleteRun(runId: string, opts?: { lease?: Lease }): Promise<void>;
  /**
   * Checkpoint pruning (OQ-20 executed at M8-T04):
   * deletes checkpoint blobs of ok-terminal attempts that no other
   * entry references; returns the count. Parked, cancelled, escalated,
   * and hanging attempts keep theirs (park/unpark, DEF-5 retention, and
   * dangling redispatch boot from them). `opts.lease` rides each blob
   * delete exactly like the deleteRun cascade.
   */
  pruneRun(runId: string, opts?: { lease?: Lease }): Promise<number>;
  /**
   * Portable run export (RV-217): the meta record, every journal
   * entry, and every transcript blob, read through Engine.stores (the
   * one policy point), so an encrypted deployment exports PLAINTEXT
   * for a subject-access request or a store migration, without raw
   * store spelunking. Blobs are materialized in memory; export runs
   * one at a time, not catalogs.
   */
  exportRun(runId: string): Promise<RunExport>;
  /**
   * Imports a bundle produced by exportRun, under its ORIGINAL runId
   * (transcript refs and journal fields embed it; rewriting ids is
   * deliberately out of scope). Writes through Engine.stores, so an
   * encrypting target re-encrypts under its own policy. Refuses typed
   * when the run already exists in the target store, so an import can
   * never interleave with live history.
   */
  /**
   * Imports an exportRun bundle into this engine's stores. Returns the
   * closure report (RV1511): every transcript, checkpoint, artifact,
   * and workflow-source ref the ENTRIES (and meta) reference that no
   * bundle blob carries. The default import stays permissive (the
   * historical shape: retention and pruning legitimately drop blobs
   * their entries still name) and the report makes the gap visible;
   * `requireClosure: true` refuses typed BEFORE any write instead. A
   * duplicate blob ref in the bundle always refuses: last-write-wins
   * is not an import.
   */
  importRun(
    bundle: RunExport,
    options?: { requireClosure?: boolean },
  ): Promise<{ unresolvedRefs: string[] }>;
}

/** The portable bundle exportRun produces and importRun consumes (RV-217). */
export interface RunExport {
  runId: string;
  /** Absent when the source store had no meta row for the run. */
  meta?: RunMeta;
  entries: JournalEntry[];
  blobs: Array<{ ref: string; data: Bytes }>;
}

/**
 * The bounded execution scope of one run (RV4007, the fifth
 * comparison experiment's P0.4): WHO this run executes for, as the
 * host names it. The library CARRIES the scope without loss (RunMeta,
 * a genesis journal decision, the invoice header, the export bundle
 * via its meta) and asserts identity on resume; it never interprets
 * it. Tenancy semantics, entitlement, and isolation policy are host
 * decisions: this is an attribution envelope, not IAM.
 */
export interface ExecutionScope {
  /** The owning tenant or organization, host-defined. */
  tenant?: string;
  /** The billing account within the tenant. */
  account?: string;
  /** The project or workload name. */
  project?: string;
  /**
   * The governing legal domain (RV4205, the sixth comparison
   * experiment's P0.2): host-defined vocabulary (a jurisdiction, a
   * regulatory regime), the first of the three named dimensions the
   * experiment's question bound to routing and audit.
   */
  legalDomain?: string;
  /** The deployment or data-residency region, host-defined (RV4205). */
  region?: string;
  /** The provider-side billing account identity, host-defined (RV4205). */
  providerAccount?: string;
  /**
   * The sponsoring principal of the work (RV4408, the seventh
   * comparison experiment's benchmark domain): the party on whose
   * behalf and at whose expense the run executes, distinct from the
   * OWNING tenant and the BILLING account. The Aster adjudication
   * shape is the motivating example: a network operator (tenant)
   * adjudicates a trial financed by a study sponsor, and the sponsor
   * identity must ride attribution, the invoice header, and the
   * regulated posture hash without being conflated with billing.
   * Host-defined vocabulary, like every dimension here.
   */
  sponsor?: string;
}

/** One of the named scope dimensions (RV4007/RV4205/RV4408). */
export type ExecutionScopeField =
  'tenant' | 'account' | 'project' | 'legalDomain' | 'region' | 'providerAccount' | 'sponsor';

const SCOPE_FIELDS = [
  'tenant',
  'account',
  'project',
  'legalDomain',
  'region',
  'providerAccount',
  'sponsor',
] as const satisfies readonly ExecutionScopeField[];

/**
 * One value-normalization operation of the declarative table (RV4302):
 * a CLOSED vocabulary on purpose. A host callback would not be replay
 * stable (it is not journalable, and it may read locale or time), so
 * the policy is data: each operation is a named pure function of the
 * string alone, all three idempotent, applied in the declared order.
 */
export type ScopeNormalizeOp = 'trim' | 'lowercase' | 'nfc';

const SCOPE_NORMALIZE_OPS = ['trim', 'lowercase', 'nfc'] as const;

/**
 * The declarative scope value normalization table (RV4302, deferred
 * from RV4205): without it, `Region` and `region` values produce two
 * digests for one identity, splitting quota buckets and FinOps joins.
 * Versioned so a future vocabulary is a new declared shape, never a
 * silent reinterpretation; JCS-serializable by construction, so the
 * genesis decision journals it verbatim and resume compares canonical
 * bytes. Applied strictly AFTER the existing per-field validation,
 * with the result re-validated by the same rule.
 */
export interface ScopeNormalizeTable {
  version: 1;
  /** Per-dimension operation lists, applied in array order. */
  fields: Partial<Record<ExecutionScopeField, readonly ScopeNormalizeOp[]>>;
}

/**
 * What an UNKNOWN scope field does (RV4205). 'drop' (the default, the
 * RV4007/RV4107 posture byte for byte) silently discards it from the
 * normalized copy, which keeps junk fields from moving the recorded
 * identity; 'reject' refuses it typed by name, because a dimension
 * the engine cannot record is a dimension nothing downstream can bind
 * to routing, quota, or audit, and a host that declared it meant it.
 * `compileRegulatedProfile` enforces 'reject'. `normalize` (RV4302)
 * canonicalizes VALUES before the identity exists anywhere: the table
 * is journaled in the genesis `execution_scope` decision and mirrored
 * in RunMeta, and resume reads the RECORDED table, never a re-supplied
 * one (a conflicting resupply refuses typed, the args-binding rule).
 */
export interface ScopePolicy {
  unknown?: 'drop' | 'reject';
  normalize?: ScopeNormalizeTable;
}

/**
 * Validates a declared normalization table (RV4302): version 1 exactly,
 * at least one field, every field a known scope dimension, every op
 * list a non-empty array over the closed vocabulary. One validator for
 * every path (run intake, resume assertion, regulated compile, direct
 * callers of normalizeExecutionScope), so a malformed table refuses
 * with the same words everywhere.
 */
function validateScopeNormalizeTable(
  value: unknown,
  site: string,
): asserts value is ScopeNormalizeTable {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(`${site} must be an object; got ${JSON.stringify(value)}`);
  }
  const table = value as { version?: unknown; fields?: unknown };
  if (table.version !== 1) {
    throw new ConfigError(
      `${site}.version must be 1 (the only shipped vocabulary); got ` +
        JSON.stringify(table.version),
    );
  }
  if (typeof table.fields !== 'object' || table.fields === null || Array.isArray(table.fields)) {
    throw new ConfigError(`${site}.fields must be an object of per-dimension op lists`);
  }
  const keys = Object.keys(table.fields);
  if (keys.length === 0) {
    throw new ConfigError(`${site}.fields must name at least one scope dimension`);
  }
  for (const key of keys) {
    if (!(SCOPE_FIELDS as readonly string[]).includes(key)) {
      throw new ConfigError(
        `${site}.fields.${key} is not a scope dimension; the named dimensions are ` +
          SCOPE_FIELDS.join(', '),
      );
    }
    const ops = (table.fields as Record<string, unknown>)[key];
    if (!Array.isArray(ops) || ops.length === 0) {
      throw new ConfigError(`${site}.fields.${key} must be a non-empty array of operations`);
    }
    for (const op of ops) {
      if (!(SCOPE_NORMALIZE_OPS as readonly unknown[]).includes(op)) {
        throw new ConfigError(
          `${site}.fields.${key} holds an unknown operation ${JSON.stringify(op)}; the ` +
            `vocabulary is ${SCOPE_NORMALIZE_OPS.join(', ')}`,
        );
      }
    }
  }
}

/** Validates a declared ScopePolicy (both knobs) with one set of words. */
function validateScopePolicy(policy: ScopePolicy, site: string): void {
  if (policy.unknown !== undefined && policy.unknown !== 'drop' && policy.unknown !== 'reject') {
    throw new ConfigError(
      `${site}.unknown must be 'drop' or 'reject'; got ` + JSON.stringify(policy.unknown),
    );
  }
  if (policy.normalize !== undefined) {
    validateScopeNormalizeTable(policy.normalize, `${site}.normalize`);
  }
}

/** Applies one closed-vocabulary op; every op is pure and idempotent. */
function applyScopeNormalizeOp(value: string, op: ScopeNormalizeOp): string {
  if (op === 'trim') {
    return value.trim();
  }
  if (op === 'lowercase') {
    // Locale-independent by construction (never toLocaleLowerCase):
    // the table must fold identically on every host.
    return value.toLowerCase();
  }
  return value.normalize('NFC');
}

/**
 * Validates and copies a declared scope (RV4007): own properties only
 * (the RV1205 doctrine: a prototype member must never resolve),
 * non-empty strings of at most 256 chars, at least one field, and the
 * copy is what gets recorded, so later host mutation of the passed
 * object cannot move the recorded identity. Under
 * `policy.unknown: 'reject'` (RV4205) an own enumerable field outside
 * the named dimensions refuses typed by name instead of dropping.
 */
export function normalizeExecutionScope(
  value: unknown,
  site: string,
  policy?: ScopePolicy,
): ExecutionScope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ConfigError(`${site} must be an object; got ${JSON.stringify(value)}`);
  }
  if (policy?.normalize !== undefined) {
    // Every path validates the table HERE (RV4302), so a direct caller
    // of the exported function refuses a malformed table with the same
    // words the run intake uses.
    validateScopeNormalizeTable(policy.normalize, `${site}Policy.normalize`);
  }
  if (policy?.unknown === 'reject') {
    for (const key of Object.keys(value)) {
      if (!(SCOPE_FIELDS as readonly string[]).includes(key)) {
        throw new ConfigError(
          `${site}.${key} is not a scope dimension (scopePolicy.unknown 'reject'): the ` +
            `named dimensions are ${SCOPE_FIELDS.join(', ')}; a field the engine cannot ` +
            'record is a field nothing downstream can bind',
        );
      }
    }
  }
  const copy: ExecutionScope = {};
  for (const field of SCOPE_FIELDS) {
    if (!Object.hasOwn(value, field)) {
      continue;
    }
    const declared = (value as Record<string, unknown>)[field];
    if (typeof declared !== 'string' || declared.length === 0 || declared.length > 256) {
      throw new ConfigError(
        `${site}.${field} must be a non-empty string of at most 256 characters; got ` +
          JSON.stringify(declared),
      );
    }
    // The declarative value normalization (RV4302), strictly AFTER the
    // input validation above: the table canonicalizes what a valid
    // declaration MEANS, it never launders an invalid one in.
    const ops = policy?.normalize?.fields[field];
    let normalized = declared;
    if (ops !== undefined) {
      for (const op of ops) {
        normalized = applyScopeNormalizeOp(normalized, op);
      }
      // Re-validated by the SAME rule: a value the table folded to
      // empty (all-whitespace under 'trim') is an identity that
      // records nothing, and it refuses typed instead of recording it.
      if (normalized.length === 0 || normalized.length > 256) {
        throw new ConfigError(
          `${site}.${field} normalizes to ${JSON.stringify(normalized)} under the declared ` +
            `scopePolicy.normalize table (ops: ${ops.join(', ')}), which is not a non-empty ` +
            'string of at most 256 characters',
        );
      }
    }
    copy[field] = normalized;
  }
  if (Object.keys(copy).length === 0) {
    throw new ConfigError(
      `${site} must declare at least one of ${SCOPE_FIELDS.join(', ')}; an empty scope ` +
        'records nothing and asserts nothing',
    );
  }
  return copy;
}

/** The canonical identity string of a scope (RV4007): JCS bytes, total and deterministic. */
export function executionScopeKey(scope: ExecutionScope): string {
  return jcsSerialize(scope);
}

/**
 * The canonical digest of a scope (RV4205): sha256 over the JCS bytes
 * of the NORMALIZED scope, a fixed-length identity for causal records
 * (the genesis decision, the invoice header) and external joins, so a
 * FinOps pipeline correlates runs by one column instead of comparing
 * structured objects field by field.
 */
export function executionScopeDigest(scope: ExecutionScope): string {
  return createHash('sha256').update(executionScopeKey(scope), 'utf8').digest('hex');
}

/** Validates a declared config fingerprint (RV3210): a non-empty string of at most 512 chars. */
function requireConfigFingerprint(value: unknown, site: string): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > 512) {
    throw new ConfigError(
      `${site} must be a non-empty string of at most 512 characters; got ` +
        (typeof value === 'string' ? `${String(value.length)} characters` : JSON.stringify(value)),
    );
  }
}

/** Content hash of an in-process workflow body (run-to-definition binding). */
export function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string {
  return createHash('sha256')
    .update((wf as Workflow<unknown, unknown>).body.toString(), 'utf8')
    .digest('hex');
}

/** Content hash of a compiled workflow source (run-to-definition binding). */
export function hashWorkflowSource(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

/** TranscriptStore ref of the persisted CompiledWorkflow source blob. */
export function workflowSourceRef(runId: string): string {
  return `${runId}/workflow-source`;
}

/**
 * The completion envelope contract (RV-207 tail): a workflow reports
 * SEMANTIC completion by returning an object result carrying a
 * `completion` literal (and optionally `childStatusCounts`), or by
 * throwing a typed RulvarError whose `data` carries them; the engine
 * lifts the validated fields onto the `run:end` event so telemetry
 * consumers read completeness without parsing workflow-specific result
 * shapes. The orchestrator acceptance path emits this envelope. Pure
 * shape validation: anything malformed is silently absent (the event is
 * telemetry, never authority), and an invalid counts record drops the
 * counts while keeping a valid completion.
 */
/**
 * The pre-acceptance roster lift (RV2602), deliberately NOT gated on a
 * completion.
 *
 * Every other lifted field rides {@link liftRunCompletion}, which bails
 * out the moment there is no completion literal, and that is exactly
 * right: those fields report what an acceptance policy CLAIMED. This
 * one exists for the case where no policy ever ran, so gating it on a
 * completion would gate it on the very thing that is missing.
 *
 * Same posture as its siblings otherwise: a well formed record mirrors,
 * anything malformed drops silently rather than half-mirroring, so a
 * consumer never reads a partial roster as a whole one.
 */
function liftChildrenAtFailure(candidate: unknown): ChildrenAtFailure | undefined {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return undefined;
  }
  const raw = (candidate as { childrenAtFailure?: unknown }).childrenAtFailure;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const { spawned, settled, statusCounts, belowFloorOkChildren, unsettled } = raw as {
    spawned?: unknown;
    settled?: unknown;
    statusCounts?: unknown;
    belowFloorOkChildren?: unknown;
    unsettled?: unknown;
  };
  const count = (value: unknown): value is number =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (!count(spawned) || !count(settled)) {
    return undefined;
  }
  if (typeof statusCounts !== 'object' || statusCounts === null || Array.isArray(statusCounts)) {
    return undefined;
  }
  const entries = Object.entries(statusCounts as Record<string, unknown>);
  if (!entries.every(([, value]) => count(value))) {
    return undefined;
  }
  const names = (value: unknown): string[] | undefined =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
      ? ([...value] as string[])
      : undefined;
  const below = belowFloorOkChildren === undefined ? undefined : names(belowFloorOkChildren);
  const open = unsettled === undefined ? undefined : names(unsettled);
  if (
    (belowFloorOkChildren !== undefined && below === undefined) ||
    (unsettled !== undefined && open === undefined)
  ) {
    return undefined;
  }
  return {
    spawned,
    settled,
    statusCounts: Object.fromEntries(entries) as Record<string, number>,
    ...(below === undefined ? {} : { belowFloorOkChildren: below }),
    ...(open === undefined ? {} : { unsettled: open }),
  };
}

function liftRunCompletion(candidate: unknown):
  | {
      completion: 'complete' | 'partial' | 'rejected';
      childStatusCounts?: Record<string, number>;
      degradedReasons?: string[];
      salvagedPartialChildren?: string[];
      salvagedTerminalOutputChildren?: string[];
      belowFloorOkChildren?: string[];
      acceptanceChildren?: AcceptanceChildSummary[];
      semanticPasses?: SemanticPassesSummary;
      claimContradictions?: Record<string, unknown>[];
      synthesisSkipped?: boolean | string;
      deliverableAccepted?: boolean;
      resultAvailable?: boolean;
      acceptedArtifactRef?: number;
      rejectedFinishCandidates?: RejectedFinishCandidate[];
    }
  | undefined {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return undefined;
  }
  const completion = (candidate as { completion?: unknown }).completion;
  if (completion !== 'complete' && completion !== 'partial' && completion !== 'rejected') {
    return undefined;
  }
  const lifted: {
    completion: 'complete' | 'partial' | 'rejected';
    childStatusCounts?: Record<string, number>;
    degradedReasons?: string[];
    salvagedPartialChildren?: string[];
    salvagedTerminalOutputChildren?: string[];
    belowFloorOkChildren?: string[];
    acceptanceChildren?: AcceptanceChildSummary[];
    semanticPasses?: SemanticPassesSummary;
    claimContradictions?: Record<string, unknown>[];
    synthesisSkipped?: boolean | string;
    deliverableAccepted?: boolean;
    resultAvailable?: boolean;
    acceptedArtifactRef?: number;
    rejectedFinishCandidates?: RejectedFinishCandidate[];
  } = { completion };
  const counts = (candidate as { childStatusCounts?: unknown }).childStatusCounts;
  if (typeof counts === 'object' && counts !== null && !Array.isArray(counts)) {
    const entries = Object.entries(counts as Record<string, unknown>);
    if (
      entries.every(
        ([, value]) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
      )
    ) {
      lifted.childStatusCounts = Object.fromEntries(entries) as Record<string, number>;
    }
  }
  // The degradation mirror (the fifth experiment, cycle 75): the
  // acceptance envelope and the typed rejection data have carried the
  // degradation facts since 1.65/1.71, but the lift stopped at counts,
  // so a host read the reasons on the ok path from a workflow-shaped
  // value and on the rejected path from error.data. Same posture as
  // counts: valid shapes mirror (an empty array is the claim of zero
  // degradation, not absence), malformed shapes drop silently.
  const liftStringList = (key: string): string[] | undefined => {
    const value = (candidate as Record<string, unknown>)[key];
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
      ? ([...value] as string[])
      : undefined;
  };
  const degradedReasons = liftStringList('degradedReasons');
  if (degradedReasons !== undefined) {
    lifted.degradedReasons = degradedReasons;
  }
  const salvagedPartialChildren = liftStringList('salvagedPartialChildren');
  if (salvagedPartialChildren !== undefined) {
    lifted.salvagedPartialChildren = salvagedPartialChildren;
  }
  const salvagedTerminalOutputChildren = liftStringList('salvagedTerminalOutputChildren');
  if (salvagedTerminalOutputChildren !== undefined) {
    lifted.salvagedTerminalOutputChildren = salvagedTerminalOutputChildren;
  }
  // Ok children below their declared evidence floor (RV1412), same
  // posture as the salvage lists: a valid string array mirrors,
  // anything malformed drops silently.
  const belowFloorOkChildren = liftStringList('belowFloorOkChildren');
  if (belowFloorOkChildren !== undefined) {
    lifted.belowFloorOkChildren = belowFloorOkChildren;
  }
  // The per-child acceptance roster (RV806), same posture: a valid
  // array of child rows mirrors, anything malformed drops silently.
  const rosterCandidate = (candidate as { acceptanceChildren?: unknown }).acceptanceChildren;
  if (Array.isArray(rosterCandidate)) {
    const validRow = (row: unknown): row is AcceptanceChildSummary => {
      if (typeof row !== 'object' || row === null) {
        return false;
      }
      const { child, status, salvage, evidence } = row as {
        child?: unknown;
        status?: unknown;
        salvage?: unknown;
        evidence?: unknown;
      };
      if (typeof child !== 'string' || typeof status !== 'string') {
        return false;
      }
      if (salvage !== undefined && salvage !== 'partial' && salvage !== 'terminal-output') {
        return false;
      }
      if (evidence === undefined) {
        return true;
      }
      if (typeof evidence !== 'object' || evidence === null) {
        return false;
      }
      const { recordedEntries, minEntries, met, waivedBySalvage } = evidence as {
        recordedEntries?: unknown;
        minEntries?: unknown;
        met?: unknown;
        waivedBySalvage?: unknown;
      };
      return (
        typeof recordedEntries === 'number' &&
        Number.isSafeInteger(recordedEntries) &&
        recordedEntries >= 0 &&
        typeof minEntries === 'number' &&
        Number.isSafeInteger(minEntries) &&
        minEntries >= 0 &&
        typeof met === 'boolean' &&
        (waivedBySalvage === undefined || waivedBySalvage === true)
      );
    };
    if (rosterCandidate.every(validRow)) {
      lifted.acceptanceChildren = rosterCandidate.map((row) => ({ ...row }));
    }
  }
  // The explicit pass summary (RV1906), same posture as the roster: a
  // valid {ran, reason?} triple mirrors, anything malformed drops
  // silently, so an absent findings field can never read as a clean
  // pass and a null can never read as anything at all.
  const passesCandidate = (candidate as { semanticPasses?: unknown }).semanticPasses;
  if (typeof passesCandidate === 'object' && passesCandidate !== null) {
    const validPass = (value: unknown): value is { ran: boolean; reason?: string } => {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      const { ran, reason } = value as { ran?: unknown; reason?: unknown };
      return typeof ran === 'boolean' && (reason === undefined || typeof reason === 'string');
    };
    const { contradictions, claimConsistency, synthesis } = passesCandidate as {
      contradictions?: unknown;
      claimConsistency?: unknown;
      synthesis?: unknown;
    };
    if (validPass(contradictions) && validPass(claimConsistency) && validPass(synthesis)) {
      lifted.semanticPasses = {
        contradictions: { ...contradictions },
        claimConsistency: { ...claimConsistency },
        synthesis: { ...synthesis },
      };
    }
  }
  // The judge metas and the one-word verdict moved to
  // liftSemanticFacts (RV4403), the ONE owner: they must ride every
  // terminal path, completion literal or not, and two lifts carrying
  // the same fields from the same sources were redundancy no test
  // could pin.
  // The judged findings beside their meta (RV3601), same posture: the
  // third comparison run failed typed with the contradictions inside
  // error.data only, and the outcome's top level read null next to a
  // null meta. Valid rows (each an object carrying a string reason)
  // mirror shallowly; `[]` is the judge's claim of a clean document,
  // and anything malformed drops silently.
  const findingsCandidate = (candidate as { claimContradictions?: unknown }).claimContradictions;
  if (
    Array.isArray(findingsCandidate) &&
    findingsCandidate.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        !Array.isArray(row) &&
        typeof (row as { reason?: unknown }).reason === 'string',
    )
  ) {
    lifted.claimContradictions = findingsCandidate.map((row) => ({
      ...(row as Record<string, unknown>),
    }));
  }
  const skippedCandidate = (candidate as { synthesisSkipped?: unknown }).synthesisSkipped;
  if (typeof skippedCandidate === 'boolean' || typeof skippedCandidate === 'string') {
    lifted.synthesisSkipped = skippedCandidate;
  }
  // The deliverable verdict (RV2506), same posture as everything
  // above: the two claims mirror only as booleans and the reference
  // only as a journal seq, so a workflow that puts a truthy string
  // where a verdict belongs mirrors nothing rather than a green
  // reading. The three travel together but lift independently: a
  // consumer that reads `deliverableAccepted` on an engine whose
  // producer wrote only `resultAvailable` reads absence, which is the
  // honest answer.
  const acceptedCandidate = (candidate as { deliverableAccepted?: unknown }).deliverableAccepted;
  if (typeof acceptedCandidate === 'boolean') {
    lifted.deliverableAccepted = acceptedCandidate;
  }
  const availableCandidate = (candidate as { resultAvailable?: unknown }).resultAvailable;
  if (typeof availableCandidate === 'boolean') {
    lifted.resultAvailable = availableCandidate;
  }
  const artifactRefCandidate = (candidate as { acceptedArtifactRef?: unknown }).acceptedArtifactRef;
  if (
    typeof artifactRefCandidate === 'number' &&
    Number.isSafeInteger(artifactRefCandidate) &&
    artifactRefCandidate >= 0
  ) {
    lifted.acceptedArtifactRef = artifactRefCandidate;
  }
  // The rejected candidates (RV2507), same posture as the acceptance
  // roster: every row must be well formed or the whole list drops, so
  // a partially shaped array can never read as the complete history of
  // what the contract refused.
  const rejectedCandidates = (candidate as { rejectedFinishCandidates?: unknown })
    .rejectedFinishCandidates;
  if (Array.isArray(rejectedCandidates)) {
    const validRow = (row: unknown): row is RejectedFinishCandidate => {
      if (typeof row !== 'object' || row === null) {
        return false;
      }
      const { callId, verdict, hash, chars, failed, ref } = row as {
        callId?: unknown;
        verdict?: unknown;
        hash?: unknown;
        chars?: unknown;
        failed?: unknown;
        ref?: unknown;
      };
      return (
        typeof callId === 'string' &&
        (verdict === 'repair' || verdict === 'rejected') &&
        typeof hash === 'string' &&
        typeof chars === 'number' &&
        Number.isSafeInteger(chars) &&
        chars >= 0 &&
        (ref === undefined || typeof ref === 'string') &&
        Array.isArray(failed) &&
        failed.every(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof (entry as { name?: unknown }).name === 'string' &&
            Array.isArray((entry as { reasons?: unknown }).reasons) &&
            (entry as { reasons: unknown[] }).reasons.every((reason) => typeof reason === 'string'),
        )
      );
    };
    if (rejectedCandidates.every(validRow)) {
      lifted.rejectedFinishCandidates = rejectedCandidates.map((row) => ({ ...row }));
    }
  }
  return lifted;
}

/**
 * The semantic facts lifted on EVERY terminal path (RV4403). The
 * completion lift above requires a completion literal by contract, so
 * a run that failed typed WITHOUT one dropped every semantic fact it
 * carried: the seventh comparison run's error.data held both judge
 * metas and the failure was ABOUT the audit's ten unsupported
 * citations, yet no outcome, settle, or restart surface carried them.
 * Field-level lift from the same candidates in the same order (the
 * first source carrying a field wins), each field under the exact
 * posture the completion lift applies, so the two lifts can never
 * disagree where they overlap.
 */
function liftSemanticFacts(...candidates: unknown[]):
  | {
      claimConsistencyMeta?: Record<string, unknown>;
      citationAuditMeta?: Record<string, unknown>;
      semanticTerminalVerdict?: Record<string, unknown>;
    }
  | undefined {
  const facts: {
    claimConsistencyMeta?: Record<string, unknown>;
    citationAuditMeta?: Record<string, unknown>;
    semanticTerminalVerdict?: Record<string, unknown>;
  } = {};
  const record = (value: unknown): Record<string, unknown> | undefined =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : undefined;
  for (const candidate of candidates) {
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
      continue;
    }
    const shaped = candidate as {
      claimConsistencyMeta?: unknown;
      citationAuditMeta?: unknown;
      semanticTerminalVerdict?: unknown;
    };
    facts.claimConsistencyMeta ??= record(shaped.claimConsistencyMeta);
    facts.citationAuditMeta ??= record(shaped.citationAuditMeta);
    facts.semanticTerminalVerdict ??= record(shaped.semanticTerminalVerdict);
  }
  const trimmed = Object.fromEntries(
    Object.entries(facts).filter(([, value]) => value !== undefined),
  ) as typeof facts;
  return Object.keys(trimmed).length === 0 ? undefined : trimmed;
}

/**
 * sha256 hex over the JCS canonical serialization of a run's args: the
 * value the engine records as `RunMeta.argsHash` at genesis, exposed so
 * hosts can verify re-supplied resume args against the recorded hash
 * (the v1.23.0 review: a resume that silently drops or changes args
 * changes the logical run and pays again). Returns undefined for
 * undefined args (a run started without args records none). Throws when
 * JCS cannot serialize the value (functions, cycles, non-finite
 * numbers); the engine then records `argsProvided` without a hash.
 *
 * The digest is deterministic and unsalted: it reveals args equality
 * across runs and low-entropy args are recoverable by hashing
 * candidates, so treat the recorded `RunMeta.argsHash` as
 * sensitive-derived metadata, not a value safe to publish (see the
 * `argsHash` field docs).
 */
export function hashRunArgs(args: unknown, options?: { salt?: string }): string | undefined {
  if (args === undefined) {
    return undefined;
  }
  const canonical = jcsSerialize(args);
  const salt = options?.salt;
  if (salt === undefined) {
    return createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
  // Salted form (RV-217): HMAC-SHA256 keyed by the deployment salt, so
  // equal args no longer produce equal digests ACROSS deployments and
  // low-entropy args stop being recoverable by hashing candidates
  // against a public table. Within one deployment the digest stays
  // deterministic, which is all the resume args gate needs.
  return createHmac('sha256', Buffer.from(salt, 'utf8')).update(canonical, 'utf8').digest('hex');
}

/**
 * sha256 hex over the JCS canonical serialization of a run's result
 * value: the digest the engine records as `outputHash` on the journaled
 * run-settle decision when the settling segment computed a value, and
 * the value `rulvar replay --compare-output-hash` compares a replayed
 * result against (RV-209). Best-effort by design: returns undefined for
 * undefined values and for values JCS cannot serialize (functions,
 * cycles, non-finite numbers), so an unhashable result records no
 * baseline rather than failing the settle. Like `hashRunArgs`, the
 * digest is deterministic and unsalted: treat it as sensitive-derived
 * metadata for low-entropy results.
 */
export function hashRunOutput(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    return createHash('sha256').update(jcsSerialize(value), 'utf8').digest('hex');
  } catch {
    return undefined;
  }
}

/**
 * Engine ownership identity: a process-local counter, not Math.random()
 * (the queue worker's identity convention): owner strings need
 * uniqueness within the store, and the dev-mode bare-randomness guard
 * stays armed while any run is live.
 */
let engineOrdinal = 0;

function engineIdentity(): string {
  engineOrdinal += 1;
  return `rulvar-engine:${process.pid}:${engineOrdinal}`;
}

/** Lease capability guard, mirroring createWorker's detection. */
function leaseCapable(store: JournalStore): store is LeasableStore {
  const candidate = store as Partial<LeasableStore>;
  return (
    typeof candidate.acquire === 'function' &&
    typeof candidate.renew === 'function' &&
    typeof candidate.release === 'function'
  );
}

/**
 * The renew-cadence fallback when a leasable store exposes no
 * leaseTtlMs: the Appendix A interim reference ttl the shipped stores
 * default to (60000 ms).
 */
const ENGINE_DEFAULT_LEASE_TTL_MS = 60_000;

/**
 * The quiescence watchdog (RV2003): no path may end the process while
 * a run has no journaled terminal. The third parity rerun did exactly
 * that: the root parked, the event loop drained, and Node exited with
 * an unsettled top-level await, no run_settle, no terminal, no cost
 * report. Every unsettled run registers a force here; when the event
 * loop is about to die (`beforeExit`), each registered run is driven
 * through its ordinary cancel path, which the settle machinery turns
 * into the RV1903 barrier, run_settle, and a terminal envelope. The
 * forced settle re-arms the loop; once every run settles, the registry
 * empties, the listener detaches, and the process exits clean. The
 * listener exists only while the registry is nonempty, so idle
 * processes and finished engines observe zero footprint.
 */
const quiescenceWatchdogRuns = new Set<() => void>();
let quiescenceWatchdogArmed = false;
function onQuiescenceBeforeExit(): void {
  for (const force of [...quiescenceWatchdogRuns]) {
    force();
  }
}
function quiescenceWatchdogRegister(force: () => void): void {
  quiescenceWatchdogRuns.add(force);
  if (!quiescenceWatchdogArmed) {
    quiescenceWatchdogArmed = true;
    process.on('beforeExit', onQuiescenceBeforeExit);
  }
}
function quiescenceWatchdogUnregister(force: () => void): void {
  quiescenceWatchdogRuns.delete(force);
  if (quiescenceWatchdogRuns.size === 0 && quiescenceWatchdogArmed) {
    quiescenceWatchdogArmed = false;
    process.removeListener('beforeExit', onQuiescenceBeforeExit);
  }
}

export function createEngine(options: CreateEngineOptions): Engine {
  const adapters = buildAdapterRegistry(options.adapters);
  const rawJournal = options.stores?.journal ?? new InMemoryStore();
  const rawTranscripts = options.stores?.transcripts ?? new InMemoryTranscriptStore();
  // The serialization hook wraps the stores, so stored bytes and every
  // reader (including Engine.stores consumers) pass ONE policy point
  // (M8-T04). Absent hook, the raw instances flow.
  const journal =
    options.serialization?.journal === undefined
      ? rawJournal
      : wrapJournalStore(rawJournal, options.serialization.journal);
  const transcripts =
    options.serialization?.transcripts === undefined
      ? rawTranscripts
      : wrapTranscriptStore(rawTranscripts, options.serialization.transcripts);
  const maskEvents = options.redaction?.maskEvents ?? true;
  // Compiled eagerly so an invalid pattern fails typed at construction,
  // before any run emits under the policy (RV-217).
  const eventMasker =
    options.redaction?.patterns === undefined
      ? undefined
      : compileSecretMasker(options.redaction.patterns, 'createEngine redaction.patterns');
  const defaults = options.defaults ?? {};
  // The genesis ownership protocol (P0.2): resolved and validated at
  // construction so a segment's ownership boot never discovers a
  // malformed mode or ttl mid-run. The renew cadence adopts the
  // store's exposed ttl exactly like createWorker (ttl/3, floored, at
  // least 1 ms); a store exposing a non-integer ttl fails typed HERE,
  // before any run could renew on a cadence derived from it.
  const ownership = options.ownership ?? 'auto';
  if (ownership !== 'auto' && ownership !== 'none') {
    throw new ConfigError(
      `createEngine ownership must be 'auto' or 'none'; got '${String(ownership)}'`,
    );
  }
  const engineOwner = engineIdentity();
  let ownershipRenewMs = Math.max(1, Math.floor(ENGINE_DEFAULT_LEASE_TTL_MS / 3));
  if (ownership === 'auto' && leaseCapable(journal)) {
    const storeTtlMs = journal.leaseTtlMs;
    if (storeTtlMs !== undefined) {
      if (!Number.isInteger(storeTtlMs) || storeTtlMs < 1 || storeTtlMs > 2_147_483_647) {
        throw new ConfigError(
          `the journal store's leaseTtlMs capability must report an integer between 1 and ` +
            `2147483647 ms for the engine's ownership renew cadence; got ${String(storeTtlMs)}`,
        );
      }
      ownershipRenewMs = Math.max(1, Math.floor(storeTtlMs / 3));
    }
  }
  // Retry policies are validated at construction: an invalid engine
  // default or profile retry fails here, before any run can merge it
  // and reach a provider under it (v1.29.0 review P2). The per-call
  // merge in ctx.agent validates again, covering call options.
  if (defaults.retry !== undefined) {
    validateRetryPolicy(defaults.retry, 'createEngine defaults.retry');
  }
  // Every numeric engine option is validated with the shared helpers at
  // construction (v1.34.0 review P2-3/P2-4): NaN and friends fail as a
  // typed ConfigError here, before any run, journal entry, worker, or
  // provider dispatch could observe the malformed value. NaN needs the
  // dedicated gates because every comparison with it is false: it slid
  // through the rejecting-polarity depth check, disabled the lifetime
  // spawn cap, and deadlocked the per-run semaphore.
  if (options.concurrency?.perRun !== undefined) {
    requirePositiveInteger(options.concurrency.perRun, 'createEngine concurrency.perRun');
  }
  for (const [adapterId, cap] of Object.entries(options.concurrency?.perProvider ?? {})) {
    requirePositiveInteger(cap, `createEngine concurrency.perProvider['${adapterId}']`);
  }
  const budgetDefaults = options.budgetDefaults;
  if (budgetDefaults?.flatReserveUsd !== undefined) {
    requireNonNegativeNumber(
      budgetDefaults.flatReserveUsd,
      'createEngine budgetDefaults.flatReserveUsd',
    );
  }
  if (budgetDefaults?.lifetimeSpawnCap !== undefined) {
    requireNonNegativeInteger(
      budgetDefaults.lifetimeSpawnCap,
      'createEngine budgetDefaults.lifetimeSpawnCap',
    );
  }
  if (budgetDefaults?.childBudgetFraction !== undefined) {
    requireFraction(
      budgetDefaults.childBudgetFraction,
      'createEngine budgetDefaults.childBudgetFraction',
    );
  }
  if (budgetDefaults?.maxDepth !== undefined) {
    requirePositiveInteger(budgetDefaults.maxDepth, 'createEngine budgetDefaults.maxDepth');
    if (budgetDefaults.maxDepth > MAX_DEPTH_CEILING) {
      throw new ConfigError(
        `createEngine budgetDefaults.maxDepth ${String(budgetDefaults.maxDepth)} is outside ` +
          `[1, ${String(MAX_DEPTH_CEILING)}] (default 1, hard ceiling ${String(MAX_DEPTH_CEILING)})`,
      );
    }
  }
  if (defaults.limits !== undefined) {
    validateUsageLimits(defaults.limits, 'createEngine defaults.limits');
  }
  for (const [name, profile] of Object.entries(defaults.profiles ?? {})) {
    if (profile.retry !== undefined) {
      validateRetryPolicy(profile.retry, `createEngine defaults.profiles['${name}'].retry`);
    }
    if (profile.limits !== undefined) {
      validateUsageLimits(profile.limits, `createEngine defaults.profiles['${name}'].limits`);
    }
    if (profile.estCost !== undefined) {
      requireNonNegativeNumber(
        profile.estCost,
        `createEngine defaults.profiles['${name}'].estCost`,
      );
    }
    if (profile.escalation?.deadlineMs !== undefined) {
      requirePositiveInteger(
        profile.escalation.deadlineMs,
        `createEngine defaults.profiles['${name}'].escalation.deadlineMs`,
      );
    }
    if (profile.escalation?.minSpendUsd !== undefined) {
      requireNonNegativeNumber(
        profile.escalation.minSpendUsd,
        `createEngine defaults.profiles['${name}'].escalation.minSpendUsd`,
      );
    }
    if (profile.compaction?.threshold !== undefined) {
      requireFraction(
        profile.compaction.threshold,
        `createEngine defaults.profiles['${name}'].compaction.threshold`,
      );
    }
    if (profile.evidenceContract !== undefined) {
      validateEvidenceContract(
        profile.evidenceContract,
        `createEngine defaults.profiles['${name}'].evidenceContract`,
      );
    }
    if (profile.toolsetAttestation !== undefined) {
      validateToolsetAttestation(
        profile.toolsetAttestation,
        `createEngine defaults.profiles['${name}'].toolsetAttestation`,
      );
    }
    if (profile.countTokens !== undefined && !['allow', 'deny'].includes(profile.countTokens)) {
      throw new ConfigError(
        `createEngine defaults.profiles['${name}'].countTokens must be 'allow' or 'deny'`,
      );
    }
  }
  if (
    options.defaults?.countTokens !== undefined &&
    !['allow', 'deny'].includes(options.defaults.countTokens)
  ) {
    throw new ConfigError("createEngine defaults.countTokens must be 'allow' or 'deny'");
  }
  if (
    options.defaults?.billingReceipts !== undefined &&
    !['async', 'awaited', 'intent'].includes(options.defaults.billingReceipts)
  ) {
    throw new ConfigError(
      "createEngine defaults.billingReceipts must be 'async', 'awaited' or 'intent'",
    );
  }
  if (
    options.telemetry?.quotaDeniedAgentError !== undefined &&
    typeof options.telemetry.quotaDeniedAgentError !== 'boolean'
  ) {
    throw new ConfigError('createEngine telemetry.quotaDeniedAgentError must be a boolean');
  }
  // The determinism guard config fails loud at construction, before any
  // run can start under an invalid mode, pattern, or hook (RV-209).
  validateDeterminismConfig(options.determinism);
  // The shared quota limiter config fails loud too: a malformed
  // limiter must never reach a dispatch decision (RV-215).
  validateEngineQuotaConfig(options.quota);
  if (
    options.security?.argsHashSalt !== undefined &&
    (typeof options.security.argsHashSalt !== 'string' || options.security.argsHashSalt === '')
  ) {
    throw new ConfigError(
      'createEngine security.argsHashSalt must be a nonempty string when given',
    );
  }
  const argsHashSalt = options.security?.argsHashSalt;
  const quotaRuntime: EngineQuotaRuntime | undefined =
    options.quota === undefined
      ? undefined
      : {
          limiter: options.quota.limiter,
          ...(options.quota.tenant === undefined ? {} : { tenant: options.quota.tenant }),
          ...(options.quota.tenantFrom === undefined
            ? {}
            : { tenantFrom: options.quota.tenantFrom }),
          onLimiterError: options.quota.onLimiterError ?? 'deny',
          reserveContinuations: options.quota.reserveContinuations ?? false,
          maxDenials: options.quota.maxDenials ?? DEFAULT_MAX_QUOTA_DENIALS,
          ...(options.quota.declaredRules === undefined
            ? {}
            : { declaredRules: options.quota.declaredRules }),
        };
  // The runtime side holds the current()-only handle, never the store:
  // commit is unreachable from inside a run by the shape of the API.
  const knowledgeStore = options.stores?.modelKnowledge;
  const knowledge: ModelKnowledgeHandle | undefined =
    knowledgeStore === undefined ? undefined : { current: () => knowledgeStore.current() };
  const runner: ScriptRunner = new InProcessRunner(
    options.onEscalation === undefined ? undefined : { onEscalation: options.onEscalation },
  );
  const mintRunId = createCanonicalIdMinter();

  // The versioned price table wins; adapter-reported caps.pricing is
  // the fallback; undefined stays undefined so the CostReport surfaces
  // the model as unpriced, never a silent zero.
  const pricingOf = (servedBy: ModelRef): Pricing | undefined => {
    const { adapterId, model } = parseModelRef(servedBy);
    return resolvePricing(servedBy, options.pricing, adapters.get(adapterId)?.caps(model).pricing);
  };

  const priceUsd = (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const pricing = pricingOf(servedBy);
    if (pricing === undefined) {
      return undefined;
    }
    return priceUsdOf(pricing, usage);
  };

  // Per-provider concurrency keys are ENGINE-scoped: every run of this
  // engine shares the same keyed limiter (M4-T07).
  const providerLimiter = new KeyedLimiter(options.concurrency?.perProvider);

  // Execution-segment ownership (the suspension ownership rule): at most
  // one live segment per runId in this engine, so a double resume fails
  // typed BEFORE any side effect instead of racing the journal.
  // Cross-process ownership stays with store leases.
  const activeSegments = new Set<string>();

  interface ResumeContext {
    runId: string;
    priorEntries: JournalEntry[];
    strict: boolean;
    invalidate: number[];
    /** Queue mode: every journal append of this resume carries it. */
    lease?: Lease;
    /**
     * The RunMeta-recorded ceiling (B0): a resumed run keeps the
     * original invocation's bound, and the ONLY thing that changes it
     * is the explicit, journaled budgetOverride below (RV2208).
     */
    budgetUsd?: number;
    /**
     * The RunMeta-recorded in-flight exposure cap (RV1504), the
     * budgetUsd rule exactly: a resumed run keeps the original
     * invocation's cap unless budgetOverride names a new one, and
     * absence stays absent (a run started uncapped
     * resumes uncapped, and a store that dropped the field degrades
     * honestly rather than inventing a bound).
     */
    maxInFlightExposureUsd?: number;
    /**
     * The explicit resume-time ceiling override (RV2208), already
     * validated by resume(): applied over the recorded values,
     * recorded back by this segment's putMeta, journaled as a
     * run_budget_override decision before the meta mirror flips.
     * Carries only the fields the host actually passed.
     */
    budgetOverride?: { budgetUsd?: number; maxInFlightExposureUsd?: number };
    /**
     * The RunMeta-recorded strict pricing gate (RV1508), the exposure
     * cap's rule: restored verbatim, no ResumeOptions override,
     * absence stays absent.
     */
    strictPricing?: { maxRatesAgeDays?: number; allowUnpriced?: string[] };
    /**
     * The RunMeta-recorded ceiling-override posture (RV3902), restored
     * verbatim; absence means 'segment'. The refusal of a
     * ResumeOptions.run override under 'immutable-lifetime' already
     * happened in engine.resume, before ownership.
     */
    budgetPolicy?: 'immutable-lifetime';
    /**
     * Execution segments started before this one (RunMeta.segments;
     * 1 when the field predates v1.23 journals). Seeds this segment's
     * event seq and span-id base so telemetry counters stay strictly
     * increasing and unique per run (v1.22.0 review P1-2).
     */
    segmentsBefore: number;
    /**
     * The genesis args binding (RunMeta.argsProvided/argsHash) carried
     * through verbatim: a resume segment writes back the RECORDED
     * values, never ones derived from its own re-supplied args, and
     * absence stays absent (a legacy run must not gain a false marker).
     */
    argsProvided?: boolean;
    argsHash?: string;
    /**
     * The RunMeta-recorded genesis token carried through verbatim, so a
     * resume segment never re-mints it; absence stays absent (a legacy
     * run must not gain a generation marker retroactively).
     */
    genesis?: string;
    /**
     * The RunMeta-recorded exec idempotency key derivation carried
     * through verbatim (RV403): a resume segment derives the version the
     * run STARTED with, and absence stays absent, so a run recorded
     * before the field shipped keeps its version 1 keys forever and a
     * mid-run upgrade never flips keys inside one incarnation.
     */
    execKeyDerivation?: number;
    /**
     * The RunMeta-recorded config fingerprint carried through verbatim
     * (RV3210): a resume segment writes back the RECORDED value, never
     * one from its own options, and absence stays absent.
     */
    configFingerprint?: string;
    /** The RunMeta-recorded execution scope (RV4007), restored verbatim; absence stays absent. */
    scope?: ExecutionScope;
    /**
     * The RunMeta-recorded scope value normalization table (RV4302),
     * restored verbatim so the resume segment's meta write preserves
     * it; absence stays absent. Never a re-supplied table: engine.resume
     * refused any conflicting ResumeOptions.scopePolicy.normalize
     * before this context was built.
     */
    scopeNormalize?: ScopeNormalizeTable;
    /**
     * Open provider wire intents the host explicitly acknowledged
     * (RV4006): the count travels in so the segment journals the
     * acknowledgment beside the run_budget_override precedent.
     */
    acknowledgedOpenWireIntents?: number;
    previewResolve: (preview: ResumePreview) => void;
  }

  function run<A, R>(
    wf: Workflow<A, R> | CompiledWorkflow,
    args: A,
    opts?: RunOptions,
    resumeCtx?: ResumeContext,
  ): RunHandle<R> {
    if (wf.kind !== 'workflow' && wf.kind !== 'compiled-workflow') {
      throw new ConfigError(
        'engine.run accepts in-process Workflow values or compileScript CompiledWorkflow values',
      );
    }
    // Run options are validated synchronously, before the journal or a
    // provider could observe them (v1.34.0 review P2-1/P2-3): a
    // malformed deadlineAt used to parse to NaN, arm a 1 ms timer, and
    // cancel the run only after the first provider dispatch.
    if (opts?.budgetUsd !== undefined) {
      requireNonNegativeNumber(opts.budgetUsd, 'RunOptions.budgetUsd');
    }
    if (opts?.maxInFlightExposureUsd !== undefined) {
      requireNonNegativeNumber(opts.maxInFlightExposureUsd, 'RunOptions.maxInFlightExposureUsd');
    }
    if (opts?.configFingerprint !== undefined) {
      requireConfigFingerprint(opts.configFingerprint, 'RunOptions.configFingerprint');
    }
    // Fail closed on intake (RV2503): a truthy string would arm a
    // dispatch posture the host never asked for, and a typo'd flag
    // that silently reads as off is the same hazard from the other
    // side.
    if (opts?.clampTurnToExposure !== undefined && typeof opts.clampTurnToExposure !== 'boolean') {
      throw new ConfigError(
        'RunOptions.clampTurnToExposure must be a boolean; got ' +
          JSON.stringify(opts.clampTurnToExposure),
      );
    }
    if (
      opts?.strictPricing !== undefined &&
      typeof opts.strictPricing !== 'boolean' &&
      (typeof opts.strictPricing !== 'object' ||
        opts.strictPricing === null ||
        Array.isArray(opts.strictPricing))
    ) {
      throw new ConfigError(
        'RunOptions.strictPricing must be a boolean or an options object; got ' +
          JSON.stringify(opts.strictPricing),
      );
    }
    if (
      opts?.budgetPolicy !== undefined &&
      opts.budgetPolicy !== 'segment' &&
      opts.budgetPolicy !== 'immutable-lifetime'
    ) {
      throw new ConfigError(
        "RunOptions.budgetPolicy must be 'segment' or 'immutable-lifetime'; got " +
          JSON.stringify(opts.budgetPolicy),
      );
    }
    if (opts?.scopePolicy !== undefined) {
      // Both knobs validate at intake (RV4302), scope or no scope: a
      // malformed policy is a declaration the engine cannot honor.
      validateScopePolicy(opts.scopePolicy, 'RunOptions.scopePolicy');
    }
    const declaredScope =
      opts?.scope === undefined
        ? undefined
        : normalizeExecutionScope(opts.scope, 'RunOptions.scope', opts.scopePolicy);
    if (opts?.limits !== undefined) {
      validateUsageLimits(opts.limits, 'RunOptions.limits');
    }
    const deadlineAtMs =
      opts?.deadlineAt === undefined ? undefined : parseDeadlineAt(opts.deadlineAt);
    const compiled = wf.kind === 'compiled-workflow' ? wf : undefined;
    if (compiled !== undefined && options.runners?.sandbox === undefined) {
      throw new ConfigError(
        'running a CompiledWorkflow requires a sandbox runner: pass ' +
          'createEngine({ runners: { sandbox: new WorkerSandboxRunner() } }) from @rulvar/planner ' +
          '',
      );
    }
    const runId = resumeCtx?.runId ?? opts?.runId ?? mintRunId();
    // Refuse an unsafe runId before the first store side effect (v1.36.0
    // review SEC-P1): a compiled run persists its source at
    // transcripts.put(workflowSourceRef(runId)) as its FIRST write, ahead
    // of the journal's own name guard, so a runId of '..' would escape the
    // transcript root there. Minted ids and prior-run ids pass unchanged.
    assertSafeRunId(runId, 'engine.run');
    // A runId is a correlation key: it rides every event envelope
    // UNMASKED (body masking runs before the envelope is assembled),
    // every journal path, and every transcript ref prefix, so a
    // secret-shaped runId would leak through the very masking the host
    // configured: a bypass channel the host creates itself. Under an
    // active masking policy the intake refuses such an id typed
    // (RV1012); masking the id instead would sever correlation.
    if (maskEvents) {
      const maskedRunId =
        eventMasker === undefined ? maskSecretsDeep(runId) : eventMasker.maskDeep(runId);
      if (maskedRunId !== runId) {
        throw new ConfigError(
          `engine.run: runId matches the active redaction policy (a secret-shaped ` +
            `correlation key); events carry the runId unmasked by design, so an id the ` +
            `policy would rewrite is refused at intake; mint a neutral runId instead`,
        );
      }
    }
    // The segment's lease rides ONE mutable holder (P0.2): caller
    // supplied (queue mode, or the genesis handoff via
    // RunOptions.lease) or engine acquired at the ownership boot in
    // the async body below. Every durable write of the segment (each
    // journal append, each putMeta, each transcript blob) reads the
    // CURRENT lease through this holder, so fresh start, resume, and
    // worker takeover share one owner/lease contract.
    const suppliedLease = resumeCtx?.lease ?? opts?.lease;
    if (suppliedLease !== undefined && suppliedLease.runId !== runId) {
      throw new ConfigError(
        `the supplied lease is for run '${suppliedLease.runId}', not '${runId}'; a lease ` +
          'fences exactly the run it was acquired for',
      );
    }
    const segmentLease: { current?: Lease } = {};
    if (suppliedLease !== undefined) {
      segmentLease.current = suppliedLease;
    }
    const registry = buildDeriverRegistry(options.extraDerivers);
    // Segment k of a run starts its telemetry counters at
    // k * EVENT_SEGMENT_STRIDE, so seq stays strictly increasing and
    // spanId unique per run across resume segments and process
    // recreation (v1.22.0 review P1-2). The durable bump of
    // RunMeta.segments happens in putMeta('running') below, strictly
    // BEFORE the segment's first emit.
    const segmentsBefore = resumeCtx?.segmentsBefore ?? 0;
    const telemetryBase = segmentsBefore * EVENT_SEGMENT_STRIDE;
    const spans = new SpanRegistry({ first: telemetryBase });
    const bus = new EventBus({
      runId,
      spans,
      now: realNow,
      maskEvents,
      ...(eventMasker === undefined ? {} : { mask: (body) => eventMasker.maskDeep(body) }),
      firstSeq: telemetryBase,
    });
    const rootSpanId = spans.mint();
    let budgetSeed:
      | { usd: number; usage: Usage; agentsSpawned: number; accounts?: Record<string, number> }
      | undefined;
    // B0 is immutable across the run's whole life with ONE exception:
    // a fresh run takes it from RunOptions, a resumed run restores the
    // RunMeta-recorded value, and the only API that changes it after
    // start is the explicit, validated, journaled ResumeOptions.run
    // override (RV2208), which putMeta below records as the run's new
    // posture so later bare resumes restore the OVERRIDDEN bound.
    const ceilingUsd =
      opts?.budgetUsd ?? resumeCtx?.budgetOverride?.budgetUsd ?? resumeCtx?.budgetUsd;
    // The exposure cap follows the SAME rule since RV1504, override
    // included: a run started without one stays uncapped until a host
    // explicitly caps it through the journaled override.
    const exposureCapUsd =
      opts?.maxInFlightExposureUsd ??
      resumeCtx?.budgetOverride?.maxInFlightExposureUsd ??
      resumeCtx?.maxInFlightExposureUsd;
    // The strict pricing gate follows the same recording rule (RV1508):
    // a fresh run canonicalizes RunOptions (true means the bare
    // object), a resumed run restores the RunMeta-recorded shape
    // verbatim.
    const strictPricing =
      opts?.strictPricing === undefined
        ? resumeCtx?.strictPricing
        : opts.strictPricing === true
          ? {}
          : opts.strictPricing === false
            ? undefined
            : {
                ...(opts.strictPricing.maxRatesAgeDays === undefined
                  ? {}
                  : { maxRatesAgeDays: opts.strictPricing.maxRatesAgeDays }),
                ...(opts.strictPricing.allowUnpriced === undefined
                  ? {}
                  : { allowUnpriced: [...opts.strictPricing.allowUnpriced] }),
              };
    // The config fingerprint follows the recording rule (RV3210): a
    // fresh run records the declared RunOptions value, a resumed run
    // writes back the RECORDED one verbatim (the compare against a
    // supplied fingerprint already happened in engine.resume, before
    // ownership), and absence stays absent.
    const configFingerprint = opts?.configFingerprint ?? resumeCtx?.configFingerprint;
    // The ceiling-override posture follows the recording rule (RV3902):
    // a fresh run takes the declared value, a resumed run restores the
    // RunMeta-recorded one (the refusal of an override under
    // 'immutable-lifetime' already happened in engine.resume, before
    // ownership), and absence means 'segment', today's behavior byte
    // for byte.
    const budgetPolicy = opts?.budgetPolicy ?? resumeCtx?.budgetPolicy;
    // The recorded scope travels back in verbatim (RV4007); genesis
    // declares it once, and there is no resume door.
    const executionScope = declaredScope ?? resumeCtx?.scope;
    // The declared normalization table travels with the identity it
    // shaped (RV4302): fresh runs record the declared table, resume
    // segments write back the RECORDED one verbatim (never a
    // re-supplied table; engine.resume already refused a conflict).
    // Without a scope there is no identity and nothing records.
    const scopeNormalize =
      executionScope === undefined
        ? undefined
        : resumeCtx !== undefined
          ? resumeCtx.scopeNormalize
          : opts?.scopePolicy?.normalize;
    const makeBudget = (): RunBudget =>
      new RunBudget({
        ...(ceilingUsd === undefined ? {} : { ceilingUsd }),
        ...(exposureCapUsd === undefined ? {} : { maxInFlightExposureUsd: exposureCapUsd }),
        ...(opts?.clampTurnToExposure === true ? { clampTurnToExposure: true as const } : {}),
        ...(strictPricing === undefined ? {} : { strictPricing, now: realNow }),
        lifetimeSpawnCap: options.budgetDefaults?.lifetimeSpawnCap ?? 500,
        events: { emit: (body) => bus.emit(body as WorkflowEventBody, rootSpanId) },
        priceUsd,
        pricingOf,
        ...(budgetSeed === undefined ? {} : { seed: budgetSeed }),
      });
    const invalidated = new Set(resumeCtx?.invalidate ?? []);
    const replayer = new Replayer({
      runId,
      store: journal,
      now: realNow,
      priceUsd,
      onWarn: (msg) => bus.emit({ type: 'log', level: 'warn', msg }, rootSpanId),
      keyRing: registryKeyRing(registry),
      ...(resumeCtx === undefined ? {} : { priorEntries: resumeCtx.priorEntries }),
      leaseOf: () => segmentLease.current,
      strict: resumeCtx?.strict ?? false,
    });
    for (const seqToInvalidate of invalidated) {
      replayer.invalidate(seqToInvalidate);
    }
    // A resume whose loaded journal already settled ok is a pure replay
    // of a finished run: unstamped limit children replay instead of
    // re-running live (the RV-210 cycle finding). Non-ok settles and
    // never-settled journals keep the rerun retry semantics.
    const runSettledOk =
      resumeCtx !== undefined && lastRunSettle(resumeCtx.priorEntries)?.runStatus === 'ok';
    replayer.setDisposition(
      dispositionHook(replayer.fold.abandonFold, registry, replayer.invalidatedSeqs, {
        runSettledOk,
      }),
    );
    // Alias-sourced candidates bypass the abandon overlay (DEF-5):
    // donor entries regain their pre-abandon status through links.
    replayer.setAliasDisposition(
      dispositionHook({ isAbandoned: () => false }, registry, replayer.invalidatedSeqs, {
        runSettledOk,
      }),
    );
    if (resumeCtx !== undefined) {
      const prior = replayer.ledger();
      // The seed's dollars are the SETTLED fold (RV801): the same
      // per-call billing basis and the same per-segment pricing pins
      // (RV505) as outcome.cost.totalUsd, so the spend a resume starts
      // from is exactly the figure the prior segment reported. Seeding
      // the aggregate-priced ledger here let a nonlinear long-context
      // tier re-price whole phase sums no single request produced: the
      // twelfth experiment's run would have resumed with 10.41 of a
      // 10.00 ceiling already "spent" (real settled spend 7.30) and
      // exhausted instantly, live. Usage sums and the spawn count are
      // basis-independent and stay the ledger's.
      const priorPinned = journalPricingSnapshot(replayer.snapshot());
      const priorPriceUsd =
        priorPinned === undefined
          ? (servedBy: ModelRef, usage: Usage): number | undefined => priceUsd(servedBy, usage)
          : priorPinned.composedPriceUsd((servedBy, usage) => priceUsd(servedBy, usage));
      budgetSeed = {
        usd: costReportFromJournal(replayer.snapshot(), priorPriceUsd).totalUsd,
        usage: prior.usage,
        agentsSpawned: prior.agentsSpawned,
        // The per-account rows of the SAME settled fold (RV1505): each
        // re-opened sub-account resumes from its journaled inclusive
        // spend, so admission and the per-turn guard hold the resumed
        // segment to the decisions a continuous run would have made.
        accounts: accountSpendFromJournal(replayer.snapshot(), priorPriceUsd),
      };
      // The override floor (RV2208): a ceiling below the settled spend
      // the seed restores would exhaust the segment before its first
      // turn, a fresh money death the host asked for by accident.
      // Refused typed here, before ownership, meta, or any append.
      const overrideCeilingUsd = resumeCtx.budgetOverride?.budgetUsd;
      if (overrideCeilingUsd !== undefined && budgetSeed.usd > overrideCeilingUsd) {
        throw new ConfigError(
          `ResumeOptions.run.budgetUsd ${String(overrideCeilingUsd)} is below the ` +
            `${budgetSeed.usd.toFixed(4)} USD the journal already records as settled spend; ` +
            'a ceiling below spent exhausts the resumed segment before its first turn. ' +
            'Pass a value at or above the recorded spend, or resume without the override',
        );
      }
    }
    const controller = new AbortController();
    let cancelReason: string | undefined;
    const requestCancel = (reason: string): void => {
      if (!controller.signal.aborted) {
        cancelReason = reason;
        controller.abort(reason);
      }
    };
    if (opts?.signal !== undefined) {
      if (opts.signal.aborted) {
        requestCancel('host signal aborted');
      } else {
        opts.signal.addEventListener('abort', () => requestCancel('host signal aborted'), {
          once: true,
        });
      }
    }
    let deadlineTimer: LongTimer | undefined;
    if (deadlineAtMs !== undefined) {
      // Sliced against the Node timer ceiling: a deadline weeks out used
      // to overflow setTimeout and cancel the run immediately (v1.34.0
      // review P2-2). The callback re-checks the wall clock, so firing a
      // slice is never taken as the deadline itself.
      deadlineTimer = setLongTimeout(
        () => requestCancel(`run deadline ${opts?.deadlineAt ?? ''} crossed`),
        deadlineAtMs,
        realNow,
      );
    }
    // The quiescence watchdog force (RV2003): fires only from
    // `beforeExit`, when the event loop is about to die with this run
    // still unsettled. The ordinary cancel path is the whole
    // mechanism: the abort reaches every signal-aware wait, the settle
    // machinery runs the RV1903 barrier, and the run reaches
    // run_settle plus a journaled terminal instead of vanishing.
    let watchdogSettle: () => void = () => undefined;
    const watchdogForced = new Promise<void>((resolve) => {
      watchdogSettle = resolve;
    });
    const quiescenceForce = (): void => {
      bus.emit(
        {
          type: 'log',
          level: 'error',
          msg:
            `quiescence watchdog: the event loop drained with run '${runId}' unsettled; ` +
            'forcing the run through the terminal barrier to a journaled terminal ' +
            '(no silent exit: every run reaches a journaled terminal)',
        },
        rootSpanId,
      );
      requestCancel('rulvar:quiescence-watchdog');
      // The abort reaches every ENGINE-owned wait, but a body stuck on
      // a bare non-signal-aware promise would still pin the settle
      // race; this third arm settles the race itself, so the finally
      // runs the RV1903 barrier and the run reaches run_settle plus a
      // terminal envelope no matter what the body is stuck on.
      watchdogSettle();
    };
    quiescenceWatchdogRegister(quiescenceForce);

    const budget = makeBudget();
    const admission = new AdmissionController({
      budget,
      ...(options.budgetDefaults?.maxDepth === undefined
        ? {}
        : { maxDepth: options.budgetDefaults.maxDepth }),
      ...(options.budgetDefaults?.childBudgetFraction === undefined
        ? {}
        : { childBudgetFraction: options.budgetDefaults.childBudgetFraction }),
      ...(options.budgetDefaults?.flatReserveUsd === undefined
        ? {}
        : { flatReserveUsd: options.budgetDefaults.flatReserveUsd }),
      // The lineage counter folds read the run journal (DEF-3); limits
      // ride budgetDefaults and are validated (XF-10 rename rejection).
      lineage: {
        journalView: () => replayer.snapshot(),
        ...(options.budgetDefaults?.lineage === undefined
          ? {}
          : { limits: options.budgetDefaults.lineage }),
      },
    });
    const external = new ExternalRegistry(replayer, (body) => bus.emit(body, rootSpanId), realNow);
    let transcriptCounter = 0;
    // The generation token (RunMeta.genesis): minted once at the fresh
    // start, carried verbatim by every resume segment. Distinguishes a
    // deleteRun and recreate of the same explicit runId from the same
    // run continuing, which journal length alone cannot (v1.25.0 scale
    // review: the queue worker's skip cache).
    const genesis = resumeCtx === undefined ? mintRunId() : resumeCtx.genesis;
    // The exec idempotency key derivation (RV403): a fresh run stamps
    // the current version; a resume derives EXACTLY what the run
    // started with (absence = version 1, the genesis-free derivation of
    // runs recorded before the field), so keys stay stable within one
    // incarnation across crash, resume, and engine upgrade, while a
    // recreated runId's version 2 keys never collide with the deleted
    // incarnation's in a long-lived external dedup store.
    const execKeyVersion =
      resumeCtx === undefined ? CURRENT_EXEC_KEY_DERIVATION : resumeCtx.execKeyDerivation;
    let execKey: ExecKeyDerivation | undefined;
    if (execKeyVersion === undefined || execKeyVersion === 1) {
      execKey = { version: 1 };
    } else if (execKeyVersion === 2 && typeof genesis === 'string') {
      execKey = { version: 2, genesis };
    }
    if (execKey === undefined && options.executors !== undefined) {
      // Fail closed BEFORE any store write or dispatch: deriving some
      // other version's key here would silently break the external
      // effect deduplication the run's provider already accumulated.
      throw new ConfigError(
        execKeyVersion === 2
          ? `resume: run '${runId}' records exec idempotency key derivation 2 but its meta ` +
              'carries no genesis token; the journal store violated the RunMeta round-trip ' +
              'contract (https://docs.rulvar.com/guide/store-authors)'
          : `resume: run '${runId}' records exec idempotency key derivation ` +
              `${String(execKeyVersion)}; this engine derives versions 1 and 2 only, so ` +
              "resuming it here would break the run's external effect deduplication; " +
              'resume with a rulvar release that supports the recorded derivation',
      );
    }
    const internals: RunInternals = {
      runId,
      replayer,
      budget,
      admission,
      liveAgentCalls: new Set(),
      semaphore: new Semaphore(options.concurrency?.perRun ?? DEFAULT_PER_RUN_CONCURRENCY),
      providerLimiter,
      ...(quotaRuntime === undefined ? {} : { quota: quotaRuntime }),
      ...(options.pricing === undefined ? {} : { pricingVersion: options.pricing.pricingVersion }),
      ...(options.budgetDefaults?.flatReserveUsd === undefined
        ? {}
        : { flatReserveUsd: options.budgetDefaults.flatReserveUsd }),
      ...(defaults.roleFloors === undefined ? {} : { floors: defaults.roleFloors }),
      ...(knowledge === undefined ? {} : { knowledge }),
      // The sink forwards the replayed marker: dropping it here silently
      // stripped `replayed: true` from every recovered/replayed emission
      // (replayed agent and tool lifecycle events rendered as live since
      // M2; found while unifying spawn events, v1.22.0 review P2-5).
      events: {
        emit: (body, spanId, replayed) =>
          bus.emit(body as WorkflowEventBody, spanId ?? rootSpanId, replayed),
      },
      spans,
      rootSpanId,
      transcripts,
      adapters,
      defaults: {
        ...(defaults.routing === undefined ? {} : { routing: defaults.routing }),
        ...(defaults.profiles === undefined ? {} : { profiles: defaults.profiles }),
        ...(defaults.limits === undefined && opts?.limits === undefined
          ? {}
          : { limits: { ...defaults.limits, ...opts?.limits } }),
        ...(defaults.permissions === undefined ? {} : { permissions: defaults.permissions }),
        ...(defaults.retry === undefined ? {} : { retry: defaults.retry }),
        ...(defaults.workflows === undefined ? {} : { workflows: defaults.workflows }),
        ...(defaults.schemas === undefined ? {} : { schemas: defaults.schemas }),
        ...(defaults.toolsets === undefined ? {} : { toolsets: defaults.toolsets }),
        ...(defaults.gates === undefined ? {} : { gates: defaults.gates }),
        ...(defaults.countTokens === undefined ? {} : { countTokens: defaults.countTokens }),
        ...(defaults.requireToolsetAttestation === undefined
          ? {}
          : { requireToolsetAttestation: defaults.requireToolsetAttestation }),
        ...(defaults.cache === undefined ? {} : { cache: defaults.cache }),
        ...(defaults.billingReceipts === undefined
          ? {}
          : { billingReceipts: defaults.billingReceipts }),
      },
      ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
      errorPolicy: wf.errorPolicy,
      dropped: [],
      cost: {
        byModel: new Map(),
        byPhase: new Map(),
        byAgentType: new Map(),
        byScope: new Map(),
        byRole: new Map(),
        unpriced: [],
        orchestrator: { spentUsd: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 },
      },
      priceUsd: (servedBy, usage) => priceUsd(servedBy, usage),
      pricingOf,
      runSignal: controller.signal,
      ...(defaults.isolation === undefined ? {} : { isolation: defaults.isolation }),
      ...(options.executors === undefined ? {} : { executors: options.executors }),
      ...(executionScope === undefined ? {} : { executionScope }),
      ...(execKey === undefined ? {} : { execKey }),
      ...(options.onEscalation === undefined ? {} : { onEscalation: options.onEscalation }),
      external,
      mintTranscriptRef: () => `${runId}/t${transcriptCounter++}`,
      now: realNow,
      // Read through the holder at every call site: an
      // engine-acquired lease exists only after the async ownership
      // boot, strictly before any consumer of this field runs.
      get lease() {
        return segmentLease.current;
      },
    };

    // The genesis args binding is immutable like B0: a fresh run records
    // presence and a canonical hash, every resume segment writes back
    // the RECORDED values verbatim (never ones derived from re-supplied
    // args), and absence stays absent so a legacy run never gains a
    // false marker (the v1.23.0 review: CLI resume args safety).
    const argsBinding: { argsProvided?: boolean; argsHash?: string } = {};
    if (resumeCtx === undefined) {
      argsBinding.argsProvided = args !== undefined;
      try {
        const argsHash = hashRunArgs(
          args,
          argsHashSalt === undefined ? undefined : { salt: argsHashSalt },
        );
        if (argsHash !== undefined) {
          argsBinding.argsHash = argsHash;
        }
      } catch {
        // Args JCS cannot serialize: the marker records presence, no hash.
      }
    } else {
      if (resumeCtx.argsProvided !== undefined) {
        argsBinding.argsProvided = resumeCtx.argsProvided;
      }
      if (resumeCtx.argsHash !== undefined) {
        argsBinding.argsHash = resumeCtx.argsHash;
      }
    }

    const putMeta = (status: RunStatus): Promise<void> =>
      resumeCtx?.strict === true
        ? // A dry-run preview leaves the store untouched: no status flip,
          // no segments bump, no meta rewrite of any kind (the journal
          // side is enforced at the Replayer's single append site).
          Promise.resolve()
        : journal.putMeta(
            {
              runId,
              status,
              // Every meta write of this segment carries the bumped count: the
              // settle write must not clobber what the start write recorded.
              segments: segmentsBefore + 1,
              updatedAt: new Date(realNow()).toISOString(),
              ...(opts?.name === undefined ? {} : { name: opts.name }),
              ...(opts?.tags === undefined ? {} : { tags: opts.tags }),
              ...(ceilingUsd === undefined ? {} : { budgetUsd: ceilingUsd }),
              ...(exposureCapUsd === undefined ? {} : { maxInFlightExposureUsd: exposureCapUsd }),
              ...(strictPricing === undefined ? {} : { strictPricing }),
              // Only the non-default posture is recorded (RV3902):
              // absence means 'segment', and a store that drops the
              // field degrades to the override door working again,
              // never to an invented refusal.
              ...(budgetPolicy === 'immutable-lifetime' ? { budgetPolicy } : {}),
              ...(configFingerprint === undefined ? {} : { configFingerprint }),
              ...(executionScope === undefined ? {} : { scope: executionScope }),
              ...(scopeNormalize === undefined ? {} : { scopeNormalize }),
              ...(argsBinding.argsProvided === undefined
                ? {}
                : { argsProvided: argsBinding.argsProvided }),
              ...(argsBinding.argsHash === undefined ? {} : { argsHash: argsBinding.argsHash }),
              ...(genesis === undefined ? {} : { genesis }),
              // The derivation stamp is carried verbatim like genesis:
              // a version this engine does not know is still preserved
              // (an executor-less resume is allowed to drive the run
              // without ever deriving a key).
              ...(execKeyVersion === undefined ? {} : { execKeyDerivation: execKeyVersion }),
              workflowName: wf.name,
              workflowHash:
                compiled === undefined
                  ? hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>)
                  : hashWorkflowSource(compiled.source),
              ...(compiled === undefined ? {} : { workflowSourceRef: workflowSourceRef(runId) }),
            },
            // The segment's lease rides every meta write like every
            // journal append, so a fencedWrites store refuses a
            // superseded segment's terminal settle instead of letting
            // it strand the run (fenced run state RFC, F1). The settle
            // caller swallows that rejection: a fenced stale settle is
            // exactly a no-op.
            segmentLease.current,
          );

    if (activeSegments.has(runId)) {
      throw new ConfigError(
        `run '${runId}' already has a live execution segment in this engine; await its ` +
          'settled result before starting another one (exactly one segment owns a run; ' +
          'https://docs.rulvar.com/guide/durability#resolving-a-settled-run)',
      );
    }
    activeSegments.add(runId);

    // The reject-path ownership teardown handle: assigned by the async
    // body below once its settleOwnership closure exists, called from
    // the outer settlement hook for rejections that never reach the
    // body's own release point.
    let ownershipTeardown: () => Promise<void> = () => Promise.resolve();

    const result: Promise<RunOutcome<R>> = (async () => {
      // The genesis ownership boot (P0.2): over a leasable journal
      // store a segment that was NOT handed a lease acquires its own
      // BEFORE its first durable mutation, renews it at ttl/3 exactly
      // like a queue worker, and releases it at settle. A second
      // driver (a worker sweep adopting a live fresh run, a double
      // resume from another process, a simultaneous genesis of one
      // explicit runId) then rejects typed at its OWN boot with ZERO
      // writes and ZERO provider dispatches, instead of re-dispatching
      // an in-flight turn and racing the journal from a stale tail. A
      // dry-run preview performs zero store mutations and must stay
      // runnable while another owner drives the run, so it never
      // acquires; a caller-supplied lease keeps its caller-owned
      // lifecycle (queue mode is unchanged).
      let ownedLease: Lease | undefined;
      let renewTimer: ReturnType<typeof setInterval> | undefined;
      const settleOwnership = async (): Promise<void> => {
        if (renewTimer !== undefined) {
          clearInterval(renewTimer);
          renewTimer = undefined;
        }
        const held = ownedLease;
        ownedLease = undefined;
        if (held !== undefined) {
          segmentLease.current = undefined;
          try {
            await (journal as LeasableStore).release(held);
          } catch {
            // A lost lease is already released for us (reclaimed after
            // the ttl); fencing made this segment's writes reject
            // either way.
          }
        }
      };
      ownershipTeardown = settleOwnership;
      if (
        ownership === 'auto' &&
        segmentLease.current === undefined &&
        resumeCtx?.strict !== true &&
        leaseCapable(journal)
      ) {
        let acquired: Lease;
        try {
          acquired = await journal.acquire(runId, engineOwner);
        } catch (thrown) {
          // Another owner holds the run: surface the typed rejection
          // through handle.result and close the segment's surfaces so
          // event consumers terminate. Nothing was written.
          if (deadlineTimer !== undefined) {
            deadlineTimer.cancel();
          }
          external.close();
          bus.end();
          throw thrown;
        }
        ownedLease = acquired;
        segmentLease.current = acquired;
        renewTimer = setInterval(() => {
          journal.renew(acquired).catch(() => {
            // The lease is lost (paused process, reclaim after the
            // ttl): every further write already rejects by fencing;
            // cancel to unwind the loop promptly instead of burning
            // live calls (the worker convention).
            bus.emit(
              {
                type: 'log',
                level: 'warn',
                msg: `run '${runId}' ownership lost: the lease could not be renewed and its fencing epoch may be superseded`,
              },
              rootSpanId,
            );
            requestCancel('run ownership lost: lease fencing epoch superseded');
            if (renewTimer !== undefined) {
              clearInterval(renewTimer);
              renewTimer = undefined;
            }
          });
        }, ownershipRenewMs);
      }
      let status: RunOutcome<R>['status'] = 'ok';
      let value: R | undefined;
      let wireError: WireError | undefined;
      let pending: PendingExternal[] = [];
      /** The settle-barrier flush verdict (RV3201); set in the finally below. */
      let journalIntegrityFailure: JournalIntegrityError | undefined;
      if (compiled !== undefined && resumeCtx?.strict !== true) {
        // The binding contract: the compiled source and
        // its content hash persist AT START so planned runs are
        // resumable by construction; resume rehydrates from this blob.
        // A dry-run preview skips the (byte-identical) re-put: a preview
        // performs zero store mutations.
        await transcripts.put(
          workflowSourceRef(runId),
          new TextEncoder().encode(compiled.source),
          segmentLease.current,
        );
      }
      // The override decision (RV2208): journal first, meta mirror
      // second, so the posture flip putMeta records is never ahead of
      // the journaled authority that explains it. Keyed by segment, so
      // a later segment's own override appends beside this one instead
      // of colliding with it. A dry-run preview appends nothing,
      // exactly like putMeta.
      if (resumeCtx?.budgetOverride !== undefined && resumeCtx.strict !== true) {
        const override = resumeCtx.budgetOverride;
        await replayer.appendSinglePhase({
          scope: '',
          key: deriverV2.deriveKey({
            kind: 'run-budget-override',
            segment: segmentsBefore + 1,
          }),
          kind: 'decision',
          status: 'ok',
          spanId: rootSpanId,
          site: 'run-budget-override',
          value: {
            decisionType: 'run_budget_override',
            source: 'resume-options',
            segment: segmentsBefore + 1,
            // Json has no undefined, and 'was uncapped' is a fact the
            // audit needs: null records it.
            ...(override.budgetUsd === undefined
              ? {}
              : {
                  budgetUsd: {
                    recorded: resumeCtx.budgetUsd ?? null,
                    applied: override.budgetUsd,
                  },
                }),
            ...(override.maxInFlightExposureUsd === undefined
              ? {}
              : {
                  maxInFlightExposureUsd: {
                    recorded: resumeCtx.maxInFlightExposureUsd ?? null,
                    applied: override.maxInFlightExposureUsd,
                  },
                }),
            ...(budgetSeed === undefined ? {} : { settledSpendUsd: budgetSeed.usd }),
          },
        });
      }
      // The scope's journal voice (RV4007): one genesis decision, so a
      // pure fold (the invoice header) reads the identity from the
      // entries alone, meta stores aside. Resume segments append
      // nothing: the recorded identity never changes.
      if (executionScope !== undefined && resumeCtx === undefined) {
        await replayer.appendSinglePhase({
          scope: '',
          key: deriverV2.deriveKey({ kind: 'execution-scope' }),
          kind: 'decision',
          status: 'ok',
          spanId: rootSpanId,
          site: 'execution-scope',
          value: {
            decisionType: 'execution_scope',
            scope: executionScope as unknown as Json,
            // The canonical digest (RV4205): a fixed-length identity
            // for external joins, derived from the same normalized
            // bytes the assertion machinery compares.
            scopeDigest: executionScopeDigest(executionScope),
            // The value normalization table (RV4302), journaled beside
            // the identity it produced: the journal is the authority a
            // resume reads the table from, and an audit reads WHY the
            // recorded values are canonical. Absent when undeclared,
            // byte for byte the RV4205 decision.
            ...(scopeNormalize === undefined
              ? {}
              : { normalize: scopeNormalize as unknown as Json }),
          },
        });
      }
      // The acknowledged unknown-outcome wires (RV4006): journaled by
      // the segment that waved them through, the override decision's
      // pattern, so an audit reads WHO resumed past open intents and
      // when instead of inferring it from a segment boundary.
      if (
        resumeCtx?.acknowledgedOpenWireIntents !== undefined &&
        resumeCtx.acknowledgedOpenWireIntents > 0 &&
        resumeCtx.strict !== true
      ) {
        await replayer.appendSinglePhase({
          scope: '',
          key: deriverV2.deriveKey({
            kind: 'open-wire-intents-acknowledged',
            segment: segmentsBefore + 1,
          }),
          kind: 'decision',
          status: 'ok',
          spanId: rootSpanId,
          site: 'resume-acknowledgment',
          value: {
            decisionType: 'open_wire_intents_acknowledged',
            segment: segmentsBefore + 1,
            count: resumeCtx.acknowledgedOpenWireIntents,
          },
        });
      }
      await putMeta('running');
      bus.emit(
        { type: 'run:start', workflow: wf.name, resumed: resumeCtx !== undefined },
        rootSpanId,
      );
      if (resumeCtx !== undefined) {
        for (const open of replayer.fold.openSuspensions()) {
          const payload = open.value as { key?: string; prompt?: string } | undefined;
          bus.emit(
            {
              type: 'external:waiting',
              key: payload?.key ?? '',
              entryRef: open.seq,
              ...(payload?.prompt === undefined ? {} : { prompt: payload.prompt }),
            },
            rootSpanId,
            true,
          );
        }
      }
      const quiesced = new Promise<PendingExternal[]>((resolve) => {
        external.onQuiesce(resolve);
      });
      try {
        if (compiled === undefined && wf.kind === 'workflow' && wf.argsSchema !== undefined) {
          const validation = await validateSchemaSpec(wf.argsSchema, args);
          if (!validation.valid) {
            throw new ConfigError(
              `arguments for workflow '${wf.name}' do not validate: ` +
                validation.issues.map((issue) => issue.message).join('; '),
            );
          }
        }
        // The root workflow's defaults become resolution-chain layer 3.
        // A CompiledWorkflow declares none (the sandbox dialect has no
        // routing surface), so a planned run contributes no layer.
        const ctx = createCtx(internals, wf.kind === 'workflow' ? wf : undefined);
        const selectedRunner =
          compiled === undefined ? runner : (options.runners?.sandbox as ScriptRunner);
        // Bare-nondeterminism detection wraps the IN-PROCESS execution
        // only (RV-209): a compiled workflow runs in the worker sandbox,
        // whose dialect is statically scanned at compile time and whose
        // thread an AsyncLocalStorage context cannot reach anyway.
        const bodyPromise =
          compiled === undefined
            ? withDeterminismDetection(
                options.determinism,
                (event) => bus.emit(event, rootSpanId),
                () => selectedRunner.execute(wf, ctx, args),
              )
            : selectedRunner.execute(wf, ctx, args);
        // Every in-flight branch blocked on suspensions settles the run
        // 'suspended' with the open keys. The watchdog arm (RV2003)
        // settles the race when `beforeExit` found the run unsettled:
        // the cancel already aborted every engine-owned wait, and this
        // arm covers a body stuck on a bare promise no signal reaches,
        // so the settle below runs unconditionally.
        const raced = await Promise.race([
          bodyPromise.then((result) => ({ kind: 'done' as const, result })),
          quiesced.then((open) => ({ kind: 'suspended' as const, open })),
          watchdogForced.then(() => ({ kind: 'watchdog-forced' as const })),
        ]);
        if (raced.kind === 'watchdog-forced') {
          // The forced settle is a cancellation with the watchdog's
          // reason: value-less, never 'suspended' (nothing quiesced),
          // and the body promise is orphaned deliberately, exactly
          // like the suspended arm orphans it.
          bodyPromise.catch(() => undefined);
        }
        if (raced.kind === 'suspended') {
          bodyPromise.catch(() => undefined);
          // Settling closes this execution segment permanently: parked
          // branches never run again, a later resolveExternal appends
          // through the fold without waking them, and exactly one
          // engine.resume owns the continuation (suspension ownership
          // rule; v1.10 deep E2E review).
          external.close();
          status = 'suspended';
          // A resolution that won in the quiesce-to-close window is
          // durable but no longer pending.
          pending = raced.open.filter(
            (item) => replayer.suspensionState(item.entryRef).state === 'suspended',
          );
          for (const item of pending) {
            bus.emit(
              {
                type: 'external:waiting',
                key: item.key,
                entryRef: item.entryRef,
                ...(item.prompt === undefined ? {} : { prompt: item.prompt }),
              },
              rootSpanId,
            );
          }
        } else if (raced.kind === 'done') {
          value = raced.result;
        }
        if (status !== 'suspended' && budget.exhausted) {
          // The workflow-returned value SURVIVES exhaustion: the DEF-7
          // finalize fallback synthesizes a partial result and exhaustion
          // is never null.
          status = 'exhausted';
        } else if (status !== 'suspended' && controller.signal.aborted) {
          status = 'cancelled';
          wireError = {
            code: 'error',
            message: cancelReason ?? 'run cancelled',
            retryable: false,
          };
          value = undefined;
        }
      } catch (thrown) {
        value = undefined;
        if (thrown instanceof BudgetExhaustedError || budget.exhausted) {
          // Exhausted overrides error.
          status = 'exhausted';
          wireError =
            thrown instanceof AgentCallError
              ? // An in-loop budget failure surfaces as AgentCallError
                // (which is NOT a RulvarError): the exhausted outcome
                // keeps the typed failure and its diagnostics exactly
                // like the error branch below, instead of dropping the
                // wire (v1.11 follow-up review, requirement 5).
                agentResultWire(thrown.result, thrown.message)
              : thrown instanceof RulvarError
                ? thrown.toWire()
                : undefined;
        } else if (controller.signal.aborted) {
          status = 'cancelled';
          wireError = {
            code: 'error',
            message: cancelReason ?? 'run cancelled',
            retryable: false,
          };
        } else {
          status = 'error';
          wireError =
            thrown instanceof AgentCallError
              ? // Carries the engine-decided abort class (abortClass in
                // data) past the run settle, so consumers of the run
                // outcome keep the typed failure, not just its message.
                agentResultWire(thrown.result, thrown.message)
              : thrown instanceof RulvarError
                ? thrown.toWire()
                : {
                    code: 'error',
                    message: thrown instanceof Error ? thrown.message : String(thrown),
                    retryable: false,
                  };
        }
      } finally {
        if (deadlineTimer !== undefined) {
          deadlineTimer.cancel();
        }
        // The settle drain (RV1904): a workflow body that returned (or
        // threw) over un-awaited ctx.agent calls must not strand
        // children writing journal entries past run_settle, the
        // four-role benchmark's recovery shape. The status and value
        // above are already fixed; the drain aborts the stragglers
        // through the run signal and awaits their journaled terminals,
        // so the fold below reads a roster that can no longer move.
        // Suspended runs skip it: quiescence means every branch is
        // parked on an external, with no live dispatch to drain.
        if (status !== 'suspended' && internals.liveAgentCalls.size > 0) {
          if (!controller.signal.aborted) {
            controller.abort('rulvar:settle-drain');
          }
          await Promise.allSettled([...internals.liveAgentCalls]);
        }
        // Every settle closes the segment (idempotent): waiters a body
        // raced away from must never wake after the outcome is out.
        external.close();
        // The settle barrier reads the flush verdict (RV3201): a lost
        // append latched in the Replayer surfaces exactly here, where
        // the outcome is still mutable. Non-integrity rejections cannot
        // occur (flush awaits the swallowed chain and rethrows only the
        // latch), so the capture is total.
        await replayer.flush().catch((thrown: unknown) => {
          journalIntegrityFailure =
            thrown instanceof JournalIntegrityError
              ? thrown
              : new JournalIntegrityError(
                  `journal flush failed at settle for run '${internals.runId}': ` +
                    (thrown instanceof Error ? thrown.message : String(thrown)),
                  { cause: thrown },
                );
        });
      }
      if (journalIntegrityFailure !== undefined) {
        // A lost append converts a would-be ok (or suspended) outcome
        // into an error terminal (RV3201): an ok settle over a journal
        // missing a deterministic record would replay differently than
        // this segment executed, and a suspension would park waiters on
        // the same torn truth. Already-failing statuses keep their own
        // error (the loss is logged loudly either way), and the
        // run_settle append below records the converted status through
        // the still-working queue when the store recovered.
        bus.emit(
          {
            type: 'log',
            level: 'error',
            msg: journalIntegrityFailure.message,
            data: { code: journalIntegrityFailure.code },
          },
          rootSpanId,
        );
        if (status === 'ok' || status === 'suspended') {
          status = 'error';
          value = undefined;
          pending = [];
          wireError = journalIntegrityFailure.toWire();
        }
      }
      // The COMPLETE report is the journal fold at settle, not the live
      // buckets: the journal is the truth cost reconciles against, and
      // a replay-only resume reproduces every breakdown byte for byte
      // because it folds the same entries (v1.6.0 follow-up review).
      // The ledger supplies the usage sums; the dollars every public
      // surface carries are the SETTLED fold below (RV801): run:end
      // spreads outcome.cost.totalUsd itself, so the event and the
      // outcome cannot disagree, under any pricing table.
      const ledger = replayer.ledger();
      // Historical segments fold under the pin of THEIR settle (RV505):
      // a resume across a price-table rotation reports history at the
      // rates its own debits used; the segment being settled now (no
      // pin covers it yet) prices at the live table, exactly like its
      // debits. Single-table runs are untouched: pins equal the table.
      // The composition itself is the snapshot's exported method
      // (RV611): the CLI cost and invoice views and the server cost
      // endpoint call the same method over the same journal, so a
      // stored fold and this mirror can never disagree by construction.
      const pinned = journalPricingSnapshot(replayer.snapshot());
      const mirrorPriceUsd =
        pinned === undefined
          ? (servedBy: ModelRef, usage: Usage): number | undefined => priceUsd(servedBy, usage)
          : pinned.composedPriceUsd((servedBy, usage) => priceUsd(servedBy, usage));
      // Assembled in two steps (RV1105): the facts here, the terminal
      // envelope after the settlement verdict below names whether
      // anything durable records them; the public RunOutcome then
      // carries both, constructed once right before run:end.
      const outcomeFacts: Omit<RunOutcome<R>, 'envelope'> = {
        status,
        dropped: internals.dropped,
        pending,
        usage: ledger.usage,
        cost: costReportFromJournal(replayer.snapshot(), mirrorPriceUsd),
      };
      if (value !== undefined && (status === 'ok' || status === 'exhausted')) {
        // Exhaustion is never null when a value exists: the DEF-7
        // finalize fallback synthesizes the partial.
        outcomeFacts.value = value;
      }
      if (wireError !== undefined) {
        outcomeFacts.error = wireError;
      }
      // The semantic completion lift (RV-207 tail): an ok/exhausted run
      // reports through its result envelope, a typed failure through its
      // error data (the orchestrator acceptance rejection). Mirrored
      // onto the outcome itself (the 1.65.0 experiment review, P0.5) so
      // handle.result is self-sufficient: ONE contract on both paths
      // instead of a workflow-shaped value parse on ok and an error-data
      // dig on rejection. run:end below spreads the SAME object, so the
      // outcome and the event can never disagree. Replay re-executes the
      // workflow and recomputes the same value, so the lifted fields are
      // identical live and replayed.
      let lifted = liftRunCompletion(
        status === 'ok' || status === 'exhausted'
          ? outcomeFacts.value
          : status === 'error'
            ? wireError?.data
            : undefined,
      );
      // The exhausted fallback (RV2203): an exhausted run whose partial
      // value carries no envelope still reports through its enriched
      // error data. The seventh subscription parity resume settled
      // exhausted on a spawn-cap refusal AFTER its acceptance verdict
      // recorded accepted/complete with four ok children, and the
      // terminal read completion null with children null: the error
      // carried the truth and the lift never looked.
      if (lifted === undefined && status === 'exhausted') {
        lifted = liftRunCompletion(wireError?.data);
      }
      // The pre-acceptance roster (RV2602), lifted on its own because
      // it exists for the terminal where the completion lift finds
      // nothing to lift. Read from the same two sources in the same
      // order, so a run that died mid-roster still names the work it
      // paid for.
      const childrenAtFailure =
        liftChildrenAtFailure(
          status === 'ok' || status === 'exhausted' ? outcomeFacts.value : wireError?.data,
        ) ?? liftChildrenAtFailure(wireError?.data);
      if (childrenAtFailure !== undefined) {
        outcomeFacts.childrenAtFailure = childrenAtFailure;
      }
      if (lifted !== undefined) {
        outcomeFacts.completion = lifted.completion;
        if (lifted.childStatusCounts !== undefined) {
          outcomeFacts.childStatusCounts = lifted.childStatusCounts;
        }
        if (lifted.degradedReasons !== undefined) {
          outcomeFacts.degradedReasons = lifted.degradedReasons;
        }
        if (lifted.salvagedPartialChildren !== undefined) {
          outcomeFacts.salvagedPartialChildren = lifted.salvagedPartialChildren;
        }
        if (lifted.salvagedTerminalOutputChildren !== undefined) {
          outcomeFacts.salvagedTerminalOutputChildren = lifted.salvagedTerminalOutputChildren;
        }
        if (lifted.belowFloorOkChildren !== undefined) {
          outcomeFacts.belowFloorOkChildren = lifted.belowFloorOkChildren;
        }
        if (lifted.acceptanceChildren !== undefined) {
          outcomeFacts.acceptanceChildren = lifted.acceptanceChildren;
        }
        if (lifted.semanticPasses !== undefined) {
          outcomeFacts.semanticPasses = lifted.semanticPasses;
        }
        // claimConsistencyMeta, citationAuditMeta and the semantic
        // verdict apply through liftSemanticFacts below (RV4403).
        if (lifted.claimContradictions !== undefined) {
          outcomeFacts.claimContradictions = lifted.claimContradictions;
        }
        if (lifted.synthesisSkipped !== undefined) {
          outcomeFacts.synthesisSkipped = lifted.synthesisSkipped;
        }
        if (lifted.deliverableAccepted !== undefined) {
          outcomeFacts.deliverableAccepted = lifted.deliverableAccepted;
        }
        if (lifted.resultAvailable !== undefined) {
          outcomeFacts.resultAvailable = lifted.resultAvailable;
        }
        if (lifted.acceptedArtifactRef !== undefined) {
          outcomeFacts.acceptedArtifactRef = lifted.acceptedArtifactRef;
        }
        if (lifted.rejectedFinishCandidates !== undefined) {
          outcomeFacts.rejectedFinishCandidates = lifted.rejectedFinishCandidates;
        }
      }
      // The semantic facts settle on EVERY path (RV4403): the
      // completion lift above requires a completion literal, so a
      // failing run without one dropped every semantic fact from the
      // outcome, the settle, and the restart read, exactly the
      // seventh comparison run's shape. Field-level lift from the
      // same two sources in the same order; it fills only what the
      // completion lift left absent, so the two can never disagree.
      const semanticFacts = liftSemanticFacts(
        status === 'ok' || status === 'exhausted' ? outcomeFacts.value : undefined,
        wireError?.data,
      );
      if (semanticFacts !== undefined) {
        if (
          outcomeFacts.claimConsistencyMeta === undefined &&
          semanticFacts.claimConsistencyMeta !== undefined
        ) {
          outcomeFacts.claimConsistencyMeta = semanticFacts.claimConsistencyMeta;
        }
        if (
          outcomeFacts.citationAuditMeta === undefined &&
          semanticFacts.citationAuditMeta !== undefined
        ) {
          outcomeFacts.citationAuditMeta = semanticFacts.citationAuditMeta;
        }
        if (
          outcomeFacts.semanticTerminalVerdict === undefined &&
          semanticFacts.semanticTerminalVerdict !== undefined
        ) {
          outcomeFacts.semanticTerminalVerdict = semanticFacts.semanticTerminalVerdict;
        }
      }
      // The journaled settle (fenced run state RFC, phase 3): the run's
      // outcome becomes part of the journal, making RunMeta a
      // rebuildable projection (stores/reconcile.ts is the auditor).
      // Appended only when this segment did durable work or the derived
      // status differs from the last journaled settle: a pure-replay
      // resume of an already settled run appends nothing, so replay
      // stays byte stable and empty-journal runs stay empty. Ordered
      // BEFORE the meta write: a crash between the two leaves the
      // repairable 'meta-behind' residue, never a journal behind its
      // projection. Failure posture (the settlement acknowledgement):
      // a fenced store's LeaseHeldError on the SETTLE APPEND means a
      // successor segment holds the lease and owns settlement, the
      // fencing contract working, and nothing durable records THIS
      // segment's outcome: the meta write is skipped, run:end refuses
      // green with the distinct superseded reason, and handle.result
      // rejects with the typed SupersededError instead of resolving
      // (RV1009; a superseded segment used to resolve ok silently). A
      // meta-only lease bounce stays swallowed: it only happens over a
      // settle the journal already records (a pure replay of a settled
      // run, or a lease lost between the two writes), so the outcome IS
      // durable and only the projection belongs to the current holder.
      // Any OTHER failure rejects handle.result with the typed
      // SettlementError below instead of resolving: the caller must
      // never act on an outcome nothing durable records. A failed
      // settle append also SKIPS the meta write; proceeding would
      // fabricate a journal behind its projection, the one residue
      // reconcile treats as impossible.
      let settlementFailure: { stage: 'run-settle' | 'meta'; cause: unknown } | undefined;
      let supersededBy: LeaseHeldError | undefined;
      if (resumeCtx?.strict !== true) {
        const priorCount = resumeCtx?.priorEntries.length ?? 0;
        const snapshotLength = replayer.snapshot().length;
        const appendedHere = snapshotLength - priorCount;
        const recorded = lastRunSettle(replayer.snapshot());
        // The third arm heals a run whose earlier segment FAILED its
        // settle append (the acknowledgement below rejected it): the
        // journal holds work but no settle, and a pure replay appends
        // nothing, so without this arm the run could never be settled
        // by resume. Truly empty journals still append nothing.
        if (
          appendedHere > 0 ||
          (recorded !== undefined && recorded.runStatus !== status) ||
          (recorded === undefined && snapshotLength > 0)
        ) {
          // The output digest rides the settle it belongs to (RV-209):
          // recorded only by a segment that COMPUTED the value (pure
          // replays append no settle, so a divergent replayed result can
          // never overwrite the live baseline), absent when the result
          // is undefined or not JCS-serializable.
          const outputHash = hashRunOutput(outcomeFacts.value);
          // The applied-pricing pin (RV407): the settle records the
          // resolved row of every model the journal used plus the table
          // version, so a later invoice fold can reproduce THESE numbers
          // after the live table changes. Additive in the existing value
          // (the outputHash precedent), and gated on the CONFIGURED
          // table: caps-fallback pricing arrives ambiently from
          // adapters, and a setting the user never enabled must not
          // change the journal (the byte doctrine; the plan cassettes
          // pin exactly that). Under the opt-in, table-missing models
          // that resolved through caps are part of the applied set.
          const appliedPricing =
            options.pricing === undefined
              ? undefined
              : snapshotJournalPricing(replayer.snapshot(), pricingOf);
          try {
            await replayer.appendSinglePhase({
              scope: '',
              key: deriverV2.deriveKey({ kind: 'run-settle' }),
              kind: 'decision',
              status: 'ok',
              spanId: rootSpanId,
              site: 'run-settle',
              value: {
                decisionType: RUN_SETTLE_DECISION_TYPE,
                runStatus: status,
                segment: segmentsBefore + 1,
                ...(outputHash === undefined ? {} : { outputHash }),
                // The semantic completion lift rides the settle it
                // belongs to (the persisted-terminal tail): the digest
                // above proves WHICH value settled, these fields
                // record what the workflow CLAIMED about it, so an
                // offline reader recovers the completion the live
                // consumer saw. Additive, the outputHash precedent;
                // pure replays append no settle, so a replayed lift
                // never overwrites the live baseline.
                ...(semanticFacts === undefined ? {} : semanticFacts),
                ...(lifted === undefined ? {} : lifted),
                ...(appliedPricing === undefined || options.pricing === undefined
                  ? {}
                  : {
                      pricing: appliedPricing as unknown as Json,
                      pricingVersion: options.pricing.pricingVersion,
                    }),
              },
            });
          } catch (settleErr) {
            if (settleErr instanceof LeaseHeldError) {
              supersededBy = settleErr;
            } else {
              settlementFailure = { stage: 'run-settle', cause: settleErr };
            }
          }
        }
      }
      if (settlementFailure === undefined && supersededBy === undefined) {
        // The journal seal (RV1904): the settle decision is durable, so
        // from here every journal append rejects typed instead of
        // silently splitting the settled fold, the four-role
        // benchmark's exact post-settle mutation. The drain above
        // guarantees nothing legitimate is still writing.
        replayer.seal();
        try {
          await putMeta(status);
        } catch (metaErr) {
          if (!(metaErr instanceof LeaseHeldError)) {
            settlementFailure = { stage: 'meta', cause: metaErr };
          }
        }
      }
      if (settlementFailure !== undefined) {
        // The stream stays honest before it closes: run:end below still
        // reports the COMPUTED status (true as computation), this line
        // says persistence did not keep up.
        bus.emit(
          {
            type: 'log',
            level: 'warn',
            msg:
              `settlement write failed (${settlementFailure.stage}); handle.result rejects ` +
              `with SettlementError; resume re-settles by replay without a provider call`,
          },
          rootSpanId,
        );
      } else if (supersededBy !== undefined) {
        bus.emit(
          {
            type: 'log',
            level: 'warn',
            msg:
              'run segment superseded: the settle append bounced off the store fence and a ' +
              'successor owns settlement; handle.result rejects with SupersededError',
          },
          rootSpanId,
        );
      }
      // The ONE envelope assembly (RV1105): the settlement verdict is
      // known, so every terminal fact lands in one shape that the
      // resolved outcome and run:end share verbatim; the surfaces
      // cannot disagree by construction.
      const envelope = terminalEnvelopeOf({
        runId,
        workflow: wf.name,
        outcome: outcomeFacts,
        agentsSpawned: budget.spent().agentsSpawned,
        // The declared config identity rides the terminal (RV3304), so
        // the decision surface binds the verdict to the configuration
        // without a second read of the run record.
        ...(configFingerprint === undefined ? {} : { configFingerprint }),
        ...(settlementFailure !== undefined
          ? { settlement: {} }
          : supersededBy !== undefined
            ? { settlement: { settledReason: 'superseded' as const } }
            : {}),
      });
      const outcome: RunOutcome<R> = { ...outcomeFacts, envelope };
      // run:end spreads the SAME lift computed at outcome construction
      // above, so telemetry and handle.result can never disagree. A
      // failed settlement stamps `settled: false` (RV907), a superseded
      // segment stamps it with the distinct reason (RV1009): the event
      // stream must never show a green terminal that exists in no
      // durable record, and the ordinary path keeps its exact bytes.
      bus.emit(
        {
          type: 'run:end',
          status,
          totalUsd: outcome.cost.totalUsd,
          ...(outcome.cost.usageApprox === true ? { usageApprox: true } : {}),
          ...(semanticFacts === undefined ? {} : semanticFacts),
          ...(lifted === undefined ? {} : lifted),
          // The same object the outcome carries (RV2602), so the event
          // and handle.result can never disagree about the roster.
          ...(childrenAtFailure === undefined ? {} : { childrenAtFailure }),
          ...(settlementFailure !== undefined
            ? { settled: false as const }
            : supersededBy !== undefined
              ? { settled: false as const, settledReason: 'superseded' as const }
              : {}),
          envelope,
        },
        rootSpanId,
      );
      bus.end();
      resumeCtx?.previewResolve({
        ...replayer.resumeReport(),
        invalidResolutions: replayer.fold.invalidResolutions(),
      });
      // The ownership release happens strictly AFTER the segment's last
      // durable write (the settle meta above) and strictly BEFORE
      // handle.result resolves, so an await-settle-then-resume caller
      // never collides with its own just-released lease.
      await settleOwnership();
      if (supersededBy !== undefined) {
        throw new SupersededError(
          `run '${runId}' computed status '${status}' but its settle append bounced off the ` +
            `store's fence: a successor segment holds the lease and owns settlement ` +
            `(${supersededBy.message}). Nothing durable records this segment's outcome, so it ` +
            `is withheld; read the run's authoritative outcome from the successor's settle or ` +
            `the store's run meta`,
          { runId, runStatus: status, cause: supersededBy },
        );
      }
      // The watchdog covers the run for exactly the span in which it
      // has no journaled terminal: released here, strictly before
      // handle.result resolves (the detached finally below backstops
      // the throw paths), so a settled run is never re-cancelled by a
      // later beforeExit.
      quiescenceWatchdogUnregister(quiescenceForce);
      if (settlementFailure !== undefined) {
        const causeText =
          settlementFailure.cause instanceof Error
            ? settlementFailure.cause.message
            : String(settlementFailure.cause);
        throw new SettlementError(
          `run '${runId}' computed status '${status}' but the ` +
            (settlementFailure.stage === 'run-settle'
              ? 'run_settle journal append failed'
              : 'terminal RunMeta write failed') +
            `: ${causeText}; nothing durable records the settlement, so the outcome is ` +
            `withheld. The journal keeps every entry the run appended: resume the run to ` +
            `re-settle by replay (no provider call is paid), or reconcile the store with ` +
            `'rulvar runs audit'`,
          {
            stage: settlementFailure.stage,
            runId,
            runStatus: status,
            cause: settlementFailure.cause,
          },
        );
      }
      return outcome;
    })();

    // The outcome is delivered through handle.result; an unobserved copy
    // must not crash the process. Segment ownership releases on ANY
    // settlement, including rejects that never reach the run try block
    // (there the engine-acquired lease, if any, releases detached; the
    // store ttl is the backstop if even that release cannot land).
    void result
      .catch(() => undefined)
      .finally(() => {
        // Strictly after settlement: the watchdog covers the run for
        // exactly the span in which it has no journaled terminal.
        quiescenceWatchdogUnregister(quiescenceForce);
        void ownershipTeardown();
        activeSegments.delete(runId);
      });

    return {
      runId,
      result,
      events: bus.iterate(),
      on: (type, cb) => bus.on(type, cb),
      resolveExternal: (key, value) => external.resolveExternal(key, value),
      revokeApproval: (key, options) => external.revokeApproval(key, options),
      cancel: async (reason?: string) => {
        requestCancel(reason ?? 'cancelled by host');
        await result.then(
          () => undefined,
          () => undefined,
        );
      },
    };
  }

  function resume<A, R>(
    runId: string,
    wf?: Workflow<A, R> | CompiledWorkflow,
    resumeOptions?: ResumeOptions,
  ): ResumeHandle<R> {
    let previewResolve: (preview: ResumePreview) => void = () => undefined;
    const preview = new Promise<ResumePreview>((resolve) => {
      previewResolve = resolve;
    });
    const handlePromise = (async () => {
      // The override values are validated first, before any store read
      // (RV2208), exactly like their RunOptions counterparts.
      if (resumeOptions?.run?.budgetUsd !== undefined) {
        requireNonNegativeNumber(resumeOptions.run.budgetUsd, 'ResumeOptions.run.budgetUsd');
      }
      if (resumeOptions?.run?.maxInFlightExposureUsd !== undefined) {
        requireNonNegativeNumber(
          resumeOptions.run.maxInFlightExposureUsd,
          'ResumeOptions.run.maxInFlightExposureUsd',
        );
      }
      if (
        resumeOptions?.bodyHash !== undefined &&
        resumeOptions.bodyHash !== 'warn' &&
        resumeOptions.bodyHash !== 'refuse'
      ) {
        throw new ConfigError(
          `ResumeOptions.bodyHash must be 'warn' or 'refuse'; got ` +
            JSON.stringify(resumeOptions.bodyHash),
        );
      }
      // Exact lookup through the optional store capability; stores
      // without it fall back to the historical full listRuns scan.
      const meta = await readRunMeta(journal, runId);
      // Bare resume of an in-process run resolves by the recorded name
      // from defaults.workflows (M8 entry amendment: the
      // queue worker resolves workflows through the engine's registry,
      // never through a parameter of its own). The persisted compiled
      // source keeps precedence below.
      let supplied = wf as Workflow<unknown, unknown> | CompiledWorkflow | undefined;
      if (supplied === undefined && meta?.workflowSourceRef === undefined) {
        const name = meta?.workflowName;
        const registered = name === undefined ? undefined : defaults.workflows?.[name];
        if (registered === undefined) {
          throw new ConfigError(
            `engine.resume(runId) with no workflow resolves by the RunMeta-recorded name from ` +
              `defaults.workflows; run '${runId}' records ` +
              (name === undefined
                ? 'no workflowName'
                : `workflow '${name}', which is not registered`) +
              '; register it under defaults.workflows or pass the workflow value',
          );
        }
        supplied = registered as unknown as Workflow<unknown, unknown>;
      }
      let bound: Workflow<unknown, unknown> | CompiledWorkflow;
      if (supplied === undefined) {
        // The compiled-run binding: rehydrate the
        // persisted source pinned by workflowHash. Dialect validation is
        // not re-run: the hash proves byte identity with the source
        // compileScript validated at run start.
        if (meta?.workflowSourceRef === undefined) {
          throw new ConfigError(
            'engine.resume requires the workflow for in-process runs ' +
              '(https://docs.rulvar.com/guide/durability); only compiled runs with a ' +
              'persisted source resume bare',
          );
        }
        const blob = await transcripts.get(meta.workflowSourceRef);
        if (blob === null) {
          throw new ConfigError(
            `resume: run '${runId}' records workflowSourceRef '${meta.workflowSourceRef}' ` +
              'but the transcript store has no such blob',
          );
        }
        const source = new TextDecoder().decode(blob);
        if (meta.workflowHash !== undefined && hashWorkflowSource(source) !== meta.workflowHash) {
          throw new ConfigError(
            `resume: the persisted source of run '${runId}' does not match the recorded ` +
              'workflowHash; the store is inconsistent',
          );
        }
        bound = {
          kind: 'compiled-workflow',
          name: meta.workflowName ?? 'compiled',
          source,
          errorPolicy: 'lenient',
        };
      } else {
        if (meta?.workflowName !== undefined && meta.workflowName !== supplied.name) {
          throw new ConfigError(
            `resume binding mismatch: run '${runId}' was started by workflow ` +
              `'${meta.workflowName}', not '${supplied.name}'`,
          );
        }
        if (supplied.kind === 'compiled-workflow') {
          // A differing compiled source is a hard mismatch.
          const expectedHash = hashWorkflowSource(supplied.source);
          if (meta?.workflowHash !== undefined && meta.workflowHash !== expectedHash) {
            throw new ConfigError(
              `resume binding mismatch: the supplied CompiledWorkflow source hash differs ` +
                `from the one recorded for run '${runId}'`,
            );
          }
        } else {
          const expectedHash = hashWorkflowBody(supplied);
          if (meta?.workflowHash !== undefined && meta.workflowHash !== expectedHash) {
            if (resumeOptions?.bodyHash === 'refuse') {
              // The opt-in pin (RV3001): this throw sits before
              // ownership, meta writes, and every append, so a refused
              // resume mutates nothing durable.
              throw new ConfigError(
                `resume: the body of workflow '${supplied.name}' changed since run '${runId}' ` +
                  `started and ResumeOptions.bodyHash is 'refuse'; resume with the original ` +
                  `body, or drop the option to proceed under the loud warning`,
              );
            }
            // The journal itself decides replay versus live per content keys.
            process.emitWarning(
              `resume: the body of workflow '${supplied.name}' changed since run '${runId}' ` +
                'started; orphans and misses will be reported honestly',
              { code: 'RULVAR_RESUME_HASH_MISMATCH', type: 'RulvarWarning' },
            );
          }
        }
        bound = supplied;
      }
      // The config-identity handshake (RV3210), strictly before
      // ownership, meta writes, and appends, the RV3001 pin's row: the
      // body-text hash above cannot see closure values, so this is the
      // host-declared pin over what the body closes over. Supplying a
      // fingerprint IS the assertion: a recorded mismatch refuses
      // typed with no posture knob. One-sided states warn instead of
      // failing, because absence means NOT RECORDED.
      {
        const supplied = resumeOptions?.configFingerprint;
        if (supplied !== undefined) {
          requireConfigFingerprint(supplied, 'ResumeOptions.configFingerprint');
        }
        const recorded =
          typeof meta?.configFingerprint === 'string' ? meta.configFingerprint : undefined;
        if (supplied !== undefined && recorded !== undefined && supplied !== recorded) {
          throw new ConfigError(
            `resume: the supplied configFingerprint does not match the one run '${runId}' ` +
              'recorded at genesis; the config the workflow closes over changed, and the host ' +
              'declared exactly this check. Resume under the original config, or drop the ' +
              'option to proceed under the loud warning',
          );
        }
        if (supplied !== undefined && recorded === undefined) {
          process.emitWarning(
            `resume: a configFingerprint was supplied but run '${runId}' never recorded one; ` +
              'the assertion cannot be verified (absence means NOT RECORDED)',
            { code: 'RULVAR_RESUME_FINGERPRINT_UNRECORDED', type: 'RulvarWarning' },
          );
        }
        if (supplied === undefined && recorded !== undefined) {
          process.emitWarning(
            `resume: run '${runId}' recorded a configFingerprint at genesis and this resume ` +
              'did not supply one; the declared config identity goes unchecked',
            { code: 'RULVAR_RESUME_FINGERPRINT_UNCHECKED', type: 'RulvarWarning' },
          );
        }
      }
      // The scope assertion (RV4007), the configFingerprint semantics.
      {
        // The recorded value normalization table (RV4302): the genesis
        // journal decision is the authority and RunMeta mirrors it for
        // this pre-load assertion, the scope's own pattern. A recorded
        // table that does not validate is corrupt store bytes and
        // refuses typed (the RV1204 corrupt-deadline rule), because a
        // mangled table would turn the assertion into a coin flip.
        const recordedNormalize = meta?.scopeNormalize as ScopeNormalizeTable | undefined;
        if (recordedNormalize !== undefined) {
          try {
            validateScopeNormalizeTable(recordedNormalize, 'RunMeta.scopeNormalize');
          } catch (cause) {
            throw new ConfigError(
              `resume: run '${runId}' recorded a scopeNormalize table that does not ` +
                'validate; the store bytes are corrupt: ' +
                (cause instanceof Error ? cause.message : String(cause)),
            );
          }
        }
        // The table assertion (RV4302), the args-binding rule: the
        // RECORDED table is what applies; a re-supplied one is only an
        // assertion. Conflict refuses typed before ownership; a table
        // supplied over a run that recorded none warns and is NOT
        // applied, because applying host input here would let a resume
        // move the recorded identity.
        const suppliedPolicy = resumeOptions?.scopePolicy;
        if (suppliedPolicy !== undefined) {
          validateScopePolicy(suppliedPolicy, 'ResumeOptions.scopePolicy');
          const suppliedTable = suppliedPolicy.normalize;
          if (
            suppliedTable !== undefined &&
            recordedNormalize !== undefined &&
            jcsSerialize(suppliedTable) !== jcsSerialize(recordedNormalize)
          ) {
            throw new ConfigError(
              `resume: the supplied scopePolicy.normalize table does not match the one run ` +
                `'${runId}' recorded at genesis; the normalization table is immutable for ` +
                'the life of the run, and the journal is its authority',
            );
          }
          if (suppliedTable !== undefined && recordedNormalize === undefined) {
            process.emitWarning(
              `resume: a scopePolicy.normalize table was supplied but run '${runId}' never ` +
                'recorded one; the assertion cannot be verified and the table is NOT applied ' +
                '(absence means NOT RECORDED)',
              { code: 'RULVAR_RESUME_SCOPE_NORMALIZE_UNRECORDED', type: 'RulvarWarning' },
            );
          }
        }
        const supplied =
          resumeOptions?.scope === undefined
            ? undefined
            : normalizeExecutionScope(resumeOptions.scope, 'ResumeOptions.scope', {
                ...(suppliedPolicy?.unknown === undefined
                  ? {}
                  : { unknown: suppliedPolicy.unknown }),
                // The RECORDED table shapes the supplied copy before
                // any comparison (RV4302), so re-supplying the same
                // raw values the run started with asserts true.
                ...(recordedNormalize === undefined ? {} : { normalize: recordedNormalize }),
              });
        const recorded =
          typeof meta?.scope === 'object' && meta.scope !== null ? meta.scope : undefined;
        if (
          supplied !== undefined &&
          recorded !== undefined &&
          executionScopeKey(supplied) !== executionScopeKey(recorded)
        ) {
          throw new ConfigError(
            `resume: the supplied scope does not match the one run '${runId}' recorded at ` +
              'genesis; the execution scope is immutable for the life of the run, and the ' +
              'host declared exactly this check',
          );
        }
        if (supplied !== undefined && recorded === undefined) {
          process.emitWarning(
            `resume: a scope was supplied but run '${runId}' never recorded one; the ` +
              'assertion cannot be verified (absence means NOT RECORDED)',
            { code: 'RULVAR_RESUME_SCOPE_UNRECORDED', type: 'RulvarWarning' },
          );
        }
      }
      const raw = await journal.load(runId);
      const priorEntries = raw.map((entry) => normalizeEntry(entry));
      // One scan, strictly before any live call, append, or reserve.
      scanJournalCompatibility(runId, priorEntries, buildDeriverRegistry(options.extraDerivers));
      // Legacy cache-semantics advisory (v1.20.0 review P1/P2-2): an
      // UNSTAMPED OpenAI entry carrying cache writes may have been
      // written by rulvar v1.19.0, whose adapter double-counted writes
      // into inputTokens; its recorded debits are then overstated and
      // this resume keeps them (the conservative direction for every
      // ceiling). Once per resume, never a failure.
      const legacyCacheShape = priorEntries.some(
        (entry) =>
          entry.usageSemantics === undefined &&
          ((entry.servedBy?.startsWith('openai:') === true &&
            (entry.usage?.cacheWriteTokens ?? 0) > 0) ||
            (entry.usageByModel?.some(
              (slice) => slice.servedBy.startsWith('openai:') && slice.usage.cacheWriteTokens > 0,
            ) ??
              false)),
      );
      if (legacyCacheShape) {
        process.emitWarning(
          `resume: run '${runId}' contains OpenAI cache-write usage recorded without a ` +
            'usage-semantics stamp. Entries written by rulvar v1.19.0 double-counted cache ' +
            'writes into inputTokens, so their recorded cost and budget debits are OVERSTATED; ' +
            'unstamped entries from v1.20.0 are correct. Resuming keeps the recorded debits. ' +
            'Audit procedure: https://docs.rulvar.com/guide/providers#openai-legacy-cache-journals',
          { code: 'RULVAR_LEGACY_CACHE_SEMANTICS', type: 'RulvarWarning' },
        );
      }
      // An override object with neither field is a no-op, not a
      // decision: nothing to apply, nothing to journal.
      const runOverride = resumeOptions?.run;
      const budgetOverride =
        runOverride === undefined ||
        (runOverride.budgetUsd === undefined && runOverride.maxInFlightExposureUsd === undefined)
          ? undefined
          : {
              ...(runOverride.budgetUsd === undefined ? {} : { budgetUsd: runOverride.budgetUsd }),
              ...(runOverride.maxInFlightExposureUsd === undefined
                ? {}
                : { maxInFlightExposureUsd: runOverride.maxInFlightExposureUsd }),
            };
      // The welded door (RV3902): a run recorded under budgetPolicy
      // 'immutable-lifetime' refuses ANY applying override, raise and
      // lower alike, HERE, before ownership, meta writes, or any
      // append. The no-op empty object above stays a no-op: nothing
      // would be applied or journaled, so there is nothing to refuse.
      // The emergency lever for a run that must stop spending is
      // cancel, not a ceiling edit.
      if (budgetOverride !== undefined && meta?.budgetPolicy === 'immutable-lifetime') {
        throw new ConfigError(
          `run '${runId}' was started with budgetPolicy 'immutable-lifetime': the recorded ` +
            'ceilings are immutable for the whole life of the run and ResumeOptions.run is ' +
            'refused, raising and lowering alike; cancel the run (or start a new one) instead ' +
            'of editing its ceilings',
        );
      }
      // The unknown-outcome wire refusal (RV4006), before ownership,
      // meta writes, and any append: an intent journaled before a
      // dispatch that has neither a receipt row nor a terminal record
      // covering it marks a wire whose outcome this process never
      // learned. The provider may have billed it, and a blind
      // redispatch could pay twice; the explicit acknowledgment is
      // journaled by the new segment, so the override is durable.
      const openIntents = openWireIntentsOf(priorEntries);
      if (openIntents.length > 0 && resumeOptions?.acknowledgeOpenWireIntents !== true) {
        const preview = openIntents
          .slice(0, 3)
          .map(
            (intent) =>
              `agent ${String(intent.agentRef)} ordinal ${String(intent.ordinal)} attempt ` +
              `${String(intent.attempt)} (${intent.servedBy})`,
          )
          .join('; ');
        throw new ConfigError(
          `resume: run '${runId}' holds ${String(openIntents.length)} provider wire ` +
            `intent(s) with unknown outcome (${preview}${openIntents.length > 3 ? '; …' : ''}): ` +
            'an intent was journaled before dispatch and neither a receipt nor a terminal ' +
            'record covers it, so the provider may have billed a wire this process never ' +
            "heard back from, and a blind retry could pay twice. Reconcile the invoice's " +
            'openIntents lane (cost-audit prints it) against the provider statement, then ' +
            'resume with ResumeOptions.acknowledgeOpenWireIntents: true; the acknowledgment ' +
            'is journaled',
        );
      }
      return run(bound, resumeOptions?.args, undefined, {
        ...(openIntents.length > 0 && resumeOptions?.acknowledgeOpenWireIntents === true
          ? { acknowledgedOpenWireIntents: openIntents.length }
          : {}),
        runId,
        priorEntries,
        strict: resumeOptions?.dryRun ?? false,
        invalidate: resumeOptions?.invalidate ?? [],
        ...(resumeOptions?.lease === undefined ? {} : { lease: resumeOptions.lease }),
        ...(budgetOverride === undefined ? {} : { budgetOverride }),
        // The recorded B0 travels back in: journals whose store dropped
        // the field (or predates it) resume uncapped, exactly as before.
        ...(typeof meta?.budgetUsd === 'number' ? { budgetUsd: meta.budgetUsd } : {}),
        // The recorded exposure cap travels back in the same way
        // (RV1504); absence stays absent, so a pre-field run resumes
        // exactly as it always did.
        ...(typeof meta?.maxInFlightExposureUsd === 'number'
          ? { maxInFlightExposureUsd: meta.maxInFlightExposureUsd }
          : {}),
        // The recorded pricing gate travels back in the same way
        // (RV1508); absence stays absent.
        ...(typeof meta?.strictPricing === 'object' && meta.strictPricing !== null
          ? { strictPricing: meta.strictPricing }
          : {}),
        // The recorded execution scope travels back in verbatim
        // (RV4007); absence stays absent.
        ...(typeof meta?.scope === 'object' && meta.scope !== null ? { scope: meta.scope } : {}),
        // The recorded normalization table travels back in verbatim
        // (RV4302); absence stays absent. Validated above: a corrupt
        // recorded table refused this resume before ownership.
        ...(meta?.scopeNormalize === undefined
          ? {}
          : { scopeNormalize: meta.scopeNormalize as ScopeNormalizeTable }),
        // The recorded ceiling-override posture travels back in
        // (RV3902); only the exact literal counts, so a store that
        // mangles the field degrades to 'segment', never to an
        // invented refusal.
        ...(meta?.budgetPolicy === 'immutable-lifetime' ? { budgetPolicy: meta.budgetPolicy } : {}),
        // Metas that predate the segments field (or a crash before the
        // first putMeta) count as ONE prior segment: the new base still
        // clears every realistic pre-upgrade seq (v1.22.0 review P1-2).
        segmentsBefore:
          typeof meta?.segments === 'number' && meta.segments > 0 ? Math.floor(meta.segments) : 1,
        // The genesis args binding travels back in verbatim; absence
        // stays absent (legacy runs never gain a marker retroactively).
        ...(typeof meta?.argsProvided === 'boolean' ? { argsProvided: meta.argsProvided } : {}),
        ...(typeof meta?.argsHash === 'string' ? { argsHash: meta.argsHash } : {}),
        // The generation token travels back in verbatim; absence stays
        // absent (a legacy run never gains one retroactively).
        ...(typeof meta?.genesis === 'string' ? { genesis: meta.genesis } : {}),
        // The exec key derivation stamp travels back in verbatim
        // (RV403); absence stays absent, so a pre-stamp run derives
        // version 1 keys for its whole life.
        ...(typeof meta?.execKeyDerivation === 'number'
          ? { execKeyDerivation: meta.execKeyDerivation }
          : {}),
        // The recorded config fingerprint travels back in verbatim
        // (RV3210); absence stays absent.
        ...(typeof meta?.configFingerprint === 'string'
          ? { configFingerprint: meta.configFingerprint }
          : {}),
        previewResolve,
      });
    })();

    // The handle facade defers to the async-loaded inner handle.
    const result = handlePromise.then((handle) => handle.result);
    return {
      runId,
      result: result as Promise<RunOutcome<R>>,
      events: (async function* stream() {
        const handle = await handlePromise;
        yield* handle.events;
      })(),
      on: (type, cb) => {
        let unsub: (() => void) | undefined;
        let cancelled = false;
        void handlePromise.then((handle) => {
          if (!cancelled) {
            unsub = handle.on(type, cb);
          }
        });
        return () => {
          cancelled = true;
          unsub?.();
        };
      },
      resolveExternal: async (key, value) => {
        const handle = await handlePromise;
        return handle.resolveExternal(key, value);
      },
      revokeApproval: async (key, options) => {
        const handle = await handlePromise;
        return handle.revokeApproval(key, options);
      },
      cancel: async (reason?: string) => {
        const handle = await handlePromise;
        await handle.cancel(reason);
      },
      preview,
    };
  }

  /** Portable export through the policy point (RV-217). */
  async function exportRun(runId: string): Promise<RunExport> {
    const entries = await journal.load(runId);
    const meta = await readRunMeta(journal, runId);
    const blobs: Array<{ ref: string; data: Bytes }> = [];
    for (const ref of await transcripts.list(runId)) {
      const data = await transcripts.get(ref);
      if (data !== null) {
        blobs.push({ ref, data });
      }
    }
    if (entries.length === 0 && meta === undefined && blobs.length === 0) {
      throw new ConfigError(`exportRun: run '${runId}' does not exist in this engine's stores`);
    }
    return { runId, ...(meta === undefined ? {} : { meta }), entries, blobs };
  }

  /** Import under the original runId; refuses an existing run (RV-217). */
  async function importRun(
    bundle: RunExport,
    options?: { requireClosure?: boolean },
  ): Promise<{ unresolvedRefs: string[] }> {
    const raw: unknown = bundle;
    if (
      typeof raw !== 'object' ||
      raw === null ||
      typeof (raw as { runId?: unknown }).runId !== 'string' ||
      (raw as { runId?: string }).runId === '' ||
      !Array.isArray((raw as { entries?: unknown }).entries) ||
      !Array.isArray((raw as { blobs?: unknown }).blobs)
    ) {
      throw new ConfigError('importRun: the bundle must be a RunExport (runId, entries, blobs)');
    }
    const runId = bundle.runId;
    // The one safe runId guard, at the import boundary too (RV1206):
    // run and resume already refuse an unsafe id through
    // assertSafeRunId, but import checked only "non-empty string", so
    // a bundle could claim '..', a slashed path, or an over-length id
    // and reach the stores raw (the sixteenth experiment's judge).
    assertSafeRunId(runId, 'importRun');
    // Intake validation BEFORE any write (RV1010): an import is an
    // all-or-nothing claim, so everything checkable up front refuses
    // up front. Every blob ref must live in the bundle runId's own
    // namespace: transcript refs are runId-prefixed by construction,
    // and a crafted bundle for run A must never overwrite run B's
    // blobs through a foreign ref.
    const availableRefs = new Set<string>();
    for (const blob of bundle.blobs) {
      const ref: unknown = (blob as { ref?: unknown } | undefined)?.ref;
      if (typeof ref !== 'string' || !ref.startsWith(`${runId}/`)) {
        throw new ConfigError(
          `importRun: blob ref '${String(ref)}' is outside run '${runId}' namespace ` +
            `('${runId}/...'); a bundle imports only its own run's blobs`,
        );
      }
      if (availableRefs.has(ref)) {
        // Two blobs claiming one ref cannot both be the record
        // (RV1511): a torn or hand-edited bundle must refuse instead
        // of silently letting the last write win.
        throw new ConfigError(
          `importRun: the bundle carries blob ref '${ref}' twice; a duplicate ref is a torn ` +
            'or edited bundle, never a valid export',
        );
      }
      availableRefs.add(ref);
    }
    // Every entry must pass the journal codec's shape validation (the
    // same registry the replayer folds with): an import that appends
    // garbage would brick the run it claims to restore.
    bundle.entries.forEach((entry, index) => {
      const rawEntry: unknown = entry;
      if (typeof rawEntry !== 'object' || rawEntry === null) {
        throw new ConfigError(`importRun: entries[${String(index)}] is not a journal entry`);
      }
      const issues = validateEntryShape(entry);
      if (issues.length > 0) {
        throw new ConfigError(
          `importRun: entries[${String(index)}] is not a valid journal entry: ` +
            issues.map((issue) => issue.message).join('; '),
        );
      }
    });
    // The closure report (RV1511): every ref the entries (and meta)
    // reference, held against the blobs the bundle actually carries.
    // Permissive by default because retention and checkpoint pruning
    // legitimately drop blobs their entries still name; the report
    // makes the gap visible, and requireClosure turns it into the
    // typed refusal a strict host wants, BEFORE any write.
    const referencedRefs = new Set<string>();
    for (const entry of bundle.entries) {
      const record = entry as {
        transcriptRef?: unknown;
        checkpointRef?: unknown;
        artifacts?: unknown;
      };
      if (typeof record.transcriptRef === 'string') {
        referencedRefs.add(record.transcriptRef);
      }
      if (typeof record.checkpointRef === 'string') {
        referencedRefs.add(record.checkpointRef);
      }
      if (Array.isArray(record.artifacts)) {
        for (const artifact of record.artifacts) {
          const ref = (artifact as { ref?: unknown } | undefined)?.ref;
          if (typeof ref === 'string') {
            referencedRefs.add(ref);
          }
        }
      }
    }
    const sourceRef = (bundle.meta as { workflowSourceRef?: unknown } | undefined)
      ?.workflowSourceRef;
    if (typeof sourceRef === 'string') {
      referencedRefs.add(sourceRef);
    }
    const unresolvedRefs = [...referencedRefs].filter((ref) => !availableRefs.has(ref));
    if (options?.requireClosure === true && unresolvedRefs.length > 0) {
      const listed = unresolvedRefs.slice(0, 10).join(', ');
      throw new ConfigError(
        `importRun: ${String(unresolvedRefs.length)} referenced ref(s) are unresolved in the ` +
          `bundle under requireClosure (${listed}${unresolvedRefs.length > 10 ? ', ...' : ''}); ` +
          'a strict import demands the blobs its entries name',
      );
    }
    const existingMeta = await readRunMeta(journal, runId);
    const existingEntries = await journal.load(runId);
    const existingBlobs = await transcripts.list(runId);
    if (existingMeta !== undefined || existingEntries.length > 0 || existingBlobs.length > 0) {
      throw new ConfigError(
        `importRun: run '${runId}' already exists in the target stores; an import never ` +
          'interleaves with live history (delete the run first if replacement is intended)',
      );
    }
    // Writes in blobs -> entries -> meta order with best-effort
    // rollback (RV1010): a failed import must not leave a partial run
    // that bricks the retry through the exists-refusal above.
    try {
      for (const blob of bundle.blobs) {
        await transcripts.put(blob.ref, blob.data);
      }
      for (const entry of bundle.entries) {
        await journal.append(runId, entry);
      }
      if (bundle.meta !== undefined) {
        await journal.putMeta({ ...bundle.meta, runId });
      }
      return { unresolvedRefs };
    } catch (failed) {
      try {
        for (const ref of await transcripts.list(runId)) {
          await transcripts.delete(ref);
        }
        await journal.delete(runId);
      } catch {
        // Best effort: the original failure is the story; a rollback
        // that also failed leaves residue `rulvar runs audit` can see.
      }
      throw failed;
    }
  }

  /** Retention cascade (OQ-20 executed at M8-T04): blobs, then journal. */
  async function deleteRun(runId: string, opts?: { lease?: Lease }): Promise<void> {
    const refs = await transcripts.list(runId);
    for (const ref of refs) {
      await transcripts.delete(ref, opts?.lease);
    }
    await journal.delete(runId, opts?.lease);
  }

  /**
   * Checkpoint pruning (OQ-20 executed at M8-T04): ok-terminal attempts
   * replay from the journal and never boot their checkpoint again;
   * everything else (parked, cancelled, escalated, hanging) keeps its
   * blob for park/unpark, DEF-5 retention, and dangling redispatch.
   *
   * References are exact whole string matches collected in ONE recursive
   * pass over every journal value and key (the v1.25.0 scale review: the
   * previous per-terminal substring scan was O(entries squared) and a
   * prefix collision such as `ckpt/2` inside `ckpt/20` kept blobs the
   * docs promise to delete). The conservative direction is unchanged:
   * any exact mention outside the owning terminal's own checkpointRef
   * field (park anchors, boot reuse, links, nested payload values)
   * keeps the blob.
   */
  async function pruneRun(runId: string, opts?: { lease?: Lease }): Promise<number> {
    const entries = (await journal.load(runId)).map((entry) => normalizeEntry(entry));
    const existing = new Set(await transcripts.list(runId));
    // Candidates: ok-terminal agent checkpoints whose blob still exists,
    // keyed by ref with the owning terminal's seq.
    const ownerOf = new Map<string, number>();
    for (const terminal of entries) {
      if (
        terminal.kind === 'agent' &&
        terminal.status === 'ok' &&
        terminal.ref !== undefined &&
        terminal.checkpointRef !== undefined &&
        existing.has(terminal.checkpointRef)
      ) {
        ownerOf.set(terminal.checkpointRef, terminal.seq);
      }
    }
    if (ownerOf.size === 0) {
      return 0;
    }
    const keep = new Set<string>();
    const visit = (value: unknown): void => {
      if (typeof value === 'string') {
        if (ownerOf.has(value)) {
          keep.add(value);
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          visit(item);
        }
        return;
      }
      if (value !== null && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) {
          // A ref used as an object KEY is a reference too (the old
          // stringify of the whole entry caught these; stay as conservative).
          if (ownerOf.has(key)) {
            keep.add(key);
          }
          visit(inner);
        }
      }
    };
    for (const entry of entries) {
      const { checkpointRef, ...rest } = entry;
      // The owning terminal's own checkpointRef field is the one mention
      // that does not keep the blob; a DIFFERENT entry carrying the ref
      // in its checkpointRef field does.
      if (checkpointRef !== undefined && ownerOf.get(checkpointRef) !== entry.seq) {
        keep.add(checkpointRef);
      }
      visit(rest);
    }
    let pruned = 0;
    for (const ref of ownerOf.keys()) {
      if (keep.has(ref)) {
        continue;
      }
      await transcripts.delete(ref, opts?.lease);
      pruned += 1;
    }
    return pruned;
  }

  return {
    run,
    resume,
    stores: { journal, transcripts },
    deleteRun,
    pruneRun,
    exportRun,
    importRun,
    profileCard: (names) => {
      const registered = defaults.profiles ?? {};
      if (names === undefined) {
        return profileCard(registered, defaults.toolsets);
      }
      const filtered: Record<string, AgentProfile> = {};
      for (const name of names) {
        if (registered[name] !== undefined) {
          filtered[name] = registered[name];
        }
      }
      return profileCard(filtered, defaults.toolsets);
    },
  };
}
