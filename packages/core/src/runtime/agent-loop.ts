/**
 * Agent runtime v1 (M1-T06): the single subagent loop shared by every
 * orchestration mode. A model turn; structured output in three tiers with
 * client validation and a bounded re-prompt; typed AgentResult; beyond the
 * configured policy the runtime never throws: failures become typed
 * AgentResult statuses. Tool dispatch, checkpoints, and compaction arrive
 * with M3/M4; the escalated status arrives in M3 as the flagged breaking
 * change.
 *
 * Owning specs: docs/06-execution-spec.md, section "Agent runtime
 * binding"; docs/04-model-layer-spec.md (roles, tiers, refusal).
 */
import {
  NonSerializableValueError,
  type AgentError,
  type Issue,
  type WireError,
} from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type {
  ChatRequest,
  FinishInfo,
  JsonSchema,
  ModelRef,
  Msg,
  Part,
  ToolContract,
  Usage,
} from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { ToolContext, ToolDef } from '../l0/spi/toolsource.js';
import type { Out, SchemaSpec } from '../l0/schema.js';
import { validateSchemaSpec } from '../l0/schema.js';
import { toJournalValue } from '../journal/serializable.js';
import type { CheckpointState, PendingToolTurn } from '../journal/checkpoint.js';
import { failoverTriggerOf, nextFailover, type FailoverTrigger } from '../model/failover.js';
import { liftRetainedParts, projectHistory, providerOf } from '../model/projector.js';
import {
  DEFAULT_RETRY_POLICY,
  retryClassOf,
  retryDelayMs,
  type RetryPolicy,
} from '../model/retry.js';
import type { ResolvedInvocation } from '../model/router.js';
import { selectStructuredOutputTier, type StructuredOutputTier } from '../model/caps.js';
import {
  ESCALATE_TOOL_NAME,
  countsAgainstLimit,
  type EscalationReport,
  type EscalationRequest,
} from './escalation.js';
import { compactMessages, shouldCompact, summarizeInstruction } from './compaction.js';
import { DEFAULT_MODEL_RETRY_ATTEMPTS, ModelRetry } from './model-retry.js';
import { NoProgressDetector, type AbortClass } from './no-progress.js';
import {
  applyStructuredOutputTier,
  extractCandidate,
  formatRePrompt,
  type CollectedTurn,
} from './structured-output.js';
import type { EffectiveUsageLimits } from './usage-limits.js';

export type AgentStatus = 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated';

/** Artifact: the normative shape of AgentResult.artifacts entries (docs/06, section 2.1). */
export interface Artifact {
  /** Stable within the result. */
  id: string;
  /** Closed in v1. */
  kind: 'file' | 'patch' | 'json' | 'text';
  /** Telemetry only. */
  label?: string;
  /** Changed-file list (kind 'patch': worktree collect()). */
  files?: string[];
  /** TranscriptStore blob ref for offloaded content. */
  ref?: string;
  /** Inline JSON content for small values. */
  data?: Json;
}

export interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage;
  costUsd: number;
  turns: number;
  /**
   * The model that actually served the loop phase at the end (M4-T04):
   * differs from the requested spec only under transport failover.
   */
  servedBy: ModelRef;
  transcriptRef: string;
  artifacts?: Artifact[];
  error?: AgentError;
  /**
   * Human-readable detail behind `error` (provider message, first schema
   * issue): feeds the journaled WireError message. Additive to the
   * docs/06 sketch; never part of identity.
   */
  errorMessage?: string;
  /** Present if and only if status === 'escalated'. */
  escalation?: EscalationReport;
  /**
   * Engine-internal: the accepted escalate request before the runtime
   * fills costToDate and salvage into the full report. The ctx layer
   * consumes and removes it; consumers read `escalation`.
   */
  escalationRequest?: EscalationRequest;
  /**
   * The dedicated first-class abort class (M3-T08): present on the
   * engine-decided no-progress abort (status 'limit'), never on user
   * cancellation or ordinary cap hits.
   */
  abortClass?: AbortClass;
}

export type EscalatedResult<T> = AgentResult<T> & {
  status: 'escalated';
  escalation: EscalationReport;
};

export function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T> {
  return r.status === 'escalated';
}

/** Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10. */
export interface RuntimeEventSink {
  emit(body: { type: string } & Record<string, unknown>): void;
}

/** Budget hooks bound by the three-layer budget (docs/06, section "Three-layer budget"). */
export interface BudgetHooks {
  /** Layer 2: before every turn; throws BudgetExhaustedError to block dispatch. */
  beforeTurn(): void;
  /** Live usage accounting; layer 3 may respond by aborting `signal`. */
  onUsage(usage: Usage, servedBy: ModelRef): void;
  /** Layer 3: the ceiling AbortSignal. */
  signal?: AbortSignal;
}

/** Reason marker distinguishing a budget-ceiling abort from host cancellation. */
export const BUDGET_ABORT_REASON = 'lurker:budget-ceiling';

/** One model-issued tool call as the loop dispatches it. */
export interface ToolCallRequest {
  id: string;
  name: string;
  args: unknown;
}

/**
 * The ctx-side verdict for one dispatch, produced by the permission
 * chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
 * pending state FIRST, then suspend() journals the approval entry (or
 * re-matches an existing one) and parks until a resolution closes it.
 */
export interface GateAudit {
  verdict: 'allow' | 'deny' | 'ask';
  decidedBy: string;
  rule?: Json;
  advisory?: Json;
}

export type PermissionGate = (
  | { kind: 'allow'; input: unknown }
  | { kind: 'deny'; reason: string }
  | {
      kind: 'ask';
      input: unknown;
      suspend: () => Promise<{ decision: 'allow' | 'deny'; reason?: string }>;
    }
) & {
  /** Chain audit payload ridden into tool:end telemetry (docs/08, 4.5). */
  audit?: GateAudit;
};

/**
 * The spawn's frozen toolset plus the per-call context factory, prepared
 * by the ctx layer (M3-T01). The contracts are the canonical identity
 * projection already hashed into the spawn's content key; the loop sends
 * exactly them to the model.
 */
export interface ToolRuntime {
  defs: ToolDef[];
  contracts: ToolContract[];
  /** Mints a per-call ToolContext (fresh tool span under the agent span). */
  contextFor(toolName: string): ToolContext;
  /** Permission chain evaluation (M3-T03); absent = every call allowed. */
  permission?: (call: ToolCallRequest) => Promise<PermissionGate>;
}

/** One serving target of a phase: the primary or a failover fallback. */
export interface PhaseTarget {
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
}

export interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
  prompt: string;
  schema?: S;
  /** Canonicalized JSON Schema projection of `schema` (precomputed for identity). */
  canonicalSchema?: JsonSchema;
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
  /**
   * Transport failover chain for the loop phase (M4-T04; docs/04,
   * section 11.2): resolved fallback targets tried in order on
   * transport or rate-limit failures after retries exhaust. Failover is
   * sticky and changes only servedBy, never the content key.
   */
  fallbacks?: PhaseTarget[];
  /**
   * Transport RetryPolicy (M4-T05; docs/04, section 11.1): lives UNDER
   * the journal, wired around every adapter.stream dispatch. sleep and
   * random are injectable for tests; the core owns wall-clock.
   */
  retry?: {
    policy?: RetryPolicy;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
  };
  /**
   * Per-provider keyed limiter hook (M4-T07): wraps every wire dispatch
   * under the serving adapter's key; absent = unlimited (Appendix A).
   */
  providerSlot?: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  /** The resolved toolset; absent = no tools declared (docs/08). */
  tools?: ToolRuntime;
  /**
   * Separate final extract invocation, present only when the role trigger
   * protocol demands one: schema set AND (routing directs extract to a
   * different model OR the loop model's caps cannot serve the required
   * tier OR finalize is routed). Otherwise the schema rides the last loop
   * turn (docs/06, section "Agent runtime binding"; the necessity rule is
   * decided by the ctx layer via model/roles.ts).
   */
  extract?: PhaseTarget & { fallbacks?: PhaseTarget[] };
  /**
   * Finalize synthesis invocation (M4-T01), present only when the role
   * trigger protocol fires it: configured in routing AND the toolset is
   * non-empty. Runs after tools stop with toolChoice 'none' over the
   * full transcript; its text becomes the output for schema-less calls,
   * and a schema-bearing call always pairs it with a separate extract
   * (the ctx layer guarantees `extract` is present in that case). Like
   * extract, the finalize invocation is not checkpointed in v1.
   */
  finalize?: PhaseTarget & { fallbacks?: PhaseTarget[] };
  /**
   * Summarize invocation target for compaction (M4-T03): resolved
   * through the chain with role 'summarize', falling back to the loop
   * model when routing resolves nothing (docs/06, section 7). Compaction
   * is ON by default; absence of this option disables it (direct
   * runAgent callers).
   */
  summarize?: PhaseTarget & { fallbacks?: PhaseTarget[] };
  /** Per-profile compaction config; threshold default 0.8 (Appendix A). */
  compaction?: { threshold?: number };
  /**
   * Turn-boundary checkpointing (M3-T02; docs/03, section "Checkpoints").
   * load() restores the last boundary on a dangling-dispatch resume;
   * save() persists each boundary where the loop continues. The separate
   * extract invocation is not checkpointed in v1: an extract-phase crash
   * re-pays from the last loop boundary.
   */
  checkpoint?: {
    load(): Promise<CheckpointState | undefined>;
    save(state: CheckpointState): Promise<void>;
  };
  limits: EffectiveUsageLimits;
  /** Emits agent:stream deltas when true (telemetry only). */
  stream?: boolean;
  /** Host or sibling cancellation. */
  signal?: AbortSignal;
  budget?: BudgetHooks;
  events?: RuntimeEventSink;
  transcript?: { mintRef(): string; put(ref: string, blob: Uint8Array): Promise<void> };
  priceUsd?: (servedBy: ModelRef, usage: Usage) => number | undefined;
  /** Bounded schema re-prompt attempts; default 2 (docs/06, Appendix A). */
  schemaRetryAttempts?: number;
  /** Bounded ModelRetry conversions per tool call chain; default 2 (Appendix A). */
  modelRetryAttempts?: number;
  /**
   * Escalation opt-in (M3-T07): the loop intercepts accepted calls to
   * the escalate tool and terminates with status 'escalated'; the
   * in-run minSpend gate rejects early scope_bigger escalations with a
   * "keep working" error tool result (M3-T09, docs/07 section 6.4).
   */
  escalation?: { minSpendUsd: number };
  agentType?: string;
  /** The primary invocation role of the tool loop; default 'loop' (M6-T05). */
  role?: 'loop' | 'plan' | 'orchestrate';
  label?: string;
  now?: () => number;
}

const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

function addUsage(total: Usage, turn: Usage): Usage {
  const sum: Usage = {
    inputTokens: total.inputTokens + turn.inputTokens,
    outputTokens: total.outputTokens + turn.outputTokens,
    cacheReadTokens: total.cacheReadTokens + turn.cacheReadTokens,
    cacheWriteTokens: total.cacheWriteTokens + turn.cacheWriteTokens,
  };
  const reasoning = (total.reasoningTokens ?? 0) + (turn.reasoningTokens ?? 0);
  if (reasoning > 0) {
    sum.reasoningTokens = reasoning;
  }
  return sum;
}

/**
 * The Usage invariant is verified at the adapter boundary: inputTokens is
 * the FULL prompt including cache reads and writes (docs/04, section
 * "Usage invariant").
 */
function assertUsageInvariant(usage: Usage, adapterId: string): void {
  if (usage.inputTokens < usage.cacheReadTokens + usage.cacheWriteTokens) {
    throw new Error(
      `adapter '${adapterId}' violated the Usage invariant: inputTokens ` +
        `(${usage.inputTokens}) < cacheReadTokens + cacheWriteTokens ` +
        `(${usage.cacheReadTokens} + ${usage.cacheWriteTokens})`,
    );
  }
}

interface TurnOutcome {
  turn: CollectedTurn;
  finish?: FinishInfo;
  usage: Usage;
  /** The portion already reported through onUsage mid-stream. */
  reported: Usage;
  usageApprox: boolean;
  wireError?: WireError;
  aborted?: 'budget' | 'external' | 'idle';
  /** The finish event's metadata; carries the retention payload (docs/04, 2.3). */
  providerMetadata?: Record<string, unknown>;
}

