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
// The canonical adder (RV1001): byRole buckets keep the cache-write TTL
// split the folded phase events carry.
import { sumUsage } from './usage.js';

const ZERO: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

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
        bucket.usage = sumUsage(bucket.usage, event.usage);
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
  /**
   * Summed wall of completed 'synthesize' spans (0 when none). Since
   * RV1604 this is exactly `finalCompositionMs + semanticJudgeMs`,
   * kept whole for existing consumers: the name predates the claim
   * judge riding the same role, and the eighteenth comparison
   * benchmark read a 54-second `synthesisMs` as a second final
   * composition when the run had SKIPPED synthesis and the bucket was
   * entirely the judge and its extract. Read the split fields.
   */
  synthesisMs: number;
  /**
   * Completed 'synthesize' spans that ARE final composition (every
   * synthesize span not labeled as the claim judge), summed (RV1604).
   */
  finalCompositionMs: number;
  /**
   * Completed 'synthesize' spans that are the claim-consistency judge
   * (agent:start label {@link CLAIM_JUDGE_LABEL}), its extract phase
   * included, summed (RV1604).
   */
  semanticJudgeMs: number;
  /**
   * The stage split of `semanticJudgeMs` (RV3404): the draft pass
   * dispatches under the exact {@link CLAIM_JUDGE_LABEL} and every
   * suffixed variant is a post draft pass (today the final pass and
   * the repair round's re-judge, both `-final`, RV2509/RV3307). Always
   * the exact partition: `draftJudgeMs + finalJudgeMs` equals
   * `semanticJudgeMs`.
   */
  draftJudgeMs: number;
  /** The post draft half of the split; see `draftJudgeMs`. */
  finalJudgeMs: number;
  /**
   * Completed composition-side synthesize spans, counted (RV3404): two
   * compositions on one run is the legible signature of the bounded
   * repair round (RV3307), and a count survives where milliseconds
   * invite guessing.
   */
  compositionSpans: number;
  /** Completed judge-side synthesize spans, counted (RV3404). */
  judgeSpans: number;
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
  /**
   * The same bucket keyed by the activation's OWN invocation role
   * ('orchestrate' for the coordinator's drafting and repair turns,
   * 'summarize' for a compaction pass, 'extract' for a schema pass),
   * so a tail spent compacting is distinguishable from a tail spent
   * drafting (RV1211). A zero-duration activation inside the window
   * still registers its role. The values sum to `coordinationModelMs`
   * exactly.
   */
  coordinationModelMsByPhase: Record<string, number>;
  /**
   * Coordination activation wall with the tool executions NESTED
   * inside it removed: the coordinator's own model time, exactly
   * (RV1211). `coordinationModelMs` is activation wall, and a tool the
   * activation called runs inside that wall, so the two buckets
   * overlap by construction and reading the first as "thinking time"
   * overstates it. This is the exact set difference of the two clipped
   * unions, never a subtraction of sums, so overlapping activations
   * cannot drive it negative. The sixteenth comparison experiment's
   * 222.6-second tail is the number this field exists to split.
   */
  coordinationModelOnlyMs: number;
  /** Tool executions of coordination spans inside the window, summed. */
  coordinationToolMs: number;
  /**
   * The same tool time keyed by tool name. A zero-duration execution
   * inside the window still registers its name: sub-millisecond tools
   * round to 0 on the wall clock but did run here.
   */
  coordinationToolMsByName: Record<string, number>;
  /**
   * How many executions of each tool the window holds (RV1211), under
   * the same touch-the-window rule as the milliseconds beside it. A
   * coordinator that calls one tool per turn reads its tail's turn
   * profile straight off this record; the milliseconds alone cannot
   * separate one slow pagination from twenty fast ones.
   */
  coordinationToolCallsByName: Record<string, number>;
  /** Completed 'synthesize' span wall clipped to the window. */
  synthesisMs: number;
  /** The final-composition half of `synthesisMs`, clipped (RV1604). */
  finalCompositionMs: number;
  /** The claim-judge half of `synthesisMs`, clipped (RV1604). */
  semanticJudgeMs: number;
  /** Union length of every covered interval above. */
  coveredMs: number;
  /** postFanInMs minus coveredMs, floored at zero. */
  residueMs: number;
  /** residueMs / postFanInMs when the window is longer than zero. */
  residueShare?: number;
}

