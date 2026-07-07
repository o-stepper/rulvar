/**
 * Ctx primitives (M1-T07) plus the parallel/pipeline composition semantics
 * of the scheduler (M1-T08): the canonical authoring surface bound to the
 * journal write path, the model router, the agent runtime, and the
 * three-layer budget. M1 ships agent, parallel, pipeline, step, phase,
 * log, budget, and the deterministic shims; workflow/orchestrate/
 * awaitExternal/brief land with their milestones (M2/M6).
 *
 * Owning spec: docs/06-execution-spec.md, sections "Canonical Ctx
 * interface", "Error policy and dropped results", "Scheduler".
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID, getRandomValues } from 'node:crypto';
import {
  agentErrorFromWire,
  agentErrorToWire,
  BudgetExhaustedError,
  ConfigError,
  LurkerError,
  type AgentError,
  type Issue,
  type WireError,
} from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type { Effort, InvocationRole, ModelRef, ModelSpec, Usage } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import type { IsolationSpec } from '../l0/spi/isolation.js';
import {
  canonicalizeSchema,
  EMPTY_SCHEMA_HASH,
  EMPTY_TOOLSET_HASH,
  projectToJsonSchema,
  schemaHash,
  validateSchemaSpec,
  type Out,
  type SchemaSpec,
} from '../l0/schema.js';
import { deriveContentKey } from '../journal/identity.js';
import { ParallelSiteCounter, parallelScope, pipelineScope, ROOT_SCOPE } from '../journal/scope.js';
import type { Replayer } from '../journal/replayer.js';
import type { JournalEntry } from '../l0/entries.js';
import {
  resolveModelInvocation,
  type ResolutionLayer,
  type ResolvedInvocation,
} from '../model/router.js';
import { runAgent, type AgentResult } from '../runtime/agent-loop.js';
import { mergeUsageLimits, type UsageLimits } from '../runtime/usage-limits.js';
import { admissionReserveUsd, type RunBudget, type Spend } from './budget.js';
import { Semaphore } from './scheduler.js';

export type ErrorPolicy = 'strict' | 'lenient';

/**
 * The canonical, complete AgentProfile shape (docs/06, section
 * "AgentProfile"); M1 honors description, model, routing, effort, limits,
 * and estCost. A profile never carries a prompt or a schema.
 */
export interface AgentProfile {
  description?: string;
  model?: ModelSpec;
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  effort?: Effort;
  limits?: UsageLimits;
  /** Admission reserve hint in USD (budget layer 1). */
  estCost?: number;
}

/**
 * Per-spawn options (docs/06, section "ctx.agent and AgentOpts"). The
 * identity split is normative: agentType, model/routing/effort (the
 * requested modelSpec), schema (schemaHash), and key enter the content
 * key; everything else is policy or telemetry and never re-keys entries.
 * Fields whose machinery lands later (tools, isolation, escalation,
 * lineage, ladder, retry) arrive with their milestones.
 */
export interface AgentOpts<S extends SchemaSpec = SchemaSpec> {
  agentType?: string;
  /** Overrides all roles at once. */
  model?: ModelSpec;
  /** Per-role, wins over profile.routing. */
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  /** Canonical effort, part of identity. */
  effort?: Effort;
  /** schemaHash enters identity. */
  schema?: S;
  /** docs/08; enters identity. Only 'none' is executable before M3. */
  isolation?: IsolationSpec;
  /** Explicit discriminator; replaces the prompt in the content key. */
  key?: string;

  onError?: 'throw' | 'null';
  /** Per-call replay mode; default scoped forward-matching (docs/03, section 7.3). */
  replay?: 'cache' | 'never';
  /** Journaled as a policy field from day one; consumed by the M2 predicate. */
  memoizeOutcome?: boolean;
  /** Admission reserve hint (USD). */
  estCost?: number;
  /** Merged over profile and engine limits (docs/06, section "UsageLimits"). */
  limits?: UsageLimits;
  result?: 'value' | 'full';

  /** Telemetry only. */
  label?: string;
  /** Enables agent:stream delta events. */
  stream?: boolean;
}

