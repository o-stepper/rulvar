/**
 * OpenTelemetry exporter (M5-T08; https://docs.rulvar.com/guide/observability). `toOtel(run,
 * tracer)` maps the spanId tree of a run 1:1 onto OTel spans: one span
 * per rulvar span, parented per the span hierarchy (run > phase >
 * agent > tool > child), with start/end timestamps from the lifecycle
 * events; each agent:phase pair additionally becomes a child span of
 * its agent span keyed (spanId, invocation), carrying the phase's role,
 * model, usage, and cost, and each tool execution becomes a child span
 * of its agent span under a synthetic FIFO pair key (RV802: tool events
 * ride the agent's spanId and carry no per-call id), so the agent span
 * lives to agent:end and keeps its closing usage, cost, and exploration
 * attributes. Events without an own span (log, budget:update, the
 * admission and adaptive families) attach as span events on their
 * enclosing span, carrying the payload fields their type's allowlist
 * names (RV4917; before it, every such event exported its type and
 * sequence number and nothing else, so the tenth comparison
 * experiment's trace showed seventy budget updates without a dollar
 * on any of them). An opener for an already-open span never
 * duplicates it (replayed re-emissions mark the original; a
 * pre-RV-207 stream's extra per-phase agent:start cannot leak the agent
 * span unended).
 *
 * `@opentelemetry/api` ^1.9 is an OPTIONAL peer: the CLI has no OTel
 * dependency, and the exporter is typed against a minimal structural
 * `TracerLike` so an absent peer never breaks the CLI. Attribute content
 * policy: prompts, completions, tool payloads, and stream deltas are
 * NEVER exported; identifiers, statuses, usage counters, cost figures,
 * and the library authored messages of the payload events (bounded and
 * masked) ride `rulvar.*` and `gen_ai.*` attributes. Replayed events do
 * not create duplicate spans; the single span is marked
 * `rulvar.replayed = true`.
 */
import {
  compileSecretMasker,
  maskSecrets,
  type RunOutcome,
  type SecretMasker,
  type WorkflowEvent,
} from '@rulvar/core';

/** The tiny subset of the OTel Tracer/Span API the exporter uses. */
export interface SpanLike {
  setAttribute(key: string, value: string | number | boolean): void;
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void;
  setStatus(status: { code: number; message?: string }): void;
  end(endTime?: number): void;
}

export interface TracerLike {
  startSpan(
    name: string,
    options?: { startTime?: number; attributes?: Record<string, string | number | boolean> },
    context?: unknown,
  ): SpanLike;
}

/** Minimal OTel context surface (setSpan/with) for parentage. */
export interface OtelContextApi {
  active(): unknown;
  with<T>(context: unknown, fn: () => T): T;
}

export interface ToOtelOptions {
  /** OTel context API for parentage; when absent, spans are flat but attributed. */
  contextApi?: OtelContextApi;
  /** trace.setSpan(context, span) equivalent; required with contextApi. */
  setSpan?: (context: unknown, span: SpanLike) => unknown;
  /**
   * Host redaction patterns applied to every exported string attribute
   * ON TOP of the default credential set (RV-217). Feed the same list
   * as `createEngine redaction.patterns` for event/trace parity; an
   * invalid pattern is a typed ConfigError before anything exports.
   */
  patterns?: ReadonlyArray<RegExp | string>;
}

const SPAN_OPENERS = new Set(['run:start', 'phase:start', 'agent:start', 'child:start']);

function msOf(ts: string): number {
  return Date.parse(ts);
}

interface OpenSpan {
  span: SpanLike;
  spanId: string;
  parentSpanId?: string;
}

/** The OTel status codes (UNSET 0, OK 1, ERROR 2); inlined to avoid the peer. */
const STATUS_OK = 1;
const STATUS_ERROR = 2;

/**
 * Usage, cost, and retry attributes on a closing span, defensively: the
 * exporter tolerates foreign or truncated streams, so absent fields
 * simply do not become attributes.
 */
