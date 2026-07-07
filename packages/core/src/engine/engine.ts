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
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { JournalStore } from '../l0/spi/store.js';
import type { TranscriptStore } from '../l0/spi/transcript.js';
import { createCanonicalIdMinter } from '../l0/messages.js';
import { validateSchemaSpec } from '../l0/schema.js';
import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import { Replayer } from '../journal/replayer.js';
import {
  buildDeriverRegistry,
  registryKeyRing,
  scanJournalCompatibility,
} from '../journal/keyderiver.js';
import { dispositionHook } from '../journal/disposition.js';
import type { ResumeReport } from '../journal/matching.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { buildAdapterRegistry, parseModelRef } from '../model/router.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
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
import { InProcessRunner, type ScriptRunner } from '../runner/inprocess.js';

export type { RunStatus };

export interface EngineDefaults {
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  limits?: UsageLimits;
}

export interface BudgetDefaults {
  /** Last resort of the admission reserve formula; default 0.50. */
  flatReserveUsd?: number;
  /** Engine kill switch; default 500 spawns per run. */
  lifetimeSpawnCap?: number;
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
  concurrency?: { perRun?: number };
  /**
   * KeyDeriver registry extension (docs/03, section "hashVersion").
   * Plumbed now, consumed by the matching kernel from M2.
   */
  extraDerivers?: readonly unknown[];
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
}

export interface ResumeHandle<R> extends RunHandle<R> {
  /** Resolves at settle with the replay accounting. */
  preview: Promise<ResumePreview>;
}

export interface Engine {
  run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): RunHandle<R>;
  /**
   * Rebinds a journal to a workflow definition and resumes (docs/06,
   * section "Engine and ops API"). Requires wf for in-process workflows;
   * a name mismatch is a typed ConfigError; a body-hash mismatch warns
   * loudly and proceeds (the journal decides replay per content keys).
   */
  resume<A, R>(runId: string, wf?: Workflow<A, R>, options?: ResumeOptions): ResumeHandle<R>;
}

/** Content hash of an in-process workflow body (run-to-definition binding, docs/06 10.2). */
export function hashWorkflowBody(wf: Workflow<never, never> | Workflow<unknown, unknown>): string {
  return createHash('sha256')
    .update((wf as Workflow<unknown, unknown>).body.toString(), 'utf8')
    .digest('hex');
}