async function streamTurn(
  adapter: ProviderAdapter,
  req: ChatRequest,
  options: {
    idleTimeoutMs: number;
    signals: AbortSignal[];
    budgetSignal?: AbortSignal;
    onDelta?: (delta: string) => void;
    /** Mid-stream usage reporting (feeds the layer-3 ceiling). */
    onUsage?: (delta: Usage) => void;
  },
): Promise<TurnOutcome> {
  const idle = new AbortController();
  const all = [...options.signals, idle.signal];
  if (options.budgetSignal !== undefined) {
    all.push(options.budgetSignal);
  }
  const combined = AbortSignal.any(all);

  const turn: CollectedTurn = { text: '', toolCalls: [] };
  const pendingArgs = new Map<string, { name: string; argsText: string }>();
  let usage: Usage = ZERO_USAGE;
  let reported: Usage = ZERO_USAGE;
  let sawFinish = false;
  let finish: FinishInfo | undefined;
  let providerMetadata: Record<string, unknown> | undefined;
  let wireError: WireError | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const armIdle = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => idle.abort('lurker:stream-idle'), options.idleTimeoutMs);
  };

  try {
    armIdle();
    for await (const event of adapter.stream(req, combined)) {
      armIdle();
      switch (event.type) {
        case 'text-delta':
          turn.text += event.text;
          options.onDelta?.(event.text);
          break;
        case 'reasoning-delta':
          options.onDelta?.(event.text);
          break;
        case 'tool-call-start':
          pendingArgs.set(event.id, { name: event.name, argsText: '' });
          break;
        case 'tool-call-delta': {
          const pending = pendingArgs.get(event.id);
          if (pending !== undefined) {
            pending.argsText += event.argsTextDelta;
          }
          break;
        }
        case 'tool-call-end': {
          const pending = pendingArgs.get(event.id);
          turn.toolCalls.push({ id: event.id, name: pending?.name ?? '', args: event.args });
          pendingArgs.delete(event.id);
          break;
        }
        case 'usage': {
          usage = { ...usage, ...event.usage };
          const delta: Usage = {
            inputTokens: event.usage.inputTokens ?? 0,
            outputTokens: event.usage.outputTokens ?? 0,
            cacheReadTokens: event.usage.cacheReadTokens ?? 0,
            cacheWriteTokens: event.usage.cacheWriteTokens ?? 0,
          };
          if (event.usage.reasoningTokens !== undefined) {
            delta.reasoningTokens = event.usage.reasoningTokens;
          }
          reported = addUsage(reported, delta);
          options.onUsage?.(delta);
          break;
        }
        case 'finish':
          sawFinish = true;
          finish = event.finish;
          usage = event.usage;
          providerMetadata = event.providerMetadata;
          break;
        case 'error':
          wireError = event.error;
          break;
      }
      if (wireError !== undefined) {
        break;
      }
    }
  } catch (thrown) {
    if (!combined.aborted) {
      wireError = {
        code: 'agent',
        message: thrown instanceof Error ? thrown.message : String(thrown),
        retryable: true,
        data: { kind: 'transport' },
      };
    }
  } finally {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer);
    }
  }

  if (combined.aborted && !sawFinish && wireError === undefined) {
    const aborted =
      options.budgetSignal?.aborted === true ? 'budget' : idle.signal.aborted ? 'idle' : 'external';
    const outcome: TurnOutcome = { turn, usage, reported, usageApprox: true, aborted };
    if (finish !== undefined) {
      outcome.finish = finish;
    }
    return outcome;
  }
  const outcome: TurnOutcome = { turn, usage, reported, usageApprox: !sawFinish };
  if (finish !== undefined) {
    outcome.finish = finish;
  }
  if (providerMetadata !== undefined) {
    outcome.providerMetadata = providerMetadata;
  }
  if (wireError !== undefined) {
    outcome.wireError = wireError;
  }
  return outcome;
}

function classifyWireError(wire: WireError): AgentError {
  const data = (wire.data ?? {}) as { [key: string]: Json };
  const kind =
    data.kind === 'rate-limit' || wire.code === 'rate-limit'
      ? 'rate-limit'
      : ((data.kind as AgentError['kind'] | undefined) ?? 'transport');
  const error: AgentError = { kind, retryable: wire.retryable };
  if (typeof data.retryAfterMs === 'number') {
    error.retryAfterMs = data.retryAfterMs;
  }
  return error;
}

function buildRequest(
  resolved: ResolvedInvocation,
  messages: Msg[],
  limits: EffectiveUsageLimits,
  tools?: ToolContract[],
): ChatRequest {
  const req: ChatRequest = { model: resolved.model, messages };
  if (resolved.wireEffort !== undefined) {
    req.effort = resolved.wireEffort;
  }
  if (resolved.providerOptions !== undefined) {
    req.providerOptions = resolved.providerOptions;
  }
  if (limits.maxOutputTokensPerTurn !== undefined) {
    req.maxOutputTokens = limits.maxOutputTokensPerTurn;
  }
  if (tools !== undefined && tools.length > 0) {
    req.tools = tools;
  }
  return req;
}

/**
 * Builds the turn's canonical assistant message. Retained provider-raw
 * parts go at the HEAD: on both first-class providers the retained
 * blocks (thinking blocks, reasoning items) precede the turn's text and
 * tool calls, and head placement reproduces that order on re-projection
 * (docs/04, section 2.3, M4-T02).
 */
function assistantMsg(turn: CollectedTurn, retained: Part[] = []): Msg {
  const parts: Part[] = [...retained];
  if (turn.text !== '') {
    parts.push({ type: 'text', text: turn.text });
  }
  for (const call of turn.toolCalls) {
    parts.push({ type: 'tool-call', id: call.id, name: call.name, args: call.args });
  }
  return { role: 'assistant', parts };
}

/**
 * Executes one model-issued tool call to a tool-result part. Failures are
 * surfaced to the model as error tool results and never thrown past
 * policy: unknown names, argument-validation issues, ModelRetry (bounded
 * per tool call chain), NonSerializableValueError, and arbitrary execute
 * throws all land as { isError: true } results (docs/08, sections 1.1 and
 * 2.4; docs/06, section "ModelRetry").
 */
async function executeToolCall(options: {
  call: { id: string; name: string; args: unknown };
  runtime: ToolRuntime;
  /** Consecutive ModelRetry conversions per tool name. */
  retryCounts: Map<string, number>;
  maxModelRetries: number;
  events?: RuntimeEventSink;
  audit?: GateAudit;
  now: () => number;
}): Promise<Part> {
  const { call, runtime } = options;
  const def = runtime.defs.find((candidate) => candidate.name === call.name);
  const startedAt = options.now();
  const finish = (result: unknown, outcome: 'ok' | 'error'): Part => {
    options.events?.emit({
      type: 'tool:end',
      toolName: call.name,
      outcome,
      durationMs: options.now() - startedAt,
      ...options.audit,
    });
    const part: Part = { type: 'tool-result', id: call.id, name: call.name, result };
    if (outcome !== 'ok') {
      (part as { isError?: boolean }).isError = true;
    }
    return part;
  };

  if (def === undefined) {
    return finish({ error: `unknown tool '${call.name}'` }, 'error');
  }
  const validation = await validateSchemaSpec(def.parameters, call.args);
  if (!validation.valid) {
    return finish(
      {
        error: `arguments for '${call.name}' failed validation`,
        issues: validation.issues.map((issue) => issue.message),
      },
      'error',
    );
  }
  try {
    const value = await def.execute(validation.value, runtime.contextFor(call.name));
    // The returned value MUST be JSON-serializable; it is recorded in the
    // canonical history and checkpointed (docs/08, section 1.1).
    const serialized = toJournalValue(value === undefined ? null : value, `tool '${call.name}'`);
    options.retryCounts.delete(call.name);
    return finish(serialized, 'ok');
  } catch (thrown) {
    if (thrown instanceof ModelRetry) {
      const used = options.retryCounts.get(call.name) ?? 0;
      options.retryCounts.set(call.name, used + 1);
      const exhausted = used >= options.maxModelRetries;
      return finish(
        {
          error: thrown.message,
          ...(thrown.data === undefined ? {} : { data: thrown.data }),
          ...(exhausted ? { retriesExhausted: true } : {}),
        },
        'error',
      );
    }
    if (thrown instanceof NonSerializableValueError) {
      return finish({ error: thrown.message }, 'error');
    }
    return finish({ error: thrown instanceof Error ? thrown.message : String(thrown) }, 'error');
  }
}

/**
 * Runs one agent to a typed AgentResult. Never throws past policy: every
 * failure mode becomes a typed status on the result.
 */
