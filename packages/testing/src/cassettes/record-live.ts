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
 * (https://docs.rulvar.com/guide/testing).
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  agentScope,
  createEngine,
  defineWorkflow,
  deriveContentKey,
  InMemoryStore,
  normalizeEntry,
  Replayer,
  type EscalationOptions,
  type EscalationReport,
  type JournalEntry,
  type JsonSchema,
  type Workflow,
} from '@rulvar/core';

import { FakeAdapter, fakeToolCalls, fakeWireError, FAKE_MODEL_REF } from '../fake-adapter.js';
import {
  APPROVED_SCHEMA,
  DECISION_SCHEMA,
  fakeAgentIdentity,
  GO_SCHEMA,
  PROMPTS,
  usageOf,
  type CassetteFixture,
} from './build-fixtures.js';

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
 * live in M7 with the orchestrator producers.
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
  // whole branch: decision strictly before the abandon.
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
/**
 * The v1 flow re-run under explicit high effort (DEF-6, M4-T08): the
 * body matches the frozen v1 journal's call sequence; the assessTone
 * call is the one genuinely new spawn and records with hashVersion 2
 * and canonical effort in identity.
 */
export function effortShiftWorkflow(): Workflow<undefined, Record<string, unknown>> {
  return defineWorkflow({ name: 'v1-flow' }, async (ctx) => {
    const draft = await ctx.agent(PROMPTS.draftSummary, { effort: 'high' });
    const saved = await ctx.step('persist-draft', () => ({
      written: true,
      path: 'drafts/summary.md',
    }));
    const stampMs = ctx.now();
    const intro1 = await ctx.agent(PROMPTS.polishIntro, { effort: 'high' });
    const intro2 = await ctx.agent(PROMPTS.polishIntro, { effort: 'high' });
    const tone = await ctx.agent(PROMPTS.assessTone, { effort: 'high' });
    const approval = await ctx.awaitExternal<{ approved: boolean }>('editor-approval', {
      schema: APPROVED_SCHEMA,
      prompt: 'Approve the draft?',
    });
    return { draft, saved, stampMs, intro1, intro2, tone, approved: approval.approved };
  });
}

/** Locates the frozen v1 journal from both src (vitest) and dist (script) layouts. */
function frozenV1JournalPath(): string {
  const candidates = [
    new URL('../../fixtures/frozen/v1-journal.jsonl', import.meta.url),
    new URL('../fixtures/frozen/v1-journal.jsonl', import.meta.url),
  ];
  for (const candidate of candidates) {
    const path = fileURLToPath(candidate);
    if (existsSync(path)) {
      return path;
    }
  }
  throw new Error('frozen v1-journal.jsonl not found next to the recorder');
}

/**
 * effort-defaults-shift (DEF-6): the frozen v1
 * prefix (recorded without effort) is closed offline the way an
 * operator would (the external resolves, the approval flow is
 * abandoned under its authority), then the SAME flow resumes LIVE under
 * a config requesting high effort with the completed effort semantics:
 * every v1 entry matches (the v1 predicate strips effort), and the one
 * new spawn records canonical effort in v2 identity.
 */
async function recordEffortDefaultsShift(): Promise<JournalEntry[]> {
  const RUN = 'RUNV1';
  const v1Entries = readFileSync(frozenV1JournalPath(), 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => normalizeEntry(JSON.parse(line) as JournalEntry));
  const journal = new InMemoryStore();
  for (const entry of v1Entries) {
    await journal.append(RUN, entry);
  }
  await journal.putMeta({
    runId: RUN,
    status: 'suspended',
    updatedAt: new Date(0).toISOString(),
    workflowName: 'v1-flow',
  });
  const offline = new Replayer({ runId: RUN, store: journal, priorEntries: v1Entries });
  const resolved = await offline.resolveSuspended(5, {
    by: 'external',
    value: { approved: true },
  });
  if (!resolved.applied) {
    throw new Error('offline resolution of the v1 external did not apply');
  }
  const abandoned = await offline.abandonBranch({
    target: 6,
    authorizedBy: resolved.seq,
    reason: 'approval flow superseded by the operator',
  });
  if (!abandoned.applied) {
    throw new Error('offline abandon of the v1 approval did not apply');
  }

  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: { '*': 'tone assessed' } })],
    stores: { journal },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const outcome = await engine.resume(RUN, effortShiftWorkflow()).result;
  if (outcome.status !== 'ok') {
    throw new Error(
      `effort-defaults-shift recording ended '${outcome.status}': ${outcome.error?.message ?? ''}`,
    );
  }
  return normalizeEntries(await journal.load(RUN));
}

