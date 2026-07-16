/**
 * Ctx primitives (M1-T07) plus the parallel/pipeline composition semantics
 * of the scheduler (M1-T08): the canonical authoring surface bound to the
 * journal write path, the model router, the agent runtime, and the
 * three-layer budget. M1 ships agent, parallel, pipeline, step, phase,
 * log, budget, and the deterministic shims; workflow/orchestrate/
 * awaitExternal/brief land with their milestones (M2/M6).
 *
 * Public contract: https://docs.rulvar.com/guide/workflows.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, getRandomValues } from 'node:crypto';
import {
  AdmissionRejectedError,
  agentErrorFromWire,
  agentErrorToWire,
  BudgetExhaustedError,
  ConfigError,
  RulvarError,
  type AgentError,
  type Issue,
  type WireError,
} from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { Effort, InvocationRole, ModelRef, ModelSpec, Usage } from '../l0/messages.js';
import type { Pricing, ProviderAdapter } from '../l0/spi/provider.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import type { IsolationProvider, IsolationSpec } from '../l0/spi/isolation.js';
import type { ModelKnowledgeHandle } from '../l0/spi/knowledge.js';
import {
  canonicalizeSchema,
  EMPTY_SCHEMA_HASH,
  projectToJsonSchema,
  schemaHash,
  validateSchemaSpec,
  type Out,
  type SchemaSpec,
} from '../l0/schema.js';
import { deriveContentKey } from '../journal/identity.js';
import {
  canonicalIsolationTag,
  type LineageStats,
  type SpawnLineage,
  type SpawnLineageOpt,
} from '../journal/lineage.js';
import { checkpointRefFor, decodeCheckpoint, encodeCheckpoint } from '../journal/checkpoint.js';
import {
  agentScope,
  ParallelSiteCounter,
  parallelScope,
  pipelineScope,
  ROOT_SCOPE,
  workflowScope,
} from '../journal/scope.js';
import type { Replayer } from '../journal/replayer.js';
import { priceEntryUsage, type JournalEntry } from '../l0/entries.js';
import { selectStructuredOutputTier } from '../model/caps.js';
import { fallbackTriggerOf, type FallbackField, type FallbackTrigger } from '../model/failover.js';
import type { KeyedLimiter } from '../model/concurrency.js';
import type { QualityFloors } from '../model/floors.js';
import type { RetryPolicy } from '../model/retry.js';
import { finalizeFires, needsSeparateExtract, roleConfiguredInRouting } from '../model/roles.js';
import {
  resolveModelInvocation,
  type ResolutionLayer,
  type ResolvedInvocation,
} from '../model/router.js';
import {
  runAgent,
  type AgentResult,
  type Artifact,
  type EscalatedResult,
  type MechanicalGateProfile,
  type PhaseTarget,
  type ToolRuntime,
} from '../runtime/agent-loop.js';
import type { AbortClass } from '../runtime/no-progress.js';
import {
  countsAgainstLimit,
  escalateTool,
  validateEscalationReport,
  type EscalationDecision,
  type EscalationOptions,
  type EscalationReport,
  type EscalationRequest,
} from '../runtime/escalation.js';
import {
  compilePermissionChain,
  evaluatePermission,
  type AgentProfilePermissions,
  type PermissionConfig,
  type PermissionRule,
} from '../runtime/permission-chain.js';
import { mergeUsageLimits, type UsageLimits } from '../runtime/usage-limits.js';
import { buildToolContext } from '../tools/context.js';
import { resolveToolset, type ToolsOption } from '../tools/toolset-hash.js';
import { AdmissionController, type AdmitVerdict } from '../orchestrator/admission.js';
import { makeOrchestratorWorkflow, type OrchestrateOptions } from '../orchestrator/orchestrate.js';
import { toJournalValue } from '../journal/serializable.js';
import { admissionReserveUsd, ROOT_ACCOUNT, type RunBudget, type Spend } from './budget.js';
import {
  ctxRuntimes,
  kBootCheckpoint,
  kFinalizeReserve,
  kOnRunning,
  kTerminalTool,
  type InternalAgentHooks,
} from './internal.js';
import { Semaphore } from './scheduler.js';
import type { ExternalRegistry } from './external.js';

export type ErrorPolicy = 'strict' | 'lenient';

/**
 * The canonical, complete AgentProfile shape; M1 honors description,
 * model, routing, effort, limits, and estCost. A profile never carries
 * a prompt or a schema.
 */
export interface AgentProfile {
  description?: string;
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
  /** Toolset default; the resolved snapshot enters identity via toolsetHash. */
  tools?: ToolsOption;
  /** Chain layers merged over engine defaults. */
  permissions?: AgentProfilePermissions;
  /** Isolation default; the RESOLVED value enters identity. */
  isolation?: IsolationSpec;
  /** Flavor B opt-in lives here or on the call. */
  escalation?: EscalationOptions;
  limits?: UsageLimits;
  /** Transport RetryPolicy layer: call over profile over engine (M4-T05). */
  retry?: RetryPolicy;
  /** Declared task class bridging ModelKnowledge; default unclassified (M4-T09). */
  taskClass?: string;
  /**
   * Per-profile compaction threshold; default 0.8 of the loop model's
   * contextWindow (M4-T03). Compaction is ON by
   * default; history-processor plumbing stays engine-internal.
   */
  compaction?: { threshold?: number };
  /** Admission reserve hint in USD (budget layer 1). */
  estCost?: number;
}

/**
 * Per-spawn options. The
 * identity split is normative: agentType, model/routing/effort (the
 * requested modelSpec), schema (schemaHash), and key enter the content
 * key; everything else is policy or telemetry and never re-keys entries.
 * Fields whose machinery lands later (tools, isolation, escalation,
 * lineage, ladder, retry) arrive with their milestones.
 */
export interface AgentOpts<S extends SchemaSpec = SchemaSpec> {
  agentType?: string;
  /**
   * The primary invocation role of the agent's tool loop; default
   * 'loop'. The plan and orchestrate entry points set it so the
   * resolution chain, role effort defaults, quality floors, and cost
   * buckets see the right role; extract/finalize/summarize stay
   * trigger-derived and are never settable here (M6-T05 amendment).
   */
  role?: 'loop' | 'plan' | 'orchestrate';
  /** Overrides all roles at once. */
  model?: ModelSpec;
  /** Per-role, wins over profile.routing. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Canonical effort, part of identity. */
  effort?: Effort;
  /** schemaHash enters identity. */
  schema?: S;
  /** toolsetHash enters identity; wins over profile.tools. */
  tools?: ToolsOption;
  /** The RESOLVED value enters identity; worktree needs defaults.isolation. */
  isolation?: IsolationSpec;
  /** Explicit discriminator; replaces the prompt in the content key. */
  key?: string;

  onError?: 'throw' | 'null';
  /** Transport RetryPolicy under the journal (M4-T05). */
  retry?: RetryPolicy;
  /**
   * The degenerate fallback (M4-T04): an agent-level
   * second attempt on `model` when the terminal matches `on`; one
   * journaled decision entry; the fallback attempt is a NEW content key.
   */
  fallback?: FallbackField;
  /** Per-call replay mode; default scoped forward-matching. */
  replay?: 'cache' | 'never';
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Opt-in; without it 'escalated' is physically unproducible. */
  escalation?: EscalationOptions;
  /**
   * Lineage continuation (DEF-3): declares this
   * spawn a rebirth of an existing logical task; absence means a new
   * lineage root. Never enters the content key. Declaring lineage or
   * approach journals a spawn-admission decision entry BEFORE dispatch,
   * carrying the engine-minted LTID and the computed approach signature.
   */
  lineage?: SpawnLineageOpt;
  /** Approach slug entering approachSig, normalized by the engine (DEF-3). */
  approach?: string;
  /** Admission reserve hint (USD). */
  estCost?: number;
  /** Merged over profile and engine limits. */
  limits?: UsageLimits;
  result?: 'value' | 'full';

  /** Telemetry only. */
  label?: string;
  /** Enables agent:stream delta events. */
  stream?: boolean;
}

/** One dropped result: its source, scope, entry ref, and wire error. */
export interface DroppedItem {
  source: 'pipeline' | 'agent-onerror-null' | 'parallel-settled';
  /** Scope path of the failed call. */
  scope: string;
  /** Seq of the terminal journal entry when one exists. */
  entryRef?: number;
  label?: string;
  error: WireError;
}

/**
 * The discriminated union over AgentStatus carrying the underlying
 * AgentResult where one exists.
 */
export type Settled<T> =
  | { status: 'ok'; value: T; result?: AgentResult<unknown> }
  | { status: 'error'; error: WireError; result?: AgentResult<unknown> }
  | { status: 'limit'; result: AgentResult<unknown> }
  | { status: 'cancelled'; result?: AgentResult<unknown> }
  | { status: 'skipped'; result: AgentResult<unknown> }
  | { status: 'escalated'; result: EscalatedResult<unknown> };

export type Stage<I, O> = (item: I) => Promise<O>;

/**
 * The rejection carrier of ctx.agent value-form calls: a real Error that
 * structurally satisfies the typed AgentError and carries the full
 * AgentResult for Settled mapping. Deliberately not a RulvarError:
 * AgentError is not in the closed code registry.
 */
export class AgentCallError extends Error implements AgentError {
  readonly kind: AgentError['kind'];
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly issues?: Issue[];
  readonly result: AgentResult<unknown>;
  readonly scope: string;
  readonly entryRef?: number;

  constructor(message: string, result: AgentResult<unknown>, scope: string, entryRef?: number) {
    super(message);
    this.name = 'AgentCallError';
    const error = result.error ?? { kind: 'terminal' as const, retryable: false };
    this.kind = error.kind;
    this.retryable = error.retryable;
    if (error.retryAfterMs !== undefined) {
      this.retryAfterMs = error.retryAfterMs;
    }
    if (error.issues !== undefined) {
      this.issues = error.issues;
    }
    this.result = result;
    this.scope = scope;
    if (entryRef !== undefined) {
      this.entryRef = entryRef;
    }
  }
}

/**
 * Projects a settled AgentResult's error to its wire form, carrying the
 * engine-decided abort class in data. AgentError itself has no data
 * field, so without this every projection past the terminal entry (the
 * run-level outcome.error, thrown AgentCallError wires, dropped items)
 * would keep only the message text and lose the typed class (v1.9.0
 * follow-up review).
 */
export function agentResultWire(result: AgentResult<unknown>, fallbackMessage: string): WireError {
  const wire = agentErrorToWire(
    result.error ?? { kind: 'terminal', retryable: false },
    (result as { errorMessage?: string }).errorMessage ?? fallbackMessage,
  );
  if (result.abortClass === undefined) {
    return wire;
  }
  const data =
    typeof wire.data === 'object' && wire.data !== null && !Array.isArray(wire.data)
      ? wire.data
      : {};
  return { ...wire, data: { ...data, abortClass: result.abortClass } };
}

/** Pipeline results plus the dropped evidence, returned by onItemError: 'collect'. */
export interface PipelineCollected<T> {
  results: T[];
  dropped: DroppedItem[];
}

/** The canonical Ctx interface, M1 members. */
export interface Ctx<P extends ErrorPolicy = 'strict'> {
  agent(prompt: string): Promise<P extends 'lenient' ? string | null : string>;
  agent<S extends SchemaSpec>(
    prompt: string,
    o: AgentOpts<S> & { result: 'full' },
  ): Promise<AgentResult<Out<S>>>;
  agent<S extends SchemaSpec>(
    prompt: string,
    o: AgentOpts<S> & { onError: 'throw' },
  ): Promise<Out<S>>;
  agent<S extends SchemaSpec>(
    prompt: string,
    o?: AgentOpts<S>,
  ): Promise<P extends 'lenient' ? Out<S> | null : Out<S>>;

  parallel<T>(
    tasks: Array<() => Promise<T>>,
    o?: { settle?: false; abortSiblings?: boolean },
  ): Promise<T[]>;
  parallel<T>(tasks: Array<() => Promise<T>>, o: { settle: true }): Promise<Settled<T>[]>;

