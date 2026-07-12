/**
 * M7 gating cassette runners (M7-T14).
 *
 * Every scenario runs fully offline on a scripted adapter over the
 * PUBLIC provider SPI and produces a NORMALIZED journal: wall clock,
 * span ids, live-minted ULIDs, and content hashes are replaced by
 * first-appearance placeholders, so two recordings of the same scenario
 * are byte-identical while the structure, ordering, kinds, statuses,
 * decision payload SHAPES, and counter balances stay exact. The
 * committed cassette is the compatibility contract; the replay test
 * re-runs each scenario fresh and compares byte-for-byte.
 */
import { createEngine, InMemoryStore, makeOrchestratorWorkflow, tool } from '@rulvar/core';
import type {
  ChatEvent,
  ChatRequest,
  Engine,
  JournalEntry,
  JournalStore,
  LeasableStore,
  ModelCaps,
  ProviderAdapter,
  RunHandle,
  Usage,
  WireError,
} from '@rulvar/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned, planRunner, type PlanRunnerOptions } from './plan-runner.js';

/** One normalized-cassette fixture file (cassettes/<id>.json). */
export interface M7CassetteFixture {
  id: string;
  note: string;
  entries: JournalEntry[];
}

const ULID_RE = /\b[0-9A-HJKMNP-TV-Z]{26}\b/g;
const SHA_RE = /\b[0-9a-f]{64}\b/g;
const RUN_RE = /\brun-[0-9a-z-]+\b/gi;

/**
 * Normalizes one journal for cassette comparison: ULIDs and sha256
 * strings map to first-appearance placeholders; wall clock, spans, and
 * transcript refs collapse to fixtures. Deterministic given a
 * deterministic entry stream.
 */
export function normalizeAdaptiveJournal(entries: readonly JournalEntry[]): JournalEntry[] {
  const scrubbed = entries.map((entry) => ({
    ...entry,
    spanId: 'fixture-span',
    startedAt: '2026-02-01T00:00:00.000Z',
    ...(entry.endedAt === undefined ? {} : { endedAt: '2026-02-01T00:00:00.000Z' }),
    ...(entry.deadlineAt === undefined ? {} : { deadlineAt: '2026-02-01T00:00:05.000Z' }),
    ...(entry.transcriptRef === undefined ? {} : { transcriptRef: 'fixture-transcript' }),
    ...(entry.checkpointRef === undefined ? {} : { checkpointRef: 'fixture-checkpoint' }),
  }));
  let text = JSON.stringify(scrubbed);
  const ulids = new Map<string, string>();
  text = text.replace(ULID_RE, (raw) => {
    let placeholder = ulids.get(raw);
    if (placeholder === undefined) {
      placeholder = `ULID-${String(ulids.size + 1).padStart(4, '0')}--------------------`;
      ulids.set(raw, placeholder);
    }
    return placeholder;
  });
  const hashes = new Map<string, string>();
  text = text.replace(SHA_RE, (raw) => {
    let placeholder = hashes.get(raw);
    if (placeholder === undefined) {
      placeholder = `hash-${String(hashes.size + 1).padStart(4, '0')}${'-'.repeat(55)}`;
      hashes.set(raw, placeholder);
    }
    return placeholder;
  });
  text = text.replace(RUN_RE, 'run-fixture');
  return JSON.parse(text) as JournalEntry[];
}

/** A minimal scripted adapter over the PUBLIC provider SPI. */
export interface CassetteTurn {
  text?: string;
  toolCall?: { name: string; args: unknown };
  hangUntilAborted?: boolean;
  /** Await this promise before emitting (cross-agent sequencing). */
  awaitPromise?: Promise<void>;
  /** The stream terminates with this typed wire error (M9 DEF-2/3 rows). */
  wireError?: WireError;
}