/**
 * A live engine over one durable store, for multi-leg recordings with
 * offline kernel writes between the legs (the M8 server/worker shape).
 */
function liveEngine(store: InMemoryStore, agents: ConstructorParameters<typeof FakeAdapter>[0]['agents']) {
  return createEngine({
    adapters: [new FakeAdapter({ agents })],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
}

/** An offline kernel writer over the loaded priors. */
async function offlineReplayer(store: InMemoryStore, runId: string): Promise<Replayer> {
  let tick = 500;
  return new Replayer({
    runId,
    store,
    priorEntries: await store.load(runId),
    now: () => BASE_MS + tick++ * 1000,
  });
}

/** Polls the store until the external suspension is durable. */
async function waitForSuspension(
  store: InMemoryStore,
  runId: string,
  key: string,
): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    const entries = await store.load(runId);
    const found = entries.some(
      (entry) =>
        entry.status === 'suspended' &&
        (entry.value as { key?: string } | undefined)?.key === key,
    );
    if (found) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`recording: the '${key}' suspension never landed`);
}

function suspendedSeqOf(entries: readonly JournalEntry[], key: string): number {
  const suspended = entries.find(
    (entry) =>
      entry.status === 'suspended' &&
      (entry.value as { key?: string } | undefined)?.key === key,
  );
  if (suspended === undefined) {
    throw new Error(`recording: no suspended entry for external key '${key}'`);
  }
  return suspended.seq;
}

/**
 * DEF-4 timeout-vs-live-race, LIVE form: the run suspends on the
 * decision, the LIVE resolution wins through RunHandle.resolveExternal,
 * and the late timer attempt lands through the offline kernel writer as
 * the journaled noop (first-wins).
 */
async function recordTimeoutVsLiveRace(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'timeout-race' }, async (ctx) => {
    const analysis = await ctx.agent(PROMPTS.analyze);
    const decision = await ctx.awaitExternal<{ decision: string }>('escalation-report', {
      schema: DECISION_SCHEMA,
      prompt: 'Escalation decision required',
    });
    return { analysis, decision: decision.decision };
  });
  const engine = liveEngine(store, { '*': 'analysis: rollback recommended' });
  const handle = engine.run(wf, undefined, { runId: 'record' });
  await waitForSuspension(store, 'record', 'escalation-report');
  const settle = await handle.result;
  if (settle.status !== 'suspended') {
    throw new Error(`timeout-vs-live-race: expected the suspension settle, got '${settle.status}'`);
  }
  const resolved = await handle.resolveExternal('escalation-report', { decision: 'rollback' });
  if (!resolved.applied) {
    throw new Error('timeout-vs-live-race: the live resolution must win');
  }
  // The late timer fires against the already-closed suspension: the
  // attempt lands as a journaled noop whose effects never re-issue.
  const replayer = await offlineReplayer(store, 'record');
  const target = suspendedSeqOf(await store.load('record'), 'escalation-report');
  const late = await replayer.resolveSuspended(target, {
    by: 'timeout',
    value: { decision: 'abort' },
  });
  if (late.applied) {
    throw new Error('timeout-vs-live-race: the timeout attempt must land as a noop');
  }
  const outcome = await liveEngine(store, {
    '*': 'analysis: rollback recommended',
  }).resume('record', wf).result;
  if (outcome.status !== 'ok') {
    throw new Error(`timeout-vs-live-race: the resume ended '${outcome.status}'`);
  }
  return normalizeEntries(await store.load('record'));
}