  pipeline<I, A>(items: I[], s1: Stage<I, A>, o: CollectOpts): Promise<PipelineCollected<A>>;
  pipeline<I, A>(items: I[], s1: Stage<I, A>, o?: PipelineOpts): Promise<A[]>;
  pipeline<I, A, B>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    o: CollectOpts,
  ): Promise<PipelineCollected<B>>;
  pipeline<I, A, B>(items: I[], s1: Stage<I, A>, s2: Stage<A, B>, o?: PipelineOpts): Promise<B[]>;
  pipeline<I, A, B, C>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    o: CollectOpts,
  ): Promise<PipelineCollected<C>>;
  pipeline<I, A, B, C>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    o?: PipelineOpts,
  ): Promise<C[]>;
  pipeline<I, A, B, C, D>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    o: CollectOpts,
  ): Promise<PipelineCollected<D>>;
  pipeline<I, A, B, C, D>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    o?: PipelineOpts,
  ): Promise<D[]>;
  pipeline<I, A, B, C, D, E>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    s5: Stage<D, E>,
    o: CollectOpts,
  ): Promise<PipelineCollected<E>>;
  pipeline<I, A, B, C, D, E>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    s5: Stage<D, E>,
    o?: PipelineOpts,
  ): Promise<E[]>;
  pipeline<I, A, B, C, D, E, F>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    s5: Stage<D, E>,
    s6: Stage<E, F>,
    o: CollectOpts,
  ): Promise<PipelineCollected<F>>;
  pipeline<I, A, B, C, D, E, F>(
    items: I[],
    s1: Stage<I, A>,
    s2: Stage<A, B>,
    s3: Stage<B, C>,
    s4: Stage<C, D>,
    s5: Stage<D, E>,
    s6: Stage<E, F>,
    o?: PipelineOpts,
  ): Promise<F[]>;

  step<T extends Json>(
    label: string,
    fn: () => Promise<T> | T,
    o?: { deps?: Json[]; key?: string },
  ): Promise<T>;

  /**
   * Runs a child workflow under the AdmissionController (M6-T06). The
   * child gets a nested journal scope (registered name
   * plus ordinal) and a hierarchical budget sub-account whose spend
   * propagates to every ancestor. Structural limit violations throw the
   * typed AdmissionRejectedError and never tear the run down; budget
   * rejections throw BudgetExhaustedError. The string form resolves
   * against the per-engine workflow registry and is the
   * only form available inside the worker sandbox.
   */
  workflow<A, R>(wf: Workflow<A, R>, args: A, o?: WorkflowCallOpts): Promise<R>;
  workflow(name: string, args?: Json, o?: WorkflowCallOpts): Promise<unknown>;

  /**
   * Nests a dynamic orchestrator under the AdmissionController (M6-T07):
   * one implementation with the top-level
   * orchestrate(engine, goal, opts) surface, clamped by maxDepth and the
   * parent budget account through the ordinary ctx.workflow admission.
   */
  orchestrate(goal: string, opts?: OrchestrateOptions): Promise<unknown>;

  /**
   * A journaled summarize invocation for handing an inheritable brief to
   * a child (M6-T10): one agent-kind entry under
   * role 'summarize', therefore free on replay.
   */
  brief(o: BriefOpts): Promise<string>;

  /**
   * Suspends this position on a journaled entry until an external
   * resolution arrives. NO deadline in v1.
   */
  awaitExternal<T = Json>(key: string, o?: { schema?: SchemaSpec; prompt?: string }): Promise<T>;

  phase<T>(name: string, fn: () => Promise<T>): Promise<T>;
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: Json): void;

  budget: { spent(): Spend; remaining(): Spend | null };

  now(): number;
  random(key?: string): number;
  uuid(): string;
}

export interface PipelineOpts {
  onItemError?: 'drop' | 'throw';
}

export interface CollectOpts {
  onItemError: 'collect';
}

/** Options of ctx.workflow; `key` replaces args in the child identity. */
export interface WorkflowCallOpts {
  key?: string;
  /** Lineage continuation (DEF-3); embedded in the admission decision entry. */
  lineage?: SpawnLineageOpt;
  /** Approach slug entering approachSig (DEF-3). */
  approach?: string;
}

/**
 * Options of ctx.brief (concrete shape fixed in M6-T10): the content to
 * distill plus an optional instruction;
 * the invocation resolves role 'summarize', so it needs
 * defaults.routing.summarize, a profile, or the explicit model.
 */
export interface BriefOpts {
  content: string;
  instruction?: string;
  model?: ModelSpec;
  agentType?: string;
}

/** Closure-form workflow value; in-process only. */
export interface Workflow<A = unknown, R = unknown> {
  readonly kind: 'workflow';
  readonly name: string;
  readonly argsSchema?: SchemaSpec<A>;
  readonly errorPolicy: ErrorPolicy;
  /**
   * Workflow defaults: the third layer of the resolution chain, under the
   * call override and the agent profile and over the engine defaults.
   * A workflow that declares nothing contributes no layer and resolves
   * exactly as it did before. The layer follows the CALL TREE, not the
   * file: a child spawned through `ctx.workflow` contributes ITS OWN
   * defaults inside its scope, so nesting a cheap workflow under an
   * expensive one does the obvious thing.
   */
  readonly model?: ModelSpec;
  readonly routing?: Partial<Record<InvocationRole, ModelSpec>>;
  readonly effort?: Effort;
  readonly body: (ctx: Ctx<never>, args: A) => Promise<R>;
}

/** The workflow-defaults layer a Workflow value contributes, or nothing. */
function workflowLayerOf(wf: {
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
}): ResolutionLayer | undefined {
  const layer: ResolutionLayer = {};
  if (wf.model !== undefined) {
    layer.model = wf.model;
  }
  if (wf.routing !== undefined) {
    layer.routing = wf.routing;
  }
  if (wf.effort !== undefined) {
    layer.effort = wf.effort;
  }
  // Undefined, not an empty object: an empty layer would still be a layer
  // to merge, and the point is that a silent workflow changes nothing.
  return Object.keys(layer).length === 0 ? undefined : layer;
}

export function defineWorkflow<A, R, P extends ErrorPolicy = 'strict'>(
  meta: {
    name: string;
    args?: SchemaSpec<A>;
    errorPolicy?: P;
    /** Workflow defaults: resolution-chain layer 3. See Workflow. */
    model?: ModelSpec;
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    effort?: Effort;
  },
  body: (ctx: Ctx<P>, args: A) => Promise<R>,
): Workflow<A, R> {
  const wf: Workflow<A, R> = {
    kind: 'workflow',
    name: meta.name,
    errorPolicy: meta.errorPolicy ?? 'strict',
    ...(meta.model === undefined ? {} : { model: meta.model }),
    ...(meta.routing === undefined ? {} : { routing: meta.routing }),
    ...(meta.effort === undefined ? {} : { effort: meta.effort }),
    body: body,
  };
  if (meta.args !== undefined) {
    return { ...wf, argsSchema: meta.args };
  }
  return wf;
}

interface ScopeState {
  scope: string;
  spanId: string;
  /**
   * The enclosing workflow's defaults (resolution-chain layer 3). Rides
   * the scope, not the run, so a child workflow's defaults apply inside
   * its scope and stop at its boundary.
   */
  workflowLayer?: ResolutionLayer;
  phase?: string;
  signal?: AbortSignal;
  /** The nearest enclosing budget account; the run root when absent (M6-T06). */
  budgetScope?: string;
}

/**
 * Span-aware event sink: bodies are stamped into the WorkflowEvent
 * envelope by the per-run EventBus (M1-T10); spanId defaults to the run
 * root span when omitted.
 */
export interface RunEventSink {
  emit(body: { type: string } & Record<string, unknown>, spanId?: string, replayed?: boolean): void;
}

/** Mints span ids in the run > phase > agent > tool > child hierarchy. */
export interface SpanMinter {
  mint(parentSpanId?: string): string;
}

/** Per-run cost attribution buckets consumed by CostReport (M1-T10/T11). */
export interface CostAttribution {
  byModel: Map<string, number>;
  byPhase: Map<string, number>;
  byAgentType: Map<string, number>;
  byRole: Map<InvocationRole, number>;
  unpriced: Array<{ model: string; usage: Usage }>;
  /** The DEF-7 orchestrator block, mutated by the mode (c) machinery. */
  orchestrator: { spentUsd: number; wakes: number; forcedFinish: boolean; reserveUsedUsd: number };
}

/** Everything one run's ctx needs; created per run by the engine (M1-T11). */
export interface RunInternals {
  runId: string;
  replayer: Replayer;
  budget: RunBudget;
  /** The single admission point for all spawns (M6-T06). */
  admission?: AdmissionController;
  semaphore: Semaphore;
  events: RunEventSink;
  spans: SpanMinter;
  /** The run root span; every top-level span parents on it. */
  rootSpanId: string;
  transcripts: TranscriptStore;
  adapters: ReadonlyMap<string, ProviderAdapter>;
  defaults: {
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    profiles?: Record<string, AgentProfile>;
    limits?: UsageLimits;
    /** Engine-wide permission chain layers. */
    permissions?: PermissionConfig;
    /** Engine-wide transport RetryPolicy (M4-T05). */
    retry?: RetryPolicy;
    /** The per-engine workflow registry (consumers: M6 ctx.workflow, M8 worker). */
    workflows?: Record<string, unknown>;
    /** Registered SchemaSpec names for outputSchemaRef (M7-T05). */
    schemas?: Record<string, SchemaSpec>;
    /** Registered tool profile names for toolsetRef (M7-T05). */
    toolsets?: Record<string, ToolsOption>;
    /** Registered mechanical gate profiles (M7-T10). */
    gates?: Record<string, MechanicalGateProfile>;
  };
  /** Engine-scoped per-provider keyed limiter (M4-T07). */
  providerLimiter?: KeyedLimiter;
  /** The configured price table's version; pinned in decision entries (M4-T06). */
  pricingVersion?: string;
  /** budgetDefaults.flatReserveUsd; last resort of the reserve formula. */
  flatReserveUsd?: number;
  /** Hard router constraints from engine config (M4-T09). */
  floors?: QualityFloors;
  errorPolicy: ErrorPolicy;
  dropped: DroppedItem[];
  cost: CostAttribution;
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /** Raw price-row resolution (table wins, caps fallback); undefined = unpriced. */
  pricingOf?: (servedBy: ModelRef) => Pricing | undefined;
  runSignal?: AbortSignal;
  /** The worktree lifecycle provider. */
  isolation?: IsolationProvider;
  /**
   * The ModelKnowledge runtime handle (M10-T03): current()
   * only, commit physically absent. Present only when the engine was
   * given stores.modelKnowledge; absent means the feature is off and
   * no kb entries are ever written.
   */
  knowledge?: ModelKnowledgeHandle;
  /**
   * The InProcessRunner escalation hook: receives
   * escalated results when the call form cannot carry them; its decision
   * is journaled as the authoritative escalation-decision entry.
   */
  onEscalation?: (
    result: EscalatedResult<unknown>,
  ) => EscalationDecision | Promise<EscalationDecision>;
  /** Open external suspensions plus the quiescence activity counter (M2-T08). */
  external?: ExternalRegistry;
  /**
   * Seqs of spawn-admission decisions already paired with a live
   * ctx.agent dispatch this process lifetime, so byte-identical repeats
   * recover THEIR OWN decisions in journal order (DEF-3; M7-T02).
   */
  claimedLineageDecisions?: Set<number>;
  mintTranscriptRef: () => string;
  now: () => number;
}

function bump(map: Map<string, number>, key: string, usd: number): void {
  map.set(key, (map.get(key) ?? 0) + usd);
}

/**
 * Completes a model-authored escalation request into the full report:
 * costToDate and salvage are runtime-filled, never model-filled. The
 * worktree patch ref lands after collect(); the pre-dispose preview for
 * flavor B decision-makers omits it.
 */
function buildEscalationReport(
  request: EscalationRequest,
  result: AgentResult<unknown>,
  worktreePatchRef: string | undefined,
): EscalationReport {
  return {
    kind: request.kind,
    scopeDelta: request.scopeDelta,
    revisedEstimate: request.revisedEstimate,
    blockers: request.blockers ?? [],
    proposedDecomposition: request.proposedDecomposition ?? [],
    costToDate: { usd: result.costUsd, turns: result.turns },
    salvage: {
      transcriptRef: result.transcriptRef,
      artifacts: (result.artifacts ?? []).map((artifact) => artifact.id),
      ...(worktreePatchRef === undefined ? {} : { worktreePatchRef }),
    },
  };
}

/**
 * Creates the per-run Ctx bound to `internals`. The current scope travels
 * through AsyncLocalStorage so parallel branches and pipeline stages keep
 * one ctx object while journaling under their own scope paths (I3:
 * structure from call-and-return only).
 */
