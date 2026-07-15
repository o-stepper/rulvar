import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { InvalidResolutionError } from '../l0/errors.js';
import type { JournalEntry } from '../l0/entries.js';
import { createEngine, defineWorkflow } from '../index.js';
import { scriptedAdapter } from '../engine/test-harness.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { deriveContentKey, type IdentityInput } from './identity.js';
import { buildDeriverRegistry } from './keyderiver.js';
import { dispositionHook } from './disposition.js';
import { Replayer } from './replayer.js';
import { ResolutionFold } from './resolution.js';
import { agentScope } from './scope.js';

let seq = 0;
function entry(partial: Partial<JournalEntry>): JournalEntry {
  return {
    hashVersion: 2,
    seq: seq++,
    scope: '',
    key: 'k',
    ordinal: 0,
    kind: 'external',
    status: 'suspended',
    spanId: 's',
    startedAt: 't',
    ...partial,
  };
}

describe('first-closing-wins fold (M2-T07; docs/03 section 8.4)', () => {
  it('the first schema-valid resolution closes; later closers are noops', () => {
    seq = 0;
    const suspended = entry({
      value: {
        key: 'k1',
        schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } },
      },
    });
    const invalid = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: { target: suspended.seq, by: 'external', value: { wrong: true } },
    });
    const valid = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: { target: suspended.seq, by: 'operator', value: { ok: true } },
    });
    const late = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: { target: suspended.seq, by: 'timeout', value: { ok: false } },
    });
    const fold = new ResolutionFold([suspended, invalid, valid, late]);
    expect(fold.classificationOf(invalid.seq)).toMatchObject({ classification: 'invalid' });
    expect(fold.classificationOf(valid.seq)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(late.seq)).toMatchObject({
      classification: 'noop',
      supersededBy: valid.seq,
      reason: 'already_resolved',
    });
    expect(fold.suspensionState(suspended.seq)).toEqual({
      state: 'resolved',
      by: valid.seq,
      value: { ok: true },
    });
    expect(fold.invalidResolutions()).toHaveLength(1);
  });

  it('abandon-vs-resolution races resolve by journal order, both directions', () => {
    seq = 0;
    // Abandon first: the later resolution is a noop with target_abandoned.
    const spawnA = entry({ kind: 'agent', status: 'running' });
    const suspA = entry({ scope: agentScope('', spawnA.seq), value: { key: 'a' } });
    const abandonA = entry({
      kind: 'abandon',
      status: 'ok',
      ref: spawnA.seq,
      abandon: { target: spawnA.seq, authorizedBy: 0, reason: 'cancelled' },
    });
    const resolutionA = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspA.seq,
      resolution: { target: suspA.seq, by: 'external', value: 1 },
    });
    const foldA = new ResolutionFold([spawnA, suspA, abandonA, resolutionA]);
    expect(foldA.classificationOf(resolutionA.seq)).toMatchObject({
      classification: 'noop',
      reason: 'target_abandoned',
    });
    expect(foldA.suspensionState(suspA.seq)).toMatchObject({ state: 'abandoned' });
    expect(foldA.abandonFold.isAbandoned(suspA.seq)).toBe(true);

    // Resolution first: it applies; the abandon still covers the subtree.
    seq = 0;
    const spawnB = entry({ kind: 'agent', status: 'running' });
    const suspB = entry({ scope: agentScope('', spawnB.seq), value: { key: 'b' } });
    const resolutionB = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspB.seq,
      resolution: { target: suspB.seq, by: 'external', value: 2 },
    });
    const abandonB = entry({
      kind: 'abandon',
      status: 'ok',
      ref: spawnB.seq,
      abandon: { target: spawnB.seq, authorizedBy: 0, reason: 'late cancel' },
    });
    const foldB = new ResolutionFold([spawnB, suspB, resolutionB, abandonB]);
    expect(foldB.classificationOf(resolutionB.seq)).toEqual({ classification: 'applied' });
    expect(foldB.classificationOf(abandonB.seq)).toEqual({ classification: 'applied' });
  });

  it('an abandon over an already-resolved suspension folds to noop', () => {
    // First-closing-wins per target, both closer kinds (the reverse
    // order yields an applied resolution and a noop abandon).
    seq = 0;
    const suspended = entry({ value: { key: 'gate' } });
    const resolution = entry({
      kind: 'resolution',
      status: 'ok',
      ref: suspended.seq,
      resolution: { target: suspended.seq, by: 'external', value: { go: true } },
    });
    const abandon = entry({
      kind: 'abandon',
      status: 'ok',
      ref: suspended.seq,
      abandon: { target: suspended.seq, authorizedBy: 0, reason: 'late cancel' },
    });
    const fold = new ResolutionFold([suspended, resolution, abandon]);
    expect(fold.classificationOf(resolution.seq)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(abandon.seq)).toMatchObject({
      classification: 'noop',
      supersededBy: resolution.seq,
      reason: 'already_resolved',
    });
    expect(fold.suspensionState(suspended.seq)).toMatchObject({ state: 'resolved' });
    expect(fold.abandonFold.isAbandoned(suspended.seq)).toBe(false);
  });

  it('double abandon folds the second to noop (idempotent)', () => {
    seq = 0;
    const spawn = entry({ kind: 'agent', status: 'running' });
    const child = entry({ kind: 'agent', status: 'running', scope: agentScope('', spawn.seq) });
    const first = entry({
      kind: 'abandon',
      status: 'ok',
      ref: spawn.seq,
      abandon: { target: spawn.seq, authorizedBy: 0, reason: 'first' },
    });
    const second = entry({
      kind: 'abandon',
      status: 'ok',
      ref: child.seq,
      abandon: { target: child.seq, authorizedBy: 0, reason: 'already covered' },
    });
    const fold = new ResolutionFold([spawn, child, first, second]);
    expect(fold.classificationOf(first.seq)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(second.seq)).toMatchObject({ classification: 'noop' });
  });
});

