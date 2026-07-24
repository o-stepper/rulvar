/**
 * Engine entry points (M1-T11): createEngine and engine.run over the
 * InProcessRunner. Every registry hangs off the engine instance; nothing
 * is module-global, so two engines in one process are fully isolated and
 * ctx is created per run. engine.resume lands with the journal
 * kernel in M2.
 */
import { createHash, createHmac } from 'node:crypto';
import { BudgetExhaustedError, ConfigError, RulvarError, type WireError } from '../l0/errors.js';
import { setLongTimeout, type LongTimer } from '../l0/long-timer.js';
import { realNow } from '../l0/real-clock.js';
import { assertSafeRunId } from '../l0/run-id.js';
import {
  requireFraction,
  requireNonNegativeInteger,
  requireNonNegativeNumber,
  requirePositiveInteger,
} from '../l0/validate-numbers.js';
import type { WorkflowEventBody } from '../l0/events.js';
import type { InvocationRole, ModelRef, ModelSpec, Usage } from '../l0/messages.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';
import type { Pricing, ProviderAdapter } from '../l0/spi/provider.js';
import type { RunMeta, JournalStore, Lease } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import {
  compileSecretMasker,
  wrapJournalStore,
  wrapTranscriptStore,
  type SerializationHook,
} from '../l0/serialization.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { validateSchemaSpec, type SchemaSpec } from '../l0/schema.js';
import { jcsSerialize } from '../l0/jcs.js';
import type { ToolsOption } from '../tools/toolset-hash.js';
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
import type { Bytes } from '../l0/json.js';
import { readRunMeta } from '../stores/meta-lookup.js';
import { buildAdapterRegistry, parseModelRef } from '../model/router.js';
import type { EscalationDecision } from '../runtime/escalation.js';
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
import { costReportFromJournal } from './cost-report.js';
import { EVENT_SEGMENT_STRIDE, EventBus, SpanRegistry } from './events.js';
import { ExternalRegistry } from './external.js';
import {
  type PendingExternal,
  type RunHandle,
  type RunOutcome,
  type RunStatus,
} from './run-handle.js';
import { DEFAULT_PER_RUN_CONCURRENCY, Semaphore } from './scheduler.js';
import { InProcessRunner, type CompiledWorkflow, type ScriptRunner } from '../runner/inprocess.js';
import {
  validateDeterminismConfig,
  withDeterminismDetection,
  type DeterminismConfig,
} from '../runner/determinism.js';
import { validateRetryPolicy, type RetryPolicy } from '../model/retry.js';
import { KeyedLimiter } from '../model/concurrency.js';
import {
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
}

export interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /**
   * Run ceiling B0; immutable after start. Enforced by projected
   * admission (a spawn whose reserve does not fit is denied before any
   * dispatch), the per-turn guard with a budget-derived maxOutputTokens
   * clamp, and live stream cuts on crossing; the residual
   * provider-dependent overshoot is bounded by one in-flight turn per
   * concurrent agent. Contract: https://docs.rulvar.com/guide/budgets.
   */
  budgetUsd?: number;
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
   * loudly and proceeds (the journal decides replay per content keys).
   * A compiled run resumes WITHOUT wf: the engine rehydrates the
   * persisted source pinned by workflowHash; supplying a compiled wf
   * whose source hash differs from the recorded one is a typed
   * ConfigError (M6-T02).
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
  importRun(bundle: RunExport): Promise<void>;
}