/**
 * The label the claim-consistency judge invocation dispatches under
 * (RV1502; named here since RV1604 so the critical-path reducer and the
 * orchestrator share one constant): the judge rides role 'synthesize',
 * and this label is what tells its wall apart from a real final
 * composition in {@link reduceCriticalPath}.
 */
export const CLAIM_JUDGE_LABEL = 'claim-consistency-judge';

/**
 * Whether a synthesize span's label names a claim-consistency judge
 * invocation: the exact {@link CLAIM_JUDGE_LABEL}, or a suffixed
 * variant of it (the final pass dispatches under
 * `claim-consistency-judge-final` since RV2509 so the two passes of
 * `stage: 'both'` stay separable). BOTH reducers must classify through
 * this one predicate (RV3302): the live fold compared the label for
 * exact equality while the journal fold accepted the suffix, and the
 * 2026-08-12 comparison run reported semanticJudgeMs 0 with the whole
 * 272923 ms window read as final composition on the live surface
 * while the journal fold correctly split 224864 against 48059.
 */
export function isClaimJudgeLabel(label: string | undefined): boolean {
  return claimJudgeStageOf(label) !== undefined;
}

/**
 * Which pass a claim-consistency judge label names (RV3404): the exact
 * {@link CLAIM_JUDGE_LABEL} is the draft pass, and every suffixed
 * variant is a post draft pass over the composed document (today the
 * final pass and the repair round's re-judge, both dispatching under
 * `-final`, RV2509/RV3307). `undefined` for every other label. One
 * classifier for both reducers, the RV3302 doctrine extended from the
 * judge predicate to the stage: the split must never read differently
 * off the live stream and off the journal of one run.
 */
export function claimJudgeStageOf(label: string | undefined): 'draft' | 'final' | undefined {
  if (label === CLAIM_JUDGE_LABEL) {
    return 'draft';
  }
  return (label?.startsWith(`${CLAIM_JUDGE_LABEL}-`) ?? false) ? 'final' : undefined;
}

/**
 * Total length of the union of possibly overlapping intervals, exported
 * (RV3404) so the journal fold computes its window coverage through the
 * SAME arithmetic the live RV710 decomposition uses, never a sibling
 * implementation that can drift.
 */
export function unionOfIntervalsMs(intervals: ReadonlyArray<{ from: number; to: number }>): number {
  return unionLength([...intervals]);
}

/**
 * The label the final synthesis (composition) invocation dispatches
 * under (RV2901). The engine labelling its OWN dispatches is what lets
 * `criticalPathFromJournal` split the synthesize bucket offline: the
 * split demands a label on EVERY synthesize span, and the comparison
 * run that shipped the journal fold still refused it because this one
 * dispatch stayed anonymous while the claim judge was labelled.
 */
export const FINAL_COMPOSITION_LABEL = 'final-composition';

/**
 * The label an incremental synthesis note dispatches under (RV2901).
 * Notes ride role 'synthesize' and are composition-side work, so both
 * reducers count them toward the composition half of the split; the
 * label exists so a journal reader can tell WHICH composition spans
 * were notes without guessing from their size.
 */