const CASSETTE_CAPS: ModelCaps = {
  structuredOutput: 'native',
  supportsTemperature: false,
  supportsParallelTools: true,
  reasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max'],
  contextWindow: 200_000,
  maxOutputTokens: 4_096,
  pricing: { inputUsdPerMTok: 1, outputUsdPerMTok: 10 },
};

const CASSETTE_USAGE: Usage = {
  inputTokens: 10,
  outputTokens: 5,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

export function cassetteAdapter(
  script: (req: ChatRequest) => CassetteTurn,
): ProviderAdapter & { calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  return {
    id: 'fake',
    calls,
    caps: () => CASSETTE_CAPS,
    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const call = calls.length;
      calls.push(req);
      const turn = script(req);
      if (turn.awaitPromise !== undefined) {
        await turn.awaitPromise;
      }
      if (turn.hangUntilAborted === true) {
        await new Promise<void>((resolve) => {
          if (signal?.aborted === true) {
            resolve();
            return;
          }
          signal?.addEventListener('abort', () => resolve(), { once: true });
        });
        return;
      }
      if (turn.wireError !== undefined) {
        yield { type: 'error', error: turn.wireError };
        return;
      }
      if (turn.text !== undefined) {
        yield { type: 'text-delta', text: turn.text };
      }
      if (turn.toolCall !== undefined) {
        const id = `id-${String(call)}`;
        yield { type: 'tool-call-start', id, name: turn.toolCall.name };
        yield { type: 'tool-call-end', id, args: turn.toolCall.args };
      }
      yield { type: 'finish', finish: { reason: 'stop' }, usage: CASSETTE_USAGE };
    },
  };
}

export function agentTypeOfRequest(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

export const EMPTY_PLAN_HASH: string = planHash(emptyPlan());

export function engineWith(
  adapter: ProviderAdapter,
  store: JournalStore,
  profiles: Record<string, unknown>,
  extras?: {
    schemas?: Record<string, unknown>;
    lineage?: Record<string, number>;
    isolation?: unknown;
    /** ModelKnowledge store for the M10 kb cassettes. */
    knowledge?: unknown;
  },
): Engine {
  return createEngine({
    adapters: [adapter],
    stores: {
      journal: store,
      ...(extras?.knowledge === undefined ? {} : { modelKnowledge: extras.knowledge as never }),
    },
    defaults: {
      ...(extras?.isolation === undefined ? {} : { isolation: extras.isolation as never }),
      // The full role map minus finalize, exactly the createTestEngine
      // posture: the deliberate finalize gap keeps synthesis calls out
      // of tool-bearing cassette agents.
      routing: {
        loop: 'fake:model',
        extract: 'fake:model',
        orchestrate: 'fake:model',
        plan: 'fake:model',
        summarize: 'fake:model',
      },
      profiles: profiles as never,
      ...(extras?.schemas === undefined ? {} : { schemas: extras.schemas as never }),
    },
    ...(extras?.lineage === undefined ? {} : { budgetDefaults: { lineage: extras.lineage } }),
  });
}

export const BUDGET = { capUsd: 5, finalizeReserveUsd: 1 } as const;

export async function settled(handle: RunHandle<unknown>): Promise<void> {
  await handle.result;
}

/**
 * revise-mid-run: a plan revision arrives while a worker subtree is
 * mid-flight. The first worker HANGS until the
 * revision cancels it; the added replacement completes.
 */
export async function runReviseMidRun(): Promise<JournalEntry[]> {
  let phase = 0;
  let slowNode: string | undefined;
  const adapter = cassetteAdapter((req) => {
    const agentType = agentTypeOfRequest(req);
    if (agentType === 'worker') {
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('slow branch')) {
        return { hangUntilAborted: true };
      }
      return { text: 'replacement done' };
    }
    slowNode = assignedNodeIn(req) ?? slowNode;
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'slow branch' } }],
            rationale: 'start the slow branch',
          },
        },
      };
    }
    if (phase === 2) {
      // Revise MID-FLIGHT: the hanging node cancels (cancelRequested +
      // abort, the transition lands cancel-landed) while the
      // replacement is admitted in the SAME revision.
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              { op: 'cancel_task', nodeId: slowNode ?? 'MISSING', reason: 'too slow' },
              { op: 'add_task', spec: { agentType: 'worker', prompt: 'fast replacement' } },
            ],
            rationale: 'replace the slow branch mid-flight',
          },
        },
      };
    }
    if (phase === 3) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'revised mid-run' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'revise mid-run', { budget: BUDGET });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/** The latest assignedNodeIds value visible in a request, when any. */