export async function runAgent<S extends SchemaSpec>(
  options: RunAgentOptions<S>,
): Promise<AgentResult<Out<S>>> {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const limits = options.limits;
  const maxSchemaAttempts = (options.schemaRetryAttempts ?? 2) + 1;
  const events = options.events;
  const agentType = options.agentType ?? '';

  const messages: Msg[] = [{ role: 'user', parts: [{ type: 'text', text: options.prompt }] }];
  let totalUsage: Usage = ZERO_USAGE;
  let turns = 0;
  let schemaAttempts = 0;
  let output: Out<S> | null = null;
  let status: AgentStatus = 'ok';
  let agentError: AgentError | undefined;
  let errorMessage: string | undefined;
  let usageApprox = false;
  let toolCallsUsed = 0;
  let escalationRequest: EscalationRequest | undefined;
  let abortClass: AbortClass | undefined;
  const noProgress = new NoProgressDetector(limits.noProgressTurns);
  const modelRetryCounts = new Map<string, number>();
  // Compaction state (M4-T03): the estimate is the last loop turn's
  // inputTokens + outputTokens; points record the turns at which
  // compaction fired and ride every checkpoint.
  let lastTurnUsage = { inputTokens: 0, outputTokens: 0 };
  let compactionDisabled = false;
  const compactionPoints: number[] = [];

  let servedBy: ModelRef = options.resolved.ref;

  // Kill-and-resume re-enters at the last turn boundary: paid turns are
  // restored, not re-called (docs/03, section 11.1). The restored usage
  // was never journaled (only terminals carry usage), so it is reported
  // to the budget now.
  const restored = await options.checkpoint?.load();
  if (restored !== undefined) {
    messages.length = 0;
    messages.push(...restored.messages);
    turns = restored.turns;
    totalUsage = restored.usage;
    toolCallsUsed = restored.toolCallsUsed;
    schemaAttempts = restored.schemaAttempts;
    // Points restore verbatim: the history is already compact, so a
    // resumed run never re-summarizes it (docs/06, M4-T03).
    compactionPoints.push(...restored.compaction);
    options.budget?.onUsage(restored.usage, servedBy);
  }

  const saveBoundary = async (pending?: PendingToolTurn): Promise<void> => {
    if (options.checkpoint === undefined) {
      return;
    }
    await options.checkpoint.save({
      v: 1,
      messages: [...messages],
      turns,
      usage: totalUsage,
      toolCallsUsed,
      schemaAttempts,
      compaction: [...compactionPoints],
      ...(pending === undefined ? {} : { pending }),
    });
  };

  const toPendingRecords = (parts: Part[]): PendingToolTurn['executed'] =>
    parts
      .filter((part) => part.type === 'tool-result')
      .map((part) => ({
        id: part.id,
        name: part.name,
        result: part.result,
        ...((part as { isError?: boolean }).isError === true ? { isError: true } : {}),
      }));

  /**
   * Gates and executes one turn's tool calls in source order. priorParts
   * carries results already executed before a mid-turn suspension; the
   * pending state checkpointed at an ask verdict stores RAW model args so
   * a resume re-runs the chain (hooks apply exactly once) and re-matches
   * the same approval identity.
   */
  const runToolCalls = async (
    calls: ToolCallRequest[],
    priorParts: Part[],
  ): Promise<{ parts: Part[]; limitHit: boolean; escalated?: EscalationRequest }> => {
    const runtime = options.tools;
    if (runtime === undefined) {
      return { parts: priorParts, limitHit: false };
    }
    const parts: Part[] = [...priorParts];
    const errorPart = (call: ToolCallRequest, payload: string | Record<string, unknown>): Part => {
      const result = typeof payload === 'string' ? { error: payload } : payload;
      const part: Part = { type: 'tool-result', id: call.id, name: call.name, result };
      (part as { isError?: boolean }).isError = true;
      return part;
    };
    for (const [index, call] of calls.entries()) {
      if (limits.maxToolCalls !== undefined && toolCallsUsed >= limits.maxToolCalls) {
        // Expiry of maxToolCalls is terminal 'limit': paid partial work;
        // already-executed results stand (docs/06, section "UsageLimits").
        return { parts, limitHit: true };
      }
      const def = runtime.defs.find((candidate) => candidate.name === call.name);
      events?.emit({
        type: 'tool:start',
        toolName: call.name,
        ...(def?.risk === undefined ? {} : { risk: def.risk }),
      });
      const gateStartedAt = now();
      let gatedCall = call;
      let gateAudit: GateAudit | undefined;
      if (runtime.permission !== undefined && def !== undefined) {
        const gate = await runtime.permission(call);
        gateAudit = gate.audit;
        if (gate.kind === 'deny') {
          // The denial is surfaced to the model as an error tool result
          // carrying the policy reason; the turn continues (docs/08 3.6).
          events?.emit({
            type: 'tool:end',
            toolName: call.name,
            outcome: 'denied',
            durationMs: now() - gateStartedAt,
            ...gate.audit,
          });
          parts.push(errorPart(call, `tool '${call.name}' denied by policy: ${gate.reason}`));
          continue;
        }
        if (gate.kind === 'ask') {
          // The ask verdict is journaled as a suspended approval entry
          // together with the turn checkpoint: durable pending state
          // first, then the suspension (docs/08 3.6; docs/03 11.1).
          await saveBoundary({
            executed: toPendingRecords(parts),
            awaiting: { id: call.id, name: call.name, args: call.args },
            remaining: calls.slice(index + 1),
          });
          const decision = await gate.suspend();
          if (decision.decision === 'deny') {
            events?.emit({
              type: 'tool:end',
              toolName: call.name,
              outcome: 'denied',
              durationMs: now() - gateStartedAt,
              ...gate.audit,
            });
            parts.push(
              errorPart(
                call,
                decision.reason === undefined
                  ? `tool '${call.name}' denied by the approval decision`
                  : `tool '${call.name}' denied: ${decision.reason}`,
              ),
            );
            continue;
          }
          gatedCall = { ...call, args: gate.input };
        } else {
          gatedCall = { ...call, args: gate.input };
        }
      }
      // The escalate tool is engine-intercepted AFTER the permission
      // chain (docs/08, section 6.6): validation against its request
      // schema, the in-run minSpend gate, then loop termination with
      // status 'escalated'. Remaining calls of the turn are moot.
      if (options.escalation !== undefined && gatedCall.name === ESCALATE_TOOL_NAME) {
        const def = runtime.defs.find((candidate) => candidate.name === ESCALATE_TOOL_NAME);
        const validation =
          def === undefined ? undefined : await validateSchemaSpec(def.parameters, gatedCall.args);
        if (validation === undefined || !validation.valid) {
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(
            errorPart(call, {
              error: 'escalation request failed validation',
              issues: validation === undefined ? [] : validation.issues.map((i) => i.message),
            }),
          );
          continue;
        }
        const request = validation.value as EscalationRequest;
        const spentSoFar = options.priceUsd?.(servedBy, totalUsage) ?? 0;
        if (countsAgainstLimit(request.kind) && spentSoFar < options.escalation.minSpendUsd) {
          // Early scope_bigger escalation below minSpend: a bounded
          // "keep working" re-prompt; exempt kinds pass through
          // (docs/07, section 6.4; M3-T09).
          events?.emit({
            type: 'tool:end',
            toolName: gatedCall.name,
            outcome: 'error',
            durationMs: now() - gateStartedAt,
          });
          parts.push(
            errorPart(call, {
              error:
                'keep working: the minimum spend before a scope_bigger escalation has not ' +
                'been reached yet',
              minSpendUsd: options.escalation.minSpendUsd,
              spentUsd: spentSoFar,
            }),
          );
          continue;
        }
        events?.emit({
          type: 'tool:end',
          toolName: gatedCall.name,
          outcome: 'ok',
          durationMs: now() - gateStartedAt,
        });
        return { parts, limitHit: false, escalated: request };
      }
      toolCallsUsed += 1;
      parts.push(
        await executeToolCall({
          call: gatedCall,
          runtime,
          retryCounts: modelRetryCounts,
          maxModelRetries: options.modelRetryAttempts ?? DEFAULT_MODEL_RETRY_ATTEMPTS,
          ...(events === undefined ? {} : { events }),
          ...(gateAudit === undefined ? {} : { audit: gateAudit }),
          now,
        }),
      );
    }
    return { parts, limitHit: false };
  };

  // A restored mid-turn suspension finishes ITS turn before the loop
  // re-enters: executed results are reused verbatim, the awaiting call
  // consults the journaled approval, remaining calls follow (docs/08
  // 3.6: resume continues the same turn without re-running tools).
  if (restored?.pending !== undefined && options.tools !== undefined) {
    const priorParts: Part[] = restored.pending.executed.map((record) => {
      const part: Part = {
        type: 'tool-result',
        id: record.id,
        name: record.name,
        result: record.result,
      };
      if (record.isError === true) {
        (part as { isError?: boolean }).isError = true;
      }
      return part;
    });
    const { parts, limitHit, escalated } = await runToolCalls(
      [restored.pending.awaiting, ...restored.pending.remaining],
      priorParts,
    );
    if (parts.length > 0) {
      messages.push({ role: 'tool', parts });
    }
    if (escalated !== undefined) {
      status = 'escalated';
      escalationRequest = escalated;
    } else if (limitHit) {
      status = 'limit';
    } else {
      await saveBoundary();
    }
  }
  const separateExtract = options.extract !== undefined && options.schema !== undefined;

  events?.emit({
    type: 'agent:start',
    agentType,
    label: options.label,
    model: servedBy,
    role: options.role ?? 'loop',
  });

  // The runtime never throws past policy: an adapter violating the Usage
  // invariant becomes a typed transport-class terminal, not an escape.
  let invariantViolation: string | undefined;
  const recordUsage = (usage: Usage, reported: Usage, adapterId: string, ref: ModelRef): void => {
    try {
      assertUsageInvariant(usage, adapterId);
    } catch (thrown) {
      invariantViolation = thrown instanceof Error ? thrown.message : String(thrown);
    }
    totalUsage = addUsage(totalUsage, usage);
    // Mid-stream deltas already reached the budget through streamTurn's
    // onUsage; report only the remainder so nothing double-counts.
    const remainder: Usage = {
      inputTokens: Math.max(0, usage.inputTokens - reported.inputTokens),
      outputTokens: Math.max(0, usage.outputTokens - reported.outputTokens),
      cacheReadTokens: Math.max(0, usage.cacheReadTokens - reported.cacheReadTokens),
      cacheWriteTokens: Math.max(0, usage.cacheWriteTokens - reported.cacheWriteTokens),
    };
    const reasoningRemainder = Math.max(
      0,
      (usage.reasoningTokens ?? 0) - (reported.reasoningTokens ?? 0),
    );
    if (reasoningRemainder > 0) {
      remainder.reasoningTokens = reasoningRemainder;
    }
    if (
      remainder.inputTokens > 0 ||
      remainder.outputTokens > 0 ||
      remainder.cacheReadTokens > 0 ||
      remainder.cacheWriteTokens > 0
    ) {
      options.budget?.onUsage(remainder, ref);
    }
  };

  // Retry and failover engine (M4-T04/T05): RetryPolicy lives UNDER the
  // journal around every adapter.stream dispatch (a retried-then-
  // successful call is one entry with one usage total, and transport
  // retries never count as lineage attempts, DEF-3). When a serving
  // model exhausts its tries on a failover trigger, the chain advances
  // (sticky) and the turn re-dispatches on the fallback: only servedBy
  // changes, never the content key. Stream-idle severance is retryable
  // transport-class per docs/06, section 6.
  const retryPolicy = options.retry?.policy ?? DEFAULT_RETRY_POLICY;
  const retryOn = retryPolicy.retryOn ?? DEFAULT_RETRY_POLICY.retryOn ?? [];
  const retrySleep =
    options.retry?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const retryRandom = options.retry?.random ?? Math.random;

  const dispatchPhase = async (site: {
    chain: Array<PhaseTarget & { on?: FailoverTrigger[] }>;
    cursor: { index: number };
    requestFor: (target: PhaseTarget) => ChatRequest;
    streamOptionsFor: (target: PhaseTarget) => Parameters<typeof streamTurn>[2];
  }): Promise<{ outcome: TurnOutcome; target: PhaseTarget }> => {
    for (;;) {
      const target = site.chain[site.cursor.index] ?? site.chain[0];
      let tries = 0;
      inner: for (;;) {
        const dispatch = (): Promise<TurnOutcome> =>
          streamTurn(target.adapter, site.requestFor(target), site.streamOptionsFor(target));
        // The keyed limiter gates the wire call itself; retries and
        // failover each re-acquire, so a stalled provider never holds
        // its slot through a backoff sleep (M4-T07).
        const outcome = await (options.providerSlot === undefined
          ? dispatch()
          : options.providerSlot(target.adapter.id, dispatch));
        recordUsage(outcome.usage, outcome.reported, target.adapter.id, target.resolved.ref);
        tries += 1;
        const retryClass =
          outcome.aborted === 'idle'
            ? 'transport'
            : outcome.wireError === undefined
              ? undefined
              : retryClassOf(outcome.wireError);
        if (retryClass === undefined) {
          return { outcome, target };
        }
        usageApprox = usageApprox || outcome.usageApprox;
        if (retryOn.includes(retryClass) && tries < retryPolicy.attempts) {
          const retryAfter = (outcome.wireError?.data as { retryAfterMs?: unknown } | undefined)
            ?.retryAfterMs;
          if (outcome.wireError !== undefined) {
            events?.emit({
              type: 'agent:error',
              agentType,
              label: options.label,
              error: outcome.wireError,
              willRetry: true,
            });
          }
          await retrySleep(
            retryDelayMs(
              retryPolicy,
              tries - 1,
              typeof retryAfter === 'number' ? retryAfter : undefined,
              retryRandom,
            ),
          );
          continue inner;
        }
        const trigger = failoverTriggerOf(retryClass);
        const next =
          trigger === undefined ? undefined : nextFailover(site.chain, trigger, site.cursor.index);
        if (next === undefined) {
          return { outcome, target };
        }
        const takeover = site.chain[next] as PhaseTarget;
        events?.emit({
          type: 'log',
          level: 'warn',
          msg:
            `failover: ${takeover.resolved.ref} takes over from ${target.resolved.ref} ` +
            `after ${trigger} (the content key is unchanged; servedBy records the server)`,
        });
        // Visible scrub (docs/04, section 3.4; M4-T08): the fallback's
        // own caps scrubbing surfaces the moment the target starts
        // serving, never silently.
        for (const scrub of takeover.resolved.scrubs) {
          events?.emit({ type: 'log', level: 'warn', msg: scrub.detail });
        }
        site.cursor.index = next;
        break inner;
      }
    }
  };

  // The ride tier follows the SERVING model's caps; a forced-tool target
  // with tools available degrades to prompt rather than pinning
  // toolChoice mid-loop (docs/04, section 8.4; the ride/separate
  // decision itself keys on the PRIMARY model at the ctx layer).
  const rideTierFor = (target: PhaseTarget): StructuredOutputTier => {
    if (options.canonicalSchema === undefined) {
      return 'prompt';
    }
    const selected = selectStructuredOutputTier(
      target.adapter.caps(target.resolved.model),
      options.canonicalSchema,
    );
    return selected === 'forced-tool' && (options.tools?.contracts.length ?? 0) > 0
      ? 'prompt'
      : selected;
  };

  const loopChain: PhaseTarget[] = [
    { adapter: options.adapter, resolved: options.resolved },
    ...(options.fallbacks ?? []),
  ];
  const loopCursor = { index: 0 };

  // A pending-turn limit hit above skips the loop entirely.
  loop: while (status === 'ok') {
    // Per-agent wall clock (docs/06, section "UsageLimits").
    if (limits.timeoutMs !== undefined && now() - startedAt >= limits.timeoutMs) {
      status = 'limit';
      break;
    }
    if (turns >= limits.maxTurns) {
      status = 'limit';
      break;
    }
    try {
      options.budget?.beforeTurn();
    } catch (thrown) {
      status = 'error';
      agentError = { kind: 'budget', retryable: false };
      void thrown;
      break;
    }
    turns += 1;

    const signals: AbortSignal[] = [];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    // Every outgoing request is a projection of the canonical history
    // into the SERVING provider's view (docs/04, section 2.3, M4-T02);
    // the dispatch engine may serve the turn from a failover target.
    const { outcome, target: servedTarget } = await dispatchPhase({
      chain: loopChain,
      cursor: loopCursor,
      requestFor: (target) => {
        let req = buildRequest(
          target.resolved,
          projectHistory(messages, providerOf(target.adapter)),
          limits,
          options.tools?.contracts,
        );
        if (
          options.schema !== undefined &&
          options.canonicalSchema !== undefined &&
          !separateExtract
        ) {
          req = applyStructuredOutputTier(req, rideTierFor(target), options.canonicalSchema);
        }
        return req;
      },
      streamOptionsFor: (target) => {
        const streamTurnOptions: Parameters<typeof streamTurn>[2] = {
          idleTimeoutMs: limits.streamIdleTimeoutMs,
          signals,
          onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
        };
        if (options.budget?.signal !== undefined) {
          streamTurnOptions.budgetSignal = options.budget.signal;
        }
        if (options.stream === true) {
          streamTurnOptions.onDelta = (delta) => events?.emit({ type: 'agent:stream', delta });
        }
        return streamTurnOptions;
      },
    });
    servedBy = servedTarget.resolved.ref;
    usageApprox = usageApprox || outcome.usageApprox;
    lastTurnUsage = {
      inputTokens: outcome.usage.inputTokens,
      outputTokens: outcome.usage.outputTokens,
    };
    messages.push(
      assistantMsg(outcome.turn, liftRetainedParts(outcome.providerMetadata, servedTarget.adapter)),
    );
    if (invariantViolation !== undefined) {
      status = 'error';
      agentError = { kind: 'transport', retryable: false };
      errorMessage = invariantViolation;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: { code: 'agent', message: invariantViolation, retryable: false },
        willRetry: false,
      });
      break;
    }

    if (outcome.aborted === 'budget') {
      status = 'cancelled';
      agentError = { kind: 'budget', retryable: false };
      break;
    }
    if (outcome.aborted === 'external') {
      status = 'cancelled';
      break;
    }
    if (outcome.aborted === 'idle') {
      status = 'error';
      agentError = { kind: 'transport', retryable: true };
      errorMessage = `stream idle for ${limits.streamIdleTimeoutMs}ms`;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: {
          code: 'agent',
          message: `stream idle for ${limits.streamIdleTimeoutMs}ms`,
          retryable: true,
        },
        willRetry: false,
      });
      break;
    }
    if (outcome.wireError !== undefined) {
      status = 'error';
      agentError = classifyWireError(outcome.wireError);
      errorMessage = outcome.wireError.message;
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: outcome.wireError,
        willRetry: false,
      });
      break;
    }
    if (outcome.finish?.reason === 'refusal') {
      status = 'error';
      const refusal = outcome.finish.refusal;
      agentError = { kind: 'terminal', retryable: false };
      errorMessage =
        `model refusal (${refusal.provider})` +
        (refusal.stopDetails?.category === undefined ? '' : `: ${refusal.stopDetails.category}`);
      events?.emit({
        type: 'agent:error',
        agentType,
        label: options.label,
        error: {
          code: 'agent',
          message:
            `model refusal (${refusal.provider})` +
            (refusal.stopDetails?.category !== undefined
              ? `: ${refusal.stopDetails.category}`
              : ''),
          retryable: false,
          data: { kind: 'terminal', refusal: refusal as unknown as Json },
        },
        willRetry: false,
      });
      break;
    }
    if (outcome.finish?.reason === 'context-window-exceeded') {
      status = 'error';
      agentError = { kind: 'terminal', retryable: false };
      break;
    }

    // Tool dispatch: gate and execute the turn's calls in source order,
    // feed the results back as one tool-role message, and loop for the
    // next model turn (docs/08, sections "Permission chain" and "Verdict
    // semantics"; docs/06, section "Agent runtime binding").
    if (options.tools !== undefined && outcome.turn.toolCalls.length > 0) {
      noProgress.recordTurn({ toolCalls: outcome.turn.toolCalls.length });
      const { parts, limitHit, escalated } = await runToolCalls(outcome.turn.toolCalls, []);
      if (parts.length > 0) {
        messages.push({ role: 'tool', parts });
      }
      if (escalated !== undefined) {
        // Flavor semantics (suspension, decision, salvage) live in the
        // ctx layer; the loop terminates with the accepted request.
        status = 'escalated';
        escalationRequest = escalated;
        break;
      }
      if (limitHit) {
        status = 'limit';
        break;
      }
      // Compaction check at the tool turn boundary (M4-T03): the
      // estimate is the last loop turn's usage against the loop model's
      // contextWindow. Compaction runs BEFORE the boundary checkpoint,
      // so a crash after it resumes compact.
      if (
        options.summarize !== undefined &&
        !compactionDisabled &&
        shouldCompact({
          lastTurnUsage,
          contextWindow: options.adapter.caps(options.resolved.model).contextWindow,
          ...(options.compaction?.threshold === undefined
            ? {}
            : { threshold: options.compaction.threshold }),
        })
      ) {
        const summarizeResolved = options.summarize.resolved;
        events?.emit({
          type: 'agent:start',
          agentType,
          label: options.label,
          model: summarizeResolved.ref,
          role: 'summarize',
        });
        // Visible scrub at fire time (docs/04, section 3.4; M4-T08):
        // the summarize resolution rarely fires, so its scrubs surface
        // here rather than as spawn-time noise.
        for (const scrub of summarizeResolved.scrubs) {
          events?.emit({ type: 'log', level: 'warn', msg: scrub.detail });
        }
        try {
          options.budget?.beforeTurn();
        } catch {
          status = 'error';
          agentError = { kind: 'budget', retryable: false };
          break;
        }
        turns += 1;
        const { outcome: summary } = await dispatchPhase({
          chain: [
            { adapter: options.summarize.adapter, resolved: options.summarize.resolved },
            ...(options.summarize.fallbacks ?? []),
          ],
          cursor: { index: 0 },
          requestFor: (target) => {
            let req = buildRequest(
              target.resolved,
              [...projectHistory(messages, providerOf(target.adapter)), summarizeInstruction()],
              limits,
              options.tools?.contracts,
            );
            if (req.tools !== undefined) {
              req = { ...req, toolChoice: 'none' };
            }
            return req;
          },
          streamOptionsFor: (target) => {
            const summarizeStreamOptions: Parameters<typeof streamTurn>[2] = {
              idleTimeoutMs: limits.streamIdleTimeoutMs,
              signals: options.signal === undefined ? [] : [options.signal],
              onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
            };
            if (options.budget?.signal !== undefined) {
              summarizeStreamOptions.budgetSignal = options.budget.signal;
            }
            return summarizeStreamOptions;
          },
        });
        usageApprox = usageApprox || summary.usageApprox;
        if (summary.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
          break;
        }
        if (summary.aborted === 'external') {
          status = 'cancelled';
          break;
        }
        if (
          summary.wireError !== undefined ||
          summary.aborted === 'idle' ||
          summary.turn.text.trim() === ''
        ) {
          // A failed or empty summarize disables compaction for the
          // rest of the run instead of failing paid work (docs/06,
          // M4-T03); the threshold would re-trip every boundary.
          compactionDisabled = true;
          events?.emit({
            type: 'log',
            level: 'warn',
            msg:
              'compaction disabled for this run: the summarize invocation ' +
              (summary.wireError !== undefined
                ? `failed (${summary.wireError.message})`
                : summary.aborted === 'idle'
                  ? 'timed out'
                  : 'returned an empty summary'),
          });
        } else {
          const compacted = compactMessages(messages, summary.turn.text);
          messages.length = 0;
          messages.push(...compacted);
          compactionPoints.push(turns);
          // The next turn's prompt is the compact history; the stale
          // estimate must not re-trip the threshold.
          lastTurnUsage = { inputTokens: 0, outputTokens: 0 };
        }
      }
      // Turn boundary: tools executed, results appended. A crash after
      // this write resumes here; a crash before it re-runs the turn's
      // tools (at-least-once; docs/03, section 11.1).
      await saveBoundary();
      continue loop;
    }

    if (options.schema === undefined) {
      output = outcome.turn.text as Out<S>;
      break;
    }
    if (separateExtract) {
      // The loop turn is done; the extract invocation below produces the output.
      break;
    }

    const candidate = extractCandidate(outcome.turn, rideTierFor(servedTarget));
    const issues: Issue[] = [];
    if (candidate !== undefined) {
      const validation = await validateSchemaSpec(options.schema, candidate.raw);
      if (validation.valid) {
        output = validation.value;
        break;
      }
      issues.push(...validation.issues);
    } else {
      issues.push({ message: 'no JSON value found in the model response' });
    }
    schemaAttempts += 1;
    if (schemaAttempts >= maxSchemaAttempts) {
      status = 'error';
      agentError = { kind: 'schema-mismatch', retryable: false, issues };
      errorMessage = issues[0]?.message;
      break;
    }
    // A schema re-prompt turn produced neither tool calls nor artifact
    // deltas; the loop is about to continue, so the no-progress detector
    // consumes it (M3-T08; docs/06 Appendix A, N = 3).
    noProgress.recordTurn({ toolCalls: 0 });
    if (noProgress.tripped) {
      status = 'limit';
      abortClass = 'no-progress';
      agentError = { kind: 'terminal', retryable: false };
      errorMessage = noProgress.describe();
      break;
    }
    events?.emit({
      type: 'agent:schema-retry',
      agentType,
      attempt: schemaAttempts,
      maxAttempts: maxSchemaAttempts - 1,
    });
    messages.push(formatRePrompt(issues, schemaAttempts, maxSchemaAttempts - 1));
    await saveBoundary();
    continue loop;
  }

  // Finalize synthesis invocation (role 'finalize', M4-T01): after tools
  // stop, one invocation with toolChoice 'none' over the full transcript.
  // Fires only when routed AND tools were available; the ctx layer
  // decides via model/roles.ts and passes the option. Its text is the
  // output for schema-less calls; with a schema the separate extract
  // below runs over the transcript INCLUDING the synthesis (docs/04,
  // section 8.4 as amended).
  if (status === 'ok' && options.finalize !== undefined) {
    const finalizeResolved = options.finalize.resolved;
    events?.emit({
      type: 'agent:start',
      agentType,
      label: options.label,
      model: finalizeResolved.ref,
      role: 'finalize',
    });
    let proceed = true;
    try {
      options.budget?.beforeTurn();
    } catch {
      status = 'error';
      agentError = { kind: 'budget', retryable: false };
      proceed = false;
    }
    if (proceed) {
      turns += 1;
      const { outcome, target: finalizeTarget } = await dispatchPhase({
        chain: [
          { adapter: options.finalize.adapter, resolved: options.finalize.resolved },
          ...(options.finalize.fallbacks ?? []),
        ],
        cursor: { index: 0 },
        requestFor: (target) => ({
          ...buildRequest(
            target.resolved,
            projectHistory(messages, providerOf(target.adapter)),
            limits,
            options.tools?.contracts,
          ),
          toolChoice: 'none',
        }),
        streamOptionsFor: (target) => {
          const finalizeStreamOptions: Parameters<typeof streamTurn>[2] = {
            idleTimeoutMs: limits.streamIdleTimeoutMs,
            signals: options.signal === undefined ? [] : [options.signal],
            onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
          };
          if (options.budget?.signal !== undefined) {
            finalizeStreamOptions.budgetSignal = options.budget.signal;
          }
          if (options.stream === true) {
            finalizeStreamOptions.onDelta = (delta) =>
              events?.emit({ type: 'agent:stream', delta });
          }
          return finalizeStreamOptions;
        },
      });
      usageApprox = usageApprox || outcome.usageApprox;
      messages.push(
        assistantMsg(
          outcome.turn,
          liftRetainedParts(outcome.providerMetadata, finalizeTarget.adapter),
        ),
      );
      if (invariantViolation !== undefined) {
        status = 'error';
        agentError = { kind: 'transport', retryable: false };
        errorMessage = invariantViolation;
      } else if (outcome.aborted !== undefined || outcome.wireError !== undefined) {
        status = outcome.aborted === 'external' ? 'cancelled' : 'error';
        if (outcome.wireError !== undefined) {
          agentError = classifyWireError(outcome.wireError);
          errorMessage = outcome.wireError.message;
        } else if (outcome.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
        } else if (outcome.aborted === 'idle') {
          status = 'error';
          agentError = { kind: 'transport', retryable: true };
          errorMessage = `stream idle for ${limits.streamIdleTimeoutMs}ms`;
        }
      } else if (
        outcome.finish?.reason === 'refusal' ||
        outcome.finish?.reason === 'context-window-exceeded'
      ) {
        status = 'error';
        agentError = { kind: 'terminal', retryable: false };
        if (outcome.finish.reason === 'refusal') {
          errorMessage = `model refusal (${outcome.finish.refusal.provider})`;
        }
      } else if (options.schema === undefined) {
        // The synthesis is the final answer for schema-less calls; a
        // schema-bearing call reads its output from the extract phase.
        output = outcome.turn.text as Out<S>;
      }
    }
  }

  // Separate extract invocation (role 'extract'): one structured-output
  // call over the loop transcript, on the extract-resolved model.
  if (
    status === 'ok' &&
    separateExtract &&
    options.extract !== undefined &&
    options.schema !== undefined
  ) {
    const extractResolved = options.extract.resolved;
    events?.emit({
      type: 'agent:start',
      agentType,
      label: options.label,
      model: extractResolved.ref,
      role: 'extract',
    });
    // The extract tier follows the SERVING model's caps; forced-tool is
    // legitimate here (the pinned emit_result IS the mechanism).
    const extractTierFor = (target: PhaseTarget): StructuredOutputTier =>
      selectStructuredOutputTier(
        target.adapter.caps(target.resolved.model),
        options.canonicalSchema ?? {},
      );
    const extractChain: PhaseTarget[] = [
      { adapter: options.extract.adapter, resolved: options.extract.resolved },
      ...(options.extract.fallbacks ?? []),
    ];
    const extractCursor = { index: 0 };
    let extractAttempts = 0;
    const extractMessages: Msg[] = [
      ...messages,
      {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Extract the final structured result from the conversation above.',
          },
        ],
      },
    ];
    while (status === 'ok') {
      try {
        options.budget?.beforeTurn();
      } catch {
        status = 'error';
        agentError = { kind: 'budget', retryable: false };
        break;
      }
      turns += 1;
      const { outcome, target: extractTarget } = await dispatchPhase({
        chain: extractChain,
        cursor: extractCursor,
        requestFor: (target) => {
          // A tool-bearing transcript must carry the tool contracts:
          // both providers reject tool-use history without tool
          // definitions. The forced-tool tier pins toolChoice to
          // emit_result; the other tiers pin 'none' so the extract call
          // cannot re-enter tools (docs/04, section 8.4, M4-T01).
          const targetTier = extractTierFor(target);
          let req = buildRequest(
            target.resolved,
            projectHistory(extractMessages, providerOf(target.adapter)),
            limits,
            options.tools?.contracts,
          );
          if (req.tools !== undefined && targetTier !== 'forced-tool') {
            req = { ...req, toolChoice: 'none' };
          }
          return applyStructuredOutputTier(req, targetTier, options.canonicalSchema ?? {});
        },
        streamOptionsFor: (target) => {
          const extractStreamOptions: Parameters<typeof streamTurn>[2] = {
            idleTimeoutMs: limits.streamIdleTimeoutMs,
            signals: options.signal === undefined ? [] : [options.signal],
            onUsage: (delta) => options.budget?.onUsage(delta, target.resolved.ref),
          };
          if (options.budget?.signal !== undefined) {
            extractStreamOptions.budgetSignal = options.budget.signal;
          }
          return extractStreamOptions;
        },
      });
      usageApprox = usageApprox || outcome.usageApprox;
      if (invariantViolation !== undefined) {
        status = 'error';
        agentError = { kind: 'transport', retryable: false };
        break;
      }
      extractMessages.push(
        assistantMsg(
          outcome.turn,
          liftRetainedParts(outcome.providerMetadata, extractTarget.adapter),
        ),
      );
      if (outcome.aborted !== undefined || outcome.wireError !== undefined) {
        status = outcome.aborted === 'external' ? 'cancelled' : 'error';
        if (outcome.wireError !== undefined) {
          agentError = classifyWireError(outcome.wireError);
        } else if (outcome.aborted === 'budget') {
          status = 'cancelled';
          agentError = { kind: 'budget', retryable: false };
        }
        break;
      }
      const candidate = extractCandidate(outcome.turn, extractTierFor(extractTarget));
      if (candidate !== undefined) {
        const validation = await validateSchemaSpec(options.schema, candidate.raw);
        if (validation.valid) {
          output = validation.value;
          break;
        }
        extractAttempts += 1;
        if (extractAttempts >= maxSchemaAttempts) {
          status = 'error';
          agentError = { kind: 'schema-mismatch', retryable: false, issues: validation.issues };
          break;
        }
        extractMessages.push(
          formatRePrompt(validation.issues, extractAttempts, maxSchemaAttempts - 1),
        );
      } else {
        extractAttempts += 1;
        if (extractAttempts >= maxSchemaAttempts) {
          status = 'error';
          agentError = {
            kind: 'schema-mismatch',
            retryable: false,
            issues: [{ message: 'no JSON value found in the extract response' }],
          };
          break;
        }
      }
    }
  }

  // Persist the canonical transcript; the journal stays small (docs/03).
  let transcriptRef = '';
  if (options.transcript !== undefined) {
    transcriptRef = options.transcript.mintRef();
    const blob = new TextEncoder().encode(JSON.stringify({ messages }));
    await options.transcript.put(transcriptRef, blob);
  }

  const costUsd = options.priceUsd?.(servedBy, totalUsage) ?? 0;
  const result: AgentResult<Out<S>> = {
    status,
    output: status === 'ok' ? output : (output ?? null),
    usage: totalUsage,
    costUsd,
    turns,
    servedBy,
    transcriptRef,
  };
  if (agentError !== undefined) {
    result.error = agentError;
  }
  if (escalationRequest !== undefined) {
    result.escalationRequest = escalationRequest;
  }
  if (abortClass !== undefined) {
    result.abortClass = abortClass;
  }
  if (errorMessage !== undefined) {
    result.errorMessage = errorMessage;
  }
  if (usageApprox) {
    (result as { usageApprox?: boolean }).usageApprox = true;
  }
  // agent:end (with entryRef) is emitted by the ctx layer after the
  // terminal journal entry is appended (docs/09, section 1.4).
  return result;
}