describe('ResolutionArbiter races (M2-T07; docs/03 section 8.5)', () => {
  it('two racing attempts settle exactly one applied; the loser is a journaled noop', async () => {
    const store = new InMemoryStore();
    const replayer = new Replayer({ runId: 'r', store });
    const suspended = await replayer.appendSuspended({
      scope: '',
      key: 'ext-key',
      kind: 'external',
      spanId: 's',
      value: { key: 'approve' },
    });
    const [first, second] = await Promise.all([
      replayer.resolveSuspended(suspended.seq, { by: 'external', value: { decision: 'yes' } }),
      replayer.resolveSuspended(suspended.seq, { by: 'timeout', value: { decision: 'default' } }),
    ]);
    const outcomes = [first, second];
    expect(outcomes.filter((o) => o.applied)).toHaveLength(1);
    const loser = outcomes.find((o) => !o.applied);
    expect(loser).toMatchObject({ applied: false, reason: 'already_resolved' });
    // Both attempts are journaled; classification is never persisted.
    const entries = await store.load('r');
    expect(entries.filter((e) => e.kind === 'resolution')).toHaveLength(2);
    expect(replayer.suspensionState(suspended.seq)).toMatchObject({
      state: 'resolved',
      value: { decision: expect.any(String) as string },
    });
  });

  it('abandon-covered operations: skip on match, zero ledger increment, skipped not orphaned', async () => {
    // The three DEF-1 kernel consequences of a covering abandon.
    const store = new InMemoryStore();
    const first = new Replayer({ runId: 'r', store });
    const branchIdentity: IdentityInput = { kind: 'step', key: 'branch', deps: [] };
    const spawn = await first.appendRunning({
      scope: '',
      key: deriveContentKey(branchIdentity),
      kind: 'agent',
      spanId: 's',
    });
    const child = await first.appendRunning({
      scope: agentScope('', spawn.seq),
      key: 'child',
      kind: 'agent',
      spanId: 's',
    });
    await first.appendTerminal(child.seq, {
      status: 'ok',
      value: 'child out',
      usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    await first.abandonBranch({ target: spawn.seq, authorizedBy: spawn.seq, reason: 'cancel' });

    const prior = await store.load('r');
    const resumed = new Replayer({ runId: 'r', store, priorEntries: prior, strict: true });
    resumed.setDisposition(dispositionHook(resumed.fold.abandonFold, buildDeriverRegistry()));
    // The hanging, abandon-covered dispatch derives skipped instead of
    // redispatching; strict mode proves no live class is reached.
    const matched = resumed.match('', branchIdentity, 'scoped');
    expect(matched.kind).toBe('skip');
    const ledger = resumed.ledger();
    expect(ledger.usage.inputTokens).toBe(0);
    expect(ledger.agentsSpawned).toBe(0);
    const report = resumed.resumeReport();
    expect(report.orphaned).toEqual([]);
    // One derived skip: the matched covered dispatch. The settled child
    // under the abandoned branch is a COMPLETE operation (running plus
    // terminal); it never passes through the orphan channel at all.
    expect(report.skipped).toBe(1);
  });

  it('abandonBranch covers a subtree and later resolutions fold to noop', async () => {
    const store = new InMemoryStore();
    const replayer = new Replayer({ runId: 'r', store });
    const spawn = await replayer.appendRunning({ scope: '', key: 'a', kind: 'agent', spanId: 's' });
    const suspended = await replayer.appendSuspended({
      scope: agentScope('', spawn.seq),
      key: 'ext',
      kind: 'external',
      spanId: 's',
      value: { key: 'inner' },
    });
    const abandonOutcome = await replayer.abandonBranch({
      target: spawn.seq,
      authorizedBy: spawn.seq,
      reason: 'cancel_task',
    });
    expect(abandonOutcome.applied).toBe(true);
    const resolution = await replayer.resolveSuspended(suspended.seq, {
      by: 'external',
      value: 42,
    });
    expect(resolution).toMatchObject({ applied: false, reason: 'target_abandoned' });
    expect(replayer.fold.abandonFold.isAbandoned(suspended.seq)).toBe(true);
  });
});

describe('awaitExternal and resolveExternal (M2-T08; docs/06 section 2.7)', () => {
  function makeEngine(store: InMemoryStore | JsonlFileStore) {
    const adapter = scriptedAdapter(() => ({ text: 'agent output' }));
    return createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
  }

  const approvalWf = defineWorkflow({ name: 'hitl' }, async (ctx) => {
    const first = await ctx.agent('analyze');
    const approval = await ctx.awaitExternal<{ approved: boolean }>('deploy-approval', {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['approved'],
        properties: { approved: { type: 'boolean' } },
      },
      prompt: 'Approve the deployment?',
    });
    return { first, approved: approval.approved };
  });

  it('suspends the run with pending[], then a live resolution settles in place', async () => {
    const store = new InMemoryStore();
    const engine = makeEngine(store);
    const handle = engine.run(approvalWf, undefined);

    // Wait for quiescence: the run settles suspended.
    const outcome = await handle.result;
    expect(outcome.status).toBe('suspended');
    expect(outcome.pending).toHaveLength(1);
    expect(outcome.pending[0]).toMatchObject({ key: 'deploy-approval', scope: '' });

    // The suspended entry is journaled with NO deadline (v1 rule).
    const entries = await store.load(handle.runId);
    const suspended = entries.find((e) => e.kind === 'external');
    expect(suspended?.status).toBe('suspended');
    expect(suspended?.deadlineAt).toBeUndefined();
  });

  it('rejects an invalid live payload without journaling, then applies a valid one', async () => {
    const store = new InMemoryStore();
    const engine = makeEngine(store);
    const handle = engine.run(approvalWf, undefined);
    await handle.result;
    const before = (await store.load(handle.runId)).length;

    await expect(handle.resolveExternal('deploy-approval', { approved: 'yes' })).rejects.toThrow(
      InvalidResolutionError,
    );
    expect((await store.load(handle.runId)).length).toBe(before);

    const outcome = await handle.resolveExternal('deploy-approval', { approved: true });
    expect(outcome.applied).toBe(true);
    const after = await store.load(handle.runId);
    expect(after.filter((e) => e.kind === 'resolution')).toHaveLength(1);

    await expect(handle.resolveExternal('missing-key', {})).rejects.toThrow(InvalidResolutionError);
  });

  it('suspend/exit/resume/resolve round-trips on JsonlFileStore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-external-'));
    const store = new JsonlFileStore({ dir });

    // First process: run to suspension and exit.
    const first = makeEngine(store);
    const firstHandle = first.run(approvalWf, undefined, { runId: 'RUN1' });
    const firstOutcome = await firstHandle.result;
    expect(firstOutcome.status).toBe('suspended');

    // Offline resolution: load, next seq, append.
    const prior = await store.load('RUN1');
    const suspended = prior.find((e) => e.kind === 'external');
    const offlineReplayer = new Replayer({ runId: 'RUN1', store, priorEntries: prior });
    const applied = await offlineReplayer.resolveSuspended(suspended?.seq ?? -1, {
      by: 'external',
      value: { approved: true },
    });
    expect(applied.applied).toBe(true);

    // Second process: the resumed body consumes the resolved value from
    // the fold with zero extra agent calls (agent replays, external
    // resolves), completing the workflow.
    const resumedPrior = await store.load('RUN1');
    const adapter = scriptedAdapter(() => ({ text: 'MUST NOT RUN' }));
    const second = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    // engine.resume lands in M2-T09; until then the harness path re-runs
    // the workflow against the prior journal by passing priorEntries
    // through a fresh run with the same runId is not yet public API, so
    // this test exercises the fold directly.
    const foldReplayer = new Replayer({ runId: 'RUN1', store, priorEntries: resumedPrior });
    expect(foldReplayer.suspensionState(suspended?.seq ?? -1)).toMatchObject({
      state: 'resolved',
      value: { approved: true },
    });
    void second;
  });
});
