/**
 * Minimal inline test doubles for M1-T05/T06/T07/T08/T09 unit tests: a
 * scripted ProviderAdapter and a RunInternals factory. Superseded for
 * consumers by @lurker/testing's FakeAdapter and createTestEngine
 * (M1-T14); these stay as the package-internal harness. Not exported from
 * the package index.
 */
import type { WireError } from '../l0/errors.js';
import type {
  ChatEvent,
  ChatRequest,
  FinishInfo,
  InvocationRole,
  ModelRef,
  ModelSpec,
  Usage,
} from '../l0/messages.js';
import type { ModelCaps, ProviderAdapter } from '../l0/spi/provider.js';
import { Replayer } from '../journal/replayer.js';
import { buildAbandonFold, dispositionHook } from '../journal/disposition.js';
import {
  buildDeriverRegistry,
  registryKeyRing,
  scanJournalCompatibility,
} from '../journal/keyderiver.js';
import type { JournalEntry } from '../l0/entries.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { buildAdapterRegistry } from '../model/router.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import { AdmissionController } from '../orchestrator/admission.js';
import { RunBudget } from './budget.js';
import { SpanRegistry } from './events.js';
import { Semaphore } from './scheduler.js';
import type { AgentProfile, RunEventSink, RunInternals } from './ctx.js';
import type { IsolationProvider } from '../l0/spi/isolation.js';
import type { EscalationDecision } from '../runtime/escalation.js';
import type { EscalatedResult } from '../runtime/agent-loop.js';
import type { PermissionConfig } from '../runtime/permission-chain.js';
import { ExternalRegistry } from './external.js';
import { KeyedLimiter } from '../model/concurrency.js';
import { resolvePricing, type PriceTable } from '../model/pricing.js';
import type { QualityFloors } from '../model/floors.js';

export interface ScriptedTurn {
  /** Text emitted as a single text-delta. */
  text?: string;
  /** A tool call emitted with assembled args. */
  toolCall?: { name: string; args: unknown };
  /** Several tool calls in one turn (emitted after toolCall when both set). */
  toolCalls?: Array<{ name: string; args: unknown }>;
  finish?: FinishInfo['reason'] | FinishInfo;
  usage?: Partial<Usage>;
  /** Rides the finish event; carries retention payloads (docs/04, 2.3). */
  providerMetadata?: Record<string, unknown>;
  /** Emit a terminal error event instead of finish. */
  error?: WireError;
  /** Delay before the terminal event; lets idle timers and aborts fire. */
  hangMs?: number;
}

export function testCaps(overrides?: Partial<ModelCaps>): ModelCaps {
  return {
    structuredOutput: 'native',
    supportsTemperature: false,
    supportsParallelTools: true,
    reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
    ...overrides,
  };
}

const DEFAULT_USAGE: Usage = {
  inputTokens: 10,
  outputTokens: 5,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

/**
 * A ProviderAdapter that replays a script. The script function receives
 * the request and the zero-based call number and returns the turn to
 * stream.
 */
export function scriptedAdapter(
  script: (req: ChatRequest, call: number) => ScriptedTurn,
  options?: { id?: string; caps?: ModelCaps; provider?: string },
): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  const caps = options?.caps ?? testCaps();
  return {
    id: options?.id ?? 'fake',
    ...(options?.provider === undefined ? {} : { provider: options.provider }),
    calls,
    caps: () => caps,
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const call = calls.length;
      calls.push(req);
      const turn = script(req, call);
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      const toolCalls = [
        ...(turn.toolCall === undefined ? [] : [turn.toolCall]),
        ...(turn.toolCalls ?? []),
      ];
      for (const [index, toolCall] of toolCalls.entries()) {
        const id = `id-${call}-${index}`;
        yield { type: 'tool-call-start', id, name: toolCall.name };
        yield {
          type: 'tool-call-delta',
          id,
          argsTextDelta: JSON.stringify(toolCall.args),
        };
        yield { type: 'tool-call-end', id, args: toolCall.args };
      }
      if (turn.usage !== undefined) {
        yield { type: 'usage', usage: turn.usage };
      }
      if (turn.hangMs !== undefined) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, turn.hangMs);
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
          });
        });
        if (signal?.aborted === true) {
          return;
        }
      }
      if (turn.error !== undefined) {
        yield { type: 'error', error: turn.error };
        return;
      }
      const finish: FinishInfo =
        turn.finish === undefined
          ? { reason: 'stop' }
          : typeof turn.finish === 'string'
            ? ({ reason: turn.finish } as FinishInfo)
            : turn.finish;
      const usage: Usage = { ...DEFAULT_USAGE, ...turn.usage };
      yield {
        type: 'finish',
        finish,
        usage,
        ...(turn.providerMetadata === undefined ? {} : { providerMetadata: turn.providerMetadata }),
      };
    },
  };
}

export interface RecordedEvents extends RunEventSink {
  all: Array<{ type: string } & Record<string, unknown>>;
  ofType(type: string): Array<Record<string, unknown>>;
}

export function recordingSink(): RecordedEvents {
  const all: Array<{ type: string } & Record<string, unknown>> = [];
  return {
    all,
    emit(body, spanId) {
      all.push(spanId === undefined ? body : { ...body, spanId });
    },
    ofType(type: string) {
      return all.filter((event) => event.type === type);
    },
  };
}