/**
 * DEF-4 class-decision-fanout, LIVE form: three sequential suspensions;
 * the first closes individually (applied by external); ONE class-level
 * decision entry closes the remaining two by class_decision with the
 * decisionRef, and the late class attempt against the first lands noop
 * (the plan-side class producer has its own cassette,
 * class-storm-single-turn).
 */
async function recordClassDecisionFanout(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'fanout' }, async (ctx) => {
    const one = await ctx.awaitExternal<{ action: string }>('report-1');
    const two = await ctx.awaitExternal<{ action: string }>('report-2');
    const three = await ctx.awaitExternal<{ action: string }>('report-3');
    return [one.action, two.action, three.action];
  });
  const engine = liveEngine(store, {});
  const first = engine.run(wf, undefined, { runId: 'record' });
  await waitForSuspension(store, 'record', 'report-1');
  const settle1 = await first.result;
  if (settle1.status !== 'suspended') {
    throw new Error(`class-decision-fanout: expected the report-1 settle, got '${settle1.status}'`);
  }
  const individual = await first.resolveExternal('report-1', { action: 'retry' });
  if (!individual.applied) {
    throw new Error('class-decision-fanout: the individual close must apply');
  }
  const leg2 = await liveEngine(store, {}).resume('record', wf).result;
  if (leg2.status !== 'suspended') {
    throw new Error(`class-decision-fanout: expected the report-2 settle, got '${leg2.status}'`);
  }

  // The class-level decision closes the remaining reports offline.
  const replayer = await offlineReplayer(store, 'record');
  const decision = await replayer.appendSinglePhase({
    scope: '',
    key: '',
    kind: 'decision',
    status: 'ok',
    spanId: SPAN,
    value: {
      decisionType: 'escalation.class',
      decision: { kind: 'retry' },
      coverage: 'all pending reports of this class',
    },
  });
  const entriesNow = await store.load('record');
  const two = await replayer.resolveSuspended(suspendedSeqOf(entriesNow, 'report-2'), {
    by: 'class_decision',
    value: { action: 'retry' },
    decisionRef: decision.seq,
  });
  if (!two.applied) {
    throw new Error('class-decision-fanout: the class close of report-2 must apply');
  }
  const lateOne = await replayer.resolveSuspended(suspendedSeqOf(entriesNow, 'report-1'), {
    by: 'class_decision',
    value: { action: 'retry' },
    decisionRef: decision.seq,
  });
  if (lateOne.applied) {
    throw new Error('class-decision-fanout: the class attempt on report-1 must land noop');
  }

  const engine2 = liveEngine(store, {});
  const second = engine2.resume('record', wf);
  const secondSettle = await second.result;
  if (secondSettle.status !== 'suspended') {
    throw new Error(`class-decision-fanout: expected report-3 to suspend, got '${secondSettle.status}'`);
  }
  const replayer2 = await offlineReplayer(store, 'record');
  const three = await replayer2.resolveSuspended(
    suspendedSeqOf(await store.load('record'), 'report-3'),
    { by: 'class_decision', value: { action: 'retry' }, decisionRef: decision.seq },
  );
  if (!three.applied) {
    throw new Error('class-decision-fanout: the class close of report-3 must apply');
  }
  const engine3 = liveEngine(store, {});
  const final = await engine3.resume('record', wf).result;
  if (final.status !== 'ok') {
    throw new Error(`class-decision-fanout: the final resume ended '${final.status}'`);
  }
  return normalizeEntries(await store.load('record'));
}

/**
 * DEF-4 abandon-then-crash-then-resume, LIVE form: the paid branch is
 * abandoned offline (decision plus abandon through the kernel writer),
 * the crash cut drops the effects, and the resume derives skipped for
 * the branch while paying the revision effects exactly once.
 */
