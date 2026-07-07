/**
 * M2 gating cassettes, DEF-1 and DEF-4 sets (M2-T12; docs/09, sections
 * 6.1 and 6.4; docs/11, section 8). Every cassette runs against the
 * COMMITTED frozen fixture under repo cassettes/ (never the builder), so
 * a derivation drift fails here before it can silently re-key journals.
 * Synthetic-fixture rule: cassettes whose live producers land later (the
 * escalation machinery in M4, plan revision in M7) gate as hand-authored
 * journals and re-record in the producers' milestone.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  hashWorkflowBody,
  InMemoryStore,
  JournalMissError,
  Replayer,
  ResolutionFold,
  type AgentResult,
  type JournalEntry,
  type Workflow,
} from '@lurker/core';
import { FakeAdapter, FAKE_MODEL_REF } from '../fake-adapter.js';
import { replayRun } from '../replay-strict.js';
import { APPROVED_SCHEMA, DECISION_SCHEMA, GO_SCHEMA, PROMPTS } from './build-fixtures.js';

interface Cassette {
  id: string;
  note: string;
  entries: JournalEntry[];
}

function cassette(id: string): Cassette {
  const url = new URL(`../../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as Cassette;
}

/** Non-strict harness for cassettes that legitimately pay live calls. */
async function seededEngine(entries: readonly JournalEntry[], wf: Workflow<never, unknown>) {
  const store = new InMemoryStore();
  const runId = 'cassette-run';
  for (const entry of entries) {
    await store.append(runId, entry);
  }
  await store.putMeta({
    runId,
    status: 'suspended',
    updatedAt: new Date(0).toISOString(),
    workflowName: wf.name,
    workflowHash: hashWorkflowBody(wf as unknown as Workflow<unknown, unknown>),
  });
  const adapter = new FakeAdapter({ agents: { '*': 'fresh live output' } });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF } },
  });
  return { engine, adapter, store, runId };
}

