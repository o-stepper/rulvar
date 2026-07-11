/**
 * The examples corpus as integration tests (M5-T09 acceptance; docs/11,
 * section 11): every quality-pattern recipe runs through the full engine
 * on FakeAdapter with zero live calls. Each example doubles as a
 * runnable reference and, later, as planner API-card teaching material.
 */
import { describe, expect, it } from 'vitest';

import { createTestEngine, type FakeCall } from '@rulvar/testing';

import { adversarialPanel } from './adversarial-panel.js';
import { judgePanel } from './judge-panel.js';
import { loopUntilDry } from './loop-until-dry.js';
import { completenessCritic } from './completeness-critic.js';

describe('adversarial panel (recipe)', () => {
  it('survives when a majority fail to refute; falls when a majority refute', async () => {
    const refuteIf = (predicate: (label: string) => boolean) => (call: FakeCall) =>
      JSON.stringify({ refuted: predicate(call.label ?? ''), reason: 'test' });

    // One of three skeptics refutes: the claim survives (2 of 3 clear).
    const survives = createTestEngine({
      agents: { '*': refuteIf((label) => label === 'skeptic-1') },
    });
    const kept = await survives.run(adversarialPanel, { claim: 'the sky is blue' }).result;
    expect(kept.status).toBe('ok');
    expect(kept.value?.survives).toBe(true);
    expect(kept.value?.refutedCount).toBe(1);
    expect(kept.cost.totalUsd).toBe(0);

    // Two of three refute: the claim falls.
    const falls = createTestEngine({
      agents: { '*': refuteIf((label) => label !== 'skeptic-3') },
    });
    const dropped = await falls.run(adversarialPanel, { claim: 'the moon is cheese' }).result;
    expect(dropped.value?.survives).toBe(false);
    expect(dropped.value?.refutedCount).toBe(2);
  });
});

describe('judge panel (recipe)', () => {
  it('picks the highest-scoring attempt across angles', async () => {
    const scores: Record<string, number> = {
      'judge-mvp-first': 4,
      'judge-risk-first': 9,
      'judge-user-first': 6,
    };
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => {
          const label = call.label ?? '';
          if (label.startsWith('judge-')) {
            return JSON.stringify({ score: scores[label] ?? 0, rationale: 'test' });
          }
          return `attempt for ${label}`;
        },
      },
    });
    const outcome = await engine.run(judgePanel, { task: 'ship the feature' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value?.winner.angle).toBe('risk-first');
    expect(outcome.value?.winner.score).toBe(9);
    expect(outcome.value?.ranking.map((r) => r.angle)).toEqual([
      'risk-first',
      'user-first',
      'mvp-first',
    ]);
  });
});

describe('loop-until-dry (recipe)', () => {
  it('keeps finding until consecutive dry rounds, then stops', async () => {
    // Rounds 1-2 surface items; rounds 3-4 are dry; the 2-dry default
    // stops the loop at round 4 without hitting maxRounds.
    const byRound: Record<string, string[]> = {
      'finder-round-1': ['a', 'b'],
      'finder-round-2': ['b', 'c'],
      'finder-round-3': [],
      'finder-round-4': [],
    };
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => JSON.stringify({ items: byRound[call.label ?? ''] ?? [] }),
      },
    });
    const outcome = await engine.run(loopUntilDry, { target: 'edge cases' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value?.found.sort()).toEqual(['a', 'b', 'c']);
    expect(outcome.value?.rounds).toBe(4);
  });

  it('terminates at maxRounds even if the model never runs dry', async () => {
    let counter = 0;
    const engine = createTestEngine({
      agents: {
        '*': () => {
          counter += 1;
          return JSON.stringify({ items: [`item-${counter}`] });
        },
      },
    });
    const outcome = await engine.run(loopUntilDry, {
      target: 'bugs',
      maxRounds: 3,
    }).result;
    expect(outcome.value?.rounds).toBe(3);
    expect(outcome.value?.found).toHaveLength(3);
  });
});

describe('completeness critic (recipe)', () => {
  it('revises until the critic reports complete', async () => {
    const critiques: Record<string, { complete: boolean; gaps: string[] }> = {
      'critic-1': { complete: false, gaps: ['missing the risks section'] },
      'critic-2': { complete: true, gaps: [] },
    };
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => {
          const label = call.label ?? '';
          if (label.startsWith('critic-')) {
            return JSON.stringify(critiques[label] ?? { complete: true, gaps: [] });
          }
          return label.startsWith('revise-') ? 'revised draft' : 'first draft';
        },
      },
    });
    const outcome = await engine.run(completenessCritic, { brief: 'write the RFC' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value?.revisions).toBe(1);
    expect(outcome.value?.draft).toBe('revised draft');
    expect(outcome.value?.outstandingGaps).toEqual([]);
    // Phase attribution is real: draft, critique, revise buckets exist.
    expect(Object.keys(outcome.cost.byPhase).sort()).toEqual(['critique', 'draft', 'revise']);
  });

  it('stops at maxRevisions when gaps persist', async () => {
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => {
          const label = call.label ?? '';
          if (label.startsWith('critic-')) {
            return JSON.stringify({ complete: false, gaps: ['still incomplete'] });
          }
          return 'a draft';
        },
      },
    });
    const outcome = await engine.run(completenessCritic, {
      brief: 'endless',
      maxRevisions: 2,
    }).result;
    expect(outcome.value?.revisions).toBe(2);
    expect(outcome.value?.outstandingGaps).toEqual(['still incomplete']);
  });
});
