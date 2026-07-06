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
import type { AgentError, Issue, WireError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';
import type {
  ChatRequest,
  FinishInfo,
  JsonSchema,
  ModelRef,
  Msg,
  Part,
  Usage,
} from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { Out, SchemaSpec } from '../l0/schema.js';
import { validateSchemaSpec } from '../l0/schema.js';
import type { ResolvedInvocation } from '../model/router.js';
import { selectStructuredOutputTier, type StructuredOutputTier } from '../model/caps.js';
import {
  applyStructuredOutputTier,
  extractCandidate,
  formatRePrompt,
  type CollectedTurn,
} from './structured-output.js';
import type { EffectiveUsageLimits } from './usage-limits.js';

export type AgentStatus = 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated';

/**
 * EscalationReport is owned by docs/07 (EscalationProtocol) and its
 * producers ship in M3; the field exists now so AgentResult is shaped
 * once. costToDate and salvage are filled by the runtime, never the model.
 */
export interface EscalationReport {
  kind: string;
  scopeDelta?: Json;
  revisedEstimate?: Json;
  blockers?: Json;
  proposedDecomposition?: Json;
  costToDate?: number;
  salvage?: Json;
}

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
  transcriptRef: string;
  artifacts?: Artifact[];
  error?: AgentError;
  /** Present if and only if status === 'escalated'. */
  escalation?: EscalationReport;
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

export interface RunAgentOptions<S extends SchemaSpec = JsonSchema> {
  prompt: string;
  schema?: S;
  /** Canonicalized JSON Schema projection of `schema` (precomputed for identity). */
  canonicalSchema?: JsonSchema;
  adapter: ProviderAdapter;
  resolved: ResolvedInvocation;
  /**
   * Separate final extract invocation, present only when the role trigger
   * protocol demands one: schema set AND (routing directs extract to a
   * different model OR the loop model's caps cannot serve the required
   * tier). Otherwise the schema rides the last loop turn (docs/06,
   * section "Agent runtime binding").
   */
  extract?: { adapter: ProviderAdapter; resolved: ResolvedInvocation };
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
  agentType?: string;
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
  return req;
}

function assistantMsg(turn: CollectedTurn): Msg {
  const parts: Part[] = [];
  if (turn.text !== '') {
    parts.push({ type: 'text', text: turn.text });
  }
  for (const call of turn.toolCalls) {
    parts.push({ type: 'tool-call', id: call.id, name: call.name, args: call.args });
  }
  return { role: 'assistant', parts };
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
  let usageApprox = false;

  const servedBy: ModelRef = options.resolved.ref;
  const tier: StructuredOutputTier | undefined =
    options.schema !== undefined && options.canonicalSchema !== undefined
      ? selectStructuredOutputTier(
          options.adapter.caps(options.resolved.model),
          options.canonicalSchema,
        )
      : undefined;
  const separateExtract = options.extract !== undefined && options.schema !== undefined;

  events?.emit({
    type: 'agent:start',
    agentType,
    label: options.label,
    model: servedBy,
    role: 'loop',
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

  loop: while (true) {
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

    let req = buildRequest(options.resolved, messages, limits);
    if (options.schema !== undefined && options.canonicalSchema !== undefined && !separateExtract) {
      req = applyStructuredOutputTier(req, tier ?? 'prompt', options.canonicalSchema);
    }

    const signals: AbortSignal[] = [];
    if (options.signal !== undefined) {
      signals.push(options.signal);
    }
    const streamTurnOptions: Parameters<typeof streamTurn>[2] = {
      idleTimeoutMs: limits.streamIdleTimeoutMs,
      signals,
      onUsage: (delta) => options.budget?.onUsage(delta, servedBy),
    };
    if (options.budget?.signal !== undefined) {
      streamTurnOptions.budgetSignal = options.budget.signal;
    }
    if (options.stream === true) {
      streamTurnOptions.onDelta = (delta) => events?.emit({ type: 'agent:stream', delta });
    }
    const outcome = await streamTurn(options.adapter, req, streamTurnOptions);
    recordUsage(outcome.usage, outcome.reported, options.adapter.id, servedBy);
    usageApprox = usageApprox || outcome.usageApprox;
    messages.push(assistantMsg(outcome.turn));
    if (invariantViolation !== undefined) {
      status = 'error';
      agentError = { kind: 'transport', retryable: false };
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

    if (options.schema === undefined) {
      output = outcome.turn.text as Out<S>;
      break;
    }
    if (separateExtract) {
      // The loop turn is done; the extract invocation below produces the output.
      break;
    }

    const candidate = extractCandidate(outcome.turn, tier ?? 'prompt');
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
      break;
    }
    events?.emit({
      type: 'agent:schema-retry',
      agentType,
      attempt: schemaAttempts,
      maxAttempts: maxSchemaAttempts - 1,
    });
    messages.push(formatRePrompt(issues, schemaAttempts, maxSchemaAttempts - 1));
    continue loop;
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
    const extractCaps = options.extract.adapter.caps(extractResolved.model);
    const extractTier = selectStructuredOutputTier(extractCaps, options.canonicalSchema ?? {});
    events?.emit({
      type: 'agent:start',
      agentType,
      label: options.label,
      model: extractResolved.ref,
      role: 'extract',
    });
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
      let req = buildRequest(extractResolved, extractMessages, limits);
      req = applyStructuredOutputTier(req, extractTier, options.canonicalSchema ?? {});
      const extractStreamOptions: Parameters<typeof streamTurn>[2] = {
        idleTimeoutMs: limits.streamIdleTimeoutMs,
        signals: options.signal === undefined ? [] : [options.signal],
        onUsage: (delta) => options.budget?.onUsage(delta, extractResolved.ref),
      };
      if (options.budget?.signal !== undefined) {
        extractStreamOptions.budgetSignal = options.budget.signal;
      }
      const outcome = await streamTurn(options.extract.adapter, req, extractStreamOptions);
      recordUsage(outcome.usage, outcome.reported, options.extract.adapter.id, extractResolved.ref);
      usageApprox = usageApprox || outcome.usageApprox;
      if (invariantViolation !== undefined) {
        status = 'error';
        agentError = { kind: 'transport', retryable: false };
        break;
      }
      extractMessages.push(assistantMsg(outcome.turn));
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
      const candidate = extractCandidate(outcome.turn, extractTier);
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
    transcriptRef,
  };
  if (agentError !== undefined) {
    result.error = agentError;
  }
  if (usageApprox) {
    (result as { usageApprox?: boolean }).usageApprox = true;
  }
  events?.emit({
    type: 'agent:end',
    agentType,
    label: options.label,
    status,
    usage: totalUsage,
    costUsd,
  });
  return result;
}