export const SYNTHESIS_NOTE_LABEL = 'synthesis-note';

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
  const startBySpan = new Map<string, { role: string; at: number; label?: string }>();
  let lastWorkerEnd: number | undefined;
  let workerSpans = 0;
  let synthesisMs = 0;
  let finalCompositionMs = 0;
  let semanticJudgeMs = 0;
  let draftJudgeMs = 0;
  let finalJudgeMs = 0;
  let compositionSpans = 0;
  let judgeSpans = 0;
  // Raw material of the RV710 decomposition, folded after the pass
  // (the window is known only once run:end and the last worker settle
  // are). An end event's interval is reconstructed as
  // [ts - durationMs, ts]: durations are differences on the loop's own
  // clock, so the reconstruction holds whatever epoch that clock uses.
  const coordinationModel: Array<Interval & { phase: string }> = [];
  const coordinationTools: Array<Interval & { name: string }> = [];
  const synthesisSpans: Array<Interval & { judge: boolean }> = [];
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
        startBySpan.set(event.spanId, {
          role: event.role,
          at,
          ...(event.label === undefined ? {} : { label: event.label }),
        });
        break;
      case 'agent:phase:end': {
        if (startBySpan.get(event.spanId)?.role === 'orchestrate') {
          // The activation's OWN role, not the span's (RV1211): the
          // span is 'orchestrate' by construction here, while the
          // phase names what the turn was doing.
          coordinationModel.push({
            phase: event.role,
            from: at - spanOf(event.durationMs),
            to: at,
          });
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
          const wall = Math.max(0, at - started.at);
          const stage = claimJudgeStageOf(started.label);
          const judge = stage !== undefined;
          synthesisMs += wall;
          if (judge) {
            semanticJudgeMs += wall;
            judgeSpans += 1;
            if (stage === 'draft') {
              draftJudgeMs += wall;
            } else {
              finalJudgeMs += wall;
            }
          } else {
            finalCompositionMs += wall;
            compositionSpans += 1;
          }
          synthesisSpans.push({ from: started.at, to: at, judge });
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
  const path: CriticalPath = {
    synthesisMs,
    finalCompositionMs,
    semanticJudgeMs,
    draftJudgeMs,
    finalJudgeMs,
    compositionSpans,
    judgeSpans,
    workerSpans,
  };
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
    // The model bucket profiled by activation role (RV1211), the same
    // clip-then-key shape the tool bucket already uses.
    const byPhase: Record<string, number> = {};
    const modelClipped: Interval[] = [];
    for (const interval of coordinationModel) {
      const clipped = clip(interval);
      if (clipped === undefined) {
        continue;
      }
      byPhase[interval.phase] = (byPhase[interval.phase] ?? 0) + (clipped.to - clipped.from);
      modelClipped.push(clipped);
    }
    const synthesisClipped: Interval[] = [];
    let judgeClippedMs = 0;
    let compositionClippedMs = 0;
    for (const span of synthesisSpans) {
      const clipped = clip(span);
      if (clipped === undefined) {
        continue;
      }
      synthesisClipped.push(clipped);
      if (span.judge) {
        judgeClippedMs += clipped.to - clipped.from;
      } else {
        compositionClippedMs += clipped.to - clipped.from;
      }
    }
    const byName: Record<string, number> = {};
    const callsByName: Record<string, number> = {};
    const toolsClipped: Interval[] = [];
    for (const interval of coordinationTools) {
      const clipped = clip(interval);
      if (clipped === undefined) {
        continue;
      }
      byName[interval.name] = (byName[interval.name] ?? 0) + (clipped.to - clipped.from);
      callsByName[interval.name] = (callsByName[interval.name] ?? 0) + 1;
      toolsClipped.push(clipped);
    }
    const lengthOf = (intervals: Interval[]): number =>
      intervals.reduce((sum, interval) => sum + (interval.to - interval.from), 0);
    const coveredMs = unionLength([...modelClipped, ...toolsClipped, ...synthesisClipped]);
    // The exact set difference |model \ tools| (RV1211), by inclusion
    // and exclusion over the two unions: nested tool executions are
    // removed ONCE, not once per overlapping activation, and the
    // result can never go negative the way a subtraction of clipped
    // sums could.
    const modelOnlyMs = unionLength([...modelClipped, ...toolsClipped]) - unionLength(toolsClipped);
    const breakdown: PostFanInBreakdown = {
      coordinationModelMs: lengthOf(modelClipped),
      coordinationModelMsByPhase: byPhase,
      coordinationModelOnlyMs: modelOnlyMs,
      coordinationToolMs: lengthOf(toolsClipped),
      coordinationToolMsByName: byName,
      coordinationToolCallsByName: callsByName,
      synthesisMs: lengthOf(synthesisClipped),
      finalCompositionMs: compositionClippedMs,
      semanticJudgeMs: judgeClippedMs,
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
