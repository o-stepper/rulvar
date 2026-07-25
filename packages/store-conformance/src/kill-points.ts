/**
 * Engine-level kill-point conformance (the 1.65.0 experiment review,
 * P1.10): a real OS child process drives a scripted engine run over the
 * consumer-constructed store and SIGKILLs ITSELF around one durable
 * write, then the referee resumes the run from a fresh process image
 * over its own store instance and asserts the engine's documented
 * recovery semantics against real death, not a simulated throw.
 *
 * The five write points and their brackets (before = the write is lost,
 * after = the write is durable and everything past it is lost):
 * - `running`: the two-phase dispatch entry appended BEFORE the
 *   provider call (the "request" write). Either bracket costs nothing
 *   extra: the step re-runs once on resume.
 * - `ok-terminal`: the terminal entry carrying the response and its
 *   usage. The `before` bracket is THE at-least-once window: the
 *   provider was paid and the acknowledgement died, so resume pays the
 *   step a second time. The `after` bracket replays it for free.
 * - `limit-terminal`: the `maxToolCalls`-expiry terminal. `before`
 *   resumes as a dangling redispatch RESTORED from the last transcript
 *   boundary (one completed tool turn = one checkpoint), so the re-pay
 *   is exactly the turns since that boundary, not the whole agent;
 *   `after` leaves an UNSTAMPED limit terminal in a never-settled run,
 *   which is the documented second chance: resume re-runs the agent
 *   live in full.
 * - `settle`: the run_settle decision. Both brackets resume as a pure
 *   replay (zero provider calls); a lost settle is re-appended by the
 *   resume segment (the settlement third guard arm), a durable one is
 *   never duplicated.
 * - `meta`: the RunMeta projection, ordered strictly AFTER the settle.
 *   `before` is the repairable meta-behind residue and the resume heals
 *   it; `after` is a fully consistent run whose resume changes nothing.
 *
 * Every scenario additionally asserts: death by SIGKILL (a worker that
 * runs to completion means the kill point was never reached, which is a
 * violation, never a pass), exactly ONE ok run_settle in the final
 * journal, meta `ok`, contiguous journal seqs, and the exact workflow
 * value after recovery.
 *
 * Three pieces, split like the multi-process soak so the child side
 * stays a few consumer lines:
 * - {@link runKillPointWorker} is the child protocol: the consumer's
 *   writer script constructs the store over
 *   `killPointWorkerConfigFromEnv()` and hands it over; the protocol
 *   wraps the journal, runs the scripted workflow, and dies at the
 *   configured write.
 * - {@link runKillPointScenario} is the referee: spawns the writer,
 *   waits out the killed owner's lease ttl, resumes over its own store
 *   instance, and throws one Error naming every violation.
 * - {@link killPointConformance} registers the whole
 *   {@link KILL_POINT_SCENARIOS} table as a {@link ConformanceSuite}.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  LeaseHeldError,
  createCanonicalIdMinter,
  createEngine,
  defineWorkflow,
  tool,
  type ChatEvent,
  type ChatRequest,
  type JournalEntry,
  type ModelCaps,
  type ProviderAdapter,
  type RunMeta,
  type Usage,
  type Workflow,
} from '@rulvar/core';

import type { FencedTranscriptsFixture } from './fenced-transcripts.js';
import { makeSuite, stableStringify, type ConformanceSuite } from './types.js';

/** The five durable writes a scenario kills around. */
export type KillPointName = 'running' | 'ok-terminal' | 'limit-terminal' | 'settle' | 'meta';

/** `before` = the write is lost; `after` = everything past it is lost. */
export type KillPointPhase = 'before' | 'after';

/** The two scripted runs: two plain steps, or one tool-capped agent. */
export type KillPointWorkflowKind = 'happy' | 'limit';

/** The pinned recovery semantics a scenario asserts. */
export interface KillPointExpectation {
  /** Provider calls the child paid before dying. */
  childCalls: number;
  /** Tool executions the child performed before dying. */
  childToolExecutions: number;
  /** Provider calls the resume pays (the bracket's documented re-pay). */
  resumeCalls: number;
  /** Tool executions during the resume. */
  resumeToolExecutions: number;
  /** `agent` terminals with status `limit` in the final journal. */
  limitTerminals: number;
  /** The workflow value after recovery. */
  value: unknown;
}

