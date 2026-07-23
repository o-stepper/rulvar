/**
 * The reproducible benchmark kit (RV-213): repeated, verified, and
 * fingerprinted measurement of one workflow on one engine, built
 * strictly on the public core APIs.
 *
 * What makes a run SCORED rather than merely finished: it settles 'ok',
 * every grader passes, and the replay-strict verification holds: a
 * dry-run resume replays it with zero would-be-live calls, reproduces
 * the recorded settle status and the journaled output digest, and the
 * re-executed body raises zero workflow-provenance determinism
 * warnings. A hand-rolled benchmark loop reports clean numbers for a
 * workflow whose result replay cannot reproduce; this kit rejects that
 * run from the series and says why, so the percentiles only ever
 * summarize runs that are evidence.
 *
 * Percentiles use the nearest-rank method (1-based, ascending): the
 * p-th percentile of n values is the element at index ceil(p/100 * n)
 * in the sorted series. No interpolation, so a reported p50/p90 is
 * always a value that actually occurred.
 *
 * Judging stays blind by construction: graders (including LLM judges
 * via the shared judge channel) see the run's output and their own
 * rubric, never a system label, a run ordinal, or a candidate
 * identity, so comparing two systems is running the same spec twice
 * and comparing reports. Repeats run SEQUENTIALLY in ordinal order;
 * cold-versus-warm cache series are a host concern (run the benchmark
 * once per series). Wall time is measured from the run's own
 * run:start/run:end event timestamps; the kit reads no clock of its
 * own.
 */
import { createRequire } from 'node:module';

import {
  hashRunOutput,
  lastRunSettle,
  type CompiledWorkflow,
  type Engine,
  type Json,
  type RunHandle,
  type RunOutcome,
  type Usage,
  type WireError,
  type Workflow,
  type WorkflowEvent,
} from '@rulvar/core';

import {
  EvalJudgeError,
  runJudge,
  type Grader,
  type GraderContext,
  type GraderVerdict,
  type JudgeSpec,
} from './case.js';
import { SweepBudgetError, type SpendEnvelope } from './envelope.js';

/** One benchmark: a workflow measured over a series of repeats. */
export interface BenchmarkSpec {
  name: string;
  workflow: Workflow | CompiledWorkflow;
  args: Json;
  /**
   * Scored repeats to attempt; a positive integer. The regression
   * protocol this kit serves calls for at least 5 before a series is
   * citable; the kit does not enforce that floor, it reports what ran.
   */
  repeats: number;
  /**
   * Per-run graders over the settled outcome, the same contract the
   * eval runners use (golden, rubric, and LLM-judge graders compose
   * unchanged). A failing grader rejects the run from scoring; a
   * throwing grader is a defect of the spec and propagates.
   */
  graders?: Grader[];
}

/** A per-run metric extractor over the run's full event stream. */
export type BenchmarkMetricExtractor = (
  events: readonly WorkflowEvent[],
  outcome: RunOutcome<Json>,
) => number;

export interface RunBenchmarkOptions {
  /** Run ceiling for each target run. */
  budgetUsd?: number;
  /** Run ceiling for each judge run a grader performs. */
  judgeBudgetUsd?: number;
  /**
   * Aggregate debit-only envelope: every target and judge run
   * authorizes its ceiling here BEFORE starting, exactly like the eval
   * runners. A target-run refusal throws SweepBudgetError; a judge-run
   * refusal rejects that run from scoring as 'judge:refused'.
   */
  envelope?: SpendEnvelope;
  /**
   * Host-supplied fingerprint labels: the commit, the pricing snapshot
   * id, the corpus hash, the series name (cold/warm). The kit never
   * shells out or guesses; identity the host does not supply is not
   * recorded.
   */
  labels?: Record<string, string>;
  /** Named per-run metric extractors; each scored series gets percentiles. */
  metrics?: Record<string, BenchmarkMetricExtractor>;
}

/** Nearest-rank percentile summary of one scored series. */
export interface BenchmarkPercentiles {
  min: number;
  p50: number;
  p90: number;
  max: number;
  mean: number;
}

