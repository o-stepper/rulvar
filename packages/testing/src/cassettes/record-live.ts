/**
 * Live-recorded cassettes (M3-T11): the DEF-1 live set (escalate-replay,
 * crash-between-report-and-decision, flavor-b-timeout) plus the
 * re-recorded M2 synthetic DEF-1 subset (abandon-subtree,
 * memoize-classifier), produced through the REAL runtime: engine runs
 * over FakeAdapter for everything with a live producer, kernel write
 * APIs (Replayer) for the orchestrator-subtree shape whose spawning
 * producer arrives with mode (c) in M6/M7. Timestamps and span ids are
 * normalized deterministically after recording (matching never reads
 * them); regeneration is DELIBERATE per the frozen-fixture policy
 * (docs/11).
 */
import {
  agentScope,
  createEngine,
  defineWorkflow,
  deriveContentKey,
  InMemoryStore,
  Replayer,
  type EscalationOptions,
  type EscalationReport,
  type JournalEntry,
  type JsonSchema,
  type Workflow,
} from '@lurker/core';

import { FakeAdapter, fakeToolCalls, fakeWireError, FAKE_MODEL_REF } from '../fake-adapter.js';
import { fakeAgentIdentity, PROMPTS, usageOf, type CassetteFixture } from './build-fixtures.js';

const BASE_MS = Date.parse('2026-02-01T00:00:00.000Z');
const SPAN = 'fixture-span';

function stampOf(seq: number): string {
  return new Date(BASE_MS + seq * 1000).toISOString();
}

/**
 * Wall-clock and span normalization: matching consumes neither, and
 * frozen bytes must not depend on the recording machine.
 */
function normalizeEntries(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.map((entry) => ({
    ...entry,
    spanId: SPAN,
    startedAt: stampOf(entry.seq),
    ...(entry.endedAt === undefined ? {} : { endedAt: stampOf(entry.seq) }),
    ...(entry.deadlineAt === undefined
      ? {}
      : { deadlineAt: new Date(BASE_MS + entry.seq * 1000 + 60_000).toISOString() }),
  }));
}

/** The deterministic escalate request every recording uses. */
export const RECORDED_ESCALATE_ARGS = {
  kind: 'scope_bigger',
  scopeDelta: 'the billing migration spans nine services, not one',
  revisedEstimate: { usd: 40, turns: 90 },
  blockers: ['schema ownership is unclear'],
} as const;

export const ESCALATE_REPLAY_PROMPTS = {
  work: 'migrate the billing system',
  retry: 'retry: split the billing migration by service',
} as const;

/** The workflow of the escalate-replay cassette; tests import it. */
export function escalateReplayWorkflow(): Workflow<undefined, string> {
  return defineWorkflow({ name: 'escalate-replay' }, async (ctx) => {
    try {
      await ctx.agent(ESCALATE_REPLAY_PROMPTS.work, { escalation: {} });
      return 'no escalation';
    } catch {
      // The typed carrier reached the caller; the parent's decision
      // (journaled from the hook) is a retry with a narrower scope, and
      // the respawn is this ordinary follow-up spawn.
      return await ctx.agent(ESCALATE_REPLAY_PROMPTS.retry);
    }
  });
}

export const CRASH_BETWEEN_PROMPT = 'stabilize the flaky import pipeline';

/** Phase 1 (recorded): the report lands, the process dies before any decision. */
function crashBetweenPhase1Workflow(): Workflow<undefined, string> {
  return defineWorkflow({ name: 'crash-between-report-and-decision' }, async (ctx) => {
    await ctx.agent(CRASH_BETWEEN_PROMPT, { escalation: {}, result: 'full' });
    return 'reported';
  });
}

/** The resume-side workflow (value form + hook); tests import it. */
export function crashBetweenResumeWorkflow(): Workflow<undefined, string> {
  return defineWorkflow({ name: 'crash-between-report-and-decision' }, async (ctx) => {
    try {
      await ctx.agent(CRASH_BETWEEN_PROMPT, { escalation: {} });
      return 'no escalation';
    } catch {
      return 'decided';
    }
  });
}

export const FLAVOR_B_PROMPT = 'reconcile the ledger discrepancies';