function assignedNodeIn(req: ChatRequest): string | undefined {
  let found: string | undefined;
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const value = part.result as { assignedNodeIds?: Record<string, string> } | undefined;
        const ids = value?.assignedNodeIds;
        if (ids !== undefined) {
          found = Object.values(ids)[0] ?? found;
        }
      }
    }
  }
  return found;
}

/**
 * crash-during-revision: process death INSIDE the revision window, at
 * the pre-append kill point: life 1 is truncated
 * strictly BEFORE the second plan.revision entry; life 2 re-issues the
 * revision live and rolls its effects forward.
 */
export async function runCrashDuringRevision(): Promise<JournalEntry[]> {
  const script = (phaseRef: { n: number }) => (req: ChatRequest) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' } as CassetteTurn;
    }
    phaseRef.n += 1;
    if (phaseRef.n === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'first' } }],
            rationale: 'first revision',
          },
        },
      } as CassetteTurn;
    }
    if (phaseRef.n === 2) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'second' } }],
            rationale: 'second revision',
          },
        },
      } as CassetteTurn;
    }
    if (phaseRef.n === 3) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      } as CassetteTurn;
    }
    return { toolCall: { name: 'finish', args: { result: 'both ran' } } } as CassetteTurn;
  };
  const phase1 = { n: 0 };
  const adapter1 = cassetteAdapter(script(phase1));
  const store = new InMemoryStore();
  const engine = engineWith(adapter1, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'crash during revision', { budget: BUDGET });
  await settled(handle);
  const full = await store.load(handle.runId);
  // The PRE-APPEND kill point: keep everything strictly before the
  // SECOND plan.revision entry.
  const revisionSeqs = full
    .filter((entry) => entry.kind === 'plan.revision')
    .map((entry) => entry.seq);
  const cut = revisionSeqs[1];
  if (cut === undefined) {
    throw new Error('crash-during-revision: expected two revisions in life 1');
  }
  const crashStore = new InMemoryStore();
  for (const meta of await store.listRuns()) {
    if (meta.runId === handle.runId) {
      await crashStore.putMeta(meta);
    }
  }
  for (const entry of full) {
    if (entry.seq < cut) {
      await crashStore.append(handle.runId, entry);
    }
  }
  const phase2 = { n: 0 };
  const adapter2 = cassetteAdapter(script(phase2));
  const engine2 = engineWith(adapter2, crashStore, { worker: { description: 'w' } });
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('crash during revision', {
      budget: BUDGET,
      extension: planRunner({}),
    }),
  );
  await resumed.result;
  return normalizeAdaptiveJournal(await crashStore.load(handle.runId));
}

/**
 * oscillation-freeze: the coarse-signature oscillation detector freezes
 * further re-adds under hysteresis (distinct from the
 * per-key osc_guard reject).
 */