/** docs/06, section "Error policy and dropped results". */
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
 * AgentResult where one exists (docs/06, section "ctx.parallel and
 * Settled").
 */
export type Settled<T> =
  | { status: 'ok'; value: T; result?: AgentResult<unknown> }
  | { status: 'error'; error: WireError; result?: AgentResult<unknown> }
  | { status: 'limit'; result: AgentResult<unknown> }
  | { status: 'cancelled'; result?: AgentResult<unknown> }
  | { status: 'skipped'; result: AgentResult<unknown> }
  | { status: 'escalated'; result: AgentResult<unknown> };

export type Stage<I, O> = (item: I) => Promise<O>;

/**
 * The rejection carrier of ctx.agent value-form calls: a real Error that
 * structurally satisfies the typed AgentError (docs/06, section "ctx.agent
 * and AgentOpts") and carries the full AgentResult for Settled mapping.
 * Deliberately not a LurkerError: AgentError is not in the closed code
 * registry (docs/02, section "Error taxonomy").
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

/** Pipeline results plus the dropped evidence, returned by onItemError: 'collect'. */
export interface PipelineCollected<T> {
  results: T[];
  dropped: DroppedItem[];
}

/** The canonical Ctx interface, M1 members (docs/06, section "Canonical Ctx interface"). */
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

/** Closure-form workflow value; in-process only (docs/06, section "Execution model"). */
export interface Workflow<A = unknown, R = unknown> {
  readonly kind: 'workflow';
  readonly name: string;
  readonly argsSchema?: SchemaSpec<A>;
  readonly errorPolicy: ErrorPolicy;
  readonly body: (ctx: Ctx<never>, args: A) => Promise<R>;
}

export function defineWorkflow<A, R, P extends ErrorPolicy = 'strict'>(
  meta: { name: string; args?: SchemaSpec<A>; errorPolicy?: P },
  body: (ctx: Ctx<P>, args: A) => Promise<R>,
): Workflow<A, R> {
  const wf: Workflow<A, R> = {
    kind: 'workflow',
    name: meta.name,
    errorPolicy: meta.errorPolicy ?? 'strict',
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
  phase?: string;
  signal?: AbortSignal;
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
}

/** Everything one run's ctx needs; created per run by the engine (M1-T11). */
export interface RunInternals {
  runId: string;
  replayer: Replayer;
  budget: RunBudget;
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
  };
  errorPolicy: ErrorPolicy;
  dropped: DroppedItem[];
  cost: CostAttribution;
  priceUsd: (servedBy: ModelRef, usage: Usage) => number | undefined;
  runSignal?: AbortSignal;
  mintTranscriptRef: () => string;
  now: () => number;
}

function bump(map: Map<string, number>, key: string, usd: number): void {
  map.set(key, (map.get(key) ?? 0) + usd);
}

/**
 * Creates the per-run Ctx bound to `internals`. The current scope travels
 * through AsyncLocalStorage so parallel branches and pipeline stages keep
 * one ctx object while journaling under their own scope paths (I3:
 * structure from call-and-return only).
 */
export function createCtx(internals: RunInternals): Ctx<ErrorPolicy> {
  const als = new AsyncLocalStorage<ScopeState>();
  const sites = new ParallelSiteCounter();
  const rootState: ScopeState = { scope: ROOT_SCOPE, spanId: internals.rootSpanId };
  const current = (): ScopeState => als.getStore() ?? rootState;

  const capsOf = (ref: ModelRef): ReturnType<ProviderAdapter['caps']> => {
    const colon = ref.indexOf(':');
    const adapterId = ref.slice(0, colon);
    const adapter = internals.adapters.get(adapterId);
    if (adapter === undefined) {
      throw new ConfigError(
        `no adapter registered for '${adapterId}' (ModelRef '${ref}'); pass it to createEngine`,
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
    // the journaled value byte-for-byte (docs/06, section 2.9).
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
    if (opts.isolation !== undefined && opts.isolation !== 'none') {
      throw new ConfigError(
        "isolation lands with the tool system in M3; only 'none' is executable",
      );
    }

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

    const telemetryNamespace: Record<string, unknown> = { agentType };
    if (opts.label !== undefined) {
      telemetryNamespace.label = opts.label;
    }
    const withTelemetry = (resolved: ResolvedInvocation): ResolvedInvocation => ({
      ...resolved,
      // The reserved engine-populated telemetry namespace (docs/04,
      // section 1.8, as amended): never identity, consumable by
      // FakeAdapter's agentType/label matching.
      providerOptions: { ...resolved.providerOptions, lurker: telemetryNamespace },
    });
    const loopResolved = withTelemetry(
      resolveModelInvocation({
        role: 'loop',
        call: callLayer,
        profile: profileLayer,
        engine: engineLayer,
        capsOf,
      }),
    );
    for (const scrub of loopResolved.scrubs) {
      internals.events.emit({ type: 'log', level: 'warn', msg: scrub.detail }, state.spanId);
    }

    // Role trigger protocol (docs/06, section "Agent runtime binding"):
    // extract fires separately only when a schema is set AND routing sends
    // extract to a different model (the prompt tier makes every schema
    // servable in M1, so caps alone never force a separate call).
    let extract: { adapter: ProviderAdapter; resolved: ResolvedInvocation } | undefined;
    let canonicalSchema: ReturnType<typeof canonicalizeSchema> | undefined;
    let derivedSchemaHash = EMPTY_SCHEMA_HASH;
    if (opts.schema !== undefined) {
      canonicalSchema = canonicalizeSchema(projectToJsonSchema(opts.schema));
      derivedSchemaHash = schemaHash(canonicalSchema);
      const extractResolved = withTelemetry(
        resolveModelInvocation({
          role: 'extract',
          call: callLayer,
          profile: profileLayer,
          engine: engineLayer,
          capsOf,
        }),
      );
      if (extractResolved.ref !== loopResolved.ref) {
        extract = { adapter: adapterOf(extractResolved), resolved: extractResolved };
      }
    }

    const identityInput = {
      kind: 'agent',
      agentType,
      modelSpec: loopResolved.canonical,
      prompt: opts.key ?? prompt,
      schemaHash: derivedSchemaHash,
      toolsetHash: EMPTY_TOOLSET_HASH,
      isolation: opts.isolation ?? 'none',
    } as const;
    const identityKey = deriveContentKey(identityInput);

    // Scoped forward-matching (docs/03 section 7): a hit synthesizes the
    // result entirely from the journal with zero adapter calls.
    const matched = internals.replayer.match(state.scope, identityInput, opts.replay ?? 'scoped');
    if (matched.kind === 'replay' || matched.kind === 'skip') {
      const terminal = matched.kind === 'replay' ? matched.terminal : matched.terminal;
      const spanId = internals.spans.mint(state.spanId);
      const usage: Usage = terminal?.usage ?? {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      const costUsd =
        terminal?.servedBy === undefined ? 0 : (internals.priceUsd(terminal.servedBy, usage) ?? 0);
      const result: AgentResult<unknown> = {
        status:
          matched.kind === 'skip'
            ? 'skipped'
            : ((terminal?.status ?? 'ok') as AgentResult<unknown>['status']),
        output: matched.kind === 'skip' ? null : (terminal?.value ?? null),
        usage,
        costUsd,
        // Turn counts are not journaled in v1; the fold recovers them
        // with the checkpoint format (M3).
        turns: 0,
        transcriptRef: terminal?.transcriptRef ?? '',
      };
      if (terminal?.error !== undefined) {
        result.error = agentErrorFromWire(terminal.error);
        (result as { errorMessage?: string }).errorMessage = terminal.error.message;
      }
      internals.events.emit(
        {
          type: 'agent:start',
          agentType,
          label: opts.label,
          model: loopResolved.ref,
          role: 'loop',
        },
        spanId,
        true,
      );
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
      bump(internals.cost.byModel, terminal?.servedBy ?? loopResolved.ref, costUsd);
      bump(internals.cost.byPhase, state.phase ?? '', costUsd);
      bump(internals.cost.byAgentType, agentType, costUsd);
      internals.cost.byRole.set('loop', (internals.cost.byRole.get('loop') ?? 0) + costUsd);
      if (opts.result === 'full') {
        return result;
      }
      if (result.status === 'ok') {
        return result.output;
      }
      const effectivePolicy =
        opts.onError ?? (internals.errorPolicy === 'lenient' ? 'null' : 'throw');
      const replayWire = agentErrorToWire(
        result.error ?? { kind: 'terminal', retryable: false },
        (result as { errorMessage?: string }).errorMessage ??
          `agent replayed with status ${result.status}`,
      );
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

    const adapter = adapterOf(loopResolved);
    const caps = adapter.caps(loopResolved.model);
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
    const reserve = admissionReserveUsd(reserveOptions);
    internals.budget.admitSpawn(reserve);

    const spanId = internals.spans.mint(state.spanId);
    // memoizeOutcome is a policy field fixed in the entry payload at
    // dispatch time (docs/03, section "Normative payload schemas"); the M2
    // predicate reads it from the ENTRY, never from current code.
    let running: JournalEntry;
    if (danglingRunning !== undefined) {
      // At-least-once redispatch: the terminal will reference the
      // original dispatch entry (docs/03, section 13.1).
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
      running = await internals.replayer.appendRunning(runningInput);
    }

    const limits = mergeUsageLimits(opts.limits, profile?.limits, internals.defaults.limits);
    const agentSink = {
      emit: (body: { type: string } & Record<string, unknown>) =>
        internals.events.emit(body, spanId),
    };
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
        beforeTurn: () => internals.budget.beforeTurn(),
        onUsage: (usage, servedBy) => internals.budget.onUsage(usage, servedBy),
        signal: internals.budget.signal,
      },
      priceUsd: internals.priceUsd,
      agentType,
      now: internals.now,
    };
    if (opts.schema !== undefined) {
      runAgentOptions.schema = opts.schema;
    }
    if (canonicalSchema !== undefined) {
      runAgentOptions.canonicalSchema = canonicalSchema;
    }
    if (extract !== undefined) {
      runAgentOptions.extract = extract;
    }
    if (opts.stream !== undefined) {
      runAgentOptions.stream = opts.stream;
    }
    if (opts.label !== undefined) {
      runAgentOptions.label = opts.label;
    }
    const branchSignal = state.signal ?? internals.runSignal;
    if (branchSignal !== undefined) {
      runAgentOptions.signal = branchSignal;
    }

    const result = await internals.semaphore.withSlot(
      () => runAgent<S>(runAgentOptions),
      () => internals.events.emit({ type: 'agent:queued', agentType, label: opts.label }, spanId),
    );
    internals.budget.releaseReserve(reserve);

    const terminalPatch: Parameters<Replayer['appendTerminal']>[1] = {
      status:
        result.status === 'skipped' || result.status === 'escalated' ? 'error' : result.status,
      usage: result.usage,
      servedBy: loopResolved.ref,
      transcriptRef: result.transcriptRef,
    };
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

    // Cost attribution buckets (CostReport, docs/09).
    const usd = result.costUsd;
    bump(internals.cost.byModel, loopResolved.ref, usd);
    bump(internals.cost.byPhase, state.phase ?? '', usd);
    bump(internals.cost.byAgentType, agentType, usd);
    internals.cost.byRole.set('loop', (internals.cost.byRole.get('loop') ?? 0) + usd);
    if (internals.priceUsd(loopResolved.ref, result.usage) === undefined) {
      internals.cost.unpriced.push({ model: loopResolved.ref, usage: result.usage });
    }

    // Uniform ceiling behavior: every ctx primitive throws
    // BudgetExhaustedError at the run ceiling (docs/06, section 2.1).
    if (result.error?.kind === 'budget' || (internals.budget.exhausted && result.status !== 'ok')) {
      throw new BudgetExhaustedError('run budget ceiling reached during agent execution', {
        data: { scope: state.scope, entryRef: terminal.seq },
      });
    }

    if (opts.result === 'full') {
      return result;
    }
    if (result.status === 'ok') {
      return result.output;
    }

    const effectiveOnError =
      opts.onError ?? (internals.errorPolicy === 'lenient' ? 'null' : 'throw');
    const wire = agentErrorToWire(
      result.error ?? { kind: 'terminal', retryable: false },
      result.errorMessage ?? `agent terminated with status ${result.status}`,
    );
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
        const promise = als.run(branchState, task);
        if (abortSiblings) {
          promise.catch((thrown: unknown) => {
            // Only error-class failures abort siblings; a 'limit' branch is
            // a settled outcome and never aborts (docs/06, section
            // "Scheduler"). Budget exhaustion severs globally by itself.
            const isLimitLike =
              thrown instanceof AgentCallError &&
              (thrown.result.status === 'limit' || thrown.result.status === 'cancelled');
            if (!isLimitLike && !(thrown instanceof BudgetExhaustedError)) {
              for (const [i, controller] of controllers.entries()) {
                if (i !== branch) {
                  controller.abort('lurker:sibling-failed');
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
          reason instanceof LurkerError
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
            (r.reason.result.status === 'limit' || r.reason.result.status === 'cancelled')
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
        try {
          value = await als.run(stageState, () => stages[stageIndex](value));
        } catch (thrown) {
          if (thrown instanceof BudgetExhaustedError || onItemError === 'throw') {
            throw thrown;
          }
          const wire: WireError =
            thrown instanceof AgentCallError
              ? agentErrorToWire(
                  thrown.result.error ?? { kind: 'terminal', retryable: false },
                  thrown.message,
                )
              : thrown instanceof LurkerError
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

  const ctx: Ctx<ErrorPolicy> = {
    agent: agentImpl as Ctx<ErrorPolicy>['agent'],
    parallel: parallelImpl,
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
          thrown instanceof LurkerError
            ? thrown.toWire()
            : {
                code: 'error',
                message: thrown instanceof Error ? thrown.message : String(thrown),
                retryable: false,
              };
        await internals.replayer.appendTerminal(running.seq, { status: 'error', error: wire });
        throw thrown;
      }
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
  const ctx = createCtx(internals);
  try {
    return await wf.body(ctx, args);
  } finally {
    await internals.replayer.flush();
  }
}