function setUsageAttributes(
  open: OpenSpan | undefined,
  event: { usage?: { inputTokens?: number; outputTokens?: number }; costUsd?: number },
  retryKey: string,
  retries: number | undefined,
): void {
  if (open === undefined) {
    return;
  }
  if (typeof event.usage?.inputTokens === 'number') {
    open.span.setAttribute('gen_ai.usage.input_tokens', event.usage.inputTokens);
  }
  if (typeof event.usage?.outputTokens === 'number') {
    open.span.setAttribute('gen_ai.usage.output_tokens', event.usage.outputTokens);
  }
  if (typeof event.costUsd === 'number') {
    open.span.setAttribute('rulvar.cost_usd', event.costUsd);
  }
  if (typeof retries === 'number') {
    open.span.setAttribute(retryKey, retries);
  }
}

function spanName(event: Extract<WorkflowEvent, { type: string }>): string {
  switch (event.type) {
    case 'run:start':
      return `run ${event.workflow}`;
    case 'phase:start':
      return `phase ${event.phase}`;
    case 'agent:start':
      return `agent ${event.agentType || '(anon)'} ${event.role}`;
    case 'agent:phase:start':
      return `invocation ${event.role}`;
    case 'tool:start':
      return `tool ${event.toolName}`;
    case 'child:start':
      return `workflow ${event.workflow}`;
    default:
      return event.type;
  }
}

function openAttributes(
  event: WorkflowEvent,
  runId: string,
  maskText: (text: string) => string,
): Record<string, string | number | boolean> {
  const attrs: Record<string, string | number | boolean> = {
    'rulvar.run_id': runId,
    'rulvar.entry_seq': event.seq,
  };
  const scope = (event as { scope?: unknown }).scope;
  if (typeof scope === 'string') {
    attrs['rulvar.scope'] = scope;
  }
  if (event.replayed === true) {
    attrs['rulvar.replayed'] = true;
  }
  if (event.type === 'agent:start') {
    attrs['rulvar.agent_type'] = event.agentType;
    attrs['gen_ai.request.model'] = event.model;
    attrs['gen_ai.operation.name'] = event.role;
  }
  if (event.type === 'agent:phase:start') {
    attrs['rulvar.agent_type'] = event.agentType;
    attrs['gen_ai.request.model'] = event.model;
    attrs['gen_ai.operation.name'] = event.role;
    attrs['rulvar.invocation'] = event.invocation;
  }
  if (event.type === 'tool:start') {
    attrs['rulvar.tool_name'] = event.toolName;
  }
  // Defense in depth (M8-T04): an id-shaped field
  // that happens to carry a credential still cannot leak. Events are
  // masked at the bus already; this covers the exporter's own strings.
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'string') {
      attrs[key] = maskText(value);
    }
  }
  return attrs;
}

/** The OTel attribute value shapes the payload projection carries. */
type AttributeValue = string | number | boolean;

/**
 * One event type's payload allowlist (RV4917). A field maps to the
 * attribute key it exports under, a nested object to its own
 * allowlist, and a record whose keys the emitter does not fix (a
 * status roster, host log data) to a `'*'` prefix that exports every
 * primitive entry as `<prefix>.<key>`. Anything the allowlist does not
 * name is withheld and counted, never exported.
 */
type PayloadAllowlist = { readonly [field: string]: string | PayloadAllowlist };

/** Exported strings are cut here, after masking, with a marker. */
const MAX_STRING_CHARS = 256;
/** A record key longer than this (host log data) is withheld. */
const MAX_KEY_CHARS = 64;
/** The counter of payload fields that did not reach the span event verbatim. */
const ATTRS_DROPPED = 'rulvar.attrs_dropped';
/** Envelope fields; never payload, never counted. */
const ENVELOPE_FIELDS: ReadonlySet<string> = new Set([
  'runId',
  'seq',
  'ts',
  'spanId',
  'parentSpanId',
  'replayed',
  'type',
]);

const AGENT_IDENTITY: PayloadAllowlist = {
  agentType: 'rulvar.agent_type',
  label: 'rulvar.agent_label',
};

/**
 * The per-type allowlist of the payload-only events: identifiers,
 * statuses, counters, cost figures, and library authored messages. The
 * catalog is closed for v1 (events.ts), so every payload-only type is
 * listed; a type absent here (a future event) keeps the historical
 * export of type plus sequence number, so nothing leaves the process
 * that nobody reviewed. The content bearing fields stay off the list
 * by design: `agent:stream.delta` is model output, `external:waiting.
 * prompt` is a free text ask, `agent:error.error.data` is arbitrary,
 * and every `tool:*` payload rides the explicit tool span cases.
 */