export async function runOscillationFreeze(options?: PlanRunnerOptions): Promise<JournalEntry[]> {
  let phase = 0;
  let liveNode: string | undefined;
  const adapter = cassetteAdapter((req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { hangUntilAborted: true };
    }
    phase += 1;
    const revise = (ops: unknown[], rationale: string): CassetteTurn => ({
      toolCall: {
        name: 'plan_revise',
        args: { base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH }, ops, rationale },
      },
    });
    liveNode = assignedNodeIn(req) ?? liveNode;
    if (phase === 1) {
      return revise(
        [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop' } }],
        'add',
      );
    }
    if (phase <= 6) {
      // cancel + re-add of the SAME coarse signature, repeatedly: the
      // detector freezes the signature at the hysteresis threshold.
      return revise(
        [
          { op: 'cancel_task', nodeId: liveNode ?? 'MISSING', reason: 'flip' },
          { op: 'add_task', spec: { agentType: 'worker', prompt: 'flip flop' } },
        ],
        `oscillation ${String(phase)}`,
      );
    }
    return { toolCall: { name: 'finish', args: { result: 'frozen' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'oscillation freeze', {
    budget: BUDGET,
    plan: options ?? {},
  });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * park-unpark: park of a running node with checkpoint retention, later
 * unpark and continuation. The worker
 * pays one tool turn, hangs in its second, parks at the boundary, and
 * the unparked continuation resumes from the retained checkpoint (the
 * booted history carries the paid turn).
 */
export async function runParkUnpark(): Promise<JournalEntry[]> {
  let workerStreams = 0;
  let phase = 0;
  let node: string | undefined;
  let signalTurnTwo: () => void = () => undefined;
  const inTurnTwo = new Promise<void>((resolve) => {
    signalTurnTwo = resolve;
  });
  const adapter = cassetteAdapter((req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      workerStreams += 1;
      if (workerStreams === 1) {
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      if (workerStreams === 2) {
        signalTurnTwo();
        return { hangUntilAborted: true };
      }
      const history = JSON.stringify(req.messages);
      return { text: history.includes('ECHO') ? 'continued fine' : 'HISTORY LOST' };
    }
    node = assignedNodeIn(req) ?? node;
    phase += 1;
    const revise = (ops: unknown[], rationale: string): CassetteTurn => ({
      toolCall: {
        name: 'plan_revise',
        args: { base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH }, ops, rationale },
      },
    });
    if (phase === 1) {
      return revise(
        [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'long haul' } }],
        'start',
      );
    }
    if (phase === 2) {
      return {
        awaitPromise: inTurnTwo,
        ...revise([{ op: 'park_task', nodeId: node ?? 'MISSING' }], 'park at the boundary'),
      };
    }
    if (phase === 3 || phase === 5) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    if (phase === 4) {
      return revise([{ op: 'unpark_task', nodeId: node ?? 'MISSING' }], 'resume it');
    }
    return { toolCall: { name: 'finish', args: { result: 'parked and resumed' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: {
      description: 'w',
      tools: [
        tool({
          name: 'echo_tool',
          description: 'echo',
          parameters: { type: 'object', additionalProperties: false, properties: {} },
          execute: () => Promise.resolve('ECHO'),
        }),
      ],
    },
  });
  const handle = orchestratePlanned(engine, 'park unpark', { budget: BUDGET });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

const LADDER_PROFILE = {
  description: 'climbs',
  model: {
    ladder: {
      rungs: [
        { model: 'fake:cheap', effort: 'low', maxTurns: 1, maxTokens: 1000 },
        { model: 'fake:strong', effort: 'high', maxTurns: 4, maxTokens: 2000 },
      ],
      startTier: 0,
      escalateOn: ['limit'],
    },
  },
  tools: [
    tool({
      name: 'echo_tool',
      description: 'echo',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
      execute: () => Promise.resolve('ECHO'),
    }),
  ],
};

function ladderScript(strongTurn: CassetteTurn): (req: ChatRequest) => CassetteTurn {
  let phase = 0;
  return (req) => {
    if (agentTypeOfRequest(req) === 'climber') {
      if (req.model === 'cheap') {
        return { toolCall: { name: 'echo_tool', args: {} } };
      }
      return strongTurn;
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'climber', prompt: 'climb' } }],
            rationale: 'one climber',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'end' } } };
  };
}