/** The portable bundle exportRun produces and importRun consumes (RV-217). */
export interface RunExport {
  runId: string;
  /** Absent when the source store had no meta row for the run. */
  meta?: RunMeta;
  entries: JournalEntry[];
  blobs: Array<{ ref: string; data: Bytes }>;
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
function liftRunCompletion(candidate: unknown):
  | {
      completion: 'complete' | 'partial' | 'rejected';
      childStatusCounts?: Record<string, number>;
    }
  | undefined {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    return undefined;
  }
  const completion = (candidate as { completion?: unknown }).completion;
  if (completion !== 'complete' && completion !== 'partial' && completion !== 'rejected') {
    return undefined;
  }
  const counts = (candidate as { childStatusCounts?: unknown }).childStatusCounts;
  if (typeof counts === 'object' && counts !== null && !Array.isArray(counts)) {
    const entries = Object.entries(counts as Record<string, unknown>);
    if (
      entries.every(
        ([, value]) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0,
      )
    ) {
      return {
        completion,
        childStatusCounts: Object.fromEntries(entries) as Record<string, number>,
      };
    }
  }
  return { completion };
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
          onLimiterError: options.quota.onLimiterError ?? 'deny',
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
     * original invocation's bound, and ResumeOptions deliberately has
     * no field to override it.
     */
    budgetUsd?: number;
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
    let budgetSeed: { usd: number; usage: Usage; agentsSpawned: number } | undefined;
    // B0 is immutable across the run's whole life: a fresh run takes it
    // from RunOptions, a resumed run restores the RunMeta-recorded
    // value, and no API can change it after start.
    const ceilingUsd = opts?.budgetUsd ?? resumeCtx?.budgetUsd;
    const makeBudget = (): RunBudget =>
      new RunBudget({
        ...(ceilingUsd === undefined ? {} : { ceilingUsd }),
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
      ...(resumeCtx?.lease === undefined ? {} : { lease: resumeCtx.lease }),
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
      budgetSeed = { usd: prior.usd, usage: prior.usage, agentsSpawned: prior.agentsSpawned };
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
    const external = new ExternalRegistry(replayer, (body) => bus.emit(body, rootSpanId));
    let transcriptCounter = 0;
    const internals: RunInternals = {
      runId,
      replayer,
      budget,
      admission,
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
      },
      errorPolicy: wf.errorPolicy,
      dropped: [],
      cost: {
        byModel: new Map(),
        byPhase: new Map(),
        byAgentType: new Map(),
        byRole: new Map(),
        unpriced: [],
        orchestrator: { spentUsd: 0, wakes: 0, forcedFinish: false, reserveUsedUsd: 0 },
      },
      priceUsd: (servedBy, usage) => priceUsd(servedBy, usage),
      pricingOf,
      runSignal: controller.signal,
      ...(defaults.isolation === undefined ? {} : { isolation: defaults.isolation }),
      ...(options.onEscalation === undefined ? {} : { onEscalation: options.onEscalation }),
      external,
      mintTranscriptRef: () => `${runId}/t${transcriptCounter++}`,
      now: realNow,
      ...(resumeCtx?.lease === undefined ? {} : { lease: resumeCtx.lease }),
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

    // The generation token (RunMeta.genesis): minted once at the fresh
    // start, carried verbatim by every resume segment. Distinguishes a
    // deleteRun and recreate of the same explicit runId from the same
    // run continuing, which journal length alone cannot (v1.25.0 scale
    // review: the queue worker's skip cache).
    const genesis = resumeCtx === undefined ? mintRunId() : resumeCtx.genesis;

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
              ...(argsBinding.argsProvided === undefined
                ? {}
                : { argsProvided: argsBinding.argsProvided }),
              ...(argsBinding.argsHash === undefined ? {} : { argsHash: argsBinding.argsHash }),
              ...(genesis === undefined ? {} : { genesis }),
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
            resumeCtx?.lease,
          );

    if (activeSegments.has(runId)) {
      throw new ConfigError(
        `run '${runId}' already has a live execution segment in this engine; await its ` +
          'settled result before starting another one (exactly one segment owns a run; ' +
          'https://docs.rulvar.com/guide/durability#resolving-a-settled-run)',
      );
    }
    activeSegments.add(runId);

    const result: Promise<RunOutcome<R>> = (async () => {
      let status: RunOutcome<R>['status'] = 'ok';
      let value: R | undefined;
      let wireError: WireError | undefined;
      let pending: PendingExternal[] = [];
      if (compiled !== undefined && resumeCtx?.strict !== true) {
        // The binding contract: the compiled source and
        // its content hash persist AT START so planned runs are
        // resumable by construction; resume rehydrates from this blob.
        // A dry-run preview skips the (byte-identical) re-put: a preview
        // performs zero store mutations.
        await transcripts.put(
          workflowSourceRef(runId),
          new TextEncoder().encode(compiled.source),
          resumeCtx?.lease,
        );
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
        // 'suspended' with the open keys.
        const raced = await Promise.race([
          bodyPromise.then((result) => ({ kind: 'done' as const, result })),
          quiesced.then((open) => ({ kind: 'suspended' as const, open })),
        ]);
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
        } else {
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
        // Every settle closes the segment (idempotent): waiters a body
        // raced away from must never wake after the outcome is out.
        external.close();
        await replayer.flush().catch(() => undefined);
      }
      // The COMPLETE report is the journal fold at settle, not the live
      // buckets: the journal is the truth cost reconciles against, one
      // summation order keeps totalUsd equal to the ledger fold exactly
      // (M5-T03 acceptance), and a replay-only resume reproduces every
      // breakdown byte for byte because it folds the same entries
      // (v1.6.0 follow-up review).
      const ledger = replayer.ledger();
      const outcome: RunOutcome<R> = {
        status,
        dropped: internals.dropped,
        pending,
        usage: ledger.usage,
        cost: costReportFromJournal(replayer.snapshot(), priceUsd),
      };
      if (value !== undefined && (status === 'ok' || status === 'exhausted')) {
        // Exhaustion is never null when a value exists: the DEF-7
        // finalize fallback synthesizes the partial.
        outcome.value = value;
      }
      if (wireError !== undefined) {
        outcome.error = wireError;
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
      // projection. A fenced store's rejection of a superseded
      // segment's settle entry is swallowed exactly like its meta
      // write below.
      if (resumeCtx?.strict !== true) {
        const priorCount = resumeCtx?.priorEntries.length ?? 0;
        const appendedHere = replayer.snapshot().length - priorCount;
        const recorded = lastRunSettle(replayer.snapshot());
        if (appendedHere > 0 || (recorded !== undefined && recorded.runStatus !== status)) {
          // The output digest rides the settle it belongs to (RV-209):
          // recorded only by a segment that COMPUTED the value (pure
          // replays append no settle, so a divergent replayed result can
          // never overwrite the live baseline), absent when the result
          // is undefined or not JCS-serializable.
          const outputHash = hashRunOutput(outcome.value);
          await replayer
            .appendSinglePhase({
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
              },
            })
            .catch(() => undefined);
        }
      }
      await putMeta(status).catch(() => undefined);
      // The semantic completion lift: an ok/exhausted run reports through
      // its result envelope, a typed failure through its error data (the
      // orchestrator acceptance rejection). Replay re-executes the
      // workflow and recomputes the same value, so the lifted fields are
      // identical live and replayed.
      const lifted = liftRunCompletion(
        status === 'ok' || status === 'exhausted'
          ? outcome.value
          : status === 'error'
            ? wireError?.data
            : undefined,
      );
      bus.emit(
        {
          type: 'run:end',
          status,
          totalUsd: ledger.usd,
          ...(outcome.cost.usageApprox === true ? { usageApprox: true } : {}),
          ...(lifted === undefined ? {} : lifted),
        },
        rootSpanId,
      );
      bus.end();
      resumeCtx?.previewResolve({
        ...replayer.resumeReport(),
        invalidResolutions: replayer.fold.invalidResolutions(),
      });
      return outcome;
    })();

    // The outcome is delivered through handle.result; an unobserved copy
    // must not crash the process. Segment ownership releases on ANY
    // settlement, including rejects that never reach the run try block.
    void result
      .catch(() => undefined)
      .finally(() => {
        activeSegments.delete(runId);
      });

    return {
      runId,
      result,
      events: bus.iterate(),
      on: (type, cb) => bus.on(type, cb),
      resolveExternal: (key, value) => external.resolveExternal(key, value),
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
      return run(bound, resumeOptions?.args, undefined, {
        runId,
        priorEntries,
        strict: resumeOptions?.dryRun ?? false,
        invalidate: resumeOptions?.invalidate ?? [],
        ...(resumeOptions?.lease === undefined ? {} : { lease: resumeOptions.lease }),
        // The recorded B0 travels back in: journals whose store dropped
        // the field (or predates it) resume uncapped, exactly as before.
        ...(typeof meta?.budgetUsd === 'number' ? { budgetUsd: meta.budgetUsd } : {}),
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
  async function importRun(bundle: RunExport): Promise<void> {
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
    const existingMeta = await readRunMeta(journal, runId);
    const existingEntries = await journal.load(runId);
    const existingBlobs = await transcripts.list(runId);
    if (existingMeta !== undefined || existingEntries.length > 0 || existingBlobs.length > 0) {
      throw new ConfigError(
        `importRun: run '${runId}' already exists in the target stores; an import never ` +
          'interleaves with live history (delete the run first if replacement is intended)',
      );
    }
    for (const entry of bundle.entries) {
      await journal.append(runId, entry);
    }
    for (const blob of bundle.blobs) {
      await transcripts.put(blob.ref, blob.data);
    }
    if (bundle.meta !== undefined) {
      await journal.putMeta({ ...bundle.meta, runId });
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
