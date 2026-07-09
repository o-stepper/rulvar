/**
 * Engine entry points (M1-T11): createEngine and engine.run over the
 * InProcessRunner. Every registry hangs off the engine instance; nothing
 * is module-global, so two engines in one process are fully isolated and
 * ctx is created per run (docs/02, section "Engine anatomy"; docs/06,
 * section "Engine and ops API"). engine.resume lands with the journal
 * kernel in M2.
 */
import { createHash } from 'node:crypto';
import {
  agentErrorToWire,
  BudgetExhaustedError,
  ConfigError,
  LurkerError,
  type WireError,
} from '../l0/errors.js';
import type { WorkflowEventBody } from '../l0/events.js';
import type { InvocationRole, ModelRef, ModelSpec, Usage } from '../l0/messages.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { JournalStore, Lease } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import {
  wrapJournalStore,
  wrapTranscriptStore,
  type SerializationHook,
} from '../l0/serialization.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { validateSchemaSpec, type SchemaSpec } from '../l0/schema.js';
import type { ToolsOption } from '../tools/toolset-hash.js';
import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import { Replayer } from '../journal/replayer.js';
import {
  buildDeriverRegistry,
  registryKeyRing,
  scanJournalCompatibility,
} from '../journal/keyderiver.js';
import { dispositionHook } from '../journal/disposition.js';
import type { EscalationLimits } from '../journal/lineage.js';
import type { ResumeReport } from '../journal/matching.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { buildAdapterRegistry, parseModelRef } from '../model/router.js';
import type { EscalationDecision } from '../runtime/escalation.js';
import type { EscalatedResult, MechanicalGateProfile } from '../runtime/agent-loop.js';
import type { PermissionConfig } from '../runtime/permission-chain.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import { profileCard } from '../model/profile-card.js';
import { AdmissionController } from '../orchestrator/admission.js';
import { RunBudget } from './budget.js';
import {
  AgentCallError,
  createCtx,
  type AgentProfile,
  type RunInternals,
  type Workflow,
} from './ctx.js';
import { EventBus, SpanRegistry } from './events.js';
import { ExternalRegistry } from './external.js';
import {
  buildCostReport,
  type PendingExternal,
  type RunHandle,
  type RunOutcome,
  type RunStatus,
} from './run-handle.js';
import { DEFAULT_PER_RUN_CONCURRENCY, Semaphore } from './scheduler.js';
import { InProcessRunner, type CompiledWorkflow, type ScriptRunner } from '../runner/inprocess.js';
import type { RetryPolicy } from '../model/retry.js';
import { KeyedLimiter } from '../model/concurrency.js';
import { resolvePricing, priceUsdOf, type PriceTable } from '../model/pricing.js';
import type { QualityFloors } from '../model/floors.js';

export type { RunStatus };

/**
 * The per-engine workflow registry (docs/06, section 10.4; M5-T01): an
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
  /** Registered SchemaSpec names for outputSchemaRef (docs/08; M7-T05). */
  schemas?: Record<string, SchemaSpec>;
  /** Registered tool profile names for toolsetRef (docs/08; M7-T05). */
  toolsets?: Record<string, ToolsOption>;
  /**
   * Registered mechanical gate profiles: named pure functions over
   * AgentResult.artifacts for ladder acceptance gates (docs/02, section
   * "Registries"; docs/07, section 10; M7-T10).
   */
  gates?: Record<string, MechanicalGateProfile>;
  limits?: UsageLimits;
  /** Engine-wide permission chain layers (docs/08, section 3). */
  permissions?: PermissionConfig;
  /** The worktree lifecycle provider (docs/08, section 8). */
  isolation?: IsolationProvider;
  /** Engine-wide transport RetryPolicy (docs/04, 11.1; M4-T05). */
  retry?: RetryPolicy;
  /** Hard per-role model constraints (docs/04, section 9; M4-T09). */
  roleFloors?: QualityFloors;
}

export interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
  /**
   * Fraction of the parent remainder (minus the parent finalize reserve)
   * a child sub-account may take; default 0.3 (docs/06, 5.4; M6-T06).
   */
  childBudgetFraction?: number;
  /** AdmissionController nesting depth; default 1, hard ceiling 4 (docs/07, 7.3). */
  maxDepth?: number;
  /**
   * Lineage limits (DEF-3, docs/03 section 10.5): maxEscalationsPerLogicalTask
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
  };
  defaults?: EngineDefaults;
  budgetDefaults?: BudgetDefaults;
  concurrency?: {
    perRun?: number;
    /** Per-adapter-id caps; unlimited unless configured (Appendix A; M4-T07). */
    perProvider?: Record<string, number>;
  };
  /** Versioned price table; wins over caps.pricing (docs/04, section 10; M4-T06). */
  pricing?: PriceTable;
  /**
   * Runner registrations beyond the built-in InProcessRunner (docs/06,
   * sections 8 and 10.1; M6-T02). `sandbox` executes CompiledWorkflow
   * values (WorkerSandboxRunner ships in @lurker/planner); running or
   * resuming a compiled workflow without one is a typed ConfigError.
   */
  runners?: { sandbox?: ScriptRunner };
  /**
   * The InProcessRunner escalation hook (docs/06, sections 2.10 and 8.1):
   * receives escalated results when the call form cannot carry them; the
   * returned decision is journaled as the authoritative
   * escalation-decision entry.
   */
  onEscalation?: (
    result: EscalatedResult<unknown>,
  ) => EscalationDecision | Promise<EscalationDecision>;
  /**
   * KeyDeriver registry extension (docs/03, section "hashVersion").
   * Plumbed now, consumed by the matching kernel from M2.
   */
  extraDerivers?: readonly unknown[];
  /**
   * Redact/encrypt at the append/put boundaries, symmetric on load/get
   * (docs/03, section "Serialization hook"; M8-T04, OQ-22 executed).
   * Applied by wrapping the configured stores; Engine.stores exposes
   * the wrapped instances, so every reader passes one policy point.
   */
  serialization?: SerializationHook;
  /**
   * The default key-masking policy at the telemetry boundary (docs/09,
   * section "Redaction and sensitive data"; docs/06 Appendix A row
   * "event secret masking"). Default ON: key-shaped strings in every
   * emitted WorkflowEvent are masked; never touches the journal.
   */
  redaction?: { maskEvents?: boolean };
}

export interface RunOptions {
  /** Explicit id; otherwise the engine mints a ULID. */
  runId?: string;
  /** Run ceiling B0; immutable after start. */
  budgetUsd?: number;
  /** Run-level defaults merged over engine defaults. */
  limits?: UsageLimits;
  /** Run-level deadline (ISO 8601); crossing cancels the run. */
  deadlineAt?: string;
  name?: string;
  tags?: string[];
  /** Host-initiated cancellation. */
  signal?: AbortSignal;
}

/** Resume-time hit/miss/orphan accounting (docs/03, section 11.3). */
export interface ResumePreview extends ResumeReport {
  invalidResolutions: Array<{ seq: number; detail: string }>;
}