/** The replay-strict verification verdict of one run. */
export interface BenchmarkVerification {
  /** Every clause below held. */
  verified: boolean;
  /** The dry-run resume had zero misses and zero reruns. */
  pureReplay: boolean;
  /** The replayed settle status equals the journaled one. */
  statusReproduced: boolean;
  /** The journaled output digest, when the settle recorded one. */
  outputHash?: string;
  /** The digest of the replayed result, when hashable. */
  replayedOutputHash?: string;
  /**
   * Digest equality where comparable. A run that settled ok with a
   * value but no journaled digest (a non-JCS-serializable result)
   * fails this clause explicitly: a benchmark demands comparable
   * outputs. A run with no output value passes it vacuously.
   */
  outputReproduced: boolean;
  /** Workflow-provenance determinism warnings across live and replay. */
  determinismWarnings: number;
  /** Machine-readable failure reasons; empty when verified. */
  reasons: string[];
}

/** The full record of one benchmark run, scored or not. */
export interface BenchmarkRunRecord {
  /** 1-based ordinal in execution order. */
  ordinal: number;
  runId: string;
  status: RunOutcome<Json>['status'];
  /** Counted into the percentile series. */
  scored: boolean;
  /** Why the run was excluded; empty when scored. */
  rejectedReasons: string[];
  /** run:start to run:end, from event timestamps. */
  wallMs: number;
  /** The target run's cost (judge runs are separate). */
  costUsd: number;
  /** The judge-run share this run's grading spent. */
  judgeCostUsd: number;
  usage: Usage;
  /** agent:end events on the live stream (logical dispatches). */
  agentDispatches: number;
  /** agent:phase:end events on the live stream (model activations). */
  invocations: number;
  verdicts: GraderVerdict[];
  verification: BenchmarkVerification;
  /** Extractor values for this run. */
  metrics: Record<string, number>;
  error?: WireError;
}

/** Where the numbers came from; percentiles without this are hearsay. */
export interface BenchmarkFingerprint {
  node: string;
  platform: string;
  arch: string;
  /** Resolved versions of the rulvar packages doing the measuring. */
  packages: Record<string, string>;
  /** The first run's run:start timestamp (event time, no clock read). */
  startedAt?: string;
  labels?: Record<string, string>;
}

export interface BenchmarkReport {
  name: string;
  /** Repeats attempted (equals runs.length). */
  repeats: number;
  /** Runs that entered the percentile series. */
  scored: number;
  runs: BenchmarkRunRecord[];
  /** Absent when no run scored: the kit never fabricates a series. */
  wallMs?: BenchmarkPercentiles;
  costUsd?: BenchmarkPercentiles;
  /** Percentiles per named extractor, over scored runs. */
  metrics: Record<string, BenchmarkPercentiles>;
  /** Every target and judge run, scored or rejected (honest spend). */
  totalCostUsd: number;
  judgeCostUsd: number;
  fingerprint: BenchmarkFingerprint;
}

const require = createRequire(import.meta.url);

function packageVersion(name: string): string | undefined {
  try {
    return (require(`${name}/package.json`) as { version?: string }).version;
  } catch {
    return undefined;
  }
}

function percentilesOf(values: readonly number[]): BenchmarkPercentiles {
  // Callers gate on a non-empty series; the ?? arms are type guards for
  // the checked index access, never taken.
  const sorted = [...values].sort((a, b) => a - b);
  const at = (index: number): number =>
    sorted[Math.min(Math.max(index, 0), sorted.length - 1)] ?? 0;
  const rank = (p: number): number => at(Math.ceil((p / 100) * sorted.length) - 1);
  return {
    min: at(0),
    p50: rank(50),
    p90: rank(90),
    max: at(sorted.length - 1),
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
  };
}

interface CollectedRun {
  events: WorkflowEvent[];
  outcome: RunOutcome<Json>;
  runId: string;
}

/**
 * The documented event catalog, enumerated: capture subscribes through
 * the typed `handle.on` surface instead of consuming the handle's
 * single `events` iterable, so the kit never competes with a host (or
 * a test harness) that already consumes the stream. An event type the
 * catalog gains later is invisible to extractors until this list
 * learns it; lifecycle, cost, and determinism events are all here.
 */
const EVENT_VOCABULARY = [
  'run:start',
  'run:end',
  'phase:start',
  'log',
  'budget:update',
  'external:waiting',
  'approval:pending',
  'child:start',
  'child:end',
  'agent:queued',
  'agent:start',
  'agent:phase:start',
  'agent:phase:end',
  'agent:end',
  'agent:error',
  'agent:schema-retry',
  'agent:stream',
  'tool:start',
  'tool:end',
  'determinism:warning',
  'plan:revised',
  'node:parked',
  'node:cancelled',
  'node:linked',
  'orchestrator:woke',
  'orchestrator:budget',
  'escalation:raised',
  'escalation:decided',
  'spawn:admitted',
  'spawn:rejected',
  'verify:failed',
  'ledger:op',
  'stall:detected',
  'guard:oscillation',
  'resolution:applied',
  'resolution:superseded',
  'termination:debit',
  'termination:denied',
  'termination:config-drift',
  'journal:compat',
] as const;