const PAYLOAD_ALLOWLIST: Readonly<Record<string, PayloadAllowlist>> = {
  log: { level: 'rulvar.log.level', msg: 'rulvar.log.msg', data: { '*': 'rulvar.log.data' } },
  'budget:update': {
    spentUsd: 'rulvar.budget.spent_usd',
    remainingUsd: 'rulvar.budget.remaining_usd',
    committedReserveUsd: 'rulvar.budget.committed_reserve_usd',
  },
  'external:waiting': {
    key: 'rulvar.external.key',
    entryRef: 'rulvar.external.entry_ref',
    deadlineAt: 'rulvar.external.deadline_at',
  },
  'approval:pending': {
    toolName: 'rulvar.tool_name',
    entryRef: 'rulvar.approval.entry_ref',
    deadlineAt: 'rulvar.approval.deadline_at',
  },
  'agent:queued': AGENT_IDENTITY,
  'agent:error': {
    ...AGENT_IDENTITY,
    error: {
      code: 'rulvar.error.code',
      message: 'rulvar.error.message',
      retryable: 'rulvar.error.retryable',
    },
    willRetry: 'rulvar.error.will_retry',
  },
  'quota:denied': {
    ...AGENT_IDENTITY,
    model: 'gen_ai.request.model',
    reason: 'rulvar.quota.reason',
    retryAfterMs: 'rulvar.quota.retry_after_ms',
    willRetry: 'rulvar.quota.will_retry',
  },
  'budget:exposure-wait': {
    ...AGENT_IDENTITY,
    scope: 'rulvar.exposure.scope',
    model: 'gen_ai.request.model',
    capUsd: 'rulvar.exposure.cap_usd',
    spentUsd: 'rulvar.exposure.spent_usd',
    inFlightUsd: 'rulvar.exposure.in_flight_usd',
    estimateUsd: 'rulvar.exposure.estimate_usd',
    willWait: 'rulvar.exposure.will_wait',
  },
  'agent:schema-retry': {
    agentType: 'rulvar.agent_type',
    attempt: 'rulvar.schema_retry.attempt',
    maxAttempts: 'rulvar.schema_retry.max_attempts',
  },
  'control:wire': {
    controlKind: 'rulvar.control.kind',
    model: 'gen_ai.request.model',
    outcome: 'rulvar.control.outcome',
    inputTokens: 'rulvar.control.input_tokens',
  },
  'agent:stream': {},
  'plan:revised': {
    entryRef: 'rulvar.plan.entry_ref',
    planHash: 'rulvar.plan.hash',
    applied: 'rulvar.plan.applied',
    dropped: 'rulvar.plan.dropped',
    revisionUnitsRemaining: 'rulvar.plan.revision_units_remaining',
  },
  'node:parked': { nodeId: 'rulvar.node.id', logicalTaskId: 'rulvar.node.logical_task_id' },
  'node:cancelled': { nodeId: 'rulvar.node.id', logicalTaskId: 'rulvar.node.logical_task_id' },
  'node:linked': {
    nodeId: 'rulvar.node.id',
    logicalTaskId: 'rulvar.node.logical_task_id',
    donorRef: 'rulvar.node.donor_ref',
    reclaimedUsd: 'rulvar.node.reclaimed_usd',
  },
  'orchestrator:woke': {
    digestSeq: 'rulvar.orchestrator.digest_seq',
    planHash: 'rulvar.plan.hash',
    coversToOrdinal: 'rulvar.orchestrator.covers_to_ordinal',
    renderSize: 'rulvar.orchestrator.render_size',
  },
  'orchestrator:budget': {
    atCap: 'rulvar.orchestrator.at_cap',
    spentUsd: 'rulvar.orchestrator.spent_usd',
    capUsd: 'rulvar.orchestrator.cap_usd',
    finalizeReserveUsd: 'rulvar.orchestrator.finalize_reserve_usd',
    runSpentUsd: 'rulvar.orchestrator.run_spent_usd',
    runCeilingUsd: 'rulvar.orchestrator.run_ceiling_usd',
    orchestratorSpentUsd: 'rulvar.orchestrator.orchestrator_spent_usd',
    orchestratorCapUsd: 'rulvar.orchestrator.orchestrator_cap_usd',
    orchestratorShare: 'rulvar.orchestrator.share',
    softWarning: 'rulvar.orchestrator.soft_warning',
  },
  'orchestrator:acceptance': {
    verdict: 'rulvar.acceptance.verdict',
    completion: 'rulvar.acceptance.completion',
    childStatusCounts: { '*': 'rulvar.acceptance.child_status_counts' },
    minSpawnedChildren: 'rulvar.acceptance.min_spawned_children',
    spawnedChildren: 'rulvar.acceptance.spawned_children',
  },
  'escalation:raised': {
    entryRef: 'rulvar.escalation.entry_ref',
    kind: 'rulvar.escalation.kind',
    logicalTaskId: 'rulvar.escalation.logical_task_id',
    costToDateUsd: 'rulvar.escalation.cost_to_date_usd',
  },
  'escalation:decided': {
    entryRef: 'rulvar.escalation.entry_ref',
    decision: 'rulvar.escalation.decision',
    by: 'rulvar.escalation.by',
    countsAgainstLimit: 'rulvar.escalation.counts_against_limit',
  },
  'spawn:admitted': {
    entryRef: 'rulvar.spawn.entry_ref',
    verdict: 'rulvar.spawn.verdict',
    agentType: 'rulvar.agent_type',
    logicalTaskId: 'rulvar.spawn.logical_task_id',
    spawnUnitsAfter: 'rulvar.spawn.units_after',
    reserveUsd: 'rulvar.spawn.reserve_usd',
  },
  'spawn:rejected': {
    entryRef: 'rulvar.spawn.entry_ref',
    code: 'rulvar.spawn.code',
    agentType: 'rulvar.agent_type',
    logicalTaskId: 'rulvar.spawn.logical_task_id',
  },
  'admission:lease-lost': {
    unitId: 'rulvar.admission.unit_id',
    generation: 'rulvar.admission.generation',
  },
  'verify:failed': {
    entryRef: 'rulvar.verify.entry_ref',
    logicalTaskId: 'rulvar.verify.logical_task_id',
    rung: 'rulvar.verify.rung',
    gate: 'rulvar.verify.gate',
  },
  'ledger:op': { entryRef: 'rulvar.ledger.entry_ref', op: 'rulvar.ledger.op' },
  'stall:detected': {
    logicalTaskId: 'rulvar.stall.logical_task_id',
    stallStreak: 'rulvar.stall.streak',
  },
  'guard:oscillation': {
    spawnKeyHash: 'rulvar.guard.spawn_key_hash',
    oscillationCount: 'rulvar.guard.oscillation_count',
    limit: 'rulvar.guard.limit',
  },
  'resolution:applied': {
    targetRef: 'rulvar.resolution.target_ref',
    entryRef: 'rulvar.resolution.entry_ref',
    by: 'rulvar.resolution.by',
  },
  'resolution:superseded': {
    targetRef: 'rulvar.resolution.target_ref',
    entryRef: 'rulvar.resolution.entry_ref',
    supersededBy: 'rulvar.resolution.superseded_by',
    reason: 'rulvar.resolution.reason',
  },
  'termination:debit': {
    entryRef: 'rulvar.termination.entry_ref',
    counter: 'rulvar.termination.counter',
    remaining: 'rulvar.termination.remaining',
    phi: 'rulvar.termination.phi',
  },
  'termination:denied': {
    entryRef: 'rulvar.termination.entry_ref',
    counter: 'rulvar.termination.counter',
    code: 'rulvar.termination.code',
  },
  'termination:config-drift': {
    field: 'rulvar.termination.field',
    frozenValue: 'rulvar.termination.frozen_value',
    liveValue: 'rulvar.termination.live_value',
  },
  'journal:compat': { code: 'rulvar.journal.code', found: 'rulvar.journal.found' },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Masks, then bounds, one exported string: masking first, so a cut can
 * never split a credential into an unrecognized prefix. Reports whether
 * the exported text differs from the event's.
 */
function boundedString(
  text: string,
  maskText: (text: string) => string,
): { text: string; altered: boolean } {
  const masked = maskText(text);
  if (masked.length <= MAX_STRING_CHARS) {
    return { text: masked, altered: masked !== text };
  }
  let head = masked.slice(0, MAX_STRING_CHARS);
  const last = head.charCodeAt(head.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) {
    head = head.slice(0, -1);
  }
  return {
    text: `${head} [truncated ${String(masked.length - head.length)} chars]`,
    altered: true,
  };
}

interface PayloadProjection {
  attrs: Record<string, AttributeValue>;
  /** Payload fields withheld or altered on the way to the span event. */
  dropped: number;
}

/**
 * Exports one leaf under one key. Returns false when the value has no
 * shape the projection carries (an object, an array, a non-finite
 * number); the caller counts the drop.
 */
function projectLeaf(
  projection: PayloadProjection,
  key: string,
  value: unknown,
  maskText: (text: string) => string,
): boolean {
  if (typeof value === 'string') {
    const bounded = boundedString(value, maskText);
    projection.attrs[key] = bounded.text;
    if (bounded.altered) {
      projection.dropped += 1;
    }
    return true;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return false;
    }
    projection.attrs[key] = value;
    return true;
  }
  if (typeof value === 'boolean') {
    projection.attrs[key] = value;
    return true;
  }
  return false;
}