export interface ResumeOptions {
  /**
   * The run's original arguments: not journaled for in-process workflows
   * in v1, so the host supplies them (resume binding residuals, docs/14).
   */
  args?: unknown;
  /**
   * Dry-run: replay-strict matching; the first would-be-live call throws
   * JournalMissError and the run settles with that typed error, zero live
   * calls performed (docs/03, section 11.3).
   */
  dryRun?: boolean;
  /** invalidate/retry: entries to unpin before matching (docs/03, section 6.5). */
  invalidate?: number[];
  /**
   * Queue mode: the worker's lease. The engine carries it on EVERY
   * journal append of this resume (the kernel's single append site), so
   * a stale worker's writes are rejected by the fencing epoch and never
   * become visible (docs/06 10.2 and docs/03 12.3, M8 entry amendment;
   * DEF-6; FR-703). putMeta and transcript blobs stay advisory and
   * unfenced.
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
   * Rebinds a journal to a workflow definition and resumes (docs/06,
   * section "Engine and ops API"). Requires wf for in-process workflows;
   * a name mismatch is a typed ConfigError; a body-hash mismatch warns
   * loudly and proceeds (the journal decides replay per content keys).
   * A compiled run resumes WITHOUT wf: the engine rehydrates the
   * persisted source pinned by workflowHash; supplying a compiled wf
   * whose source hash differs from the recorded one is a typed
   * ConfigError (docs/06, 10.2; M6-T02).
   */
  resume<A, R>(
    runId: string,
    wf?: Workflow<A, R> | CompiledWorkflow,
    options?: ResumeOptions,
  ): ResumeHandle<R>;
  /**
   * Renders the registered agent profiles into the shared vocabulary
   * card (docs/06, 9.3), optionally filtered to `names`; the registry
   * itself stays private to the engine (docs/06, 10.2; M6-T05
   * amendment). Unknown names are ignored.
   */
  profileCard(names?: readonly string[]): string;
  /**
   * The engine's configured stores, exposed for shells and hosts
   * (docs/06, 10.2, M8 entry amendment; docs/02, section "Shells
   * overview": "the journal store comes from the engine"). Exactly the
   * instances createEngine received, or the defaults it built; no store
   * contract widens through this accessor. With a serialization hook
   * configured these are the HOOKED wrappers, so every reader passes
   * the one policy point (docs/03, 12.8; M8-T04).
   */
  readonly stores: { journal: JournalStore; transcripts: TranscriptStore };
  /**
   * Retention (docs/06, 10.2; OQ-20 executed at M8-T04): deletes every
   * blob transcripts.list(runId) returns, then the journal; no orphan
   * blobs survive. The caller owns the decision that the run is done.
   */
  deleteRun(runId: string): Promise<void>;
  /**
   * Checkpoint pruning (docs/03, 12.4 note; OQ-20 executed at M8-T04):
   * deletes checkpoint blobs of ok-terminal attempts that no other
   * entry references; returns the count. Parked, cancelled, escalated,
   * and hanging attempts keep theirs (park/unpark, DEF-5 retention, and
   * dangling redispatch boot from them).
   */
  pruneRun(runId: string): Promise<number>;
}

/** Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). */
export function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string {
  return createHash('sha256')
    .update((wf as Workflow<unknown, unknown>).body.toString(), 'utf8')
    .digest('hex');
}