/**
 * half-escalated-ladder: some rungs terminal, the active rung dangling
 * mid-attempt at the crash; resume continues the ladder without
 * repaying completed rungs.
 */
export async function runHalfEscalatedLadder(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(ladderScript({ hangUntilAborted: true }));
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { climber: LADDER_PROFILE });
  const handle = orchestratePlanned(engine, 'half ladder', { budget: BUDGET });
  for (;;) {
    if (adapter.calls.some((req) => req.model === 'strong')) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const atCrash = await store.load(handle.runId);
  await handle.cancel('crash simulation');
  await handle.result;
  const verdictSeq = atCrash.find(
    (entry) =>
      entry.kind === 'decision' &&
      (entry.value as { decisionType?: string } | undefined)?.decisionType === 'ladder-verdict',
  )?.seq;
  const rungTwoRoot = atCrash.find(
    (entry) =>
      entry.kind === 'agent' && entry.status === 'running' && entry.seq > (verdictSeq ?? 0),
  );
  if (rungTwoRoot === undefined) {
    throw new Error('half-escalated-ladder: the dangling strong rung root is missing');
  }
  const crashStore = new InMemoryStore();
  for (const meta of await store.listRuns()) {
    if (meta.runId === handle.runId) {
      await crashStore.putMeta(meta);
    }
  }
  for (const entry of atCrash) {
    if (entry.seq <= rungTwoRoot.seq) {
      await crashStore.append(handle.runId, entry);
    }
  }
  const resumedAdapter = cassetteAdapter(ladderScript({ text: 'strong done' }));
  const engine2 = engineWith(resumedAdapter, crashStore, { climber: LADDER_PROFILE });
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('half ladder', { budget: BUDGET, extension: planRunner({}) }),
  );
  await resumed.result;
  if (resumedAdapter.calls.some((req) => req.model === 'cheap')) {
    throw new Error('half-escalated-ladder: the completed cheap rung was re-paid');
  }
  return normalizeAdaptiveJournal(await crashStore.load(handle.runId));
}

/**
 * budget-denied-rung: the budget guard denies the rung respawn; the
 * denial journals as termination.denied strictly before the verdict and
 * the ladder takes its declared fallback path.
 */
export async function runBudgetDeniedRung(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(ladderScript({ text: 'never reached' }));
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { climber: LADDER_PROFILE });
  const handle = orchestratePlanned(engine, 'denied rung', {
    budget: BUDGET,
    plan: { limits: { maxTotalSpawns: 1 } },
  });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

const TINY_CAP = { capUsd: 0.4, finalizeReserveUsd: 0.01 } as const;

function capScript(
  finalTurn: (req: ChatRequest) => CassetteTurn,
): (req: ChatRequest) => CassetteTurn {
  let phase = 0;
  return (req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' };
    }
    const prompt = JSON.stringify(req.messages);
    if (prompt.includes('budget cap was reached')) {
      return finalTurn(req);
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
            rationale: 'one worker',
          },
        },
      };
    }
    if (phase === 2) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'normal end' } } };
  };
}

/**
 * cap-freeze-then-finish (DEF-7): the soft boundary crossed with live
 * children; the cap decision precedes its effects; admitted nodes run to
 * completion; the final quiescence wake gets the finish-only toolset;
 * outcome ok with forcedFinish.
 */
export async function runCapFreezeThenFinish(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(
    capScript(() => ({ toolCall: { name: 'finish', args: { result: 'partial but honest' } } })),
  );
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'cap freeze', { budget: TINY_CAP });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * crash-between-cap-and-effects (DEF-7): process death right after the
 * cap decision entry, before any of its effects; resume re-derives the
 * frozen state from the entry and rolls the forced finish forward.
 */
