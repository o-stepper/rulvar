import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineWorkflow } from '@lurker/core';
import { createTestEngine } from './test-engine.js';
import { lurkerMatchers } from './matchers.js';

expect.extend(lurkerMatchers);

describe('createTestEngine and FakeAdapter (M1-T14)', () => {
  it('runs a workflow with zero network and typed fake outputs', async () => {
    const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });
    const engine = createTestEngine({
      agents: {
        reviewer: () => ({ verdict: 'pass' }),
        '*': 'stub text',
      },
    });
    const wf = defineWorkflow({ name: 'review' }, async (ctx) => {
      const verdict = await ctx.agent('review the diff', {
        agentType: 'reviewer',
        schema: verdictSchema,
      });
      const prose = await ctx.agent('summarize');
      return { verdict: verdict.verdict, prose };
    });
    const run = engine.run(wf, undefined);
    const outcome = await run.result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toEqual({ verdict: 'pass', prose: 'stub text' });
    // Zero USD by construction.
    expect(outcome.cost.totalUsd).toBe(0);
    expect(engine.fake.calls).toHaveLength(2);
    expect(engine.fake.calls[0]?.agentType).toBe('reviewer');
  });

  it('matches by label and prompt regex with * fallback', async () => {
    const engine = createTestEngine({
      agents: {
        'deploy-check': 'label matched',
        'urgent.*fix': 'regex matched',
        '*': 'fallback',
      },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel([
        () => ctx.agent('anything', { label: 'deploy-check' }),
        () => ctx.agent('urgent hotfix please'),
        () => ctx.agent('unmatched prompt'),
      ]);
    });
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.value).toEqual(['label matched', 'regex matched', 'fallback']);
  });

  it('an unmatched call without fallback is a loud typed error', async () => {
    const engine = createTestEngine({ agents: { reviewer: 'x' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('nothing matches me'));
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('no pattern matches');
  });

  it('responder exceptions surface as terminal agent errors', async () => {
    const engine = createTestEngine({
      agents: {
        '*': () => {
          throw new Error('scripted failure');
        },
      },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => ctx.agent('x', { result: 'full' }));
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    const full = outcome.value as { status: string; error?: { kind: string } };
    expect(full.status).toBe('error');
    expect(full.error?.kind).toBe('terminal');
  });

  it('ships working toHaveCalledAgent and toStayUnderBudget matchers', async () => {
    const engine = createTestEngine({
      agents: { reviewer: () => ({ ok: true }), '*': 'text' },
    });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      await ctx.agent('a', { agentType: 'reviewer', schema: { type: 'object' } });
      await ctx.agent('b', { agentType: 'reviewer', schema: { type: 'object' } });
      await ctx.agent('c');
      return null;
    });
    const run = engine.run(wf, undefined);
    await expect(run).toHaveCalledAgent('reviewer', { times: 2 });
    await expect(run).toHaveCalledAgent('reviewer');
    await expect(run).not.toHaveCalledAgent('reviewer', { times: 3 });
    await expect(run).toStayUnderBudget({ usd: 5 });
  });

  it('re-runs the budget exhaustion scenario through the public engine', async () => {
    const engine = createTestEngine({ agents: { '*': 'x' } });
    const wf = defineWorkflow({ name: 'w' }, async (ctx) => {
      return ctx.parallel([
        () => ctx.agent('a', { estCost: 0.3 }),
        () => ctx.agent('b', { estCost: 0.3 }),
        () => ctx.agent('c', { estCost: 0.3 }),
      ]);
    });
    // FakeAdapter spend is zero, so exhaustion here comes from committed
    // reserves at concurrent admission (budget layer 1) with a tiny ceiling.
    const outcome = await engine.run(wf, undefined, { budgetUsd: 0.5 }).result;
    expect(outcome.status).toBe('exhausted');
    expect(outcome.value).toBeUndefined();
  });
});