export const FLAVOR_B_OPTIONS: EscalationOptions = {
  flavor: 'B',
  deadlineMs: 25,
  defaultDecision: { kind: 'cancel', reason: 'nobody decided before the deadline' },
};

/** The workflow of the flavor-b-timeout cassette; tests import it. */
export function flavorBTimeoutWorkflow(): Workflow<undefined, string> {
  return defineWorkflow({ name: 'flavor-b-timeout' }, async (ctx) => {
    const result = await ctx.agent(FLAVOR_B_PROMPT, {
      escalation: FLAVOR_B_OPTIONS,
      result: 'full',
    });
    return result.status;
  });
}

export const CLASSIFY_SCHEMA: JsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label'],
  properties: { label: { type: 'string' } },
};

/** The workflow of the re-recorded memoize-classifier cassette. */
export function memoizeClassifierWorkflow(): Workflow<undefined, string> {
  return defineWorkflow({ name: 'memoize-classifier' }, async (ctx) => {
    await ctx.agent(PROMPTS.classify, {
      schema: CLASSIFY_SCHEMA,
      memoizeOutcome: true,
      result: 'full',
    });
    await ctx.agent(PROMPTS.summarize, { memoizeOutcome: true, result: 'full' });
    return 'classified';
  });
}

async function recordEngineRun(options: {
  workflow: Workflow<undefined, string>;
  agents: ConstructorParameters<typeof FakeAdapter>[0]['agents'];
  onEscalation?: Parameters<typeof createEngine>[0]['onEscalation'];
}): Promise<JournalEntry[]> {
  const journal = new InMemoryStore();
  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: options.agents })],
    stores: { journal },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
    },
    ...(options.onEscalation === undefined ? {} : { onEscalation: options.onEscalation }),
  });
  const outcome = await engine.run(options.workflow, undefined, { runId: 'record' }).result;
  if (outcome.status !== 'ok') {
    throw new Error(
      `cassette recording run ended '${outcome.status}': ${outcome.error?.message ?? ''}`,
    );
  }
  return normalizeEntries((await journal.load('record')));
}

/** A realistic validated report for the kernel-recorded escalated child. */
function subtreeChildReport(): EscalationReport {
  return {
    kind: 'scope_bigger',
    scopeDelta: 'the child branch needs the whole schema registry',
    revisedEstimate: { usd: 12, turns: 30 },
    blockers: [],
    proposedDecomposition: [],
    costToDate: { usd: 0, turns: 2 },
    salvage: { transcriptRef: 'record/t-child', artifacts: [] },
  };
}

/**
 * The orchestrator-subtree shape: written through the KERNEL write APIs
 * (the same calls mode (c) spawning uses from M6), since no script-mode
 * producer can spawn agents under an agent scope yet; re-recorded again
 * live in M7 with the orchestrator producers (docs/10, cassette plan).
 */
async function recordAbandonSubtree(): Promise<JournalEntry[]> {
  let tick = 0;
  const replayer = new Replayer({
    runId: 'record',
    store: new InMemoryStore(),
    now: () => BASE_MS + tick++ * 1000,
  });
  const parent = await replayer.appendRunning({
    scope: '',
    key: deriveContentKey(fakeAgentIdentity(PROMPTS.branchWork)),
    kind: 'agent',
    spanId: SPAN,
  });
  const subtree = agentScope('', parent.seq);

  const okRunning = await replayer.appendRunning({
    scope: subtree,
    key: deriveContentKey(fakeAgentIdentity(PROMPTS.childOk)),
    kind: 'agent',
    spanId: SPAN,
  });
  await replayer.appendTerminal(okRunning.seq, {
    status: 'ok',
    value: 'child ok out',
    usage: usageOf(100, 20),
    servedBy: FAKE_MODEL_REF,
  });

  const escalatedRunning = await replayer.appendRunning({
    scope: subtree,
    key: deriveContentKey(fakeAgentIdentity(PROMPTS.childEscalated)),
    kind: 'agent',
    spanId: SPAN,
  });
  await replayer.appendTerminal(escalatedRunning.seq, {
    status: 'escalated',
    escalation: subtreeChildReport(),
    usage: usageOf(200, 40),
    servedBy: FAKE_MODEL_REF,
  });

  await replayer.appendRunning({
    scope: subtree,
    key: deriveContentKey(fakeAgentIdentity(PROMPTS.childHanging)),
    kind: 'agent',
    spanId: SPAN,
  });

  // The owner's cancel decision on the escalation authorizes killing the
  // whole branch: decision strictly before the abandon (docs/03, 6.8).
  const decision = await replayer.appendSinglePhase({
    scope: '',
    key: '',
    kind: 'decision',
    status: 'ok',
    spanId: SPAN,
    value: {
      decisionType: 'escalation.decision',
      targetRef: escalatedRunning.seq,
      decision: { kind: 'cancel', reason: 'owner cancelled the branch' },
      countsAgainstLimit: true,
    },
  });
  await replayer.abandonBranch({
    target: parent.seq,
    authorizedBy: decision.seq,
    reason: 'cancel_task',
  });
  return normalizeEntries(replayer.snapshot());
}