export async function runCrashBetweenCapAndEffects(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(
    capScript(() => ({ toolCall: { name: 'finish', args: { result: 'after the crash' } } })),
  );
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'cap crash', { budget: TINY_CAP });
  await settled(handle);
  const full = await store.load(handle.runId);
  const capSeq = full.find(
    (entry) =>
      (entry.value as { decisionType?: string } | undefined)?.decisionType ===
      'orchestrator_budget_cap',
  )?.seq;
  if (capSeq === undefined) {
    throw new Error('crash-between-cap-and-effects: the cap decision is missing');
  }
  const crashStore = new InMemoryStore();
  for (const meta of await store.listRuns()) {
    if (meta.runId === handle.runId) {
      await crashStore.putMeta(meta);
    }
  }
  for (const entry of full) {
    if (entry.seq <= capSeq) {
      await crashStore.append(handle.runId, entry);
    }
  }
  const resumedAdapter = cassetteAdapter(
    capScript(() => ({ toolCall: { name: 'finish', args: { result: 'after the crash' } } })),
  );
  const engine2 = engineWith(resumedAdapter, crashStore, { worker: { description: 'w' } });
  const resumed = engine2.resume(
    handle.runId,
    makeOrchestratorWorkflow('cap crash', { budget: TINY_CAP, extension: planRunner({}) }),
  );
  const outcome = await resumed.result;
  if (outcome.status !== 'ok') {
    throw new Error(`crash-between-cap-and-effects: resume ended ${outcome.status}`);
  }
  return normalizeAdaptiveJournal(await crashStore.load(handle.runId));
}

/**
 * finalize-fallback-synthesized (DEF-7): the final finish fails inside
 * its turn limit; the engine journals orchestrator_finalize_fallback and
 * synthesizes the deterministic partial by pure fold; outcome exhausted
 * with the non-null value.
 */
export async function runFinalizeFallbackSynthesized(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(capScript(() => ({ toolCall: { name: 'plan_view', args: {} } })));
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'fallback', {
    budget: { ...TINY_CAP, finalizeTurns: 1 },
  });
  const outcome = await handle.result;
  if (outcome.status !== 'exhausted' || outcome.value === undefined) {
    throw new Error('finalize-fallback-synthesized: expected exhausted with a value');
  }
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * escalation-storm-frozen (DEF-7 set): three Flavor B escalations while
 * the plan is frozen at the cap; each resolves through its journaled
 * defaultDecision and the lineage counters hold. The branches CHAIN via
 * dependencies so exactly one deadline timer is live at a time: the
 * journal byte order stays deterministic (DEF-4 already guarantees the
 * fold; the cassette asserts bytes).
 */
export async function runEscalationStormFrozen(): Promise<JournalEntry[]> {
  let phase = 0;
  let previousNode: string | undefined;
  const adapter = cassetteAdapter((req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'storm branch',
            revisedEstimate: { usd: 2, turns: 8 },
          },
        },
      };
    }
    previousNode = assignedNodeIn(req) ?? previousNode;
    phase += 1;
    if (phase <= 3) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              {
                op: 'add_task',
                spec: { agentType: 'worker', prompt: `branch ${String(phase)}` },
                ...(previousNode === undefined ? {} : { deps: [previousNode] }),
              },
            ],
            rationale: `storm branch ${String(phase)}`,
          },
        },
      };
    }
    const prompt = JSON.stringify(req.messages);
    if (prompt.includes('budget cap was reached')) {
      return { toolCall: { name: 'finish', args: { result: 'storm closed' } } };
    }
    if (phase === 4) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'no storm' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: {
      description: 'w',
      escalation: { flavor: 'B', deadlineMs: 20, defaultDecision: { kind: 'accept' } },
    },
  });
  const handle = orchestratePlanned(engine, 'storm', { budget: TINY_CAP });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * revision-exhaustion (DEF-2): the absolute revision budget hits zero;
 * termination.denied precedes the typed error; the guards chain closes
 * the run without HITL.
 */