/**
 * Walks one object level against its allowlist. Absent and null fields
 * become no attribute and no count (an uncapped run's `remainingUsd`
 * is null on every budget update); every other field either exports
 * under its listed key or counts as dropped.
 */
function projectFields(
  projection: PayloadProjection,
  source: Record<string, unknown>,
  allow: PayloadAllowlist,
  maskText: (text: string) => string,
  skip?: ReadonlySet<string>,
): void {
  const wildcard = Object.hasOwn(allow, '*') ? allow['*'] : undefined;
  for (const [field, value] of Object.entries(source)) {
    if (skip?.has(field) === true || value === undefined || value === null) {
      continue;
    }
    let spec = Object.hasOwn(allow, field) ? allow[field] : undefined;
    if (spec === undefined && typeof wildcard === 'string' && field.length <= MAX_KEY_CHARS) {
      spec = `${wildcard}.${field}`;
    }
    if (spec === undefined) {
      // Outside the allowlist: withheld and counted, never exported.
      projection.dropped += 1;
      continue;
    }
    if (typeof spec === 'string') {
      if (!projectLeaf(projection, spec, value, maskText)) {
        projection.dropped += 1;
      }
      continue;
    }
    if (isPlainObject(value)) {
      projectFields(projection, value, spec, maskText);
      continue;
    }
    // A record allowlist over a primitive (a host logging a bare
    // value as its data) exports under the prefix itself.
    const prefix = Object.hasOwn(spec, '*') ? spec['*'] : undefined;
    if (typeof prefix === 'string' && projectLeaf(projection, prefix, value, maskText)) {
      continue;
    }
    projection.dropped += 1;
  }
}