/**
 * Records the five live cassettes. Deterministic by construction:
 * scripted FakeAdapter responders, fixed runId, normalized stamps.
 */
export async function recordLiveCassettes(): Promise<CassetteFixture[]> {
  const fixtures: CassetteFixture[] = [];

  fixtures.push({
    id: 'abandon-subtree',
    note:
      'DEF-1 (re-recorded through the kernel write APIs in M3): abandon over a subtree with ' +
      'ok, escalated, and a hanging running entry, authorized by the owner cancel decision; ' +
      'all derive skipped, zero live calls, zero spend increment.',
    entries: await recordAbandonSubtree(),
  });

  fixtures.push({
    id: 'memoize-classifier',
    note:
      'DEF-1 (re-recorded through the live runtime in M3): memoizeOutcome pins the ' +
      'task-class failure (schema mismatch) for replay; the transport-class failure ' +
      '(rate limit) reruns and is the expected strict miss.',
    entries: await recordEngineRun({
      workflow: memoizeClassifierWorkflow(),
      agents: {
        'summarize the document': () =>
          fakeWireError({
            code: 'rate-limit',
            message: '429 too many requests',
            retryable: true,
            data: { kind: 'rate-limit', retryAfterMs: 1000 },
          }),
        // The classify call and its schema re-prompts: never valid JSON.
        '*': 'this is not the requested JSON, just prose',
      },
    }).then((entries) => {
      // The transport-class failure reruns live by design: the journal
      // records the paid attempt; the strict replay misses on it.
      return entries;
    }),
  });

  fixtures.push({
    id: 'escalate-replay',
    note:
      'DEF-1 live set: the worker finishes escalated with a report, the parent decides ' +
      'retry (journaled escalation.decision), and the respawn completes; replay-strict ' +
      'resume yields zero live calls, the byte-identical report, and the decision from ' +
      'the entry.',
    entries: await recordEngineRun({
      workflow: escalateReplayWorkflow(),
      agents: {
        'migrate the billing': () => fakeToolCalls({ name: 'escalate', args: RECORDED_ESCALATE_ARGS }),
        'retry: split the billing': 'migration retried per service',
      },
      onEscalation: () => ({ kind: 'retry', amendedPrompt: 'split by service' }),
    }),
  });

  fixtures.push({
    id: 'crash-between-report-and-decision',
    note:
      'DEF-1 live set: the terminal escalated entry landed, the process died before any ' +
      'decision; the first resume replays escalated and pays for the decision live exactly ' +
      'once; the second resume replays both with zero live calls.',
    entries: await recordEngineRun({
      workflow: crashBetweenPhase1Workflow(),
      agents: {
        'stabilize the flaky': () =>
          fakeToolCalls({ name: 'escalate', args: RECORDED_ESCALATE_ARGS }),
      },
    }),
  });

  fixtures.push({
    id: 'flavor-b-timeout',
    note:
      'DEF-1 live set: the escalate tool suspends the agent with a journaled deadline; the ' +
      'timer appends the resolution by timeout applying the defaultDecision (first-wins); ' +
      'dispose and the terminal escalated entry follow as effects; resume replays the ' +
      'closing resolution and the terminal entry with no re-suspension.',
    entries: await recordEngineRun({
      workflow: flavorBTimeoutWorkflow(),
      agents: {
        'reconcile the ledger': () =>
          fakeToolCalls({ name: 'escalate', args: RECORDED_ESCALATE_ARGS }),
      },
    }),
  });

  return fixtures;
}