export function createEngine(options: CreateEngineOptions): Engine {
  const adapters = buildAdapterRegistry(options.adapters);
  const journal = options.stores?.journal ?? new InMemoryStore();
  const transcripts = options.stores?.transcripts ?? new InMemoryTranscriptStore();
  const defaults = options.defaults ?? {};
  const runner: ScriptRunner = new InProcessRunner();
  const mintRunId = createCanonicalIdMinter();
  // Captured before any dev-mode patch so engine internals never trip the
  // bare-Date.now warning.
  const realNow: () => number = Date.now.bind(globalThis);

  const priceUsd = (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const { adapterId, model } = parseModelRef(servedBy);
    const pricing = adapters.get(adapterId)?.caps(model).pricing;
    if (pricing === undefined) {
      return undefined;
    }
    return (
      (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok +
      (usage.cacheReadTokens / 1_000_000) * (pricing.cacheReadUsdPerMTok ?? 0) +
      (usage.cacheWriteTokens / 1_000_000) * (pricing.cacheWriteUsdPerMTok ?? 0)
    );
  };

  interface ResumeContext {
    runId: string;
    priorEntries: JournalEntry[];
    strict: boolean;
    invalidate: number[];
    previewResolve: (preview: ResumePreview) => void;
  }

  function run<A, R>(
    wf: Workflow<A, R>,
    args: A,
    opts?: RunOptions,
    resumeCtx?: ResumeContext,
  ): RunHandle<R> {
    if (wf.kind !== 'workflow') {
      throw new ConfigError(
        'engine.run accepts in-process Workflow values only before M6 (CompiledWorkflow ' +
          'values first exist with compileScript in @lurker/planner)',
      );
    }
    const runId = resumeCtx?.runId ?? opts?.runId ?? mintRunId();
    const registry = buildDeriverRegistry(options.extraDerivers);
    const spans = new SpanRegistry();
    const bus = new EventBus({ runId, spans, now: realNow });
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
      strict: resumeCtx?.strict ?? false,
    });
    for (const seqToInvalidate of invalidated) {
      replayer.invalidate(seqToInvalidate);
    }
    replayer.setDisposition(
      dispositionHook(replayer.fold.abandonFold, registry, replayer.invalidatedSeqs),
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
    const external = new ExternalRegistry(replayer);
    let transcriptCounter = 0;
    const internals: RunInternals = {
      runId,
      replayer,
      budget,
      semaphore: new Semaphore(options.concurrency?.perRun ?? DEFAULT_PER_RUN_CONCURRENCY),
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
      },
      errorPolicy: wf.errorPolicy,
      dropped: [],
      cost: {
        byModel: new Map(),
        byPhase: new Map(),
        byAgentType: new Map(),
        byRole: new Map(),
        unpriced: [],
      },
      priceUsd: (servedBy, usage) => priceUsd(servedBy, usage),
      runSignal: controller.signal,
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
        workflowHash: hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>),
      });

    const result: Promise<RunOutcome<R>> = (async () => {
      let status: RunOutcome<R>['status'] = 'ok';
      let value: R | undefined;
      let wireError: WireError | undefined;
      let pending: PendingExternal[] = [];
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
        if (wf.argsSchema !== undefined) {
          const validation = await validateSchemaSpec(wf.argsSchema, args);
          if (!validation.valid) {
            throw new ConfigError(
              `arguments for workflow '${wf.name}' do not validate: ` +
                validation.issues.map((issue) => issue.message).join('; '),
            );
          }
        }
        const ctx = createCtx(internals);
        const bodyPromise = runner.execute(wf, ctx, args);
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
          status = 'exhausted';
          value = undefined;
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
      const spend = budget.spent();
      const outcome: RunOutcome<R> = {
        status,
        dropped: internals.dropped,
        pending,
        usage: spend.usage,
        cost: buildCostReport(internals.cost, spend.usd),
      };
      if (value !== undefined && status === 'ok') {
        outcome.value = value;
      }
      if (wireError !== undefined) {
        outcome.error = wireError;
      }
      await putMeta(status).catch(() => undefined);
      bus.emit({ type: 'run:end', status, totalUsd: spend.usd }, rootSpanId);
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
    wf?: Workflow<A, R>,
    resumeOptions?: ResumeOptions,
  ): ResumeHandle<R> {
    if (wf === undefined) {
      throw new ConfigError(
        'engine.resume requires the workflow for in-process runs; CompiledWorkflow source ' +
          'persistence arrives with M6-T05 (docs/06, section "Engine and ops API")',
      );
    }
    let previewResolve: (preview: ResumePreview) => void = () => undefined;
    const preview = new Promise<ResumePreview>((resolve) => {
      previewResolve = resolve;
    });
    const handlePromise = (async () => {
      const metas = await journal.listRuns();
      const meta = metas.find((candidate) => candidate.runId === runId);
      if (meta?.workflowName !== undefined && meta.workflowName !== wf.name) {
        throw new ConfigError(
          `resume binding mismatch: run '${runId}' was started by workflow ` +
            `'${meta.workflowName}', not '${wf.name}'`,
        );
      }
      const expectedHash = hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>);
      if (meta?.workflowHash !== undefined && meta.workflowHash !== expectedHash) {
        // The journal itself decides replay versus live per content keys.
        process.emitWarning(
          `resume: the body of workflow '${wf.name}' changed since run '${runId}' started; ` +
            'orphans and misses will be reported honestly',
          { code: 'LURKER_RESUME_HASH_MISMATCH', type: 'LurkerWarning' },
        );
      }
      const raw = await journal.load(runId);
      const priorEntries = raw.map((entry) => normalizeEntry(entry));
      // One scan, strictly before any live call, append, or reserve.
      scanJournalCompatibility(runId, priorEntries, buildDeriverRegistry(options.extraDerivers));
      return run(wf as unknown as Workflow<unknown, unknown>, resumeOptions?.args, undefined, {
        runId,
        priorEntries,
        strict: resumeOptions?.dryRun ?? false,
        invalidate: resumeOptions?.invalidate ?? [],
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

  return { run, resume };
}