/**
 * The span event attributes of a payload-only event (RV4917): the
 * sequence number, the fields its type's allowlist names, and the
 * count of payload fields that did not reach the span event verbatim
 * (withheld, masked, or truncated), present when nonzero. A type
 * without an allowlist keeps the historical export byte for byte.
 */
function payloadAttributes(
  event: WorkflowEvent,
  maskText: (text: string) => string,
): Record<string, AttributeValue> {
  const allow = Object.hasOwn(PAYLOAD_ALLOWLIST, event.type)
    ? PAYLOAD_ALLOWLIST[event.type]
    : undefined;
  if (allow === undefined) {
    return { 'rulvar.entry_seq': event.seq };
  }
  const projection: PayloadProjection = { attrs: { 'rulvar.entry_seq': event.seq }, dropped: 0 };
  projectFields(projection, event, allow, maskText, ENVELOPE_FIELDS);
  if (projection.dropped > 0) {
    projection.attrs[ATTRS_DROPPED] = projection.dropped;
  }
  return projection.attrs;
}

/**
 * Exports one run's event stream onto a tracer. The run's events are
 * consumed in seq order; span openers start spans, the matching
 * closers end them, and payload-only events attach as span events on
 * the innermost open span. Returns the number of spans created. Every
 * terminal path exports, the unsettled ones included (RV1106): a
 * rejecting `result` never fails an export the stream already
 * completed, it only marks any leftover span with the refusal.
 */
