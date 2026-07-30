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
import type { CostBasis, ToolBudgetSummary, WorkflowEvent } from './events.js';

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
  /**
   * The fold behind `costUsd` (RV702). An event stream recorded before
   * the field shipped priced aggregates, so an absent field reduces to
   * 'aggregate-estimate', never to a per-call claim it cannot back.
   */
  costBasis: CostBasis;
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
  /**
   * The fold behind `costUsd` (RV702), from the span's agent:end; an
   * absent field (a pre-RV702 stream, or a span still open) reduces to
   * 'aggregate-estimate', never to a per-call claim it cannot back.
   */
  costBasis: CostBasis;
  usageApprox: boolean;
  retryCount: number;
  /**
   * The tool budget pressure snapshot (RV304), carried through from the
   * live agent:end. Absent on replayed rows and unbounded loops.
   */
  toolBudget?: ToolBudgetSummary;
  replayed: boolean;
  /** True when the span's agent:end never arrived. */
  open: boolean;
  phases: PhaseRow[];
}

/** The reduced table plus the per-role aggregate across every span. */
export interface InvocationTable {
  agents: AgentInvocationRow[];
  /**
   * Aggregated over COMPLETED phase pairs, keyed by role. The bucket's
   * `costBasis` is 'per-call' only while EVERY folded pair carried the
   * per-call basis; one aggregate-estimate pair degrades the bucket.
   */
  byRole: Record<string, { usage: Usage; costUsd: number; costBasis: CostBasis }>;
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
  const byRole: Record<string, { usage: Usage; costUsd: number; costBasis: CostBasis }> = {};
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
        costBasis: 'aggregate-estimate',
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
          costBasis: 'aggregate-estimate',
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
            costBasis: 'aggregate-estimate',
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
        // The honest default (RV702): a stream recorded before the field
        // shipped priced aggregates, so absent means aggregate-estimate.
        phase.costBasis = event.costBasis ?? 'aggregate-estimate';
        phase.outcome = event.outcome;
        phase.retries = event.retries ?? 0;
        const bucket = (byRole[event.role] ??= {
          usage: ZERO,
          costUsd: 0,
          costBasis: 'per-call',
        });
        bucket.usage = addUsage(bucket.usage, event.usage);
        bucket.costUsd += event.costUsd;
        if (phase.costBasis === 'aggregate-estimate') {
          bucket.costBasis = 'aggregate-estimate';
        }
        break;
      }
      case 'agent:end': {
        const row = rowFor(event);
        row.open = false;
        row.status = event.status;
        row.usage = event.usage;
        row.costUsd = event.costUsd;
        row.costBasis = event.costBasis ?? 'aggregate-estimate';
        row.usageApprox = event.usageApprox === true;
        row.retryCount = event.retryCount ?? 0;
        if (event.toolBudget !== undefined) {
          row.toolBudget = event.toolBudget;
        }
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
  /** The RV710 decomposition of the window; present with postFanInMs. */
  postFanIn?: PostFanInBreakdown;
}

/**
 * Where the post-fan-in interval actually went (RV710): the eleventh
 * comparison experiment measured 45.5 percent of wall sitting after
 * fan-in with zero synthesis share and nothing to name it. The
 * decomposition is a pure fold over the SAME vocabulary, no new event
 * types: model activations and tool executions of coordination spans
 * (spans whose agent:start role is 'orchestrate') are reconstructed
 * from their end events' (ts, durationMs) and clipped to the
 * [last worker settle, run:end] window, and completed 'synthesize'
 * spans are clipped the same way. The coordinator's draft and repair
 * thinking lands in the model bucket; child-result pagination and the
 * finish exchanges (host validators run inside the finish tool's
 * measured window) land in the tool buckets under their own names; the
 * residue is what no recorded interval covers: scheduling gaps,
 * journal writes, park-to-wake latency. Live fidelity only, exactly
 * like the wall numbers around it: a replayed stream re-stamps
 * emission times and carries durationMs 0, so its decomposition is
 * degenerate. Buckets are clipped SUMS (two concurrent coordination
 * spans, or duration-clock skew against emission stamps, can
 * overlap-count); coveredMs is the exact interval union, so residueMs
 * is never understated by an overlap. End events whose span never
 * started in the stream (a consumer attached mid-stream) cannot be
 * attributed and are skipped, never guessed at.
 */
export interface PostFanInBreakdown {
  /** Model activations of coordination spans inside the window. */
  coordinationModelMs: number;
  /** Tool executions of coordination spans inside the window, summed. */
  coordinationToolMs: number;
  /**
   * The same tool time keyed by tool name. A zero-duration execution
   * inside the window still registers its name: sub-millisecond tools
   * round to 0 on the wall clock but did run here.
   */
  coordinationToolMsByName: Record<string, number>;
  /** Completed 'synthesize' span wall clipped to the window. */
  synthesisMs: number;
  /** Union length of every covered interval above. */
  coveredMs: number;
  /** postFanInMs minus coveredMs, floored at zero. */
  residueMs: number;
  /** residueMs / postFanInMs when the window is longer than zero. */
  residueShare?: number;
}