/** Content hash of a compiled workflow source (run-to-definition binding, docs/06 10.2). */
export function hashWorkflowSource(source: string): string {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

/** TranscriptStore ref of the persisted CompiledWorkflow source blob. */
export function workflowSourceRef(runId: string): string {
  return `${runId}/workflow-source`;
}

export function createEngine(options: CreateEngineOptions): Engine {
  const adapters = buildAdapterRegistry(options.adapters);
  const rawJournal = options.stores?.journal ?? new InMemoryStore();
  const rawTranscripts = options.stores?.transcripts ?? new InMemoryTranscriptStore();
  // The serialization hook wraps the stores, so stored bytes and every
  // reader (including Engine.stores consumers) pass ONE policy point
  // (docs/03, 12.8; M8-T04). Absent hook, the raw instances flow.
  const journal =
    options.serialization?.journal === undefined
      ? rawJournal
      : wrapJournalStore(rawJournal, options.serialization.journal);
  const transcripts =
    options.serialization?.transcripts === undefined
      ? rawTranscripts
      : wrapTranscriptStore(rawTranscripts, options.serialization.transcripts);
  const maskEvents = options.redaction?.maskEvents ?? true;
  const defaults = options.defaults ?? {};
  const runner: ScriptRunner = new InProcessRunner(
    options.onEscalation === undefined ? undefined : { onEscalation: options.onEscalation },
  );
  const mintRunId = createCanonicalIdMinter();
  // Captured before any dev-mode patch so engine internals never trip the
  // bare-Date.now warning.
  const realNow: () => number = Date.now.bind(globalThis);

  const priceUsd = (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const { adapterId, model } = parseModelRef(servedBy);
    // The versioned price table wins; adapter-reported caps.pricing is
    // the fallback; undefined stays undefined so the CostReport surfaces
    // the model as unpriced, never a silent zero (docs/04, section 10).
    const pricing = resolvePricing(
      servedBy,
      options.pricing,
      adapters.get(adapterId)?.caps(model).pricing,
    );
    if (pricing === undefined) {
      return undefined;
    }
    return priceUsdOf(pricing, usage);
  };

  // Per-provider concurrency keys are ENGINE-scoped: every run of this
  // engine shares the same keyed limiter (docs/06, section 4; M4-T07).
  const providerLimiter = new KeyedLimiter(options.concurrency?.perProvider);

  interface ResumeContext {
    runId: string;
    priorEntries: JournalEntry[];
    strict: boolean;
    invalidate: number[];
    /** Queue mode: every journal append of this resume carries it (docs/03, 12.3). */
    lease?: Lease;
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
    const compiled = wf.kind === 'compiled-workflow' ? wf : undefined;
    if (compiled !== undefined && options.runners?.sandbox === undefined) {
      throw new ConfigError(
        'running a CompiledWorkflow requires a sandbox runner: pass ' +
          'createEngine({ runners: { sandbox: new WorkerSandboxRunner() } }) from @lurker/planner ' +
          '(docs/06, sections 8.2 and 10.1)',
      );
    }
    const runId = resumeCtx?.runId ?? opts?.runId ?? mintRunId();
    const registry = buildDeriverRegistry(options.extraDerivers);
    const spans = new SpanRegistry();
    const bus = new EventBus({ runId, spans, now: realNow, maskEvents });
    const rootSpanId = spans.mint();
    let budgetSeed: { usd: number; usage: Usage; agentsSpawned: number } | undefined;
    const makeBudget = (): RunBudget =>
      new RunBudget({
        ...(opts?.budgetUsd === undefined ? {} : { ceilingUsd: opts.budgetUsd }),
        lifetimeSpawnCap: options.budgetDefaults?.lifetimeSpawnCap ?? 500,
        events: { emit: (body) => bus.emit(body as WorkflowEventBody, rootSpanId) },
        priceUsd,
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
    replayer.setDisposition(
      dispositionHook(replayer.fold.abandonFold, registry, replayer.invalidatedSeqs),
    );
    // Alias-sourced candidates bypass the abandon overlay (DEF-5, docs/03
    // 9.5): donor entries regain their pre-abandon status through links.
    replayer.setAliasDisposition(
      dispositionHook({ isAbandoned: () => false }, registry, replayer.invalidatedSeqs),
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
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    if (opts?.deadlineAt !== undefined) {
      const delay = Date.parse(opts.deadlineAt) - realNow();
      deadlineTimer = setTimeout(
        () => requestCancel(`run deadline ${opts.deadlineAt} crossed`),
        Math.max(0, delay),
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
    const external = new ExternalRegistry(replayer);
    let transcriptCounter = 0;
    const internals: RunInternals = {
      runId,
      replayer,
      budget,
      admission,
      semaphore: new Semaphore(options.concurrency?.perRun ?? DEFAULT_PER_RUN_CONCURRENCY),
      providerLimiter,
      ...(options.pricing === undefined ? {} : { pricingVersion: options.pricing.pricingVersion }),
      ...(options.budgetDefaults?.flatReserveUsd === undefined
        ? {}
        : { flatReserveUsd: options.budgetDefaults.flatReserveUsd }),
      ...(defaults.roleFloors === undefined ? {} : { floors: defaults.roleFloors }),
      events: { emit: (body, spanId) => bus.emit(body as WorkflowEventBody, spanId ?? rootSpanId) },
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
      runSignal: controller.signal,
      ...(defaults.isolation === undefined ? {} : { isolation: defaults.isolation }),
      ...(options.onEscalation === undefined ? {} : { onEscalation: options.onEscalation }),
      external,
      mintTranscriptRef: () => `${runId}/t${transcriptCounter++}`,
      now: realNow,
    };

    const putMeta = (status: RunStatus): Promise<void> =>
      journal.putMeta({
        runId,
        status,
        updatedAt: new Date(realNow()).toISOString(),
        ...(opts?.name === undefined ? {} : { name: opts.name }),
        ...(opts?.tags === undefined ? {} : { tags: opts.tags }),
        workflowName: wf.name,
        workflowHash:
          compiled === undefined
            ? hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>)
            : hashWorkflowSource(compiled.source),
        ...(compiled === undefined ? {} : { workflowSourceRef: workflowSourceRef(runId) }),
      });

    const result: Promise<RunOutcome<R>> = (async () => {
      let status: RunOutcome<R>['status'] = 'ok';
      let value: R | undefined;
      let wireError: WireError | undefined;
      let pending: PendingExternal[] = [];
      if (compiled !== undefined) {
        // The binding contract (docs/06, 10.2): the compiled source and
        // its content hash persist AT START so planned runs are
        // resumable by construction; resume rehydrates from this blob.
        await transcripts.put(workflowSourceRef(runId), new TextEncoder().encode(compiled.source));
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
        const ctx = createCtx(internals);
        const selectedRunner =
          compiled === undefined ? runner : (options.runners?.sandbox as ScriptRunner);
        const bodyPromise = selectedRunner.execute(wf, ctx, args);
        // Every in-flight branch blocked on suspensions settles the run
        // 'suspended' with the open keys (docs/06, section 2.7).
        const raced = await Promise.race([
          bodyPromise.then((result) => ({ kind: 'done' as const, result })),
          quiesced.then((open) => ({ kind: 'suspended' as const, open })),
        ]);
        if (raced.kind === 'suspended') {
          bodyPromise.catch(() => undefined);
          status = 'suspended';
          pending = raced.open;
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
          // is never null (docs/07, 12.4).
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
          // Exhausted overrides error (docs/06, section "Script-mode
          // exhaustion and the exhausted outcome").
          status = 'exhausted';
          wireError = thrown instanceof LurkerError ? thrown.toWire() : undefined;
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
        }
      } finally {
        if (deadlineTimer !== undefined) {
          clearTimeout(deadlineTimer);
        }
        await replayer.flush().catch(() => undefined);
      }
      // Report totals are the LEDGER FOLD totals at settle, not the live
      // budget accumulator: the journal is the truth cost reconciles
      // against, and one summation order keeps the equality exact
      // (M5-T03 acceptance; docs/09, section "CostReport").
      const ledger = replayer.ledger();
      const outcome: RunOutcome<R> = {
        status,
        dropped: internals.dropped,
        pending,
        usage: ledger.usage,
        cost: buildCostReport(internals.cost, ledger.usd),
      };
      if (value !== undefined && (status === 'ok' || status === 'exhausted')) {
        // Exhaustion is never null when a value exists: the DEF-7
        // finalize fallback synthesizes the partial (docs/07, 12.4).
        outcome.value = value;
      }
      if (wireError !== undefined) {
        outcome.error = wireError;
      }
      await putMeta(status).catch(() => undefined);
      bus.emit({ type: 'run:end', status, totalUsd: ledger.usd }, rootSpanId);
      bus.end();
      resumeCtx?.previewResolve({
        ...replayer.resumeReport(),
        invalidResolutions: replayer.fold.invalidResolutions(),
      });
      return outcome;
    })();

    // The outcome is delivered through handle.result; an unobserved copy
    // must not crash the process.
    result.catch(() => undefined);

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
      const metas = await journal.listRuns();
      const meta = metas.find((candidate) => candidate.runId === runId);
      // Bare resume of an in-process run resolves by the recorded name
      // from defaults.workflows (docs/06, 10.2, M8 entry amendment: the
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
              `defaults.workflows (docs/06, 10.2); run '${runId}' records ` +
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
        // The compiled-run binding (docs/06, 10.2): rehydrate the
        // persisted source pinned by workflowHash. Dialect validation is
        // not re-run: the hash proves byte identity with the source
        // compileScript validated at run start.
        if (meta?.workflowSourceRef === undefined) {
          throw new ConfigError(
            'engine.resume requires the workflow for in-process runs (docs/06, section ' +
              '"Engine and ops API"); only compiled runs with a persisted source resume bare',
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
          // A differing compiled source is a hard mismatch (docs/06, 10.2).
          const expectedHash = hashWorkflowSource(supplied.source);
          if (meta?.workflowHash !== undefined && meta.workflowHash !== expectedHash) {
            throw new ConfigError(
              `resume binding mismatch: the supplied CompiledWorkflow source hash differs ` +
                `from the one recorded for run '${runId}' (docs/06, 10.2)`,
            );
          }
        } else {
          const expectedHash = hashWorkflowBody(supplied);
          if (meta?.workflowHash !== undefined && meta.workflowHash !== expectedHash) {
            // The journal itself decides replay versus live per content keys.
            process.emitWarning(
              `resume: the body of workflow '${supplied.name}' changed since run '${runId}' ` +
                'started; orphans and misses will be reported honestly',
              { code: 'LURKER_RESUME_HASH_MISMATCH', type: 'LurkerWarning' },
            );
          }
        }
        bound = supplied;
      }
      const raw = await journal.load(runId);
      const priorEntries = raw.map((entry) => normalizeEntry(entry));
      // One scan, strictly before any live call, append, or reserve.
      scanJournalCompatibility(runId, priorEntries, buildDeriverRegistry(options.extraDerivers));
      return run(bound, resumeOptions?.args, undefined, {
        runId,
        priorEntries,
        strict: resumeOptions?.dryRun ?? false,
        invalidate: resumeOptions?.invalidate ?? [],
        ...(resumeOptions?.lease === undefined ? {} : { lease: resumeOptions.lease }),
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

  /** Retention cascade (OQ-20 executed at M8-T04): blobs, then journal. */
  async function deleteRun(runId: string): Promise<void> {
    const refs = await transcripts.list(runId);
    for (const ref of refs) {
      await transcripts.delete(ref);
    }
    await journal.delete(runId);
  }

  /**
   * Checkpoint pruning (OQ-20 executed at M8-T04): ok-terminal attempts
   * replay from the journal and never boot their checkpoint again;
   * everything else (parked, cancelled, escalated, hanging) keeps its
   * blob for park/unpark, DEF-5 retention, and dangling redispatch.
   */
  async function pruneRun(runId: string): Promise<number> {
    const entries = (await journal.load(runId)).map((entry) => normalizeEntry(entry));
    const existing = new Set(await transcripts.list(runId));
    let pruned = 0;
    for (const terminal of entries) {
      if (
        terminal.kind !== 'agent' ||
        terminal.status !== 'ok' ||
        terminal.ref === undefined ||
        terminal.checkpointRef === undefined ||
        !existing.has(terminal.checkpointRef)
      ) {
        continue;
      }
      const ref = terminal.checkpointRef;
      // Conservative reference scan: ANY other entry mentioning the ref
      // (park anchors, boot reuse, links) keeps the blob.
      const referencedElsewhere = entries.some(
        (entry) => entry.seq !== terminal.seq && JSON.stringify(entry).includes(ref),
      );
      if (referencedElsewhere) {
        continue;
      }
      await transcripts.delete(ref);
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
    profileCard: (names) => {
      const registered = defaults.profiles ?? {};
      if (names === undefined) {
        return profileCard(registered);
      }
      const filtered: Record<string, AgentProfile> = {};
      for (const name of names) {
        if (registered[name] !== undefined) {
          filtered[name] = registered[name];
        }
      }
      return profileCard(filtered);
    },
  };
}
