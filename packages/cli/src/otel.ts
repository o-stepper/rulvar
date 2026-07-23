/**
 * OpenTelemetry exporter (M5-T08; https://docs.rulvar.com/guide/observability). `toOtel(run,
 * tracer)` maps the spanId tree of a run 1:1 onto OTel spans: one span
 * per rulvar span, parented per the span hierarchy (run > phase >
 * agent > tool > child), with start/end timestamps from the lifecycle
 * events; each agent:phase pair additionally becomes a child span of
 * its agent span keyed (spanId, invocation), carrying the phase's role,
 * model, usage, and cost. Events without an own span (log,
 * budget:update) attach as span events on their enclosing span. An
 * opener for an already-open span never duplicates it (replayed
 * re-emissions mark the original; a pre-RV-207 stream's extra per-phase
 * agent:start cannot leak the agent span unended).
 *
 * `@opentelemetry/api` ^1.9 is an OPTIONAL peer: the CLI has no OTel
 * dependency, and the exporter is typed against a minimal structural
 * `TracerLike` so an absent peer never breaks the CLI. Attribute content
 * policy: prompts, completions, and tool payloads are NEVER exported;
 * only identifiers, statuses, usage counters, and cost figures ride
 * `rulvar.*` and `gen_ai.*` attributes. Replayed events do not create
 * duplicate spans; the single span is marked `rulvar.replayed = true`.
 */
import { maskSecrets, type RunOutcome, type WorkflowEvent } from '@rulvar/core';

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
}

const SPAN_OPENERS = new Set([
  'run:start',
  'phase:start',
  'agent:start',
  'tool:start',
  'child:start',
]);

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
      attrs[key] = maskSecrets(value);
    }
  }
  return attrs;
}

/**
 * Exports one settled run's event stream onto a tracer. The run's
 * events are consumed in seq order; span openers start spans, the
 * matching closers end them, and payload-only events attach as span
 * events on the innermost open span. Returns the number of spans
 * created.
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

  const { contextApi, setSpan } = options;

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
        attributes: openAttributes(event, run.runId),
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

  const endSpan = (spanId: string, ts: string, status?: string, message?: string): void => {
    const open = openBySpanId.get(spanId);
    if (open === undefined) {
      return;
    }
    if (status !== undefined) {
      open.span.setAttribute('rulvar.status', status);
    }
    open.span.setStatus(
      status !== undefined && status !== 'ok' && status !== 'skipped'
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
      case 'run:end':
        endSpan(event.spanId, event.ts, event.status);
        break;
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
      case 'tool:end':
        if (event.guard !== undefined) {
          openBySpanId.get(event.spanId)?.span.setAttribute('rulvar.tool.guard', event.guard);
        }
        endSpan(event.spanId, event.ts, event.outcome);
        break;
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
          ...(event.file === undefined ? {} : { 'code.filepath': maskSecrets(event.file) }),
          ...(event.line === undefined ? {} : { 'code.lineno': event.line }),
        });
        break;
      }
      default: {
        // Payload-only event: attach to its own span if it has one,
        // else to the innermost open span.
        const host = openBySpanId.get(event.spanId) ?? stack[stack.length - 1];
        host?.span.addEvent(event.type, { 'rulvar.entry_seq': event.seq });
      }
    }
  }
  // The run may end without a run:end opener match in edge cases; close
  // anything still open at the run's settle time.
  const outcome = await run.result;
  for (const open of [...openBySpanId.values()]) {
    open.span.setStatus({ code: outcome.status === 'ok' ? STATUS_OK : STATUS_ERROR });
    open.span.end();
    openBySpanId.delete(open.spanId);
  }
  return created;
}