async function recordAbandonThenCrashThenResume(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'crash-resume' }, async (ctx) => {
    const branch = await ctx.agent(PROMPTS.reviseReport, { result: 'full' });
    if (branch.status !== 'skipped') {
      return 'branch unexpectedly ran';
    }
    return ctx.agent(PROMPTS.revisionEffects);
  });
  // Life 1 pays for the branch on a scratch store; the CRASH is the
  // prefix cut strictly after the branch terminal (a lost process and a
  // truncated journal look identical).
  const scratch = new InMemoryStore();
  const life1 = liveEngine(scratch, { '*': 'branch out' });
  const outcome1 = await life1.run(wf, undefined, { runId: 'record' }).result;
  if (outcome1.status !== 'ok') {
    throw new Error(`abandon-then-crash: life 1 ended '${outcome1.status}'`);
  }
  const scratchEntries = await scratch.load('record');
  const branchTerminal = scratchEntries.find(
    (entry) => entry.kind === 'agent' && entry.ref !== undefined,
  );
  if (branchTerminal === undefined) {
    throw new Error('abandon-then-crash: the branch terminal is missing');
  }
  for (const meta of await scratch.listRuns()) {
    if (meta.runId === 'record') {
      await store.putMeta({ ...meta, status: 'suspended' });
    }
  }
  for (const entry of scratchEntries) {
    if (entry.seq <= branchTerminal.seq) {
      await store.append('record', entry);
    }
  }
  // The owner abandons the branch offline (authorizedBy points at the
  // covering root, the synthetic precedent); the crash means no effects
  // follow.
  const replayer = await offlineReplayer(store, 'record');
  const branchRoot = (await store.load('record')).find(
    (entry) => entry.kind === 'agent' && entry.ref === undefined,
  );
  if (branchRoot === undefined) {
    throw new Error('abandon-then-crash: the branch root is missing');
  }
  const severed = await replayer.abandonBranch({
    target: branchRoot.seq,
    authorizedBy: branchRoot.seq,
    reason: 'plan revision',
  });
  if (!severed.applied) {
    throw new Error('abandon-then-crash: the abandon must apply');
  }
  // The resume: the branch replays skipped; the effects pay live once.
  const life2 = liveEngine(store, { '*': 'fresh live output' });
  const outcome2 = await life2.resume('record', wf).result;
  if (outcome2.status !== 'ok' || outcome2.value !== 'fresh live output') {
    throw new Error(
      `abandon-then-crash: the resume must pay the effects once, got '${outcome2.status}'`,
    );
  }
  return normalizeEntries(await store.load('record'));
}

/**
 * DEF-4 abandon-vs-resolution-race, LIVE form: both orders through the
 * kernel writer over one journal: an abandon covering a suspension makes
 * the late resolution a noop (target_abandoned); the reverse order
 * applies the resolution and the late abandon folds noop.
 */