describe('DEF-1 cassettes (docs/09, section 6.1)', () => {
  it('abandon-subtree: ok, escalated, and hanging running all derive skipped, zero spend', async () => {
    const { entries } = cassette('abandon-subtree');
    const wf = defineWorkflow({ name: 'abandon-subtree' }, async (ctx) => {
      const branch = (await ctx.agent(PROMPTS.branchWork, {
        result: 'full',
      }));
      return branch.status;
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('skipped');
    // The whole subtree is skipped, never orphaned, never re-paid.
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    expect(preview.skipped).toBe(4);
    // Zero spend increment: the ok and escalated children carry usage in
    // the fixture; the covered fold contributes nothing (docs/03, 13.3).
    const ledger = new Replayer({
      runId: 'ledger-probe',
      store: new InMemoryStore(),
      priorEntries: entries,
    }).ledger();
    expect(ledger.usage.inputTokens).toBe(0);
    expect(ledger.usage.outputTokens).toBe(0);
    expect(ledger.agentsSpawned).toBe(0);
  });

  it('memoize-classifier: the task-class failure replays; the transport-class failure is the exact strict miss', async () => {
    const { entries } = cassette('memoize-classifier');
    const probe: Array<AgentResult<unknown>> = [];
    const wf = defineWorkflow({ name: 'memoize-classifier' }, async (ctx) => {
      probe.push(
        (await ctx.agent(PROMPTS.classify, {
          memoizeOutcome: true,
          result: 'full',
        })),
      );
      await ctx.agent(PROMPTS.summarize, { memoizeOutcome: true });
      return 'unreachable';
    });
    await expect(replayRun(wf, undefined as never, { journal: entries })).rejects.toThrow(
      JournalMissError,
    );
    // The first rung REPLAYED its memoized schema-mismatch failure with
    // zero live calls before the second rung missed as the expected rerun.
    expect(probe).toHaveLength(1);
    expect(probe[0]?.status).toBe('error');
    expect(probe[0]?.error?.kind).toBe('schema-mismatch');
  });

  it('v1-journal-on-v2: dispositions byte-identical to the round-1 table', async () => {
    const { entries } = cassette('v1-journal-on-v2');
    const wf = defineWorkflow({ name: 'v1-dispositions' }, async (ctx) => {
      const alpha = await ctx.agent(PROMPTS.alpha);
      const beta = await ctx.agent(PROMPTS.beta, { onError: 'null' });
      const gamma = await ctx.agent(PROMPTS.gamma, { onError: 'null' });
      return { alpha, beta, gamma };
    });
    const { engine, adapter, store, runId } = await seededEngine(entries, wf as never);
    const handle = engine.resume(runId, wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    // ok replays; error and cancelled rerun live (the round-1 table; the
    // compatibility lemma keeps v2 agreeing on this domain).
    expect(outcome.value).toEqual({
      alpha: 'alpha out',
      beta: 'fresh live output',
      gamma: 'fresh live output',
    });
    expect(adapter.calls).toHaveLength(2);
    const preview = await handle.preview;
    expect(preview.hits).toBe(1);
    expect(preview.reruns).toBe(2);
    expect(preview.orphaned).toEqual([]);
    // Rerun executions journal fresh operations under the CURRENT profile.
    const grown = await store.load(runId);
    const fresh = grown.filter((entry) => entry.seq >= entries.length && entry.kind === 'agent');
    expect(fresh.length).toBeGreaterThanOrEqual(4);
    expect(fresh.every((entry) => entry.hashVersion === 2)).toBe(true);
  });
});

describe('DEF-4 cassettes (docs/09, section 6.4)', () => {
  it('timeout-vs-live-race: the live decision wins; the timeout attempt is a journaled noop', async () => {
    const { entries } = cassette('timeout-vs-live-race');
    const wf = defineWorkflow({ name: 'timeout-race' }, async (ctx) => {
      const analysis = await ctx.agent(PROMPTS.analyze);
      const decision = await ctx.awaitExternal<{ decision: string }>('escalation-report', {
        schema: DECISION_SCHEMA,
        prompt: 'Escalation decision required',
      });
      return { analysis, decision: decision.decision };
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({
      analysis: 'analysis: rollback recommended',
      decision: 'rollback',
    });
    expect(preview.misses).toBe(0);
    const fold = new ResolutionFold(entries);
    expect(fold.classificationOf(3)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(4)).toMatchObject({
      classification: 'noop',
      supersededBy: 3,
      reason: 'already_resolved',
    });
  });

  it('class-decision-fanout: two applied, one noop, decisionRef preserved, fold bit-stable', async () => {
    const { entries } = cassette('class-decision-fanout');
    const wf = defineWorkflow({ name: 'fanout' }, async (ctx) => {
      const one = await ctx.awaitExternal<{ action: string }>('report-1');
      const two = await ctx.awaitExternal<{ action: string }>('report-2');
      const three = await ctx.awaitExternal<{ action: string }>('report-3');
      return [one.action, two.action, three.action];
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual(['retry', 'retry', 'retry']);
    const fold = new ResolutionFold(entries);
    expect(fold.classificationOf(3)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(5)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(6)).toMatchObject({
      classification: 'noop',
      supersededBy: 3,
      reason: 'already_resolved',
    });
    expect(fold.classificationOf(7)).toEqual({ classification: 'applied' });
    expect(entries[5]?.resolution?.decisionRef).toBe(4);
    expect(entries[5]?.resolution?.by).toBe('class_decision');
    // The class decision FACT gains its live consumer with the M4
    // escalation machinery; until then the report lists it honestly.
    expect(preview.orphaned).toEqual([4]);
    // Fold state is identical when folded twice (bit-stable on replay).
    expect(fold.suspensionState(1)).toEqual(new ResolutionFold(entries).suspensionState(1));
  });

  it('abandon-then-crash-then-resume: subtree skipped (not orphaned), only the effects re-issue', async () => {
    const { entries } = cassette('abandon-then-crash-then-resume');
    const wf = defineWorkflow({ name: 'crash-resume' }, async (ctx) => {
      const branch = (await ctx.agent(PROMPTS.reviseReport, {
        result: 'full',
      }));
      if (branch.status !== 'skipped') {
        return 'branch unexpectedly ran';
      }
      return ctx.agent(PROMPTS.revisionEffects);
    });
    const { engine, adapter, runId } = await seededEngine(entries, wf as never);
    const handle = engine.resume(runId, wf);
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('fresh live output');
    // Exactly ONE live call: the revision effects; zero inside the subtree.
    expect(adapter.calls).toHaveLength(1);
    expect(adapter.calls[0]?.prompt).toBe(PROMPTS.revisionEffects);
    const preview = await handle.preview;
    expect(preview.skipped).toBe(3);
    expect(preview.orphaned).toEqual([]);
    expect(preview.misses).toBe(1);
  });

  it('abandon-vs-resolution-race: journal order decides, both directions', async () => {
    const { entries } = cassette('abandon-vs-resolution-race');
    const wf = defineWorkflow({ name: 'race-directions' }, async (ctx) => {
      const alpha = (await ctx.agent(PROMPTS.branchAlpha, {
        result: 'full',
      }));
      const beta = await ctx.awaitExternal<{ go: boolean }>('beta-gate', { schema: GO_SCHEMA });
      return { alphaStatus: alpha.status, go: beta.go };
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ alphaStatus: 'skipped', go: true });
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    const fold = new ResolutionFold(entries);
    // Abandon first: the late resolution is a noop with target_abandoned.
    expect(fold.classificationOf(3)).toMatchObject({
      classification: 'noop',
      reason: 'target_abandoned',
    });
    expect(fold.suspensionState(1)).toMatchObject({ state: 'abandoned' });
    // Resolution first: it applies; the late abandon is a noop.
    expect(fold.classificationOf(5)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(6)).toMatchObject({
      classification: 'noop',
      supersededBy: 5,
      reason: 'already_resolved',
    });
    expect(fold.abandonFold.isAbandoned(4)).toBe(false);
  });

  it('offline-invalid-then-valid: invalid never closes; resume consumes the valid value', async () => {
    const { entries } = cassette('offline-invalid-then-valid');
    const wf = defineWorkflow({ name: 'invalid-then-valid' }, async (ctx) => {
      const approval = await ctx.awaitExternal<{ approved: boolean }>('deploy-approval', {
        schema: APPROVED_SCHEMA,
        prompt: 'Approve the deployment?',
      });
      return approval.approved;
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe(true);
    expect(preview.misses).toBe(0);
    expect(preview.invalidResolutions).toHaveLength(1);
    expect(preview.invalidResolutions[0]?.seq).toBe(1);
    const fold = new ResolutionFold(entries);
    expect(fold.classificationOf(1)).toMatchObject({ classification: 'invalid' });
    expect(fold.classificationOf(2)).toEqual({ classification: 'applied' });
  });

  it('double-abandon-idempotent: the second abandon noops; abandon beats terminal ok; no repayment', async () => {
    const { entries } = cassette('double-abandon-idempotent');
    const wf = defineWorkflow({ name: 'double-abandon' }, async (ctx) => {
      const alpha = (await ctx.agent(PROMPTS.subtreeAlpha, {
        result: 'full',
      }));
      return alpha.status;
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('skipped');
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
    const fold = new ResolutionFold(entries);
    expect(fold.classificationOf(4)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(5)).toMatchObject({
      classification: 'noop',
      reason: 'target_abandoned',
    });
    const ledger = new Replayer({
      runId: 'ledger-probe',
      store: new InMemoryStore(),
      priorEntries: entries,
    }).ledger();
    expect(ledger.usage.inputTokens).toBe(0);
    expect(ledger.agentsSpawned).toBe(0);
  });
});
