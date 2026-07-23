/**
 * The official reducer over the agent event vocabulary (the RV-207
 * event-model contract): builds the per-agent, per-phase table a
 * telemetry consumer wants WITHOUT heuristics, because the vocabulary
 * needs none: one `agent:start`/`agent:end` pair per span, one
 * `agent:phase:start`/`agent:phase:end` pair per activation keyed
 * (spanId, invocation). Usage and cost are identical for a live stream
 * and its replay (both derive from the journal's recorded slices);
 * durations and retry counts are live-only fidelity and read 0 on
 * replayed rows.
 *
 * The reducer is order-driven and single-pass; it tolerates unknown
 * event types (skipped) and truncated streams (rows and phases whose
 * end never arrived stay `open: true` instead of being guessed at).
 */
import type { Usage } from './messages.js';
import type { WorkflowEvent } from './events.js';

const ZERO: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

function addUsage(a: Usage, b: Usage): Usage {
  const sum: Usage = {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
  const reasoning = (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0);
  if (reasoning > 0) {
    sum.reasoningTokens = reasoning;
  }
  return sum;
}

/** One phase activation of one agent span. */
export interface PhaseRow {
  invocation: number;
  role: string;
  model: string;
  /** 0 until the end event arrives, and on replayed rows. */
  durationMs: number;
  usage: Usage;
  costUsd: number;
  outcome?: 'ok' | 'error';
  retries: number;
  replayed: boolean;
  /** True when the phase's end event never arrived. */
  open: boolean;
}

/** One logical agent span. */
export interface AgentInvocationRow {
  spanId: string;
  agentType: string;
  label?: string;
  /** The primary role from agent:start. */
  role?: string;
  /** From agent:end; absent while the span is open. */
  status?: string;
  usage: Usage;
  costUsd: number;
  usageApprox: boolean;
  retryCount: number;
  replayed: boolean;
  /** True when the span's agent:end never arrived. */
  open: boolean;
  phases: PhaseRow[];
}

/** The reduced table plus the per-role aggregate across every span. */
export interface InvocationTable {
  agents: AgentInvocationRow[];
  /** Aggregated over COMPLETED phase pairs, keyed by role. */
  byRole: Record<string, { usage: Usage; costUsd: number }>;
  /** Sum of agent:end costUsd over settled spans. */
  totalCostUsd: number;
}

/**
 * Reduces one run's event stream (or any slice of it) to the invocation
 * table. Feed it the events in emission order; both a live stream and a
 * replayed one produce the same usage and cost columns.
 */
export function reduceInvocationTable(events: Iterable<WorkflowEvent>): InvocationTable {
  const rows = new Map<string, AgentInvocationRow>();
  const order: AgentInvocationRow[] = [];
  const openPhases = new Map<string, PhaseRow>();
  const byRole: Record<string, { usage: Usage; costUsd: number }> = {};
  let totalCostUsd = 0;

  const rowFor = (
    event: WorkflowEvent & { agentType: string; label?: string },
  ): AgentInvocationRow => {
    let row = rows.get(event.spanId);
    if (row === undefined) {
      row = {
        spanId: event.spanId,
        agentType: event.agentType,
        ...(event.label === undefined ? {} : { label: event.label }),
        usage: ZERO,
        costUsd: 0,
        usageApprox: false,
        retryCount: 0,
        replayed: event.replayed === true,
        open: true,
        phases: [],
      };
      rows.set(event.spanId, row);
      order.push(row);
    }
    return row;
  };

  for (const event of events) {
    switch (event.type) {
      case 'agent:start': {
        const row = rowFor(event);
        row.role = event.role;
        break;
      }
      case 'agent:phase:start': {
        const row = rowFor(event);
        const phase: PhaseRow = {
          invocation: event.invocation,
          role: event.role,
          model: event.model,
          durationMs: 0,
          usage: ZERO,
          costUsd: 0,
          retries: 0,
          replayed: event.replayed === true,
          open: true,
        };
        row.phases.push(phase);
        openPhases.set(`${event.spanId}#${event.invocation}`, phase);
        break;
      }
      case 'agent:phase:end': {
        const key = `${event.spanId}#${event.invocation}`;
        let phase = openPhases.get(key);
        if (phase === undefined) {
          // An end without its start (a consumer attached mid-stream):
          // record it whole rather than dropping the facts.
          phase = {
            invocation: event.invocation,
            role: event.role,
            model: event.model,
            durationMs: 0,
            usage: ZERO,
            costUsd: 0,
            retries: 0,
            replayed: event.replayed === true,
            open: true,
          };
          rowFor(event).phases.push(phase);
        }
        openPhases.delete(key);
        phase.open = false;
        phase.role = event.role;
        phase.model = event.model;
        phase.durationMs = event.durationMs;
        phase.usage = event.usage;
        phase.costUsd = event.costUsd;
        phase.outcome = event.outcome;
        phase.retries = event.retries ?? 0;
        const bucket = (byRole[event.role] ??= { usage: ZERO, costUsd: 0 });
        bucket.usage = addUsage(bucket.usage, event.usage);
        bucket.costUsd += event.costUsd;
        break;
      }
      case 'agent:end': {
        const row = rowFor(event);
        row.open = false;
        row.status = event.status;
        row.usage = event.usage;
        row.costUsd = event.costUsd;
        row.usageApprox = event.usageApprox === true;
        row.retryCount = event.retryCount ?? 0;
        totalCostUsd += event.costUsd;
        break;
      }
      default:
        break;
    }
  }
  return { agents: order, byRole, totalCostUsd };
}

/**
 * The critical-path summary of one run (RV-211): the plan's post-fan-in
 * gate ("synthesis takes at most 40% of wall time with four settled
 * workers") computed as a pure fold over the same vocabulary, no
 * heuristics beyond the role tags. Post-fan-in is the interval from the
 * LAST settled non-coordination agent (any span whose primary role is
 * neither 'orchestrate' nor 'synthesize') to run:end; the synthesis wall
 * is the summed span wall of 'synthesize' spans. Wall numbers are LIVE
 * fidelity: a replayed stream re-stamps emission times, so its intervals
 * are degenerate, exactly like phase durations. Absent pieces (no
 * run:end, no worker spans) leave the corresponding fields undefined
 * rather than guessed at.
 */
export interface CriticalPath {
  /** run:start to run:end; absent while the run is open. */
  runWallMs?: number;
  /** Last non-coordination agent:end to run:end; absent without both. */
  postFanInMs?: number;
  /** Summed wall of completed 'synthesize' spans (0 when none). */
  synthesisMs: number;
  /** postFanInMs / runWallMs when both are defined and the wall is > 0. */
  postFanInShare?: number;
  /** synthesisMs / runWallMs under the same conditions. */
  synthesisShare?: number;
  /** Settled non-coordination agent spans that anchored the fan-in. */
  workerSpans: number;
}

export function reduceCriticalPath(events: Iterable<WorkflowEvent>): CriticalPath {
  let runStart: number | undefined;
  let runEnd: number | undefined;
  const startBySpan = new Map<string, { role: string; at: number }>();
  let lastWorkerEnd: number | undefined;
  let workerSpans = 0;
  let synthesisMs = 0;
  for (const event of events) {
    const at = Date.parse(event.ts);
    if (!Number.isFinite(at)) {
      continue;
    }
    switch (event.type) {
      case 'run:start':
        runStart ??= at;
        break;
      case 'run:end':
        runEnd = at;
        break;
      case 'agent:start':
        startBySpan.set(event.spanId, { role: event.role, at });
        break;
      case 'agent:end': {
        const started = startBySpan.get(event.spanId);
        if (started === undefined) {
          break;
        }
        if (started.role === 'synthesize') {
          synthesisMs += Math.max(0, at - started.at);
        } else if (started.role !== 'orchestrate') {
          workerSpans += 1;
          lastWorkerEnd = lastWorkerEnd === undefined ? at : Math.max(lastWorkerEnd, at);
        }
        break;
      }
      default:
        break;
    }
  }
  const path: CriticalPath = { synthesisMs, workerSpans };
  if (runStart !== undefined && runEnd !== undefined) {
    path.runWallMs = Math.max(0, runEnd - runStart);
  }
  if (runEnd !== undefined && lastWorkerEnd !== undefined) {
    path.postFanInMs = Math.max(0, runEnd - lastWorkerEnd);
  }
  if (path.runWallMs !== undefined && path.runWallMs > 0) {
    if (path.postFanInMs !== undefined) {
      path.postFanInShare = path.postFanInMs / path.runWallMs;
    }
    path.synthesisShare = synthesisMs / path.runWallMs;
  }
  return path;
}