async function recordAbandonVsResolutionRace(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'race-directions' }, async (ctx) => {
    const alpha = await ctx.agent(PROMPTS.branchAlpha, { result: 'full' });
    const beta = await ctx.awaitExternal<{ go: boolean }>('beta-gate', {
      schema: GO_SCHEMA,
    });
    return { alphaStatus: alpha.status, go: beta.go };
  });
  // Life 1: alpha pays and completes; the run suspends on beta.
  const life1 = liveEngine(store, { '*': 'alpha branch out' });
  const settle1 = await life1.run(wf, undefined, { runId: 'record' }).result;
  if (settle1.status !== 'suspended') {
    throw new Error(`abandon-vs-resolution: expected the beta suspension, got '${settle1.status}'`);
  }
  const replayer = await offlineReplayer(store, 'record');
  const loaded = await store.load('record');
  const alphaRoot = loaded.find((entry) => entry.kind === 'agent' && entry.ref === undefined);
  if (alphaRoot === undefined) {
    throw new Error('abandon-vs-resolution: the alpha root is missing');
  }
  // Direction one: a dangling inner approval sits under alpha's child
  // scope; the abandon covers alpha FIRST; the late resolution against
  // the covered suspension lands noop target_abandoned.
  const innerApproval = await replayer.appendSuspended({
    scope: agentScope('', alphaRoot.seq),
    key: '',
    kind: 'approval',
    spanId: SPAN,
    value: { toolName: 'deploy', input: { env: 'prod' } },
  });
  const severed = await replayer.abandonBranch({
    target: alphaRoot.seq,
    authorizedBy: alphaRoot.seq,
    reason: 'abandon first',
  });
  if (!severed.applied) {
    throw new Error('abandon-vs-resolution: the covering abandon must apply');
  }
  const lateInner = await replayer.resolveSuspended(innerApproval.seq, {
    by: 'external',
    value: { approved: true },
  });
  if (lateInner.applied) {
    throw new Error('abandon-vs-resolution: the covered resolution must land noop');
  }
  // Direction two: the beta resolution applies FIRST; the late covering
  // abandon over the beta suspension folds noop.
  const betaSeq = suspendedSeqOf(loaded, 'beta-gate');
  const applied = await replayer.resolveSuspended(betaSeq, {
    by: 'external',
    value: { go: true },
  });
  if (!applied.applied) {
    throw new Error('abandon-vs-resolution: the beta resolution must apply');
  }
  const lateAbandon = await replayer.abandonBranch({
    target: betaSeq,
    authorizedBy: alphaRoot.seq,
    reason: 'abandon second',
  });
  if (lateAbandon.applied) {
    throw new Error('abandon-vs-resolution: the late abandon must fold noop');
  }
  return normalizeEntries(await store.load('record'));
}

/**
 * DEF-4 offline-invalid-then-valid, LIVE form (the M8 server machinery
 * end to end): the run suspends on a schema-validated external; the
 * offline writer appends an INVALID then a VALID resolution; the resume
 * consumes the valid value with zero live calls inside the suspension.
 */
async function recordOfflineInvalidThenValid(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'invalid-then-valid' }, async (ctx) => {
    const approval = await ctx.awaitExternal<{ approved: boolean }>('deploy-approval', {
      schema: APPROVED_SCHEMA,
      prompt: 'Approve the deployment?',
    });
    return approval.approved;
  });
  const life1 = liveEngine(store, {});
  const settle1 = await life1.run(wf, undefined, { runId: 'record' }).result;
  if (settle1.status !== 'suspended') {
    throw new Error(`offline-invalid-then-valid: expected suspended, got '${settle1.status}'`);
  }
  const replayer = await offlineReplayer(store, 'record');
  const target = suspendedSeqOf(await store.load('record'), 'deploy-approval');
  const invalid = await replayer.resolveSuspended(target, {
    by: 'external',
    value: { approved: 'yes-ish' },
  });
  if (invalid.applied) {
    throw new Error('offline-invalid-then-valid: the invalid payload must not close');
  }
  const valid = await replayer.resolveSuspended(target, {
    by: 'external',
    value: { approved: true },
  });
  if (!valid.applied) {
    throw new Error('offline-invalid-then-valid: the valid payload must apply');
  }
  const life2 = liveEngine(store, {});
  const outcome = await life2.resume('record', wf).result;
  if (outcome.status !== 'ok' || outcome.value !== true) {
    throw new Error(`offline-invalid-then-valid: the resume ended '${outcome.status}'`);
  }
  return normalizeEntries(await store.load('record'));
}

/**
 * DEF-4 double-abandon-idempotent, LIVE form: two covering abandons over
 * overlapping targets through the kernel writer; the second folds noop,
 * the terminal ok inside the coverage derives skipped, and the ledger
 * pays nothing on replay.
 */
