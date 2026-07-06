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
import { Replayer } from '../journal/replayer.js';
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
import { buildCostReport, type RunHandle, type RunOutcome, type RunStatus } from './run-handle.js';
import { DEFAULT_PER_RUN_CONCURRENCY, Semaphore } from './scheduler.js';
import { InProcessRunner, type CompiledWorkflow, type ScriptRunner } from '../runner/inprocess.js';

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

export interface Engine {
  run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): RunHandle<R>;
  /** Lands with the journal kernel in M2; throws a typed ConfigError until then. */
  resume(runId: string, wf?: Workflow<unknown, unknown> | CompiledWorkflow): RunHandle<unknown>;
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

  function run<A, R>(wf: Workflow<A, R>, args: A, opts?: RunOptions): RunHandle<R> {
    if (wf.kind !== 'workflow') {
      throw new ConfigError(
        'engine.run accepts in-process Workflow values only before M6 (CompiledWorkflow ' +
          'values first exist with compileScript in @lurker/planner)',
      );
    }
    const runId = opts?.runId ?? mintRunId();
    const spans = new SpanRegistry();
    const bus = new EventBus({ runId, spans, now: realNow });
    const rootSpanId = spans.mint();
    const budget = new RunBudget({
      ...(opts?.budgetUsd === undefined ? {} : { ceilingUsd: opts.budgetUsd }),
      lifetimeSpawnCap: options.budgetDefaults?.lifetimeSpawnCap ?? 500,
      events: { emit: (body) => bus.emit(body as WorkflowEventBody, rootSpanId) },
      priceUsd,
    });
    const replayer = new Replayer({ runId, store: journal, now: realNow, priceUsd });
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
      await putMeta('running');
      bus.emit({ type: 'run:start', workflow: wf.name, resumed: false }, rootSpanId);
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
        value = await runner.execute(wf, ctx, args);
        if (budget.exhausted) {
          status = 'exhausted';
          value = undefined;
        } else if (controller.signal.aborted) {
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
        pending: [],
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
      cancel: async (reason?: string) => {
        requestCancel(reason ?? 'cancelled by host');
        await result.then(
          () => undefined,
          () => undefined,
        );
      },
    };
  }

  return {
    run,
    resume: () => {
      throw new ConfigError(
        'engine.resume lands with the journal kernel in M2 (docs/10, section 3.3); ' +
          'InMemoryStore runs are not resumable in any case',
      );
    },
  };
}