export interface KillPointScenario {
  /** Stable scenario id (`<workflow>-<point>-<phase>`). */
  id: string;
  workflow: KillPointWorkflowKind;
  point: KillPointName;
  phase: KillPointPhase;
  /** Which matching write dies (1-based; step two of the happy run is 2). */
  occurrence: number;
  expected: KillPointExpectation;
}

const HAPPY_VALUE = { one: 'alpha', two: 'beta' };
const LIMIT_VALUE = { agentStatus: 'limit' };

/**
 * The full table: both brackets of all five write points. The expected
 * counts ARE the engine's documented recovery semantics; a count moving
 * here means the durability contract moved and the change must be
 * deliberate.
 */
export const KILL_POINT_SCENARIOS: readonly KillPointScenario[] = [
  {
    id: 'happy-running-before',
    workflow: 'happy',
    point: 'running',
    phase: 'before',
    occurrence: 2,
    expected: {
      childCalls: 1,
      childToolExecutions: 0,
      resumeCalls: 1,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-running-after',
    workflow: 'happy',
    point: 'running',
    phase: 'after',
    occurrence: 2,
    expected: {
      childCalls: 1,
      childToolExecutions: 0,
      resumeCalls: 1,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-ok-terminal-before',
    workflow: 'happy',
    point: 'ok-terminal',
    phase: 'before',
    occurrence: 2,
    expected: {
      // The at-least-once window: the child paid step two and the
      // acknowledgement died, so the resume pays it again.
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 1,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-ok-terminal-after',
    workflow: 'happy',
    point: 'ok-terminal',
    phase: 'after',
    occurrence: 2,
    expected: {
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 0,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-settle-before',
    workflow: 'happy',
    point: 'settle',
    phase: 'before',
    occurrence: 1,
    expected: {
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 0,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-settle-after',
    workflow: 'happy',
    point: 'settle',
    phase: 'after',
    occurrence: 1,
    expected: {
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 0,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-meta-before',
    workflow: 'happy',
    point: 'meta',
    phase: 'before',
    occurrence: 1,
    expected: {
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 0,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'happy-meta-after',
    workflow: 'happy',
    point: 'meta',
    phase: 'after',
    occurrence: 1,
    expected: {
      childCalls: 2,
      childToolExecutions: 0,
      resumeCalls: 0,
      resumeToolExecutions: 0,
      limitTerminals: 0,
      value: HAPPY_VALUE,
    },
  },
  {
    id: 'limit-limit-terminal-before',
    workflow: 'limit',
    point: 'limit-terminal',
    phase: 'before',
    occurrence: 1,
    expected: {
      // Three provider turns (two executed probes, then the request the
      // spent budget refuses), killed at the limit terminal. The resume
      // is a dangling redispatch restored from the boundary after the
      // second tool turn: it re-pays exactly ONE turn, executes no
      // tools, and terminals as limit again.
      childCalls: 3,
      childToolExecutions: 2,
      resumeCalls: 1,
      resumeToolExecutions: 0,
      limitTerminals: 1,
      value: LIMIT_VALUE,
    },
  },
  {
    id: 'limit-limit-terminal-after',
    workflow: 'limit',
    point: 'limit-terminal',
    phase: 'after',
    occurrence: 1,
    expected: {
      // The durable limit terminal is UNSTAMPED and the run never
      // settled: the documented second chance re-runs the agent live in
      // full (three turns, two tool executions), leaving two limit
      // terminals along the journal.
      childCalls: 3,
      childToolExecutions: 2,
      resumeCalls: 3,
      resumeToolExecutions: 2,
      limitTerminals: 2,
      value: LIMIT_VALUE,
    },
  },
];

/**
 * The per-scenario contract, serialized as JSON into the
 * `RULVAR_KILL_POINT_CONFIG` environment variable of the spawned worker.
 */
export interface KillPointWorkerConfig {
  /** Store location the writer script constructs its store over. */
  storePath: string;
  /** The run both processes drive; the referee resumes this id. */
  runId: string;
  /** Lease ttl the writer's store MUST be constructed with. */
  ttlMs: number;
  /** JSONL report file the worker appends its events to. */
  reportPath: string;
  /** Which {@link KILL_POINT_SCENARIOS} entry this worker executes. */
  scenarioId: string;
}

/** One JSONL line of a worker's report file. */
export type KillPointEvent =
  | { t: 'call'; prompt: string }
  | { t: 'tool'; target: string }
  | {
      t: 'kill';
      point: KillPointName;
      phase: KillPointPhase;
      site: 'append' | 'putMeta';
      kind?: string;
      status?: string;
      seq?: number;
    }
  | { t: 'ran-to-completion'; status: string }
  | { t: 'fatal'; message: string };

const KILL_POINT_CONFIG_ENV = 'RULVAR_KILL_POINT_CONFIG';

/** Reads the worker contract a referee serialized into the child env. */
export function killPointWorkerConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): KillPointWorkerConfig {
  const raw = env[KILL_POINT_CONFIG_ENV];
  if (raw === undefined) {
    throw new Error(
      `store-conformance kill-points: the worker expects its config in ${KILL_POINT_CONFIG_ENV}`,
    );
  }
  return JSON.parse(raw) as KillPointWorkerConfig;
}

/** Parses one report file, tolerating a torn trailing line. */
export function parseKillPointReport(path: string): KillPointEvent[] {
  if (!existsSync(path)) {
    return [];
  }
  const events: KillPointEvent[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    try {
      events.push(JSON.parse(line) as KillPointEvent);
    } catch {
      // A line torn by the kill itself; everything before it is whole.
    }
  }
  return events;
}

const KILL_POINT_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
};

function lastUserText(req: ChatRequest): string {
  for (let i = req.messages.length - 1; i >= 0; i -= 1) {
    const msg = req.messages[i];
    if (msg?.role !== 'user') {
      continue;
    }
    return msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');
  }
  return '';
}

/**
 * The scripted model: `step one`/`step two` answer with fixed texts;
 * every other prompt is the limit script, whose model NEVER stops
 * asking for the probe tool, so the executed-call cap is what ends it.
 */
function makeKillPointAdapter(onCall: (prompt: string) => void): ProviderAdapter {
  const mintId = createCanonicalIdMinter();
  let limitTurn = 0;
  return {
    id: 'kp',
    caps: () => KILL_POINT_CAPS,
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      const prompt = lastUserText(req);
      onCall(prompt);
      const usage: Usage = {
        inputTokens: Math.max(1, Math.ceil(prompt.length / 4)),
        outputTokens: 4,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      };
      if (prompt.includes('step one')) {
        yield { type: 'text-delta', text: 'alpha' };
        yield { type: 'finish', finish: { reason: 'stop' }, usage };
        return;
      }
      if (prompt.includes('step two')) {
        yield { type: 'text-delta', text: 'beta' };
        yield { type: 'finish', finish: { reason: 'stop' }, usage };
        return;
      }
      limitTurn += 1;
      const id = mintId();
      yield { type: 'tool-call-start', id, name: 'probe' };
      yield { type: 'tool-call-end', id, args: { target: `t${String(limitTurn)}` } };
      yield { type: 'finish', finish: { reason: 'tool-calls' }, usage };
    },
  };
}

/** The value either scripted run recovers to. */
type KillPointRunValue = { one: string; two: string } | { agentStatus: string };

/** Both processes run the SAME workflow; resume replays through it. */
function makeKillPointWorkflow(
  kind: KillPointWorkflowKind,
  onTool: (target: string) => void,
): Workflow<unknown, KillPointRunValue> {
  if (kind === 'limit') {
    const probe = tool({
      name: 'probe',
      description: 'reads one evidence source',
      // A bare JSON Schema on purpose: the kit adds no schema-library
      // dependency, and the l0 intake documents bare schemas as legal.
      parameters: {
        type: 'object',
        properties: { target: { type: 'string' } },
        required: ['target'],
        additionalProperties: false,
      },
      execute: (input: unknown) => {
        const target = (input as { target: string }).target;
        onTool(target);
        return Promise.resolve(`evidence ${target}`);
      },
    });
    return defineWorkflow({ name: 'kp-limit' }, async (ctx) => {
      const res = await ctx.agent('probe until the cap', {
        tools: [probe],
        limits: { maxTurns: 4, maxToolCalls: 2 },
        result: 'full',
      });
      return { agentStatus: (res as { status: string }).status };
    });
  }
  return defineWorkflow({ name: 'kp-happy' }, async (ctx) => {
    const one = await ctx.agent('step one');
    const two = await ctx.agent('step two');
    return { one, two };
  });
}

function isRunSettle(entry: JournalEntry): boolean {
  return (
    entry.kind === 'decision' &&
    (entry.value as { decisionType?: string } | undefined)?.decisionType === 'run_settle'
  );
}

/** Consumer hooks for {@link runKillPointWorker}. */
export interface KillPointWorkerHooks {
  /**
   * The death itself; default SIGKILLs the current process and never
   * returns. In-process protocol tests inject a throwing hook instead,
   * which surfaces through the engine as a store failure.
   */
  kill?: () => void;
}

/**
 * The worker protocol: run it in a spawned process against the
 * consumer-constructed store pair. Wraps the journal so the configured
 * write kills the process (`before` = ahead of the write, `after` =
 * once it is durable), appends every observation to the report file
 * first (the appends are synchronous, so the report survives the
 * SIGKILL), and reports `ran-to-completion` when the kill point is
 * never reached, which the referee treats as a violation.
 */
export async function runKillPointWorker(
  fixture: FencedTranscriptsFixture,
  config: KillPointWorkerConfig,
  hooks: KillPointWorkerHooks = {},
): Promise<void> {
  const scenario = KILL_POINT_SCENARIOS.find((s) => s.id === config.scenarioId);
  if (scenario === undefined) {
    throw new Error(`store-conformance kill-points: unknown scenario '${config.scenarioId}'`);
  }
  const log = (event: KillPointEvent): void => {
    appendFileSync(config.reportPath, `${JSON.stringify(event)}\n`);
  };
  const die =
    hooks.kill ??
    ((): void => {
      process.kill(process.pid, 'SIGKILL');
    });
  const counters = { hits: 0 };
  const matches = (entry: JournalEntry): boolean => {
    if (scenario.point === 'running') {
      return entry.kind === 'agent' && entry.status === 'running';
    }
    if (scenario.point === 'ok-terminal') {
      return entry.kind === 'agent' && entry.ref !== undefined && entry.status === 'ok';
    }
    if (scenario.point === 'limit-terminal') {
      return entry.kind === 'agent' && entry.ref !== undefined && entry.status === 'limit';
    }
    if (scenario.point === 'settle') {
      return isRunSettle(entry);
    }
    return false;
  };
  const kill = (
    site: 'append' | 'putMeta',
    extra: { kind?: string; status?: string; seq?: number },
  ): void => {
    log({ t: 'kill', point: scenario.point, phase: scenario.phase, site, ...extra });
    die();
  };
  const journal = new Proxy(fixture.journal, {
    get(target, prop, receiver) {
      if (prop === 'append') {
        return async (runId: string, entry: JournalEntry, lease?: unknown): Promise<unknown> => {
          let hit = false;
          if (matches(entry)) {
            counters.hits += 1;
            hit = counters.hits === scenario.occurrence;
          }
          const detail = { kind: entry.kind, status: entry.status, seq: entry.seq };
          if (hit && scenario.phase === 'before') {
            kill('append', detail);
          }
          const out = await (
            target.append as (r: string, e: JournalEntry, l?: unknown) => Promise<unknown>
          )(runId, entry, lease);
          if (hit && scenario.phase === 'after') {
            kill('append', detail);
          }
          return out;
        };
      }
      if (prop === 'putMeta') {
        return async (meta: RunMeta, lease?: unknown): Promise<unknown> => {
          const hit = scenario.point === 'meta' && meta.status !== 'running';
          if (hit && scenario.phase === 'before') {
            kill('putMeta', { status: meta.status });
          }
          const out = await (target.putMeta as (m: RunMeta, l?: unknown) => Promise<unknown>)(
            meta,
            lease,
          );
          if (hit && scenario.phase === 'after') {
            kill('putMeta', { status: meta.status });
          }
          return out;
        };
      }
      const value = Reflect.get(target, prop, receiver) as unknown;
      return typeof value === 'function'
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
  });
  const adapter = makeKillPointAdapter((prompt) => {
    log({ t: 'call', prompt });
  });
  const workflow = makeKillPointWorkflow(scenario.workflow, (target) => {
    log({ t: 'tool', target });
  });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal, transcripts: fixture.transcripts },
    defaults: { routing: { loop: 'kp:kp-model' } },
  });
  try {
    const outcome = await engine.run(workflow, undefined, { runId: config.runId }).result;
    log({ t: 'ran-to-completion', status: outcome.status });
  } catch (thrown) {
    log({ t: 'fatal', message: String(thrown) });
    throw thrown;
  }
}

/** What a green scenario returns (the observed recovery). */
export interface KillPointObservation {
  scenario: KillPointScenario;
  childCalls: number;
  childToolExecutions: number;
  resumeCalls: number;
  resumeToolExecutions: number;
  /** `kind:status` per final journal entry, in seq order. */
  journal: string[];
  metaStatus: string | undefined;
}

export interface KillPointScenarioOptions {
  /**
   * Absolute path of the consumer's writer script. It must construct
   * the store over `killPointWorkerConfigFromEnv()` and call
   * {@link runKillPointWorker}.
   */
  writerScript: string;
  /** Scratch directory for the report file. */
  dir: string;
  /** The scenario to execute, by table entry or id. */
  scenario: KillPointScenario | string;
  /** Store location handed to the worker config; default `join(dir, 'kp.db')`. */
  storePath?: string;
  /**
   * Lease ttl for BOTH sides; default 300 ms. The referee waits it out
   * after the kill, so keep it short.
   */
  ttlMs?: number;
  /**
   * Opens the referee's own fixture over the SAME store location for
   * the resume and the final state verification.
   */
  openStore: () => Promise<FencedTranscriptsFixture> | FencedTranscriptsFixture;
  /** Closes what {@link KillPointScenarioOptions.openStore} opened. */
  closeStore?: (fixture: FencedTranscriptsFixture) => void | Promise<void>;
  /** Extra environment for the worker process. */
  env?: Record<string, string>;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
  /** Ceiling on lease-held resume retries; default 15000 ms. */
  resumeDeadlineMs?: number;
}

const wallClock: () => number = Date.now.bind(globalThis);
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Spawns the worker, asserts it died AT the configured write by
 * SIGKILL, waits out the dead owner's lease, resumes the run over the
 * referee's own store instance, and asserts the scenario's pinned
 * recovery semantics. Throws one Error naming every violation.
 */
export async function runKillPointScenario(
  options: KillPointScenarioOptions,
): Promise<KillPointObservation> {
  const scenario =
    typeof options.scenario === 'string'
      ? KILL_POINT_SCENARIOS.find((s) => s.id === options.scenario)
      : options.scenario;
  if (scenario === undefined) {
    const named = typeof options.scenario === 'string' ? options.scenario : options.scenario.id;
    throw new Error(`store-conformance kill-points: unknown scenario '${named}'`);
  }
  const ttlMs = options.ttlMs ?? 300;
  const storePath = options.storePath ?? join(options.dir, 'kp.db');
  const reportPath = join(options.dir, `kill-report-${scenario.id}.jsonl`);
  const runId = `kp-${scenario.id}`;
  const config: KillPointWorkerConfig = {
    storePath,
    runId,
    ttlMs,
    reportPath,
    scenarioId: scenario.id,
  };

  const child = spawn(process.execPath, [...(options.execArgv ?? []), options.writerScript], {
    env: {
      ...process.env,
      ...options.env,
      [KILL_POINT_CONFIG_ENV]: JSON.stringify(config),
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += String(chunk);
  });
  const exitPromise = new Promise<{ code: number | null; signal: string | null }>((resolve) => {
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
  const exit = await Promise.race([exitPromise, sleep(30_000).then(() => 'hung' as const)]);
  if (exit === 'hung') {
    child.kill('SIGKILL');
    throw new Error(
      `store-conformance kill-points ${scenario.id}: the worker did not exit within 30 s`,
    );
  }

  const violations: string[] = [];
  const events = parseKillPointReport(reportPath);
  const childCalls = events.filter((e) => e.t === 'call').length;
  const childTools = events.filter((e) => e.t === 'tool').length;
  const kills = events.filter((e): e is Extract<KillPointEvent, { t: 'kill' }> => e.t === 'kill');
  const completed = events.find((e) => e.t === 'ran-to-completion');
  const fatal = events.find((e) => e.t === 'fatal');

  if (exit.signal !== 'SIGKILL') {
    violations.push(
      `the worker must die by SIGKILL at the configured write; exit code ` +
        `${String(exit.code)}, signal ${String(exit.signal)}` +
        (completed === undefined
          ? ''
          : ' (it ran to completion: the kill point was never reached)') +
        (fatal === undefined ? '' : ` (fatal: ${fatal.message})`) +
        (stderr === '' ? '' : `; stderr: ${stderr.slice(0, 2000)}`),
    );
  }
  if (kills.length !== 1) {
    violations.push(`expected exactly one kill event, saw ${String(kills.length)}`);
  } else {
    const kill = kills[0];
    if (kill.point !== scenario.point || kill.phase !== scenario.phase) {
      violations.push(
        `the kill event names ${kill.point}/${kill.phase}, the scenario is ` +
          `${scenario.point}/${scenario.phase}`,
      );
    }
  }
  if (childCalls !== scenario.expected.childCalls) {
    violations.push(
      `the child paid ${String(childCalls)} provider calls before dying, expected ` +
        String(scenario.expected.childCalls),
    );
  }
  if (childTools !== scenario.expected.childToolExecutions) {
    violations.push(
      `the child executed ${String(childTools)} tools before dying, expected ` +
        String(scenario.expected.childToolExecutions),
    );
  }

  // The killed owner never released; its lease must lapse before the
  // referee can own the run.
  await sleep(ttlMs * 2);

  let resumeCalls = 0;
  let resumeTools = 0;
  const fixture = await options.openStore();
  try {
    const adapter = makeKillPointAdapter(() => {
      resumeCalls += 1;
    });
    const workflow = makeKillPointWorkflow(scenario.workflow, () => {
      resumeTools += 1;
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: fixture.journal, transcripts: fixture.transcripts },
      defaults: { routing: { loop: 'kp:kp-model' } },
    });
    const deadline = wallClock() + (options.resumeDeadlineMs ?? 15_000);
    let resumed: { status: string; value?: unknown } | undefined;
    for (;;) {
      try {
        resumed = await engine.resume(runId, workflow).result;
        break;
      } catch (thrown) {
        if (thrown instanceof LeaseHeldError && wallClock() < deadline) {
          await sleep(Math.max(50, Math.ceil(ttlMs / 3)));
          continue;
        }
        violations.push(`the resume rejected: ${String(thrown)}`);
        break;
      }
    }
    if (resumed !== undefined) {
      if (resumed.status !== 'ok') {
        violations.push(`the resume settled '${resumed.status}', expected 'ok'`);
      }
      if (stableStringify(resumed.value) !== stableStringify(scenario.expected.value)) {
        violations.push(
          `the recovered value is ${stableStringify(resumed.value)}, expected ` +
            stableStringify(scenario.expected.value),
        );
      }
      if (resumeCalls !== scenario.expected.resumeCalls) {
        violations.push(
          `the resume paid ${String(resumeCalls)} provider calls, the bracket documents ` +
            String(scenario.expected.resumeCalls),
        );
      }
      if (resumeTools !== scenario.expected.resumeToolExecutions) {
        violations.push(
          `the resume executed ${String(resumeTools)} tools, the bracket documents ` +
            String(scenario.expected.resumeToolExecutions),
        );
      }
    }

    const entries = await fixture.journal.load(runId);
    const firstSeq = entries[0]?.seq ?? 0;
    if (!entries.every((entry, i) => entry.seq === firstSeq + i)) {
      violations.push(
        `journal seqs are not contiguous: ${entries.map((e) => String(e.seq)).join(', ')}`,
      );
    }
    const settles = entries.filter((entry) => isRunSettle(entry));
    if (settles.length !== 1) {
      violations.push(
        `expected exactly one run_settle, the journal holds ${String(settles.length)}`,
      );
    }
    const lastSettle = settles.at(-1)?.value as { runStatus?: string } | undefined;
    if (lastSettle?.runStatus !== 'ok') {
      violations.push(`the run settle records '${String(lastSettle?.runStatus)}', expected 'ok'`);
    }
    const limitTerminals = entries.filter(
      (entry) => entry.kind === 'agent' && entry.ref !== undefined && entry.status === 'limit',
    ).length;
    if (limitTerminals !== scenario.expected.limitTerminals) {
      violations.push(
        `the journal holds ${String(limitTerminals)} limit terminals, expected ` +
          String(scenario.expected.limitTerminals),
      );
    }
    const meta = await (
      fixture.journal as { getMeta?: (runId: string) => Promise<RunMeta | undefined> }
    ).getMeta?.(runId);
    if (meta?.status !== 'ok') {
      violations.push(`meta records '${String(meta?.status)}', expected 'ok' after recovery`);
    }

    if (violations.length > 0) {
      throw new Error(
        `store-conformance kill-points ${scenario.id}: ${String(violations.length)} violation(s)\n - ` +
          violations.join('\n - '),
      );
    }
    return {
      scenario,
      childCalls,
      childToolExecutions: childTools,
      resumeCalls,
      resumeToolExecutions: resumeTools,
      journal: entries.map((entry) => `${entry.kind}:${entry.status}`),
      metaStatus: meta?.status,
    };
  } finally {
    await options.closeStore?.(fixture);
  }
}

/** Per-scenario isolation a consumer's `prepare` hands the suite. */
export interface KillPointTarget {
  /** Store location for this scenario (worker config + referee). */
  storePath?: string;
  /** Extra environment for the worker process. */
  env?: Record<string, string>;
  openStore: KillPointScenarioOptions['openStore'];
  closeStore?: KillPointScenarioOptions['closeStore'];
  /** Runs after the scenario, pass or fail (drop the schema, etc). */
  cleanup?: () => void | Promise<void>;
}

export interface KillPointConformanceOptions {
  /** Absolute path of the consumer's writer script. */
  writerScript: string;
  /** Scratch directory for report files. */
  dir: string;
  /** Fresh isolation per scenario: store location and referee opener. */
  prepare: (scenario: KillPointScenario) => Promise<KillPointTarget> | KillPointTarget;
  /** Lease ttl for both sides; default 300 ms. */
  ttlMs?: number;
  /** Extra `node` arguments placed before the writer script. */
  execArgv?: string[];
  /** Ceiling on lease-held resume retries; default 15000 ms. */
  resumeDeadlineMs?: number;
}

/**
 * The whole {@link KILL_POINT_SCENARIOS} table as a conformance suite:
 * one check per scenario, each over the fresh isolation `prepare`
 * returns. Register it with a test API whose `it` allows at least
 * thirty seconds per case (spawn, run, die, lease lapse, resume).
 */
export function killPointConformance(options: KillPointConformanceOptions): ConformanceSuite {
  const checks = KILL_POINT_SCENARIOS.map((scenario) => ({
    id: `kp-${scenario.id}`,
    title:
      `a SIGKILL ${scenario.phase} the ${scenario.point} write recovers on resume ` +
      `(${String(scenario.expected.resumeCalls)} re-paid call(s))`,
    run: async (): Promise<void> => {
      const target = await options.prepare(scenario);
      try {
        await runKillPointScenario({
          writerScript: options.writerScript,
          dir: options.dir,
          scenario,
          openStore: target.openStore,
          ...(target.storePath === undefined ? {} : { storePath: target.storePath }),
          ...(target.env === undefined ? {} : { env: target.env }),
          ...(target.closeStore === undefined ? {} : { closeStore: target.closeStore }),
          ...(options.ttlMs === undefined ? {} : { ttlMs: options.ttlMs }),
          ...(options.execArgv === undefined ? {} : { execArgv: options.execArgv }),
          ...(options.resumeDeadlineMs === undefined
            ? {}
            : { resumeDeadlineMs: options.resumeDeadlineMs }),
        });
      } finally {
        await target.cleanup?.();
      }
    },
  }));
  return makeSuite('kill-point conformance (engine recovery under real process death)', checks);
}