export async function toOtel(
  run: {
    runId: string;
    events: AsyncIterable<WorkflowEvent>;
    result: Promise<RunOutcome<unknown>>;
  },
  tracer: TracerLike,
  options: ToOtelOptions = {},
): Promise<number> {
  const openBySpanId = new Map<string, OpenSpan>();
  const stack: OpenSpan[] = [];
  let created = 0;
  // Tool executions are child spans of their agent span (RV802). Tool
  // events ride the AGENT's spanId, so every tool:start mints a fresh
  // synthetic key. Pairing is exact when the events carry the
  // model-minted toolCallId (RV908): the end closes precisely the span
  // its id opened, so concurrent same-name calls keep their own
  // durations and outcomes. Events without the field (journals recorded
  // before RV908, foreign emitters) keep the historical FIFO fallback:
  // the end pops the oldest open key of (spanId, toolName), which may
  // swap attribution among identically named spans while counts,
  // parentage, and the duration multiset stay exact; an id-bearing end
  // whose start carried no id falls back to the same FIFO, so mixed
  // streams pair no worse than before. Before RV802, tool:start was
  // swallowed as a duplicate opener of the agent span and the FIRST
  // tool:end closed the agent span itself, so agent:end attached
  // usage, cost, and exploration to nothing (the twelfth comparison
  // experiment's P0 #2: 569 tool events on 12 agent spans, none with a
  // span of its own).
  let toolMint = 0;
  const openToolPairs = new Map<string, string[]>();
  const toolPairOf = (spanId: string, toolName: string): string => `${spanId} ${toolName}`;
  const openToolById = new Map<string, string>();
  const toolIdOf = (spanId: string, toolCallId: string): string => `${spanId} ${toolCallId}`;

  const { contextApi, setSpan } = options;
  // Compiled once, typed failure before anything exports (RV-217).
  const masker: SecretMasker | undefined =
    options.patterns === undefined
      ? undefined
      : compileSecretMasker(options.patterns, 'toOtel patterns');
  const maskText = (text: string): string =>
    masker === undefined ? maskSecrets(text) : masker.maskText(text);

  const startSpan = (
    event: WorkflowEvent,
    key: string = event.spanId,
    parentKey?: string,
  ): void => {
    const parentId = parentKey ?? event.parentSpanId;
    if (openBySpanId.has(key)) {
      // An opener for a span already open never duplicates: replayed
      // re-emissions mark the original, and a live duplicate (a stream
      // from a pre-RV-207 core, where every phase emitted an extra
      // agent:start) must not overwrite the tracked span and leak the
      // first one unended with the last phase's duration reported as
      // the agent's.
      if (event.replayed === true) {
        openBySpanId.get(key)?.span.setAttribute('rulvar.replayed', true);
      }
      return;
    }
    // Real parent-child nesting when the host wires the OTel context
    // API: the parent is resolved through the event envelope's
    // parentSpanId against the still-open spans. Without both options,
    // spans come out flat but fully attributed.
    const parent = parentId === undefined ? undefined : openBySpanId.get(parentId);
    const parentContext =
      parent !== undefined && contextApi !== undefined && setSpan !== undefined
        ? setSpan(contextApi.active(), parent.span)
        : undefined;
    const span = tracer.startSpan(
      spanName(event),
      {
        startTime: msOf(event.ts),
        attributes: openAttributes(event, run.runId, maskText),
      },
      parentContext,
    );
    created += 1;
    const open: OpenSpan = {
      span,
      spanId: key,
      ...(parentId === undefined ? {} : { parentSpanId: parentId }),
    };
    openBySpanId.set(key, open);
    stack.push(open);
  };

  const endSpan = (
    spanId: string,
    ts: string,
    status?: string,
    message?: string,
    unsettled = false,
  ): void => {
    const open = openBySpanId.get(spanId);
    if (open === undefined) {
      return;
    }
    if (status !== undefined) {
      open.span.setAttribute('rulvar.status', status);
    }
    open.span.setStatus(
      (status !== undefined && status !== 'ok' && status !== 'skipped') || unsettled
        ? { code: STATUS_ERROR, ...(message === undefined ? {} : { message }) }
        : { code: STATUS_OK },
    );
    open.span.end(msOf(ts));
    openBySpanId.delete(spanId);
    const idx = stack.lastIndexOf(open);
    if (idx !== -1) {
      stack.splice(idx, 1);
    }
  };

  for await (const event of run.events) {
    if (SPAN_OPENERS.has(event.type)) {
      startSpan(event);
      continue;
    }
    switch (event.type) {
      case 'run:end': {
        // The semantic completion lift (RV-207 tail): transport status
        // and semantic completeness are different claims; surface both.
        const runOpen = openBySpanId.get(event.spanId);
        if (runOpen !== undefined && event.completion !== undefined) {
          runOpen.span.setAttribute('rulvar.run.completion', event.completion);
        }
        if (runOpen !== undefined && event.childStatusCounts !== undefined) {
          runOpen.span.setAttribute(
            'rulvar.run.childStatusCounts',
            JSON.stringify(event.childStatusCounts),
          );
        }
        // The degradation mirror (the fifth experiment, cycle 75):
        // library-authored child notes and salvage id lists, never
        // model content, so the no-content export policy holds.
        if (runOpen !== undefined && event.degradedReasons !== undefined) {
          runOpen.span.setAttribute(
            'rulvar.run.degradedReasons',
            JSON.stringify(event.degradedReasons),
          );
        }
        if (runOpen !== undefined && event.salvagedPartialChildren !== undefined) {
          runOpen.span.setAttribute(
            'rulvar.run.salvagedPartialChildren',
            JSON.stringify(event.salvagedPartialChildren),
          );
        }
        if (runOpen !== undefined && event.salvagedTerminalOutputChildren !== undefined) {
          runOpen.span.setAttribute(
            'rulvar.run.salvagedTerminalOutputChildren',
            JSON.stringify(event.salvagedTerminalOutputChildren),
          );
        }
        // The per-child acceptance roster (RV806): identifiers,
        // statuses, and evidence counters only, JSON like its siblings.
        if (runOpen !== undefined && event.acceptanceChildren !== undefined) {
          runOpen.span.setAttribute(
            'rulvar.run.acceptanceChildren',
            JSON.stringify(event.acceptanceChildren),
          );
        }
        // An unsettled terminal (RV907): the computed status stays an
        // attribute, but the span refuses green, because nothing
        // durable records this terminal and handle.result rejects. A
        // superseded segment (RV1009) carries its distinct reason.
        if (runOpen !== undefined && event.settled === false) {
          runOpen.span.setAttribute('rulvar.run.settled', false);
          if (event.settledReason !== undefined) {
            runOpen.span.setAttribute('rulvar.run.settled_reason', event.settledReason);
          }
        }
        // The envelope mirror (RV1105): the run span carries the money
        // and agent facts from the SAME envelope the outcome resolves
        // with, so the trace and the SDK cannot disagree. Widened at
        // runtime: a persisted stream written by an older engine may
        // replay a run:end without one.
        const envelope = event.envelope as typeof event.envelope | undefined;
        if (runOpen !== undefined && envelope !== undefined) {
          runOpen.span.setAttribute('rulvar.run.total_usd', envelope.totalUsd);
          runOpen.span.setAttribute('rulvar.run.agents_spawned', envelope.agentsSpawned);
        }
        endSpan(
          event.spanId,
          event.ts,
          event.status,
          event.settled === false
            ? event.settledReason === 'superseded'
              ? 'superseded: a successor owns settlement; this stale terminal is withheld'
              : 'settlement failed: nothing durable records this terminal; resume re-settles'
            : undefined,
          event.settled === false,
        );
        break;
      }
      // Phase activations are child spans of the agent span, keyed
      // (spanId, invocation) so a summarize that fires three times gets
      // three spans.
      case 'agent:phase:start':
        startSpan(event, `${event.spanId}#${event.invocation}`, event.spanId);
        break;
      case 'agent:phase:end': {
        const key = `${event.spanId}#${event.invocation}`;
        setUsageAttributes(openBySpanId.get(key), event, 'rulvar.retries', event.retries);
        endSpan(key, event.ts, event.outcome);
        break;
      }
      case 'agent:end': {
        const agentOpen = openBySpanId.get(event.spanId);
        setUsageAttributes(agentOpen, event, 'rulvar.retry_count', event.retryCount);
        // The exploration guard counters (RV-210) as span attributes, so
        // a backend can gate on the repeated/duplicate call share.
        if (event.exploration !== undefined && agentOpen !== undefined) {
          agentOpen.span.setAttribute(
            'rulvar.exploration.tool_calls_used',
            event.exploration.toolCallsUsed,
          );
          agentOpen.span.setAttribute(
            'rulvar.exploration.distinct_signatures',
            event.exploration.distinctSignatures,
          );
          agentOpen.span.setAttribute(
            'rulvar.exploration.repeated_calls',
            event.exploration.repeatedCalls,
          );
          agentOpen.span.setAttribute(
            'rulvar.exploration.duplicate_result_calls',
            event.exploration.duplicateResultCalls,
          );
          agentOpen.span.setAttribute(
            'rulvar.exploration.denied_repeats',
            event.exploration.deniedRepeats,
          );
        }
        endSpan(event.spanId, event.ts, event.status);
        break;
      }
      case 'tool:start': {
        const key = `${event.spanId}#tool${String(toolMint)}`;
        toolMint += 1;
        if (typeof event.toolCallId === 'string') {
          // Exact pairing (RV908): the id-keyed register, never the
          // FIFO queue, so a later no-id end cannot steal this span.
          openToolById.set(toolIdOf(event.spanId, event.toolCallId), key);
        } else {
          const pair = toolPairOf(event.spanId, event.toolName);
          const fifo = openToolPairs.get(pair);
          if (fifo === undefined) {
            openToolPairs.set(pair, [key]);
          } else {
            fifo.push(key);
          }
        }
        startSpan(event, key, event.spanId);
        if (typeof event.toolCallId === 'string') {
          openBySpanId.get(key)?.span.setAttribute('rulvar.tool.call_id', event.toolCallId);
        }
        break;
      }
      case 'tool:end': {
        let key: string | undefined;
        if (typeof event.toolCallId === 'string') {
          const idKey = toolIdOf(event.spanId, event.toolCallId);
          key = openToolById.get(idKey);
          if (key !== undefined) {
            openToolById.delete(idKey);
          }
        }
        // The FIFO fallback covers streams recorded before RV908 and an
        // id-bearing closer whose start carried no id.
        key ??= openToolPairs.get(toolPairOf(event.spanId, event.toolName))?.shift();
        if (key === undefined) {
          // A closer with no open start (a foreign or truncated
          // stream): the exporter's tolerance posture is a span event
          // on the enclosing span, never a closed agent span.
          const host = openBySpanId.get(event.spanId) ?? stack[stack.length - 1];
          host?.span.addEvent(event.type, { 'rulvar.entry_seq': event.seq });
          break;
        }
        if (event.guard !== undefined) {
          openBySpanId.get(key)?.span.setAttribute('rulvar.tool.guard', event.guard);
        }
        endSpan(key, event.ts, event.outcome);
        break;
      }
      case 'child:end':
        endSpan(event.spanId, event.ts, event.status);
        break;
      // The determinism warning attaches as a span event carrying its
      // classification and the localized code location (OTel semantic
      // convention keys), so a backend can alert on workflow-provenance
      // warnings without parsing frames (RV-209).
      case 'determinism:warning': {
        const host = openBySpanId.get(event.spanId) ?? stack[stack.length - 1];
        host?.span.addEvent('determinism:warning', {
          'rulvar.entry_seq': event.seq,
          'rulvar.determinism.category': event.category,
          'rulvar.determinism.provenance': event.provenance,
          ...(event.file === undefined ? {} : { 'code.filepath': maskText(event.file) }),
          ...(event.line === undefined ? {} : { 'code.lineno': event.line }),
        });
        break;
      }
      default: {
        // Payload-only event: attach to its own span if it has one,
        // else to the innermost open span, carrying the allowlisted
        // payload (RV4917).
        const host = openBySpanId.get(event.spanId) ?? stack[stack.length - 1];
        host?.span.addEvent(event.type, payloadAttributes(event, maskText));
      }
    }
  }
  // The run may end without a run:end opener match in edge cases; close
  // anything still open at the run's settle time. An unsettled terminal
  // REJECTS handle.result typed (RV907) after the stream already
  // carried the refusal, so the export completes either way (RV1106);
  // a leftover span refuses green, because nothing durable records its
  // terminal.
  const settledOk = await run.result.then(
    (outcome) => outcome.status === 'ok',
    () => false,
  );
  for (const open of [...openBySpanId.values()]) {
    open.span.setStatus({ code: settledOk ? STATUS_OK : STATUS_ERROR });
    open.span.end();
    openBySpanId.delete(open.spanId);
  }
  return created;
}