export async function runRevisionExhaustion(): Promise<JournalEntry[]> {
  let phase = 0;
  const adapter = cassetteAdapter((req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      return { text: 'worker done' };
    }
    phase += 1;
    if (phase <= 3) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [
              { op: 'add_task', spec: { agentType: 'worker', prompt: `task ${String(phase)}` } },
            ],
            rationale: `revision ${String(phase)}`,
          },
        },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'exhausted revisions' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { worker: { description: 'w' } });
  const handle = orchestratePlanned(engine, 'revision exhaustion', {
    budget: BUDGET,
    plan: { maxRevisionsPerRun: 2 },
  });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * rung-retry-lineage (DEF-3): the ladder raise continues the SAME
 * logical task with relation rung-retry; attemptsUsed counts both rungs.
 */
export async function runRungRetryLineage(): Promise<JournalEntry[]> {
  const adapter = cassetteAdapter(ladderScript({ text: 'strong done' }));
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, { climber: LADDER_PROFILE });
  const handle = orchestratePlanned(engine, 'rung lineage', { budget: BUDGET });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * decompose-mints-children (DEF-3): an escalation decomposition mints
 * FRESH logical tasks inside the decision entry; the spawn debits ride
 * the same entry.
 */
export async function runDecomposeMintsChildren(): Promise<JournalEntry[]> {
  let phase = 0;
  const adapter = cassetteAdapter((req) => {
    if (agentTypeOfRequest(req) === 'worker') {
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('half A') || prompt.includes('half B')) {
        return { text: 'small piece done' };
      }
      return {
        toolCall: {
          name: 'escalate',
          args: {
            kind: 'scope_bigger',
            scopeDelta: 'needs a split',
            revisedEstimate: { usd: 2, turns: 8 },
          },
        },
      };
    }
    phase += 1;
    if (phase === 1) {
      return {
        toolCall: {
          name: 'plan_revise',
          args: {
            base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
            ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the big one' } }],
            rationale: 'one worker',
          },
        },
      };
    }
    if (phase === 2 || phase === 3) {
      return {
        toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
      };
    }
    return { toolCall: { name: 'finish', args: { result: 'decomposed' } } };
  });
  const store = new InMemoryStore();
  const engine = engineWith(adapter, store, {
    worker: {
      description: 'w',
      escalation: {
        flavor: 'B',
        deadlineMs: 20,
        defaultDecision: {
          kind: 'decompose',
          children: [
            { agentType: 'worker', prompt: 'half A' },
            { agentType: 'worker', prompt: 'half B' },
          ],
        },
      },
    },
  });
  const handle = orchestratePlanned(engine, 'decompose', { budget: BUDGET });
  await settled(handle);
  return normalizeAdaptiveJournal(await store.load(handle.runId));
}

/**
 * queue-failover-during-forced-finish (the DEF-7 final cassette;
 * M8-T03): worker A loses its lease strictly
 * between the cap decision and the final wake; worker B reclaims with a
 * bumped fencing epoch and rolls the forced finish forward. The stale
 * writer's appends are rejected and invisible, exactly one cap decision
 * exists, and finalization is paid once.
 *
 * The LeasableStore is INJECTED so this package stays core-only: the
 * replay test and the record script supply the reference SqliteStore.
 * One deterministic clock drives lease expiry.
 */
export interface QueueFailoverDeps {
  /** A fresh LeasableStore over the injected clock (SqliteStore ':memory:' in the suite). */
  makeStore: (now: () => number) => JournalStore & LeasableStore;
}