async function recordDoubleAbandonIdempotent(): Promise<JournalEntry[]> {
  const store = new InMemoryStore();
  const wf = defineWorkflow({ name: 'double-abandon' }, async (ctx) => {
    const alpha = await ctx.agent(PROMPTS.subtreeAlpha, { result: 'full' });
    return alpha.status;
  });
  const life1 = liveEngine(store, { '*': 'alpha done' });
  const settle1 = await life1.run(wf, undefined, { runId: 'record' }).result;
  if (settle1.status !== 'ok') {
    throw new Error(`double-abandon: life 1 ended '${settle1.status}'`);
  }
  const replayer = await offlineReplayer(store, 'record');
  const root = (await store.load('record')).find(
    (entry) => entry.kind === 'agent' && entry.ref === undefined,
  );
  if (root === undefined) {
    throw new Error('double-abandon: the alpha root is missing');
  }
  const first = await replayer.abandonBranch({
    target: root.seq,
    authorizedBy: root.seq,
    reason: 'first cancel',
  });
  if (!first.applied) {
    throw new Error('double-abandon: the first abandon must apply');
  }
  const second = await replayer.abandonBranch({
    target: root.seq,
    authorizedBy: root.seq,
    reason: 'second cancel overlaps',
  });
  if (second.applied) {
    throw new Error('double-abandon: the second abandon must fold noop');
  }
  return normalizeEntries(await store.load('record'));
}

/** @internal */
export async function recordLiveCassettes(): Promise<CassetteFixture[]> {
  const fixtures: CassetteFixture[] = [];

  fixtures.push({
    id: 'effort-defaults-shift',
    note:
      'DEF-6 (recorded through the live runtime in M4-T08): the frozen v1 prefix recorded ' +
      'without effort, closed offline, then resumed live under explicit high effort with ' +
      'the completed effort semantics; every v1 entry matches (the v1 predicate strips ' +
      'effort) and the one new spawn carries canonical effort in v2 identity.',
    entries: await recordEffortDefaultsShift(),
  });

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
    id: 'timeout-vs-live-race',
    note:
      'DEF-4 (re-recorded through the live producers in M9): the live resolution wins ' +
      'through RunHandle.resolveExternal; the late timer attempt lands through the offline ' +
      'kernel writer as the journaled noop whose effects never re-issue (docs/03, 8.6).',
    entries: await recordTimeoutVsLiveRace(),
  });

  fixtures.push({
    id: 'class-decision-fanout',
    note:
      'DEF-4 (re-recorded through the live producers in M9): report-1 closes individually; ' +
      'ONE class-level decision closes the remaining reports by class_decision with the ' +
      'decisionRef; the late class attempt on report-1 lands noop; the plan-side class ' +
      'producer has its own cassette (class-storm-single-turn).',
    entries: await recordClassDecisionFanout(),
  });

  fixtures.push({
    id: 'abandon-then-crash-then-resume',
    note:
      'DEF-4 (re-recorded through the live producers in M9): the paid branch is abandoned ' +
      'through the offline kernel writer (decision plus abandon), the crash cut drops the ' +
      'effects, and the resume derives skipped while paying the effects exactly once.',
    entries: await recordAbandonThenCrashThenResume(),
  });

  fixtures.push({
    id: 'abandon-vs-resolution-race',
    note:
      'DEF-4 (re-recorded through the live producers in M9): both orders over one journal; ' +
      'an abandon covering a suspension makes the late resolution a noop target_abandoned; ' +
      'the reverse order applies the resolution and the late abandon folds noop.',
    entries: await recordAbandonVsResolutionRace(),
  });

  fixtures.push({
    id: 'offline-invalid-then-valid',
    note:
      'DEF-4 (re-recorded through the live producers in M9, the M8 offline machinery end to ' +
      'end): the offline writer appends an INVALID then a VALID resolution against the ' +
      'schema-validated suspension; the resume consumes the valid value.',
    entries: await recordOfflineInvalidThenValid(),
  });

  fixtures.push({
    id: 'double-abandon-idempotent',
    note:
      'DEF-4 (re-recorded through the live producers in M9): two covering abandons over one ' +
      'target; the second folds noop, the terminal ok inside the coverage derives skipped, ' +
      'and replay pays nothing.',
    entries: await recordDoubleAbandonIdempotent(),
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