interface Interval {
  from: number;
  to: number;
}

/** Total length of the union of possibly overlapping intervals. */
function unionLength(intervals: Interval[]): number {
  const positive = intervals.filter((interval) => interval.to > interval.from);
  if (positive.length === 0) {
    return 0;
  }
  const sorted = [...positive].sort((a, b) => a.from - b.from);
  let total = 0;
  let from = sorted[0]?.from ?? 0;
  let to = sorted[0]?.to ?? 0;
  for (const interval of sorted.slice(1)) {
    if (interval.from > to) {
      total += to - from;
      from = interval.from;
      to = interval.to;
    } else if (interval.to > to) {
      to = interval.to;
    }
  }
  return total + (to - from);
}

export function reduceCriticalPath(events: Iterable<WorkflowEvent>): CriticalPath {
  let runStart: number | undefined;
  let runEnd: number | undefined;
  const startBySpan = new Map<string, { role: string; at: number }>();
  let lastWorkerEnd: number | undefined;
  let workerSpans = 0;
  let synthesisMs = 0;
  // Raw material of the RV710 decomposition, folded after the pass
  // (the window is known only once run:end and the last worker settle
  // are). An end event's interval is reconstructed as
  // [ts - durationMs, ts]: durations are differences on the loop's own
  // clock, so the reconstruction holds whatever epoch that clock uses.
  const coordinationModel: Interval[] = [];
  const coordinationTools: Array<Interval & { name: string }> = [];
  const synthesisSpans: Interval[] = [];
  const spanOf = (durationMs: number): number =>
    Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
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
      case 'agent:phase:end': {
        if (startBySpan.get(event.spanId)?.role === 'orchestrate') {
          coordinationModel.push({ from: at - spanOf(event.durationMs), to: at });
        }
        break;
      }
      case 'tool:end': {
        if (startBySpan.get(event.spanId)?.role === 'orchestrate') {
          coordinationTools.push({
            name: event.toolName,
            from: at - spanOf(event.durationMs),
            to: at,
          });
        }
        break;
      }
      case 'agent:end': {
        const started = startBySpan.get(event.spanId);
        if (started === undefined) {
          break;
        }
        if (started.role === 'synthesize') {
          synthesisMs += Math.max(0, at - started.at);
          synthesisSpans.push({ from: started.at, to: at });
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
    const windowFrom = Math.min(lastWorkerEnd, runEnd);
    const windowTo = runEnd;
    // An interval participates when it touches the window at all; a
    // zero-length clip keeps registering the tool's name.
    const clip = (interval: Interval): Interval | undefined => {
      if (interval.to < windowFrom || interval.from > windowTo) {
        return undefined;
      }
      return {
        from: Math.max(interval.from, windowFrom),
        to: Math.min(interval.to, windowTo),
      };
    };
    const modelClipped = coordinationModel
      .map(clip)
      .filter((interval): interval is Interval => interval !== undefined);
    const synthesisClipped = synthesisSpans
      .map(clip)
      .filter((interval): interval is Interval => interval !== undefined);
    const byName: Record<string, number> = {};
    const toolsClipped: Interval[] = [];
    for (const interval of coordinationTools) {
      const clipped = clip(interval);
      if (clipped === undefined) {
        continue;
      }
      byName[interval.name] = (byName[interval.name] ?? 0) + (clipped.to - clipped.from);
      toolsClipped.push(clipped);
    }
    const lengthOf = (intervals: Interval[]): number =>
      intervals.reduce((sum, interval) => sum + (interval.to - interval.from), 0);
    const coveredMs = unionLength([...modelClipped, ...toolsClipped, ...synthesisClipped]);
    const breakdown: PostFanInBreakdown = {
      coordinationModelMs: lengthOf(modelClipped),
      coordinationToolMs: lengthOf(toolsClipped),
      coordinationToolMsByName: byName,
      synthesisMs: lengthOf(synthesisClipped),
      coveredMs,
      residueMs: Math.max(0, path.postFanInMs - coveredMs),
    };
    if (path.postFanInMs > 0) {
      breakdown.residueShare = breakdown.residueMs / path.postFanInMs;
    }
    path.postFanIn = breakdown;
  }
  if (path.runWallMs !== undefined && path.runWallMs > 0) {
    if (path.postFanInMs !== undefined) {
      path.postFanInShare = path.postFanInMs / path.runWallMs;
    }
    path.synthesisShare = synthesisMs / path.runWallMs;
  }
  return path;
}