export function createCtx(
  internals: RunInternals,
  /**
   * The workflow whose body this ctx runs: its defaults become the root
   * scope's layer 3. Absent for a CompiledWorkflow (the sandbox dialect
   * declares no routing), which then contributes no layer, exactly as
   * before.
   */
  rootWorkflow?: {
    model?: ModelSpec;
    routing?: Partial<Record<InvocationRole, ModelSpec>>;
    effort?: Effort;
  },
): Ctx<ErrorPolicy> {
  const als = new AsyncLocalStorage<ScopeState>();
  const sites = new ParallelSiteCounter();
  const rootWorkflowLayer = rootWorkflow === undefined ? undefined : workflowLayerOf(rootWorkflow);
  const rootState: ScopeState = {
    scope: ROOT_SCOPE,
    spanId: internals.rootSpanId,
    ...(rootWorkflowLayer === undefined ? {} : { workflowLayer: rootWorkflowLayer }),
  };
  const current = (): ScopeState => als.getStore() ?? rootState;

  const capsOf = (ref: ModelRef): ReturnType<ProviderAdapter['caps']> => {
    const colon = ref.indexOf(':');
    const adapterId = ref.slice(0, colon);
    const adapter = internals.adapters.get(adapterId);
    if (adapter === undefined) {
      // Naming the adapters that ARE registered turns the most common
      // routing mistake from a puzzle into a one-line fix: a routing
      // default that crosses providers (the recommended extract default
      // targets OpenAI) trips every engine that registered only one
      // adapter. The router prefixes the role, which is the other half
      // of the answer.
      const registered = [...internals.adapters.keys()].sort();
      throw new ConfigError(
        `no adapter registered for '${adapterId}' (ModelRef '${ref}'); registered: ` +
          `${registered.length === 0 ? '(none)' : registered.join(', ')}. Pass the adapter to ` +
          'createEngine, or route this role to a registered adapter through defaults.routing',
      );
    }
    return adapter.caps(ref.slice(colon + 1));
  };

  const adapterOf = (resolved: ResolvedInvocation): ProviderAdapter => {
    const adapter = internals.adapters.get(resolved.adapterId);
    if (adapter === undefined) {
      throw new ConfigError(`no adapter registered for '${resolved.adapterId}'`);
    }
    return adapter;
  };

  function randValue<T extends number | string>(
    subtype: 'now' | 'random' | 'uuid',
    generate: () => T,
    key?: string,
  ): T {
    const state = current();
    const identity =
      key === undefined
        ? ({ kind: 'rand', subtype } as const)
        : ({ kind: 'rand', subtype, key } as const);
    // The first execution records the live value; every replay returns
    // the journaled value byte-for-byte.
    const matched = internals.replayer.match(state.scope, identity, 'scoped');
    if (matched.kind === 'replay') {
      return (matched.terminal.value as { value: T }).value;
    }
    const value = generate();
    const payload: Record<string, Json> = { subtype, value };
    if (key !== undefined) {
      payload.key = key;
    }
    // Fire-and-forget through the serialized queue; the engine awaits
    // Replayer.flush() before settling the run.
    void internals.replayer.appendSinglePhase({
      scope: state.scope,
      key: deriveContentKey(identity),
      kind: 'rand',
      status: 'ok',
      spanId: state.spanId,
      value: payload,
    });
    return value;
  }

  async function agentImpl<S extends SchemaSpec>(
    prompt: string,
    opts: AgentOpts<S> = {},
  ): Promise<unknown> {
    const state = current();
    const agentType = opts.agentType ?? '';
    let profile: AgentProfile | undefined;
    if (opts.agentType !== undefined) {
      profile = internals.defaults.profiles?.[opts.agentType];
      if (profile === undefined) {
        throw new ConfigError(
          `unknown agentType '${opts.agentType}': register it under defaults.profiles`,
        );
      }
    }
    // The degenerate fallback (M4-T04): one decision
    // entry per failed attempt, re-used on resume by targetRef so a
    // crash between the decision and the fallback spawn never
    // duplicates it; then the whole agent re-enters with the fallback
    // model overriding all roles and no further fallback.
    const runFallbackAttempt = async (
      targetRef: number,
      trigger: FallbackTrigger,
      decisionSpanId: string,
    ): Promise<unknown> => {
      const fallback = opts.fallback as FallbackField;
      const prior = internals.replayer.snapshot().find((entry) => {
        if (entry.kind !== 'decision') {
          return false;
        }
        const value = entry.value as { decisionType?: string; targetRef?: number } | undefined;
        return value?.decisionType === 'model.fallback' && value.targetRef === targetRef;
      });
      if (prior === undefined) {
        internals.events.emit(
          {
            type: 'log',
            level: 'warn',
            msg: `model.fallback: re-attempting on ${fallback.model} after ${trigger}`,
          },
          decisionSpanId,
        );
        await internals.replayer.appendSinglePhase({
          scope: state.scope,
          key: '',
          kind: 'decision',
          status: 'ok',
          spanId: decisionSpanId,
          value: {
            decisionType: 'model.fallback',
            targetRef,
            trigger,
            model: fallback.model,
            // Replayed cost attribution stays stable against later
            // price-table updates (M4-T06).
            ...(internals.pricingVersion === undefined
              ? {}
              : { pricingVersion: internals.pricingVersion }),
          },
        });
      }
      const { fallback: _fallback, routing: _routing, ...rest } = opts;
      void _fallback;
      void _routing;
      return agentImpl<S>(prompt, { ...rest, model: fallback.model });
    };

    // Isolation resolves call over profile; the RESOLVED value enters
    // identity. The worktree lifecycle needs the
    // engine-configured provider.
    const isolation: IsolationSpec = opts.isolation ?? profile?.isolation ?? 'none';
    if (
      typeof isolation === 'object' &&
      isolation.kind === 'worktree' &&
      internals.isolation === undefined
    ) {
      throw new ConfigError(
        'worktree isolation requires an IsolationProvider: pass defaults.isolation to ' +
          'createEngine',
      );
    }

    // Floors ride every resolution of this spawn (M4-T09): the engine
    // config supplies them; the profile's declared taskClass activates
    // the byTaskClass axis.
    const floorContext: { floors?: QualityFloors; taskClass?: string } = {
      ...(internals.floors === undefined ? {} : { floors: internals.floors }),
      ...(profile?.taskClass === undefined ? {} : { taskClass: profile.taskClass }),
    };

    const callLayer: ResolutionLayer = {};
    if (opts.model !== undefined) {
      callLayer.model = opts.model;
    }
    if (opts.routing !== undefined) {
      callLayer.routing = opts.routing;
    }
    if (opts.effort !== undefined) {
      callLayer.effort = opts.effort;
    }
    const profileLayer: ResolutionLayer = {};
    if (profile?.model !== undefined) {
      profileLayer.model = profile.model;
    }
    if (profile?.routing !== undefined) {
      profileLayer.routing = profile.routing;
    }
    if (profile?.effort !== undefined) {
      profileLayer.effort = profile.effort;
    }
    const engineLayer: ResolutionLayer = {};
    if (internals.defaults.routing !== undefined) {
      engineLayer.routing = internals.defaults.routing;
    }
    // Layer 3, between the profile and the engine: the defaults of the
    // workflow whose scope this call sits in. Undefined for a workflow
    // that declares none, which merges as nothing.
    const workflowLayer = state.workflowLayer;

    const telemetryNamespace: Record<string, unknown> = { agentType };
    if (opts.label !== undefined) {
      telemetryNamespace.label = opts.label;
    }
    const withTelemetry = (resolved: ResolvedInvocation): ResolvedInvocation => ({
      ...resolved,
      // The reserved engine-populated telemetry namespace: never
      // identity, consumable by FakeAdapter's agentType/label matching.
      providerOptions: { ...resolved.providerOptions, rulvar: telemetryNamespace },
    });
    // The primary role of the tool loop: 'loop' unless the plan or
    // orchestrate entry points override it (M6-T05).
    const primaryRole = opts.role ?? 'loop';
    const loopResolved = withTelemetry(
      resolveModelInvocation({
        role: primaryRole,
        call: callLayer,
        profile: profileLayer,
        workflow: workflowLayer,
        engine: engineLayer,
        capsOf,
        ...floorContext,
      }),
    );
    for (const scrub of loopResolved.scrubs) {
      internals.events.emit({ type: 'log', level: 'warn', msg: scrub.detail }, state.spanId);
    }

    let canonicalSchema: ReturnType<typeof canonicalizeSchema> | undefined;
    let derivedSchemaHash = EMPTY_SCHEMA_HASH;
    if (opts.schema !== undefined) {
      canonicalSchema = canonicalizeSchema(projectToJsonSchema(opts.schema));
      derivedSchemaHash = schemaHash(canonicalSchema);
    }

    // Escalation opt-in resolves call over profile; without it the
    // escalated status is physically unproducible.
    const escalation = opts.escalation ?? profile?.escalation;
    if (escalation !== undefined) {
      if (escalation.flavor === 'B' && escalation.deadlineMs === undefined) {
        // The knob has NO engine default: enabling
        // Flavor B requires an explicit per-spawn deadlineMs, enforced
        // BEFORE any LLM call and before any journal entry.
        throw new ConfigError(
          "flavor 'B' escalation requires an explicit deadlineMs: the suspension deadline " +
            'has no engine default',
        );
      }
      if (opts.result !== 'full' && internals.onEscalation === undefined) {
        // No channel able to carry the report: fail BEFORE any LLM call
        // and before any journal entry.
        throw new ConfigError(
          'a spawn that opts into escalation from a plain value-form call needs an ' +
            "onEscalation hook (or use result: 'full')",
        );
      }
      if (escalation.flavor === 'B' && escalation.deadlineMs === undefined) {
        // Appendix A interim rule: no engine default deadline; enabling
        // Flavor B requires an explicit deadlineMs.
        throw new ConfigError("escalation flavor 'B' requires an explicit deadlineMs");
      }
    }

    // The toolset snapshot is captured at spawn time and hashed into the
    // spawn's identity; a mid-run source change never mutates an in-flight
    // agent's toolset.
    // The escalate tool registers through the same path as any opt-in
    // tool, so opting in changes toolsetHash by design.
    const declaredTools = opts.tools ?? profile?.tools ?? [];
    const toolset = await resolveToolset(
      escalation === undefined ? declaredTools : [...declaredTools, escalateTool()],
      { runId: internals.runId },
    );

    // Role trigger protocol (M4-T01; predicates in model/roles.ts):
    // extract fires separately
    // only when a schema is set AND (routing sends extract to a
    // different model OR the loop model's required tier cannot ride a
    // tools-available turn OR finalize is routed); finalize fires only
    // when configured in routing and the toolset is non-empty.
    const layers = [callLayer, profileLayer, engineLayer];
    const toolsAvailable = toolset.contracts.length > 0;
    const finalizeRouted = roleConfiguredInRouting('finalize', layers);
    let extract: (PhaseTarget & { fallbacks?: PhaseTarget[] }) | undefined;
    if (opts.schema !== undefined && canonicalSchema !== undefined) {
      const extractResolved = withTelemetry(
        resolveModelInvocation({
          role: 'extract',
          call: callLayer,
          profile: profileLayer,
          workflow: workflowLayer,
          engine: engineLayer,
          capsOf,
          ...floorContext,
        }),
      );
      const loopTier = selectStructuredOutputTier(capsOf(loopResolved.ref), canonicalSchema);
      if (
        needsSeparateExtract({
          schemaSet: true,
          loopRef: loopResolved.ref,
          extractRef: extractResolved.ref,
          loopTier,
          toolsAvailable,
          finalizeRouted,
        })
      ) {
        extract = { adapter: adapterOf(extractResolved), resolved: extractResolved };
        for (const scrub of extractResolved.scrubs) {
          internals.events.emit({ type: 'log', level: 'warn', msg: scrub.detail }, state.spanId);
        }
      }
    }
    let finalize: (PhaseTarget & { fallbacks?: PhaseTarget[] }) | undefined;
    if (finalizeFires({ routed: finalizeRouted, toolsAvailable })) {
      const finalizeResolved = withTelemetry(
        resolveModelInvocation({
          role: 'finalize',
          call: callLayer,
          profile: profileLayer,
          workflow: workflowLayer,
          engine: engineLayer,
          capsOf,
          ...floorContext,
        }),
      );
      finalize = { adapter: adapterOf(finalizeResolved), resolved: finalizeResolved };
      for (const scrub of finalizeResolved.scrubs) {
        internals.events.emit({ type: 'log', level: 'warn', msg: scrub.detail }, state.spanId);
      }
    }

    // Compaction target (M4-T03): the summarize role through the same
    // chain; when no layer resolves a summarize model, fall back to the
    // loop-resolved model (the low role-effort default still applies).
    let summarizeResolved: ResolvedInvocation;
    try {
      summarizeResolved = resolveModelInvocation({
        role: 'summarize',
        call: callLayer,
        profile: profileLayer,
        workflow: workflowLayer,
        engine: engineLayer,
        capsOf,
        ...floorContext,
      });
    } catch {
      summarizeResolved = resolveModelInvocation({
        role: 'summarize',
        call: callLayer,
        profile: profileLayer,
        workflow: workflowLayer,
        engine: { ...engineLayer, model: loopResolved.ref },
        capsOf,
        ...floorContext,
      });
    }
    const summarize: PhaseTarget & { fallbacks?: PhaseTarget[] } = {
      adapter: adapterOf(summarizeResolved),
      resolved: withTelemetry(summarizeResolved),
    };

    // Transport failover chains (M4-T04): each
    // phase's resolved fallbacks re-resolve through the chain with the
    // fallback model overriding all roles, so effort defaults and caps
    // scrubbing apply per serving model. Identity keeps the REQUESTED
    // spec; failover changes only servedBy.
    const failoverChainFor = (role: InvocationRole, resolved: ResolvedInvocation): PhaseTarget[] =>
      (resolved.fallbacks ?? []).map((ref) => {
        const fallbackLayer: ResolutionLayer = { model: ref };
        if (callLayer.effort !== undefined) {
          fallbackLayer.effort = callLayer.effort;
        }
        const fallbackResolved = withTelemetry(
          resolveModelInvocation({
            role,
            call: fallbackLayer,
            profile: profileLayer,
            workflow: workflowLayer,
            engine: engineLayer,
            capsOf,
            ...floorContext,
          }),
        );
        return { adapter: adapterOf(fallbackResolved), resolved: fallbackResolved };
      });
    const loopFallbacks = failoverChainFor(primaryRole, loopResolved);
    if (extract !== undefined) {
      const chain = failoverChainFor('extract', extract.resolved);
      if (chain.length > 0) {
        extract.fallbacks = chain;
      }
    }
    if (finalize !== undefined) {
      const chain = failoverChainFor('finalize', finalize.resolved);
      if (chain.length > 0) {
        finalize.fallbacks = chain;
      }
    }
    {
      const chain = failoverChainFor('summarize', summarizeResolved);
      if (chain.length > 0) {
        summarize.fallbacks = chain;
      }
    }

    // Transport RetryPolicy merge: call over profile over engine; the
    // loop applies the Appendix A default when nothing is configured.
    const retryPolicy = opts.retry ?? profile?.retry ?? internals.defaults.retry;

    const identityInput = {
      kind: 'agent',
      agentType,
      modelSpec: loopResolved.canonical,
      prompt: opts.key ?? prompt,
      schemaHash: derivedSchemaHash,
      toolsetHash: toolset.hash,
      isolation,
    } as const;
    const identityKey = deriveContentKey(identityInput);

    // Scoped forward-matching: a hit synthesizes the
    // result entirely from the journal with zero adapter calls.
    const matched = internals.replayer.match(state.scope, identityInput, opts.replay ?? 'scoped');
    if (matched.kind === 'replay' || matched.kind === 'skip') {
      // Handles are journal-derived and stable across resume (M6-T07):
      // a replayed spawn reports its original dispatch seq.
      (opts as InternalAgentHooks)[kOnRunning]?.(matched.running.seq);
      const terminal = matched.kind === 'replay' ? matched.terminal : matched.terminal;
      const spanId = internals.spans.mint(state.spanId);
      const usage: Usage = terminal?.usage ?? {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      // The same pricing fold the kernel ledger runs: each serving
      // model's slice at its own rate, so a replayed multi-model call
      // reports exactly what the live one did.
      const replayPriced =
        terminal === undefined
          ? undefined
          : priceEntryUsage(terminal, (ref, sliceUsage) => internals.priceUsd(ref, sliceUsage));
      const costUsd = replayPriced?.usd ?? 0;
      const result: AgentResult<unknown> = {
        status:
          matched.kind === 'skip'
            ? 'skipped'
            : ((terminal?.status ?? 'ok') as AgentResult<unknown>['status']),
        output: matched.kind === 'skip' ? null : (terminal?.value ?? null),
        usage,
        costUsd,
        servedBy: terminal?.servedBy ?? loopResolved.ref,
        // Best-effort recovery below: turns are not journaled; the last
        // turn-boundary checkpoint carries the paid-turn count.
        turns: 0,
        transcriptRef: terminal?.transcriptRef ?? '',
      };
      if (terminal?.error !== undefined) {
        result.error = agentErrorFromWire(terminal.error);
        (result as { errorMessage?: string }).errorMessage = terminal.error.message;
      }
      if (terminal?.artifacts !== undefined) {
        result.artifacts = terminal.artifacts as unknown as Artifact[];
      }
      if (terminal?.status === 'escalated' && terminal.escalation !== undefined) {
        // The byte-identical report, zero adapter calls (DEF-1: an
        // escalated entry replays as completed, paid work).
        result.escalation = terminal.escalation as unknown as EscalationReport;
      }
      {
        // Engine-decided abort classes ride the terminal error payload;
        // replay restores whichever class was stamped (no-progress,
        // output-truncated) so a resumed consumer sees the same typed
        // result the live run reported.
        const stamped = (terminal?.error?.data as { abortClass?: AbortClass } | undefined)
          ?.abortClass;
        if (stamped !== undefined) {
          result.abortClass = stamped;
        }
      }
      // Tool results reconstructed from the replayed turn checkpoint are
      // re-emitted with the replay marker.
      let replayedToolResults: Array<{ name: string; isError: boolean }> = [];
      if (matched.kind === 'replay' && terminal?.checkpointRef !== undefined) {
        const blob = await internals.transcripts.get(terminal.checkpointRef);
        const checkpoint = blob === null ? undefined : decodeCheckpoint(blob);
        if (checkpoint !== undefined) {
          result.turns = checkpoint.turns;
          replayedToolResults = checkpoint.messages
            .filter((msg) => msg.role === 'tool')
            .flatMap((msg) => msg.parts)
            .filter((part) => part.type === 'tool-result')
            .map((part) => ({
              name: part.name,
              isError: (part as { isError?: boolean }).isError === true,
            }));
        }
      }
      internals.events.emit(
        {
          type: 'agent:start',
          agentType,
          label: opts.label,
          model: loopResolved.ref,
          role: primaryRole,
        },
        spanId,
        true,
      );
      for (const toolResult of replayedToolResults) {
        internals.events.emit({ type: 'tool:start', toolName: toolResult.name }, spanId, true);
        internals.events.emit(
          {
            type: 'tool:end',
            toolName: toolResult.name,
            outcome: toolResult.isError ? 'error' : 'ok',
            durationMs: 0,
          },
          spanId,
          true,
        );
      }
      internals.events.emit(
        {
          type: 'agent:end',
          agentType,
          label: opts.label,
          status: result.status,
          usage,
          costUsd,
          entryRef: terminal?.seq ?? matched.running.seq,
        },
        spanId,
        true,
      );
      // Replayed spend is already inside the seeded budget fold; only the
      // cost-report buckets accumulate here.
      for (const slice of replayPriced?.priced ?? []) {
        bump(internals.cost.byModel, slice.servedBy, slice.usd);
      }
      for (const slice of replayPriced?.unpriced ?? []) {
        internals.cost.unpriced.push({ model: slice.servedBy, usage: slice.usage });
      }
      bump(internals.cost.byPhase, state.phase ?? '', costUsd);
      bump(internals.cost.byAgentType, agentType, costUsd);
      internals.cost.byRole.set(
        primaryRole,
        (internals.cost.byRole.get(primaryRole) ?? 0) + costUsd,
      );
      if (result.status === 'escalated' && result.escalation !== undefined) {
        // The owner's decision is read from the decision entry, never
        // re-evaluated; a crash between the report and the decision pays
        // for the decision live exactly once.
        const priorDecision = internals.replayer
          .snapshot()
          .find(
            (entry) =>
              entry.kind === 'decision' &&
              (entry.value as { targetRef?: number } | undefined)?.targetRef ===
                matched.running.seq,
          );
        if (
          priorDecision === undefined &&
          opts.result !== 'full' &&
          internals.onEscalation !== undefined
        ) {
          const decision = await Promise.resolve(
            internals.onEscalation(result as EscalatedResult<unknown>),
          );
          await internals.replayer.appendSinglePhase({
            scope: state.scope,
            key: '',
            kind: 'decision',
            status: 'ok',
            spanId,
            value: {
              decisionType: 'escalation.decision',
              targetRef: matched.running.seq,
              decision: decision as unknown as Json,
              countsAgainstLimit: countsAgainstLimit(result.escalation.kind),
            },
          });
        }
      }
      if (opts.fallback !== undefined) {
        const trigger = fallbackTriggerOf(result);
        if (trigger !== undefined && opts.fallback.on.includes(trigger)) {
          return runFallbackAttempt(matched.running.seq, trigger, spanId);
        }
      }
      if (opts.result === 'full') {
        return result;
      }
      if (result.status === 'ok') {
        return result.output;
      }
      if (result.status === 'escalated') {
        throw new AgentCallError(
          `agent escalated: ${result.escalation?.scopeDelta ?? ''}`,
          result,
          state.scope,
          terminal?.seq ?? matched.running.seq,
        );
      }
      const effectivePolicy =
        opts.onError ?? (internals.errorPolicy === 'lenient' ? 'null' : 'throw');
      const replayWire = agentResultWire(result, `agent replayed with status ${result.status}`);
      if (effectivePolicy === 'null') {
        const droppedItem: DroppedItem = {
          source: 'agent-onerror-null',
          scope: state.scope,
          entryRef: terminal?.seq ?? matched.running.seq,
          error: replayWire,
        };
        if (opts.label !== undefined) {
          droppedItem.label = opts.label;
        }
        internals.dropped.push(droppedItem);
        return null;
      }
      throw new AgentCallError(
        replayWire.message,
        result,
        state.scope,
        terminal?.seq ?? matched.running.seq,
      );
    }
    const danglingRunning = matched.kind === 'rerun-dangling' ? matched.running : undefined;

    // A declared lineage block or approach tag journals ONE
    // spawn-admission decision entry strictly BEFORE dispatch (DEF-3):
    // the engine-minted LTID and the computed
    // approach signature ride the entry's value part and are read back on
    // resume, never re-minted. Applicability outside PlanRunner is per
    // declared lineage only.
    if (
      (opts.lineage !== undefined || opts.approach !== undefined) &&
      internals.admission !== undefined
    ) {
      const admission = internals.admission;
      const claimed = (internals.claimedLineageDecisions ??= new Set<number>());
      const prior = internals.replayer.snapshot().find((entry) => {
        if (entry.kind !== 'decision' || claimed.has(entry.seq)) {
          return false;
        }
        const value = entry.value as
          | { decisionType?: string; origin?: string; attemptScope?: string; spawnKey?: string }
          | undefined;
        return (
          value?.decisionType === 'spawn-admission' &&
          value.origin === 'ctx.agent' &&
          value.attemptScope === state.scope &&
          value.spawnKey === identityKey
        );
      });
      if (prior !== undefined) {
        // Replay reads the recorded verdict; a journaled rejection is
        // re-issued without re-evaluation.
        claimed.add(prior.seq);
        const recorded = prior.value as {
          reject?: { code: string };
        };
        if (recorded.reject !== undefined) {
          internals.events.emit(
            {
              type: 'spawn:rejected',
              entryRef: prior.seq,
              code: recorded.reject.code,
              agentType,
            },
            state.spanId,
            true,
          );
          throw new AdmissionRejectedError(
            `lineage admission rejected agent spawn (${recorded.reject.code}; recorded verdict)`,
            { data: { reason: recorded.reject as unknown as Json } },
          );
        }
      } else {
        const evaluated = admission.evaluateLineage({
          name: agentType,
          ...(opts.lineage === undefined ? {} : { lineage: opts.lineage }),
          ...(opts.approach === undefined ? {} : { approach: opts.approach }),
          signature: {
            agentType,
            toolsetHash: toolset.hash,
            schemaHash: derivedSchemaHash,
            isolation: canonicalIsolationTag(isolation),
          },
        });
        const decisionValue: {
          decisionType: 'spawn-admission';
          origin: 'ctx.agent';
          attemptScope: string;
          spawnKey: string;
          childScope: string;
          statsBefore?: LineageStats;
          lineage?: SpawnLineage;
          reject?: { code: string };
        } = {
          decisionType: 'spawn-admission',
          origin: 'ctx.agent',
          attemptScope: state.scope,
          spawnKey: identityKey,
          // ctx.agent roots are appended in the calling scope; the
          // lineage fold binds attempts by this slot.
          childScope: state.scope,
          ...(evaluated.statsBefore === undefined ? {} : { statsBefore: evaluated.statsBefore }),
        };
        if (evaluated.decision.kind === 'reject') {
          decisionValue.reject = { code: evaluated.decision.reason.code };
        } else {
          decisionValue.lineage = evaluated.decision.lineage;
        }
        const decisionEntry = await internals.replayer.appendSinglePhase({
          scope: state.scope,
          key: '',
          kind: 'decision',
          status: 'ok',
          spanId: internals.spans.mint(state.spanId),
          value: decisionValue,
        });
        if (evaluated.decision.kind === 'reject') {
          internals.events.emit(
            {
              type: 'spawn:rejected',
              entryRef: decisionEntry.seq,
              code: evaluated.decision.reason.code,
              agentType,
            },
            state.spanId,
          );
          throw new AdmissionRejectedError(
            `lineage admission rejected agent spawn (${evaluated.decision.reason.code})`,
            { data: { reason: evaluated.decision.reason as unknown as Json } },
          );
        }
        admission.registerLineageAdmit(evaluated.decision.lineage.logicalTaskId);
      }
    }

    const adapter = adapterOf(loopResolved);
    const caps = adapter.caps(loopResolved.model);
    const limits = mergeUsageLimits(opts.limits, profile?.limits, internals.defaults.limits);
    let inputTokens: number | undefined;
    if (opts.estCost === undefined && profile?.estCost === undefined && adapter.countTokens) {
      try {
        inputTokens = await adapter.countTokens({
          model: loopResolved.model,
          messages: [{ role: 'user', parts: [{ type: 'text', text: prompt }] }],
        });
      } catch {
        inputTokens = undefined;
      }
    }
    const reserveOptions: Parameters<typeof admissionReserveUsd>[0] = { caps };
    if (opts.estCost !== undefined) {
      reserveOptions.estCost = opts.estCost;
    }
    if (profile?.estCost !== undefined) {
      reserveOptions.profileEstCost = profile.estCost;
    }
    if (inputTokens !== undefined) {
      reserveOptions.inputTokens = inputTokens;
    }
    if (limits.maxOutputTokensPerTurn !== undefined) {
      reserveOptions.maxOutputTokensPerTurn = limits.maxOutputTokensPerTurn;
    }
    if (internals.flatReserveUsd !== undefined) {
      reserveOptions.flatReserveUsd = internals.flatReserveUsd;
    }
    // An unpriced model spends zero against a USD ceiling by definition
    // (the once-per-model warning and CostReport.unpriced say so out
    // loud), so a dollar reserve for it would deny work while bounding
    // nothing. An explicit estCost still wins: that is the host speaking.
    const unpriced =
      internals.pricingOf !== undefined && internals.pricingOf(loopResolved.ref) === undefined;
    const reserve =
      unpriced && opts.estCost === undefined && profile?.estCost === undefined
        ? 0
        : admissionReserveUsd(reserveOptions);
    const budgetAccount = state.budgetScope ?? ROOT_ACCOUNT;
    // The reserve never exceeds the tightest allowance on the account
    // chain: an allowance ceiling already bounds this spawn's lifetime
    // spend, so an estimate above it must clamp, not deny (the layer-2
    // admission applies the same childCeiling clamp; this is what makes
    // an admitted plan op dispatchable by construction). A FULL
    // allowance still rejects inside admitSpawn.
    const allowanceHeadroomUsd = internals.budget.allowanceHeadroomOf(budgetAccount);
    internals.budget.admitSpawn(
      allowanceHeadroomUsd === undefined ? reserve : Math.min(reserve, allowanceHeadroomUsd),
      budgetAccount,
    );

    // Worktree lifecycle: acquired before the
    // dispatch entry so an acquire failure never leaves a dangling
    // running entry. A dangling redispatch acquires a FRESH tree from the
    // same ref; tools are at-least-once and SHOULD be idempotent.
    let acquired:
      Awaited<ReturnType<NonNullable<RunInternals['isolation']>['acquire']>> | undefined;
    if (typeof isolation === 'object' && isolation.kind === 'worktree') {
      const acquireInput: { runId: string; spanId: string; ref?: string } = {
        runId: internals.runId,
        spanId: state.spanId,
      };
      if (isolation.ref !== undefined) {
        acquireInput.ref = isolation.ref;
      }
      acquired = await internals.isolation?.acquire(acquireInput);
    }

    const spanId = internals.spans.mint(state.spanId);
    // memoizeOutcome is a policy field fixed in the entry payload at
    // dispatch time; the M2 predicate reads it from the ENTRY, never
    // from current code.
    let running: JournalEntry;
    if (danglingRunning !== undefined) {
      // At-least-once redispatch: the terminal will reference the
      // original dispatch entry.
      running = danglingRunning;
    } else {
      const runningInput: Parameters<Replayer['appendRunning']>[0] = {
        scope: state.scope,
        key: identityKey,
        kind: 'agent',
        spanId,
      };
      if (opts.memoizeOutcome !== undefined) {
        runningInput.memoizeOutcome = opts.memoizeOutcome;
      }
      {
        // The resolved isolation is recorded on the dispatch root so the
        // DedupIndex donor rules can read it from the journal (worktree
        // grafts degrade unless pinned). 'none' stays
        // implicit, so isolation-free journals are byte-identical.
        const isolationTag = canonicalIsolationTag(isolation);
        if (isolationTag !== 'none') {
          runningInput.value = { isolation: isolationTag };
        }
      }
      running = await internals.replayer.appendRunning(runningInput);
    }
    (opts as InternalAgentHooks)[kOnRunning]?.(running.seq);

    const agentSink = {
      emit: (body: { type: string } & Record<string, unknown>) =>
        internals.events.emit(body, spanId),
    };
    // Turn-boundary checkpoints live at a deterministic ref derived from
    // the dispatch seq, overwritten per boundary; only a dangling
    // redispatch restores (cancelled entries rerun from scratch per the
    // predicate).
    const ckptRef = checkpointRefFor(internals.runId, running.seq);
    let checkpointWritten = false;
    const checkpointPlumbing: NonNullable<Parameters<typeof runAgent<S>>[0]['checkpoint']> = {
      load: async () => {
        if (danglingRunning === undefined) {
          // Park/unpark continuation and the DEF-5 graft boot (M7-T08):
          // a fresh dispatch may boot from a retained donor checkpoint.
          const bootRef = (opts as InternalAgentHooks)[kBootCheckpoint];
          if (bootRef !== undefined) {
            const donorBlob = await internals.transcripts.get(bootRef);
            return donorBlob === null ? undefined : decodeCheckpoint(donorBlob);
          }
          return undefined;
        }
        const blob = await internals.transcripts.get(ckptRef);
        return blob === null ? undefined : decodeCheckpoint(blob);
      },
      save: async (checkpointState) => {
        await internals.transcripts.put(ckptRef, encodeCheckpoint(checkpointState));
        checkpointWritten = true;
      },
    };
    const branchOrRunSignal = state.signal ?? internals.runSignal;
    let toolRuntime: ToolRuntime | undefined;
    if (toolset.tools.length > 0) {
      const toolSignals: AbortSignal[] = [];
      if (branchOrRunSignal !== undefined) {
        toolSignals.push(branchOrRunSignal);
      }
      if (internals.budget.signal !== undefined) {
        toolSignals.push(internals.budget.signal);
      }
      const toolSignal =
        toolSignals.length > 0 ? AbortSignal.any(toolSignals) : new AbortController().signal;
      const contextFor = (): ReturnType<typeof buildToolContext> =>
        buildToolContext({
          runId: internals.runId,
          agentType,
          ...(opts.label === undefined ? {} : { label: opts.label }),
          cwd: acquired?.cwd ?? process.cwd(),
          isolation,
          signal: toolSignal,
          mintSpan: () => internals.spans.mint(spanId),
          emitLog: (toolSpanId, level, msg, data) =>
            internals.events.emit(
              data === undefined ? { type: 'log', level, msg } : { type: 'log', level, msg, data },
              toolSpanId,
            ),
        });
      // The chain is the single approval surface for every dispatch,
      // regardless of tool origin. Profile layers
      // merge over engine defaults; an ask verdict suspends on the
      // journal in the agent's child scope.
      const compiledChain = compilePermissionChain(
        internals.defaults.permissions,
        profile?.permissions,
      );
      // 'readonly' isolation compiles a deny rule for tools declaring
      // risk write or destructive into this spawn's chain (tools guide,
      // IsolationSpec table). Worktree isolation isolates the filesystem
      // instead, and 'none' adds nothing.
      const readonlyDeny: PermissionRule = { risk: ['write', 'destructive'] };
      const chain =
        isolation === 'readonly'
          ? { ...compiledChain, deny: [...compiledChain.deny, readonlyDeny] }
          : compiledChain;
      toolRuntime = {
        defs: toolset.tools,
        contracts: toolset.contracts,
        contextFor,
        permission: async (call) => {
          const def = toolset.tools.find((candidate) => candidate.name === call.name);
          if (def === undefined) {
            // Unknown names fall through: the loop reports them to the
            // model as error tool results.
            return { kind: 'allow', input: call.args };
          }
          const verdict = await evaluatePermission(chain, def, call.args, contextFor());
          // Audit telemetry rides tool:end (M5-T05).
          const audit = {
            verdict: verdict.verdict,
            decidedBy: verdict.decidedBy,
            ...('rule' in verdict && verdict.rule !== undefined
              ? { rule: verdict.rule as unknown as Json }
              : {}),
            ...(verdict.advisory === undefined
              ? {}
              : { advisory: verdict.advisory as unknown as Json }),
          };
          if (verdict.verdict === 'allow') {
            return { kind: 'allow', input: verdict.input, audit };
          }
          if (verdict.verdict === 'deny') {
            return {
              kind: 'deny',
              audit,
              reason:
                verdict.decidedBy === 'deny-rule'
                  ? 'a deny rule matched'
                  : `denied by ${verdict.decidedBy}`,
            };
          }
          return {
            kind: 'ask',
            audit,
            input: verdict.input,
            suspend: async () => {
              if (internals.external === undefined) {
                throw new ConfigError(
                  'tool approvals require the engine run context (createEngine)',
                );
              }
              return internals.external.awaitApproval({
                scope: agentScope(state.scope, running.seq),
                spanId: internals.spans.mint(spanId),
                toolName: call.name,
                input: verdict.input as Json,
                ...(def.risk === undefined ? {} : { risk: def.risk }),
                onPending: (entry, replayed) =>
                  internals.events.emit(
                    { type: 'approval:pending', toolName: call.name, entryRef: entry.seq },
                    spanId,
                    replayed,
                  ),
              });
            },
          };
        },
      };
    }
    const runAgentOptions: Parameters<typeof runAgent<S>>[0] = {
      prompt,
      adapter,
      resolved: loopResolved,
      limits,
      events: agentSink,
      transcript: {
        mintRef: internals.mintTranscriptRef,
        put: (ref, blob) => internals.transcripts.put(ref, blob),
      },
      budget: {
        beforeTurn: () => internals.budget.beforeTurn(budgetAccount),
        maxAffordableOutputTokens: (servedBy, estimatedInputTokens) =>
          internals.budget.maxAffordableOutputTokens(servedBy, estimatedInputTokens, budgetAccount),
        onUsage: (usage, servedBy) => internals.budget.onUsage(usage, servedBy, budgetAccount),
        // Layer 3 severs through the whole account chain: the account's
        // own subtree signal composed with the run root (M6-T06).
        signal:
          budgetAccount === ROOT_ACCOUNT
            ? internals.budget.signal
            : AbortSignal.any(
                [internals.budget.signal, internals.budget.signalOf(budgetAccount)].filter(
                  (signal): signal is AbortSignal => signal !== undefined,
                ),
              ),
      },
      priceUsd: internals.priceUsd,
      agentType,
      role: primaryRole,
      now: internals.now,
    };
    if (toolRuntime !== undefined) {
      runAgentOptions.tools = toolRuntime;
    }
    if (escalation !== undefined) {
      runAgentOptions.escalation = { minSpendUsd: escalation.minSpendUsd ?? 0 };
    }
    const terminalTool = (opts as InternalAgentHooks)[kTerminalTool];
    if (terminalTool !== undefined) {
      runAgentOptions.terminalTool = terminalTool;
    }
    runAgentOptions.checkpoint = checkpointPlumbing;
    if (opts.schema !== undefined) {
      runAgentOptions.schema = opts.schema;
    }
    if (canonicalSchema !== undefined) {
      runAgentOptions.canonicalSchema = canonicalSchema;
    }
    if (extract !== undefined) {
      runAgentOptions.extract = extract;
    }
    if (finalize !== undefined) {
      runAgentOptions.finalize = finalize;
    }
    runAgentOptions.summarize = summarize;
    if (profile?.compaction !== undefined) {
      runAgentOptions.compaction = profile.compaction;
    }
    if (loopFallbacks.length > 0) {
      runAgentOptions.fallbacks = loopFallbacks;
    }
    if (retryPolicy !== undefined) {
      runAgentOptions.retry = { policy: retryPolicy };
    }
    if (internals.providerLimiter !== undefined) {
      const limiter = internals.providerLimiter;
      runAgentOptions.providerSlot = (key, fn) =>
        limiter.withSlot(key, fn, () =>
          internals.events.emit(
            { type: 'agent:queued', agentType, label: opts.label, providerKey: key },
            spanId,
          ),
        );
    }
    if (opts.stream !== undefined) {
      runAgentOptions.stream = opts.stream;
    }
    if (opts.label !== undefined) {
      runAgentOptions.label = opts.label;
    }
    if (branchOrRunSignal !== undefined) {
      runAgentOptions.signal = branchOrRunSignal;
    }

    const exitActivity = internals.external?.enter();
    let result: Awaited<ReturnType<typeof runAgent<S>>>;
    try {
      result = await internals.semaphore.withSlot(
        () => runAgent<S>(runAgentOptions),
        () => internals.events.emit({ type: 'agent:queued', agentType, label: opts.label }, spanId),
      );
    } finally {
      exitActivity?.();
    }
    internals.budget.releaseReserve(reserve, budgetAccount);

    // Flavor B: the accepted escalate call suspends on the approval
    // machinery with a journaled
    // deadline; the decision resolution closes it FIRST, and dispose plus
    // the terminal escalated entry are effects strictly after it. The
    // worktree stays alive until the decision so salvage collection
    // precedes destruction.
    let flavorBDecision: EscalationDecision | undefined;
    if (
      result.status === 'escalated' &&
      escalation?.flavor === 'B' &&
      result.escalationRequest !== undefined
    ) {
      if (internals.external === undefined) {
        throw new ConfigError('flavor B escalation requires the engine run context');
      }
      const request = result.escalationRequest;
      const deadlineMs = escalation.deadlineMs;
      if (deadlineMs === undefined) {
        throw new ConfigError("flavor 'B' escalation requires an explicit deadlineMs");
      }
      // An absent defaultDecision canonicalizes to accept at the timeout.
      const defaultDecision: EscalationDecision = escalation.defaultDecision ?? {
        kind: 'accept',
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const decisionOutcome = await internals.external.awaitDecision({
        scope: agentScope(state.scope, running.seq),
        spanId: internals.spans.mint(spanId),
        toolName: 'escalate',
        input: request as unknown as Json,
        deadlineAt: new Date(internals.now() + deadlineMs).toISOString(),
        onPending: (entry, replayed) => {
          internals.events.emit(
            { type: 'approval:pending', toolName: 'escalate', entryRef: entry.seq },
            spanId,
            replayed,
          );
          // The journaled deadlineAt survives resume: the timer re-arms
          // from the ENTRY, not from config.
          const registry = internals.external;
          const dueAt = Date.parse(entry.deadlineAt ?? '') || internals.now();
          timer = setTimeout(
            () => {
              void registry
                ?.submitResolution(entry.seq, { by: 'timeout', value: defaultDecision })
                .catch(() => undefined);
            },
            Math.max(0, dueAt - internals.now()),
          );
          // A live decision races the timer through the arbiter;
          // first-closing-wins, the loser journals as noop (DEF-4).
          if (internals.onEscalation !== undefined) {
            const preview = buildEscalationReport(request, result, undefined);
            const previewResult = {
              ...result,
              escalation: preview,
            } as EscalatedResult<unknown>;
            void Promise.resolve(internals.onEscalation(previewResult))
              .then((decision) =>
                registry?.submitResolution(entry.seq, {
                  by: 'external',
                  value: decision,
                }),
              )
              .catch(() => undefined);
          }
        },
      });
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      flavorBDecision = decisionOutcome.value as unknown as EscalationDecision;
    }

    // collect() before dispose: the patch lands in TranscriptStore and
    // its reference in AgentResult.artifacts; applying it stays with the
    // caller.
    if (acquired !== undefined) {
      try {
        const { files, patch } = await acquired.collect();
        const patchRef = internals.mintTranscriptRef();
        await internals.transcripts.put(patchRef, patch);
        const artifact: Artifact = { id: 'worktree-patch', kind: 'patch', files, ref: patchRef };
        result.artifacts = [...(result.artifacts ?? []), artifact];
      } catch (thrown) {
        internals.events.emit(
          {
            type: 'log',
            level: 'warn',
            msg: `worktree collect failed: ${thrown instanceof Error ? thrown.message : String(thrown)}`,
          },
          spanId,
        );
      }
      await acquired.dispose(result.status !== 'ok' && result.status !== 'escalated');
    }

    // The full report: runtime fills costToDate and salvage, validated
    // BEFORE append.
    if (result.status === 'escalated' && result.escalationRequest !== undefined) {
      const patchRef = result.artifacts?.find((artifact) => artifact.kind === 'patch')?.ref;
      const report = buildEscalationReport(result.escalationRequest, result, patchRef);
      const issues = await validateEscalationReport(report);
      if (issues.length > 0) {
        throw new ConfigError(
          'escalation report failed validation before append: ' +
            issues.map((issue) => issue.message).join('; '),
        );
      }
      result.escalation = report;
      delete result.escalationRequest;
    }

    const terminalPatch: Parameters<Replayer['appendTerminal']>[1] = {
      status: result.status === 'skipped' ? 'error' : result.status,
      usage: result.usage,
      // Under transport failover only servedBy changes, never the
      // content key (M4-T04).
      servedBy: result.servedBy,
      // Present only when the call genuinely spanned models; every cost
      // fold then prices each slice at its own rate instead of billing
      // the whole call at the loop model's.
      ...(result.usageByModel === undefined ? {} : { usageByModel: result.usageByModel }),
      // The attribution facts behind the CostReport breakdowns: policy,
      // never identity. Folding these from the journal is what makes a
      // replayed run report the same numbers byte for byte instead of
      // mixing the persistent ledger with this process's buckets.
      costAttribution: {
        ...(state.phase === undefined ? {} : { phase: state.phase }),
        agentType,
        role: primaryRole,
        budgetAccount: state.budgetScope ?? ROOT_ACCOUNT,
        ...((opts as InternalAgentHooks)[kFinalizeReserve] === true
          ? { finalizeReserve: true }
          : {}),
      },
      transcriptRef: result.transcriptRef,
    };
    if (result.status === 'escalated' && result.escalation !== undefined) {
      terminalPatch.escalation = result.escalation;
    }
    if (result.output !== null && result.status === 'ok') {
      terminalPatch.value = result.output;
    }
    if (result.error !== undefined) {
      terminalPatch.error = agentErrorToWire(
        result.error,
        result.errorMessage ?? `agent terminated with status ${result.status}`,
      );
    }
    if ((result as { usageApprox?: boolean }).usageApprox === true) {
      terminalPatch.usageApprox = true;
    }
    if (result.artifacts !== undefined) {
      terminalPatch.artifacts = result.artifacts;
    }
    if (result.abortClass !== undefined) {
      // An engine-decided abort replays on every resume: memoizeOutcome
      // stamped on the TERMINAL, the class marker in the error payload
      // (M3-T08 for no-progress; the v1.9.0 follow-up review added
      // output-truncated). The work is paid, so a rerun would only
      // re-pay the same bounded failure.
      terminalPatch.memoizeOutcome = true;
      if (terminalPatch.error !== undefined) {
        const priorData = terminalPatch.error.data;
        const dataRecord =
          typeof priorData === 'object' && priorData !== null && !Array.isArray(priorData)
            ? priorData
            : {};
        terminalPatch.error = {
          ...terminalPatch.error,
          data: { ...dataRecord, abortClass: result.abortClass },
        };
      }
    }
    if (checkpointWritten) {
      terminalPatch.checkpointRef = ckptRef;
    }
    const terminal = await internals.replayer.appendTerminal(running.seq, terminalPatch);
    internals.events.emit(
      {
        type: 'agent:end',
        agentType,
        label: opts.label,
        status: result.status,
        usage: result.usage,
        costUsd: result.costUsd,
        entryRef: terminal.seq,
      },
      spanId,
    );

    // Ordering: the terminal escalated entry
    // strictly BEFORE the decision entry recording the owner's decision;
    // the decision entry strictly before its effects. countsAgainstLimit
    // derives once, live, from the report kind (XF-06).
    if (result.status === 'escalated' && result.escalation !== undefined) {
      let decision = flavorBDecision;
      if (
        decision === undefined &&
        opts.result !== 'full' &&
        internals.onEscalation !== undefined
      ) {
        decision = await Promise.resolve(
          internals.onEscalation(result as EscalatedResult<unknown>),
        );
      }
      if (decision !== undefined) {
        await internals.replayer.appendSinglePhase({
          scope: state.scope,
          key: '',
          kind: 'decision',
          status: 'ok',
          spanId,
          value: {
            decisionType: 'escalation.decision',
            targetRef: running.seq,
            decision: decision as unknown as Json,
            countsAgainstLimit: countsAgainstLimit(result.escalation.kind),
          },
        });
      }
    }

    // Cost attribution buckets (CostReport). byModel is keyed by the
    // SERVING model, the same key the journal fold uses, so a run's live
    // breakdown and its replayed one cannot disagree; and a call that
    // spanned models contributes one bucket per model at its own rate.
    const usd = result.costUsd;
    for (const slice of result.usageByModel ?? [
      { servedBy: result.servedBy, usage: result.usage },
    ]) {
      const priced = internals.priceUsd(slice.servedBy, slice.usage);
      if (priced === undefined) {
        internals.cost.unpriced.push({ model: slice.servedBy, usage: slice.usage });
        continue;
      }
      bump(internals.cost.byModel, slice.servedBy, priced);
    }
    bump(internals.cost.byPhase, state.phase ?? '', usd);
    bump(internals.cost.byAgentType, agentType, usd);
    internals.cost.byRole.set(primaryRole, (internals.cost.byRole.get(primaryRole) ?? 0) + usd);

    // Uniform ceiling behavior: every ctx primitive throws
    // BudgetExhaustedError at the run ceiling. The message names the
    // account that actually closed: blaming the run ceiling while only
    // an orchestrator cap had crossed misled the v1.6.0 follow-up
    // review's live probe.
    if (result.error?.kind === 'budget' || (internals.budget.exhausted && result.status !== 'ok')) {
      const diagnostics = internals.budget.exhaustionDiagnostics(state.budgetScope ?? ROOT_ACCOUNT);
      const crossed = diagnostics.crossed;
      const rootSuffix =
        `run root: spent ${diagnostics.root.spentUsd.toFixed(4)}` +
        (diagnostics.root.ceilingUsd === undefined
          ? ' USD, no ceiling'
          : ` of ${diagnostics.root.ceilingUsd.toFixed(4)} USD`);
      const message =
        crossed === undefined || crossed.source === 'root'
          ? 'run budget ceiling reached during agent execution'
          : (crossed.source === 'orchestrator-cap'
              ? 'orchestrator budget cap reached during agent execution'
              : 'budget sub-account ceiling reached during agent execution') +
            ` (account '${crossed.scope}': spent ${crossed.spentUsd.toFixed(4)}` +
            (crossed.committedReserveUsd + crossed.finalizeReserveUsd > 0
              ? ` plus ${(crossed.committedReserveUsd + crossed.finalizeReserveUsd).toFixed(4)} reserved`
              : '') +
            ` of ${crossed.ceilingUsd.toFixed(4)} USD; ${rootSuffix})`;
      throw new BudgetExhaustedError(message, {
        data: {
          scope: state.scope,
          entryRef: terminal.seq,
          source: crossed?.source ?? 'root',
          rootSpentUsd: diagnostics.root.spentUsd,
          ...(diagnostics.root.ceilingUsd === undefined
            ? {}
            : { rootCeilingUsd: diagnostics.root.ceilingUsd }),
          ...(crossed === undefined
            ? {}
            : {
                crossedScope: crossed.scope,
                crossedCeilingUsd: crossed.ceilingUsd,
                crossedSpentUsd: crossed.spentUsd,
                crossedCommittedReserveUsd: crossed.committedReserveUsd,
                crossedFinalizeReserveUsd: crossed.finalizeReserveUsd,
              }),
        },
      });
    }

    if (opts.fallback !== undefined) {
      const trigger = fallbackTriggerOf(result);
      if (trigger !== undefined && opts.fallback.on.includes(trigger)) {
        return runFallbackAttempt(running.seq, trigger, spanId);
      }
    }

    if (opts.result === 'full') {
      return result;
    }
    if (result.status === 'ok') {
      return result.output;
    }
    if (result.status === 'escalated') {
      // Never an error: onError does not fire and 'null' never swallows
      // the report; the typed carrier reaches the caller (and Settled
      // maps it to a settled outcome).
      throw new AgentCallError(
        `agent escalated: ${result.escalation?.scopeDelta ?? ''}`,
        result,
        state.scope,
        terminal.seq,
      );
    }

    const effectiveOnError =
      opts.onError ?? (internals.errorPolicy === 'lenient' ? 'null' : 'throw');
    const wire = agentResultWire(result, `agent terminated with status ${result.status}`);
    if (effectiveOnError === 'null') {
      const droppedItem: DroppedItem = {
        source: 'agent-onerror-null',
        scope: state.scope,
        entryRef: terminal.seq,
        error: wire,
      };
      if (opts.label !== undefined) {
        droppedItem.label = opts.label;
      }
      internals.dropped.push(droppedItem);
      return null;
    }
    throw new AgentCallError(wire.message, result, state.scope, terminal.seq);
  }

  async function parallelImpl<T>(
    tasks: Array<() => Promise<T>>,
    o?: { settle?: boolean; abortSiblings?: boolean },
  ): Promise<T[] | Settled<T>[]> {
    const state = current();
    const site = sites.next(state.scope);
    const settle = o?.settle === true;
    const abortSiblings = settle ? false : (o?.abortSiblings ?? internals.errorPolicy === 'strict');

    const controllers = tasks.map(() => new AbortController());
    const outcomes = await Promise.allSettled(
      tasks.map((task, branch) => {
        const upstream = state.signal ?? internals.runSignal;
        const branchSignal =
          upstream === undefined
            ? controllers[branch].signal
            : AbortSignal.any([upstream, controllers[branch].signal]);
        const branchState: ScopeState = {
          scope: parallelScope(state.scope, site, branch),
          spanId: internals.spans.mint(state.spanId),
          signal: branchSignal,
        };
        if (state.phase !== undefined) {
          branchState.phase = state.phase;
        }
        if (state.budgetScope !== undefined) {
          branchState.budgetScope = state.budgetScope;
        }
        const promise = als.run(branchState, task);
        if (abortSiblings) {
          promise.catch((thrown: unknown) => {
            // Only error-class failures abort siblings; a 'limit' branch is
            // a settled outcome and never aborts. Budget exhaustion severs
            // globally by itself.
            const isLimitLike =
              thrown instanceof AgentCallError &&
              (thrown.result.status === 'limit' ||
                thrown.result.status === 'cancelled' ||
                thrown.result.status === 'escalated');
            if (!isLimitLike && !(thrown instanceof BudgetExhaustedError)) {
              for (const [i, controller] of controllers.entries()) {
                if (i !== branch) {
                  controller.abort('rulvar:sibling-failed');
                }
              }
            }
          });
        }
        return promise;
      }),
    );

    const budgetRejection = outcomes.find(
      (r): r is PromiseRejectedResult =>
        r.status === 'rejected' && r.reason instanceof BudgetExhaustedError,
    );
    if (budgetRejection !== undefined) {
      throw budgetRejection.reason;
    }

    if (settle) {
      return outcomes.map((outcome, branch): Settled<T> => {
        if (outcome.status === 'fulfilled') {
          return { status: 'ok', value: outcome.value };
        }
        const reason: unknown = outcome.reason;
        if (reason instanceof AgentCallError) {
          const status = reason.result.status;
          if (status === 'limit') {
            return { status: 'limit', result: reason.result };
          }
          if (status === 'cancelled') {
            return { status: 'cancelled', result: reason.result };
          }
          if (status === 'escalated') {
            // A settled outcome, exactly like limit: onError does not
            // fire and no DroppedItem is recorded.
            return { status: 'escalated', result: reason.result as EscalatedResult<unknown> };
          }
          const wire = agentErrorToWire(
            reason.result.error ?? { kind: 'terminal', retryable: false },
            reason.message,
          );
          const droppedItem: DroppedItem = {
            source: 'parallel-settled',
            scope: parallelScope(state.scope, site, branch),
            error: wire,
          };
          if (reason.entryRef !== undefined) {
            droppedItem.entryRef = reason.entryRef;
          }
          internals.dropped.push(droppedItem);
          return { status: 'error', error: wire, result: reason.result };
        }
        const wire: WireError =
          reason instanceof RulvarError
            ? reason.toWire()
            : {
                code: 'error',
                message: reason instanceof Error ? reason.message : String(reason),
                retryable: false,
              };
        internals.dropped.push({
          source: 'parallel-settled',
          scope: parallelScope(state.scope, site, branch),
          error: wire,
        });
        return { status: 'error', error: wire };
      });
    }

    // Non-settle: resolve in SOURCE order, or reject after all branches
    // settle. Error-class rejections take precedence over limit-class.
    const rejections = outcomes.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (rejections.length > 0) {
      const errorClass = rejections.find(
        (r) =>
          !(
            r.reason instanceof AgentCallError &&
            (r.reason.result.status === 'limit' ||
              r.reason.result.status === 'cancelled' ||
              r.reason.result.status === 'escalated')
          ),
      );
      throw (errorClass ?? rejections[0]).reason;
    }
    return outcomes.map((r) => (r as PromiseFulfilledResult<T>).value);
  }

  async function pipelineImpl(
    items: unknown[],
    stages: Array<Stage<unknown, unknown>>,
    o?: { onItemError?: 'drop' | 'throw' | 'collect' },
  ): Promise<unknown> {
    const state = current();
    const onItemError = o?.onItemError ?? 'drop';
    const localDropped: DroppedItem[] = [];

    const runItem = async (
      item: unknown,
      index: number,
    ): Promise<{ ok: boolean; value?: unknown }> => {
      let value = item;
      for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
        const stageState: ScopeState = {
          scope: pipelineScope(state.scope, stageIndex, index),
          spanId: internals.spans.mint(state.spanId),
        };
        if (state.phase !== undefined) {
          stageState.phase = state.phase;
        }
        if (state.signal !== undefined) {
          stageState.signal = state.signal;
        }
        if (state.budgetScope !== undefined) {
          stageState.budgetScope = state.budgetScope;
        }
        try {
          value = await als.run(stageState, () => stages[stageIndex](value));
        } catch (thrown) {
          if (thrown instanceof BudgetExhaustedError || onItemError === 'throw') {
            throw thrown;
          }
          const wire: WireError =
            thrown instanceof AgentCallError
              ? agentResultWire(thrown.result, thrown.message)
              : thrown instanceof RulvarError
                ? thrown.toWire()
                : {
                    code: 'error',
                    message: thrown instanceof Error ? thrown.message : String(thrown),
                    retryable: false,
                  };
          const droppedItem: DroppedItem = {
            source: 'pipeline',
            scope: stageState.scope,
            error: wire,
          };
          if (thrown instanceof AgentCallError && thrown.entryRef !== undefined) {
            droppedItem.entryRef = thrown.entryRef;
          }
          internals.dropped.push(droppedItem);
          localDropped.push(droppedItem);
          return { ok: false };
        }
      }
      return { ok: true, value };
    };

    if (onItemError === 'throw') {
      const results = await Promise.all(items.map((item, index) => runItem(item, index)));
      return results.filter((r) => r.ok).map((r) => r.value);
    }
    const settled = await Promise.allSettled(items.map((item, index) => runItem(item, index)));
    const budgetRejection = settled.find(
      (r): r is PromiseRejectedResult =>
        r.status === 'rejected' && r.reason instanceof BudgetExhaustedError,
    );
    if (budgetRejection !== undefined) {
      throw budgetRejection.reason;
    }
    const results = settled
      .filter(
        (r): r is PromiseFulfilledResult<{ ok: boolean; value?: unknown }> =>
          r.status === 'fulfilled',
      )
      .filter((r) => r.value.ok)
      .map((r) => r.value.value);
    if (onItemError === 'collect') {
      return { results, dropped: localDropped };
    }
    return results;
  }

  /**
   * Per-(scope, name) invocation ordinals of ctx.workflow, in execution
   * order (nested workflow scopes).
   */
  const workflowOrdinals = new Map<string, number>();
  const nextWorkflowOrdinal = (scope: string, name: string): number => {
    const counterKey = `${scope} ${name}`;
    const ordinal = workflowOrdinals.get(counterKey) ?? 0;
    workflowOrdinals.set(counterKey, ordinal + 1);
    return ordinal;
  };

  /** Rebuilds the typed error a journaled child failure recorded. */
  const childErrorFromWire = (wire: WireError): Error => {
    if (wire.code === 'budget_exhausted') {
      return new BudgetExhaustedError(
        wire.message,
        wire.data === undefined ? {} : { data: wire.data },
      );
    }
    if (wire.code === 'admission_rejected') {
      return new AdmissionRejectedError(
        wire.message,
        wire.data === undefined ? {} : { data: wire.data },
      );
    }
    if (wire.code === 'config') {
      return new ConfigError(wire.message, wire.data === undefined ? {} : { data: wire.data });
    }
    const rebuilt = new Error(wire.message);
    rebuilt.name = wire.code;
    return rebuilt;
  };

  /** Maps an embedded admission rejection onto its typed error. */
  const rejectionError = (
    reason: { code: string } & Record<string, unknown>,
    name: string,
  ): Error => {
    if (reason.code === 'budget' || reason.code === 'lifetime') {
      return new BudgetExhaustedError(
        `admission rejected child workflow '${name}' (${reason.code})`,
        { data: { reason: reason as Json } },
      );
    }
    return new AdmissionRejectedError(
      `admission rejected child workflow '${name}' (${reason.code}; ` +
        'maxDepth/maxChildrenPerNode are set via createEngine budgetDefaults)',
      { data: { reason: reason as Json } },
    );
  };

  async function workflowImpl(
    wfOrName: Workflow<never, unknown> | string,
    args?: unknown,
    o?: WorkflowCallOpts,
  ): Promise<unknown> {
    const state = current();
    let wf: Workflow<never, unknown>;
    let name: string;
    if (typeof wfOrName === 'string') {
      const registered = internals.defaults.workflows?.[wfOrName];
      if (registered === undefined) {
        throw new ConfigError(
          `unknown workflow '${wfOrName}': register it under defaults.workflows`,
        );
      }
      const candidate = registered as Workflow<never, unknown>;
      if (candidate.kind !== 'workflow') {
        throw new ConfigError(`registry entry '${wfOrName}' is not a defineWorkflow value`);
      }
      wf = candidate;
      name = wfOrName;
    } else {
      wf = wfOrName;
      name = wf.name;
    }
    if (wf.argsSchema !== undefined) {
      const validation = await validateSchemaSpec(wf.argsSchema, args);
      if (!validation.valid) {
        throw new ConfigError(
          `arguments for child workflow '${name}' do not validate: ` +
            validation.issues.map((issue) => issue.message).join('; '),
          { data: { issues: validation.issues.map((issue) => issue.message) } },
        );
      }
    }
    const argsJson =
      o?.key !== undefined ? o.key : toJournalValue(args ?? null, `ctx.workflow('${name}') args`);
    const ordinal = nextWorkflowOrdinal(state.scope, name);
    const childScope = workflowScope(state.scope, name, ordinal);
    const identity = { kind: 'child', workflow: name, args: argsJson } as const;
    const key = deriveContentKey(identity);
    const spanId = internals.spans.mint(state.spanId);
    const budgetAccount = state.budgetScope ?? ROOT_ACCOUNT;

    const matched = internals.replayer.match(state.scope, identity, 'scoped');
    if (matched.kind === 'replay') {
      // Counters (maxChildrenPerNode, the lifetime cap) survive resume:
      // the ledger seed counts agent dispatches only, so replayed
      // children re-register here without re-committing any reserve.
      internals.admission?.recoverSettled(budgetAccount);
      internals.events.emit(
        { type: 'child:start', workflow: name, scope: childScope },
        spanId,
        true,
      );
      const terminal = matched.terminal;
      internals.events.emit(
        { type: 'child:end', workflow: name, scope: childScope, status: terminal.status },
        spanId,
        true,
      );
      if (terminal.status === 'ok') {
        return terminal.value;
      }
      throw childErrorFromWire(
        terminal.error ?? {
          code: 'error',
          message: `child workflow '${name}' replayed terminal status ${terminal.status}`,
          retryable: false,
        },
      );
    }
    if (matched.kind === 'skip') {
      // Derived-skipped children (abandon coverage) are DEF-5 territory;
      // reuse-by-reference delivery lands in M7. Unreachable from M6
      // producers, kept total for foreign journals.
      throw new ConfigError(
        `child workflow '${name}' is covered by an abandon entry; ` +
          'reuse-by-reference delivery lands with DEF-5 in M7',
      );
    }
    const danglingRunning = matched.kind === 'rerun-dangling' ? matched.running : undefined;

    // Admission: the verdict is evaluated live
    // strictly BEFORE the carrying decision entry is appended and is
    // embedded IN it; on resume the journaled decision is recovered and
    // never re-evaluated.
    if (internals.admission === undefined) {
      throw new ConfigError('ctx.workflow requires the engine run context (createEngine)');
    }
    const admission = internals.admission;
    const prior = internals.replayer.snapshot().find((entry) => {
      if (entry.kind !== 'decision') {
        return false;
      }
      const value = entry.value as { decisionType?: string; childScope?: string } | undefined;
      return value?.decisionType === 'spawn-admission' && value.childScope === childScope;
    });
    let verdict: AdmitVerdict;
    if (prior !== undefined) {
      const recorded = (prior.value as { decision: { verdict: AdmitVerdict } }).decision;
      verdict = recorded.verdict;
      if (verdict.kind !== 'reject') {
        admission.recoverInFlight(budgetAccount, verdict);
      }
    } else {
      const decision = admission.admit({
        origin: 'ctx.workflow',
        name,
        childScope,
        parentAccountScope: budgetAccount,
        ...(o?.lineage === undefined ? {} : { lineage: o.lineage }),
        ...(o?.approach === undefined ? {} : { approach: o.approach }),
        signature: { agentType: name, isolation: 'none' },
      });
      verdict = decision.verdict;
      await internals.replayer.appendSinglePhase({
        scope: state.scope,
        key: '',
        kind: 'decision',
        status: 'ok',
        spanId,
        value: {
          decisionType: 'spawn-admission',
          origin: 'ctx.workflow',
          name,
          childScope,
          parentAccountScope: budgetAccount,
          decision: decision as unknown as Json,
        },
      });
    }
    if (verdict.kind === 'reject') {
      throw rejectionError(verdict.reason, name);
    }
    if (verdict.kind !== 'admit') {
      throw new ConfigError(
        `admission verdict '${verdict.kind}' has no producer before M7 (DEF-5)`,
      );
    }
    const reserve = verdict.reserve;
    const openOptions: Parameters<RunBudget['openAccount']>[1] = {
      parentScope: budgetAccount,
    };
    if (reserve.childCeilingUsd !== undefined) {
      openOptions.ceilingUsd = reserve.childCeilingUsd;
      // The ceiling is this child's allowance: reserves for ITS spawns
      // clamp to it instead of denying on estimates it already bounds.
      openOptions.kind = 'child-allowance';
    }
    internals.budget.openAccount(childScope, openOptions);

    const running =
      danglingRunning ??
      (await internals.replayer.appendRunning({
        scope: state.scope,
        key,
        kind: 'child',
        spanId,
        value: { workflow: name, childScope },
        site: `ctx.workflow('${name}')`,
      }));

    const upstream = state.signal ?? internals.runSignal;
    const accountSignal = internals.budget.signalOf(childScope);
    const signals = [upstream, accountSignal].filter(
      (signal): signal is AbortSignal => signal !== undefined,
    );
    // The child's OWN defaults replace the parent's inside its scope: the
    // layer follows the call tree, so nesting a cheap workflow under an
    // expensive one does the obvious thing. A child that declares nothing
    // contributes nothing and falls straight through to the engine.
    const childLayer = workflowLayerOf(wf);
    const childState: ScopeState = {
      scope: childScope,
      spanId,
      budgetScope: childScope,
      ...(childLayer === undefined ? {} : { workflowLayer: childLayer }),
    };
    if (signals.length === 1) {
      childState.signal = signals[0];
    } else if (signals.length > 1) {
      childState.signal = AbortSignal.any(signals);
    }
    if (state.phase !== undefined) {
      childState.phase = state.phase;
    }

    internals.events.emit({ type: 'child:start', workflow: name, scope: childScope }, spanId);
    try {
      const result = await als.run(childState, () => wf.body(ctx as Ctx<never>, args as never));
      const value = toJournalValue(result ?? null, `ctx.workflow('${name}') result`);
      await internals.replayer.appendTerminal(running.seq, {
        status: 'ok',
        value,
        site: `ctx.workflow('${name}')`,
      });
      internals.events.emit(
        { type: 'child:end', workflow: name, scope: childScope, status: 'ok' },
        spanId,
      );
      return result;
    } catch (thrown) {
      const cancelled = childState.signal?.aborted === true;
      const wire: WireError =
        thrown instanceof RulvarError
          ? thrown.toWire()
          : {
              code: 'error',
              message: thrown instanceof Error ? thrown.message : String(thrown),
              retryable: false,
            };
      const status = cancelled ? 'cancelled' : 'error';
      await internals.replayer.appendTerminal(running.seq, { status, error: wire });
      internals.events.emit(
        { type: 'child:end', workflow: name, scope: childScope, status },
        spanId,
      );
      throw thrown;
    } finally {
      internals.budget.releaseReserve(reserve.reserveUsd, budgetAccount);
    }
  }

  const ctx: Ctx<ErrorPolicy> = {
    agent: agentImpl as Ctx<ErrorPolicy>['agent'],
    parallel: parallelImpl,
    workflow: workflowImpl as Ctx<ErrorPolicy>['workflow'],
    orchestrate: (goal: string, orchestrateOpts?: OrchestrateOptions) =>
      workflowImpl(
        makeOrchestratorWorkflow(goal, orchestrateOpts) as unknown as Workflow<never, unknown>,
        undefined,
      ),
    brief: async (o: BriefOpts): Promise<string> => {
      const prompt = `${
        o.instruction ??
        'Distill the following context into a brief a child agent can inherit. Reply with the brief only.'
      }\n\n${o.content}`;
      // An ordinary agent-kind entry under the summarize role: the role
      // is an internal override here (the public AgentOpts.role union
      // stays primary-only).
      const briefOpts: AgentOpts = {
        role: 'summarize' as unknown as 'loop',
        onError: 'throw',
        ...(o.model === undefined ? {} : { model: o.model }),
        ...(o.agentType === undefined ? {} : { agentType: o.agentType }),
      };
      const value = await agentImpl(prompt, briefOpts);
      return String(value);
    },
    pipeline: ((items: unknown[], ...rest: unknown[]) => {
      const last = rest[rest.length - 1];
      const hasOpts = typeof last === 'object' && last !== null;
      const stages = (hasOpts ? rest.slice(0, -1) : rest) as Array<Stage<unknown, unknown>>;
      const opts = hasOpts ? (last as { onItemError?: 'drop' | 'throw' | 'collect' }) : undefined;
      if (stages.length === 0 || stages.length > 6) {
        throw new ConfigError('ctx.pipeline accepts 1 through 6 stages');
      }
      return pipelineImpl(items, stages, opts);
    }) as Ctx<ErrorPolicy>['pipeline'],

    step: async <T extends Json>(
      label: string,
      fn: () => Promise<T> | T,
      o?: { deps?: Json[]; key?: string },
    ): Promise<T> => {
      const state = current();
      const identity = { kind: 'step', key: o?.key ?? label, deps: o?.deps ?? [] } as const;
      const key = deriveContentKey(identity);
      const spanId = internals.spans.mint(state.spanId);
      const matched = internals.replayer.match(state.scope, identity, 'scoped');
      if (matched.kind === 'replay') {
        return matched.terminal.value as T;
      }
      if (matched.kind === 'skip') {
        return null as T;
      }
      const running =
        matched.kind === 'rerun-dangling'
          ? matched.running
          : await internals.replayer.appendRunning({
              scope: state.scope,
              key,
              kind: 'step',
              spanId,
            });
      const exitActivity = internals.external?.enter();
      try {
        const value = await fn();
        await internals.replayer.appendTerminal(running.seq, {
          status: 'ok',
          value,
          site: `ctx.step('${label}')`,
        });
        return value;
      } catch (thrown) {
        const wire: WireError =
          thrown instanceof RulvarError
            ? thrown.toWire()
            : {
                code: 'error',
                message: thrown instanceof Error ? thrown.message : String(thrown),
                retryable: false,
              };
        await internals.replayer.appendTerminal(running.seq, { status: 'error', error: wire });
        throw thrown;
      } finally {
        exitActivity?.();
      }
    },

    awaitExternal: async <T = Json>(
      key: string,
      o?: { schema?: SchemaSpec; prompt?: string },
    ): Promise<T> => {
      if (internals.external === undefined) {
        throw new ConfigError('awaitExternal requires the engine run context (createEngine)');
      }
      const state = current();
      return internals.external.awaitExternal(
        state.scope,
        internals.spans.mint(state.spanId),
        key,
        o,
      ) as Promise<T>;
    },

    phase: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const state = current();
      const phaseState: ScopeState = {
        ...state,
        phase: name,
        spanId: internals.spans.mint(state.spanId),
      };
      internals.events.emit({ type: 'phase:start', phase: name }, phaseState.spanId);
      return als.run(phaseState, fn);
    },

    log: (level, msg, data) => {
      internals.events.emit(
        data === undefined ? { type: 'log', level, msg } : { type: 'log', level, msg, data },
        current().spanId,
      );
    },

    budget: {
      spent: () => internals.budget.spent(),
      remaining: () => internals.budget.remaining(),
    },

    now: () => randValue('now', () => internals.now()),
    random: (key?: string) =>
      randValue(
        'random',
        () => {
          const buffer = new Uint32Array(1);
          getRandomValues(buffer);
          return buffer[0] / 2 ** 32;
        },
        key,
      ),
    uuid: () => randValue('uuid', () => randomUUID()),
  };
  // In-package runtime access for the sandbox bridge and the mode (c)
  // orchestrator (M6): never part of the public surface.
  ctxRuntimes.set(ctx, {
    internals,
    currentState: current,
    runInScope: (state, fn) => als.run(state, fn),
  });
  return ctx;
}

/**
 * Runs a workflow body against a fresh ctx: the engine core that
 * engine.run wraps with RunHandle, events, and outcome assembly (M1-T11).
 * Validates args against the declared schema, then executes single-pass.
 */
export async function executeWorkflow<A, R>(
  internals: RunInternals,
  wf: Workflow<A, R>,
  args: A,
): Promise<R> {
  if (wf.argsSchema !== undefined) {
    const validation = await validateSchemaSpec(wf.argsSchema, args);
    if (!validation.valid) {
      throw new ConfigError(
        `arguments for workflow '${wf.name}' do not validate: ` +
          validation.issues.map((issue) => issue.message).join('; '),
        { data: { issues: validation.issues.map((issue) => issue.message) } },
      );
    }
  }
  const ctx = createCtx(internals, wf);
  try {
    return await wf.body(ctx, args);
  } finally {
    await internals.replayer.flush();
  }
}