export async function runQueueFailoverDuringForcedFinish(
  deps: QueueFailoverDeps,
): Promise<JournalEntry[]> {
  // Phase 0: the full scenario on a scratch store yields the byte
  // prefix up to the cap decision. A lost lease and a dead process
  // leave the same journal, so the M7 crash-simulation technique
  // (clone the prefix) reproduces "stalled between the cap decision
  // and the final wake" exactly.
  const finishTurn = (): CassetteTurn => ({
    toolCall: { name: 'finish', args: { result: 'after failover' } },
  });
  const scratch = new InMemoryStore();
  const scratchEngine = engineWith(cassetteAdapter(capScript(finishTurn)), scratch, {
    worker: { description: 'w' },
  });
  const handle = orchestratePlanned(scratchEngine, 'queue failover', { budget: TINY_CAP });
  await settled(handle);
  const full = await scratch.load(handle.runId);
  const capSeq = full.find(
    (entry) =>
      (entry.value as { decisionType?: string } | undefined)?.decisionType ===
      'orchestrator_budget_cap',
  )?.seq;
  if (capSeq === undefined) {
    throw new Error('queue-failover: the cap decision is missing');
  }

  // The shared leasable store both workers see, on one deterministic
  // clock; the run's meta says 'running': a crashed primary.
  let nowMs = 1_000_000;
  const store = deps.makeStore(() => nowMs);
  for (const meta of await scratch.listRuns()) {
    if (meta.runId === handle.runId) {
      await store.putMeta({ ...meta, status: 'running' });
    }
  }
  for (const entry of full) {
    if (entry.seq <= capSeq) {
      await store.append(handle.runId, entry);
    }
  }
  const before = (await store.load(handle.runId)).length;

  // Worker A held the lease when it stalled; the ttl expires unrenewed
  // and worker B reclaims with a bumped epoch.
  const leaseA = await store.acquire(handle.runId, 'worker-a');
  nowMs += 61_000;
  const leaseB = await store.acquire(handle.runId, 'worker-b');
  if (leaseB.epoch <= leaseA.epoch) {
    throw new Error('queue-failover: the reclaim did not bump the fencing epoch');
  }

  const failoverWorkflow = (): ReturnType<typeof makeOrchestratorWorkflow> =>
    makeOrchestratorWorkflow('queue failover', { budget: TINY_CAP, extension: planRunner({}) });

  // The stale writer resumes anyway (a paused process never notices):
  // replay reaches the cap decision, the forced finish dispatches LIVE,
  // and its first append is rejected by the fencing epoch. Rejected and
  // invisible: the run dies loudly, the journal does not move.
  const staleEngine = engineWith(cassetteAdapter(capScript(finishTurn)), store, {
    worker: { description: 'w' },
  });
  const stale = staleEngine.resume(handle.runId, failoverWorkflow(), { lease: leaseA });
  const staleOutcome = await stale.result;
  if (staleOutcome.status === 'ok') {
    throw new Error('queue-failover: the stale writer was not fenced');
  }
  if ((await store.load(handle.runId)).length !== before) {
    throw new Error('queue-failover: stale appends became visible');
  }

  // Worker B rolls the forced finish forward under its live lease.
  const freshEngine = engineWith(cassetteAdapter(capScript(finishTurn)), store, {
    worker: { description: 'w' },
  });
  const resumed = freshEngine.resume(handle.runId, failoverWorkflow(), { lease: leaseB });
  const outcome = await resumed.result;
  if (outcome.status !== 'ok') {
    throw new Error(`queue-failover: worker B ended '${outcome.status}'`);
  }
  await store.release(leaseB);

  const entries = await store.load(handle.runId);
  const caps = entries.filter(
    (entry) =>
      (entry.value as { decisionType?: string } | undefined)?.decisionType ===
      'orchestrator_budget_cap',
  );
  if (caps.length !== 1) {
    throw new Error(`queue-failover: expected exactly one cap decision, got ${caps.length}`);
  }
  // Finalization paid once: the only agent entries past the cap
  // decision are the single finalize two-phase pair.
  const finalizeEntries = entries.filter((entry) => entry.kind === 'agent' && entry.seq > capSeq);
  if (finalizeEntries.length !== 2) {
    throw new Error(
      `queue-failover: expected one finalize pair after the cap, got ${finalizeEntries.length}`,
    );
  }
  return normalizeAdaptiveJournal(entries);
}