async function collectRun(handle: RunHandle<unknown>): Promise<CollectedRun> {
  const events: WorkflowEvent[] = [];
  const record = (event: WorkflowEvent): void => {
    events.push(event);
  };
  const detachers = EVENT_VOCABULARY.map((type) => handle.on(type, record));
  const outcome = (await handle.result) as RunOutcome<Json>;
  for (const detach of detachers) {
    detach();
  }
  return { events, outcome, runId: handle.runId };
}

function wallMsOf(events: readonly WorkflowEvent[]): number {
  const start = events.find((event) => event.type === 'run:start')?.ts;
  const end = events.find((event) => event.type === 'run:end')?.ts;
  return start !== undefined && end !== undefined
    ? Math.max(0, Date.parse(end) - Date.parse(start))
    : 0;
}

function workflowWarningsOf(events: readonly WorkflowEvent[]): number {
  return events.filter(
    (event) => event.type === 'determinism:warning' && event.provenance === 'workflow',
  ).length;
}

/**
 * Runs the spec's repeats sequentially and reports the verified series.
 * Throws only for spec defects (invalid repeats, a throwing grader or
 * extractor) and for a target-run envelope refusal; everything a run
 * does wrong lands in its record instead.
 */
export async function runBenchmark(
  engine: Engine,
  spec: BenchmarkSpec,
  options: RunBenchmarkOptions = {},
): Promise<BenchmarkReport> {
  if (!Number.isInteger(spec.repeats) || spec.repeats < 1) {
    throw new TypeError(
      `BenchmarkSpec.repeats must be a positive integer, got ${String(spec.repeats)}`,
    );
  }
  const runs: BenchmarkRunRecord[] = [];
  let startedAt: string | undefined;
  let totalCostUsd = 0;
  let totalJudgeCostUsd = 0;

  for (let ordinal = 1; ordinal <= spec.repeats; ordinal += 1) {
    options.envelope?.authorize(
      options.budgetUsd,
      `benchmark '${spec.name}' run ${String(ordinal)}`,
    );
    const live = await collectRun(
      engine.run(spec.workflow, spec.args, {
        name: `benchmark:${spec.name}:${String(ordinal)}`,
        ...(options.budgetUsd === undefined ? {} : { budgetUsd: options.budgetUsd }),
      }),
    );
    startedAt ??= live.events.find((event) => event.type === 'run:start')?.ts;
    totalCostUsd += live.outcome.cost.totalUsd;
    const rejectedReasons: string[] = [];
    if (live.outcome.status !== 'ok') {
      rejectedReasons.push(`status:${live.outcome.status}`);
    }

    // Replay-strict verification: the scored-run gate of the regression
    // protocol. The dry-run resume performs zero journal or meta writes
    // and zero adapter calls, so verifying costs nothing.
    const replayHandle = engine.resume(live.runId, spec.workflow, {
      args: spec.args,
      dryRun: true,
    });
    const replay = await collectRun(replayHandle);
    const preview = await replayHandle.preview;
    const recorded = lastRunSettle(await engine.stores.journal.load(live.runId));
    const outputHash = recorded?.outputHash;
    const replayedOutputHash = hashRunOutput(replay.outcome.value);
    const pureReplay = preview.misses === 0 && preview.reruns === 0;
    const statusReproduced = recorded !== undefined && replay.outcome.status === recorded.runStatus;
    const outputReproduced =
      live.outcome.value === undefined
        ? true
        : outputHash !== undefined && replayedOutputHash === outputHash;
    const determinismWarnings = workflowWarningsOf(live.events) + workflowWarningsOf(replay.events);
    const reasons: string[] = [];
    if (!pureReplay) {
      reasons.push('verification:not-pure-replay');
    }
    if (recorded === undefined) {
      reasons.push('verification:no-recorded-settle');
    } else if (!statusReproduced) {
      reasons.push('verification:status-diverged');
    }
    if (!outputReproduced) {
      reasons.push(
        outputHash === undefined
          ? 'verification:output-not-hashable'
          : 'verification:output-diverged',
      );
    }
    if (determinismWarnings > 0) {
      reasons.push('verification:determinism-warning');
    }
    const verification: BenchmarkVerification = {
      verified: reasons.length === 0,
      pureReplay,
      statusReproduced,
      ...(outputHash === undefined ? {} : { outputHash }),
      ...(replayedOutputHash === undefined ? {} : { replayedOutputHash }),
      outputReproduced,
      determinismWarnings,
      reasons,
    };
    rejectedReasons.push(...reasons);

    // Grading, through the same context contract the eval runners use.
    let judgeCostUsd = 0;
    let judgeOrdinal = 0;
    const context: GraderContext = {
      value: live.outcome.value,
      outcome: live.outcome,
      async judge(judgeSpec: JudgeSpec): Promise<Json> {
        const which = judgeOrdinal;
        judgeOrdinal += 1;
        options.envelope?.authorize(
          options.judgeBudgetUsd,
          `benchmark judge '${spec.name}:${String(ordinal)}:${String(which)}'`,
        );
        const judged = await runJudge(
          engine,
          `${spec.name}:${String(ordinal)}:${String(which)}`,
          judgeSpec,
          options.judgeBudgetUsd,
        );
        judgeCostUsd += judged.costUsd;
        return judged.output;
      },
    };
    const verdicts: GraderVerdict[] = [];
    for (const grader of spec.graders ?? []) {
      try {
        const verdict = await grader.grade(context);
        verdicts.push(verdict);
        if (!verdict.passed) {
          rejectedReasons.push(`grader:${verdict.grader}`);
        }
      } catch (error) {
        if (error instanceof SweepBudgetError) {
          rejectedReasons.push('judge:refused');
          break;
        }
        if (error instanceof EvalJudgeError && error.status === 'exhausted') {
          judgeCostUsd += error.costUsd;
          rejectedReasons.push('judge:exhausted');
          break;
        }
        throw error;
      }
    }
    totalJudgeCostUsd += judgeCostUsd;
    totalCostUsd += judgeCostUsd;

    const metricValues: Record<string, number> = {};
    for (const [metricName, extract] of Object.entries(options.metrics ?? {})) {
      metricValues[metricName] = extract(live.events, live.outcome);
    }

    runs.push({
      ordinal,
      runId: live.runId,
      status: live.outcome.status,
      scored: rejectedReasons.length === 0,
      rejectedReasons,
      wallMs: wallMsOf(live.events),
      costUsd: live.outcome.cost.totalUsd,
      judgeCostUsd,
      usage: live.outcome.usage,
      agentDispatches: live.events.filter((event) => event.type === 'agent:end').length,
      invocations: live.events.filter((event) => event.type === 'agent:phase:end').length,
      verdicts,
      verification,
      metrics: metricValues,
      ...(live.outcome.error === undefined ? {} : { error: live.outcome.error }),
    });
  }

  const scoredRuns = runs.filter((run) => run.scored);
  const seriesOf = (pick: (run: BenchmarkRunRecord) => number): BenchmarkPercentiles | undefined =>
    scoredRuns.length === 0 ? undefined : percentilesOf(scoredRuns.map(pick));
  const metricSeries: Record<string, BenchmarkPercentiles> = {};
  for (const metricName of Object.keys(options.metrics ?? {})) {
    // Extractors run for every run, so the ?? arm is a type guard only.
    const series = seriesOf((run) => run.metrics[metricName] ?? 0);
    if (series !== undefined) {
      metricSeries[metricName] = series;
    }
  }
  const wallMs = seriesOf((run) => run.wallMs);
  const costUsd = seriesOf((run) => run.costUsd);
  const packages: Record<string, string> = {};
  for (const name of ['@rulvar/core', '@rulvar/evals']) {
    const version = packageVersion(name);
    if (version !== undefined) {
      packages[name] = version;
    }
  }
  return {
    name: spec.name,
    repeats: runs.length,
    scored: scoredRuns.length,
    runs,
    ...(wallMs === undefined ? {} : { wallMs }),
    ...(costUsd === undefined ? {} : { costUsd }),
    metrics: metricSeries,
    totalCostUsd,
    judgeCostUsd: totalJudgeCostUsd,
    fingerprint: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      packages,
      ...(startedAt === undefined ? {} : { startedAt }),
      ...(options.labels === undefined ? {} : { labels: options.labels }),
    },
  };
}
