/**
 * DEF-4 live forms (M9-T04 re-record): the committed files hold journals produced
 * through the LIVE producers (engine runs, RunHandle.resolveExternal,
 * the offline kernel writer of the M8 machinery); these replays are the
 * end-to-end gate, seq-agnostic where the synthetic tests hardcoded
 * positions. The synthetic builders stay in def1-def4.test.ts as the
 * kernel regression.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { defineWorkflow, ResolutionFold, type JournalEntry } from '@rulvar/core';
import { replayRun } from '../replay-strict.js';
import { APPROVED_SCHEMA, DECISION_SCHEMA, PROMPTS } from './build-fixtures.js';

interface Cassette {
  id: string;
  note: string;
  entries: JournalEntry[];
}

function cassette(id: string): Cassette {
  const url = new URL(`../../../../cassettes/${id}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as Cassette;
}

function resolutionsOf(entries: readonly JournalEntry[]): JournalEntry[] {
  return entries.filter((entry) => entry.kind === 'resolution');
}

describe('DEF-4 cassettes, live forms (docs/09, section 6.4)', () => {
  it('timeout-vs-live-race: the live resolution wins; the late timer attempt is a journaled noop', async () => {
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
    const attempts = resolutionsOf(entries);
    expect(attempts).toHaveLength(2);
    expect(fold.classificationOf(attempts[0]?.seq ?? -1)).toEqual({ classification: 'applied' });
    expect(attempts[0]?.resolution?.by).toBe('external');
    expect(fold.classificationOf(attempts[1]?.seq ?? -1)).toMatchObject({
      classification: 'noop',
      reason: 'already_resolved',
    });
    expect(attempts[1]?.resolution?.by).toBe('timeout');
  });

  it('class-decision-fanout: two class closes applied with the decisionRef, the late attempt noop', async () => {
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
    expect(preview.misses).toBe(0);
    const fold = new ResolutionFold(entries);
    const attempts = resolutionsOf(entries);
    const byClass = attempts.filter((entry) => entry.resolution?.by === 'class_decision');
    expect(byClass.length).toBe(3);
    const applied = byClass.filter(
      (entry) => fold.classificationOf(entry.seq)?.classification === 'applied',
    );
    const noops = byClass.filter(
      (entry) => fold.classificationOf(entry.seq)?.classification === 'noop',
    );
    expect(applied).toHaveLength(2);
    expect(noops).toHaveLength(1);
    const decision = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'escalation.class',
    );
    if (decision === undefined) {
      throw new Error('the class decision entry is missing');
    }
    for (const entry of byClass) {
      expect(entry.resolution?.decisionRef).toBe(decision.seq);
    }
  });

  it('abandon-then-crash-then-resume: the branch replays skipped; the effects paid exactly once', async () => {
    const { entries } = cassette('abandon-then-crash-then-resume');
    const wf = defineWorkflow({ name: 'crash-resume' }, async (ctx) => {
      const branch = await ctx.agent(PROMPTS.reviseReport, { result: 'full' });
      if (branch.status !== 'skipped') {
        return 'branch unexpectedly ran';
      }
      return ctx.agent(PROMPTS.revisionEffects);
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('fresh live output');
    expect(preview.misses).toBe(0);
    expect(preview.orphaned).toEqual([]);
  });

  it('abandon-vs-resolution-race: journal order decides, both directions', () => {
    const { entries } = cassette('abandon-vs-resolution-race');
    const fold = new ResolutionFold(entries);
    const attempts = resolutionsOf(entries);
    expect(attempts.length).toBeGreaterThanOrEqual(2);
    // Direction one: the abandon covered the branch first; the late
    // resolution against the covered suspension is a noop.
    const abandoned = attempts.find(
      (entry) =>
        fold.classificationOf(entry.seq)?.classification === 'noop' &&
        (fold.classificationOf(entry.seq) as { reason?: string } | undefined)?.reason === 'target_abandoned',
    );
    expect(abandoned).toBeDefined();
    // Direction two: the resolution applied first; the late abandon
    // folded noop (the abandon overlay never covers the beta target).
    const applied = attempts.find(
      (entry) => fold.classificationOf(entry.seq)?.classification === 'applied',
    );
    if (applied === undefined) {
      throw new Error('the applied resolution is missing');
    }
    expect(fold.abandonFold.isAbandoned(applied.ref ?? -1)).toBe(false);
  });

  it('offline-invalid-then-valid: the invalid offline payload never closes; the valid one resumes', async () => {
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
    const fold = new ResolutionFold(entries);
    const attempts = resolutionsOf(entries);
    expect(attempts).toHaveLength(2);
    expect(fold.classificationOf(attempts[0]?.seq ?? -1)).toMatchObject({
      classification: 'invalid',
    });
    expect(fold.classificationOf(attempts[1]?.seq ?? -1)).toEqual({ classification: 'applied' });
  });

  it('double-abandon-idempotent: the second covering abandon folds noop; replay pays nothing', async () => {
    const { entries } = cassette('double-abandon-idempotent');
    const wf = defineWorkflow({ name: 'double-abandon' }, async (ctx) => {
      const alpha = await ctx.agent(PROMPTS.subtreeAlpha, { result: 'full' });
      return alpha.status;
    });
    const { outcome, preview } = await replayRun(wf, undefined as never, { journal: entries });
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toBe('skipped');
    expect(preview.misses).toBe(0);
    const abandons = entries.filter((entry) => entry.kind === 'abandon');
    expect(abandons).toHaveLength(2);
    const fold = new ResolutionFold(entries);
    expect(fold.classificationOf(abandons[0]?.seq ?? -1)).toEqual({ classification: 'applied' });
    expect(fold.classificationOf(abandons[1]?.seq ?? -1)).toMatchObject({
      classification: 'noop',
    });
  });
});