export interface TestInternalsOptions {
  adapters?: ProviderAdapter[];
  routing?: Partial<Record<InvocationRole, ModelSpec>>;
  profiles?: Record<string, AgentProfile>;
  /** The per-engine workflow registry (docs/06, 10.4; M6-T06). */
  workflows?: Record<string, unknown>;
  limits?: UsageLimits;
  permissions?: PermissionConfig;
  isolation?: IsolationProvider;
  onEscalation?: (
    result: EscalatedResult<unknown>,
  ) => EscalationDecision | Promise<EscalationDecision>;
  budgetUsd?: number;
  lifetimeSpawnCap?: number;
  /** AdmissionController knobs (docs/07, 7.3; M6-T06). */
  maxDepth?: number;
  maxChildrenPerNode?: number;
  childBudgetFraction?: number;
  flatReserveUsd?: number;
  admissionMintId?: () => string;
  perRun?: number;
  /** Versioned price table; wins over caps.pricing (M4-T06). */
  pricing?: PriceTable;
  /** Per-adapter-id concurrency caps (M4-T07). */
  perProvider?: Record<string, number>;
  /** Hard per-role model constraints (M4-T09). */
  floors?: QualityFloors;
  errorPolicy?: 'strict' | 'lenient';
  now?: () => number;
  /** Resume simulation: the loaded prior journal. */
  priorEntries?: JournalEntry[];
  store?: InMemoryStore;
  /** Shared across simulated processes for checkpoint restore tests. */
  transcripts?: InMemoryTranscriptStore;
  extraDerivers?: readonly unknown[];
}

export function makeInternals(options: TestInternalsOptions = {}): {
  internals: RunInternals;
  store: InMemoryStore;
  events: RecordedEvents;
} {
  const store = options.store ?? new InMemoryStore();
  const events = recordingSink();
  const adapters = buildAdapterRegistry(options.adapters ?? []);
  const priceUsd = (servedBy: ModelRef | undefined, usage: Usage): number | undefined => {
    if (servedBy === undefined) {
      return undefined;
    }
    const colon = servedBy.indexOf(':');
    const adapter = adapters.get(servedBy.slice(0, colon));
    const pricing = resolvePricing(
      servedBy,
      options.pricing,
      adapter?.caps(servedBy.slice(colon + 1)).pricing,
    );
    if (pricing === undefined) {
      return undefined;
    }
    return (
      (usage.inputTokens / 1_000_000) * pricing.inputUsdPerMTok +
      (usage.outputTokens / 1_000_000) * pricing.outputUsdPerMTok
    );
  };
  const budgetOptions: ConstructorParameters<typeof RunBudget>[0] = { events, priceUsd };
  if (options.budgetUsd !== undefined) {
    budgetOptions.ceilingUsd = options.budgetUsd;
  }
  if (options.lifetimeSpawnCap !== undefined) {
    budgetOptions.lifetimeSpawnCap = options.lifetimeSpawnCap;
  }
  const registry = buildDeriverRegistry(options.extraDerivers);
  if (options.priorEntries !== undefined) {
    scanJournalCompatibility('test-run', options.priorEntries, registry);
  }
  const fold = buildAbandonFold(options.priorEntries ?? []);
  const seededReplayer = new Replayer({
    runId: 'test-run',
    store,
    priceUsd,
    keyRing: registryKeyRing(registry),
    disposition: dispositionHook(fold, registry),
    ...(options.priorEntries === undefined ? {} : { priorEntries: options.priorEntries }),
  });
  if (options.priorEntries !== undefined) {
    const prior = seededReplayer.ledger();
    budgetOptions.seed = { usd: prior.usd, usage: prior.usage, agentsSpawned: prior.agentsSpawned };
  }
  const budget = new RunBudget(budgetOptions);
  const admission = new AdmissionController({
    budget,
    ...(options.maxDepth === undefined ? {} : { maxDepth: options.maxDepth }),
    ...(options.maxChildrenPerNode === undefined
      ? {}
      : { maxChildrenPerNode: options.maxChildrenPerNode }),
    ...(options.childBudgetFraction === undefined
      ? {}
      : { childBudgetFraction: options.childBudgetFraction }),
    ...(options.flatReserveUsd === undefined ? {} : { flatReserveUsd: options.flatReserveUsd }),
    ...(options.admissionMintId === undefined ? {} : { mintId: options.admissionMintId }),
  });
  const replayer = seededReplayer;
  let refCounter = 0;
  const spans = new SpanRegistry();
  const internals: RunInternals = {
    runId: 'test-run',
    replayer,
    budget,
    admission,
    semaphore: new Semaphore(options.perRun ?? 12),
    providerLimiter: new KeyedLimiter(options.perProvider),
    ...(options.pricing === undefined ? {} : { pricingVersion: options.pricing.pricingVersion }),
    ...(options.floors === undefined ? {} : { floors: options.floors }),
    events,
    spans,
    rootSpanId: spans.mint(),
    transcripts: options.transcripts ?? new InMemoryTranscriptStore(),
    adapters,
    defaults: {
      ...(options.routing === undefined ? {} : { routing: options.routing }),
      ...(options.profiles === undefined ? {} : { profiles: options.profiles }),
      ...(options.workflows === undefined ? {} : { workflows: options.workflows }),
      ...(options.limits === undefined ? {} : { limits: options.limits }),
      ...(options.permissions === undefined ? {} : { permissions: options.permissions }),
    },
    errorPolicy: options.errorPolicy ?? 'strict',
    dropped: [],
    cost: {
      byModel: new Map(),
      byPhase: new Map(),
      byAgentType: new Map(),
      byRole: new Map(),
      unpriced: [],
    },
    priceUsd,
    ...(options.isolation === undefined ? {} : { isolation: options.isolation }),
    ...(options.onEscalation === undefined ? {} : { onEscalation: options.onEscalation }),
    external: new ExternalRegistry(replayer),
    mintTranscriptRef: () => `test-run/t${refCounter++}`,
    now: options.now ?? Date.now,
  };
  return { internals, store, events };
}
