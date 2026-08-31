/**
 * The examples corpus as integration tests (M5-T09 acceptance): every
 * quality-pattern recipe runs through the full engine
 * on FakeAdapter with zero live calls. Each example doubles as a
 * runnable reference and, later, as planner API-card teaching material.
 */
import { describe, expect, it } from 'vitest';

import { createTestEngine, type FakeCall } from '@rulvar/testing';

import { adversarialPanel } from './adversarial-panel.js';
import { judgePanel } from './judge-panel.js';
import { loopUntilDry } from './loop-until-dry.js';
import { completenessCritic } from './completeness-critic.js';
import { verifierLane } from './verifier-lane.js';

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

describe('verifier lane (recipe)', () => {
  it('the strongest claims meet a refuting verifier before the synthesis', async () => {
    // The correctness specialist lists its LOW claim first: the pick
    // is by severity, not by listing order, so the high claim is the
    // one that meets the verifier and the typo never does.
    const reports: Record<string, unknown> = {
      'specialist-correctness': {
        claims: [
          { claim: 'a comment typo', severity: 'low', evidence: 'src/budget.ts:12' },
          {
            claim: 'the release bracket leaks a reserve',
            severity: 'high',
            evidence: 'src/budget.ts:2900',
          },
        ],
      },
      'specialist-security': {
        claims: [
          {
            claim: 'the token rides the journal in clear text',
            severity: 'high',
            evidence: 'src/journal.ts:88',
          },
        ],
      },
      'specialist-operations': {
        claims: [
          { claim: 'the lock has no timeout', severity: 'medium', evidence: 'src/lock.ts:41' },
        ],
      },
    };
    const verdicts: Record<string, unknown> = {
      'verify-correctness': { verdict: 'confirmed', reason: 'reproduced against the source' },
      'verify-security': {
        verdict: 'refuted',
        reason: 'the journal stores a redacted hash, src/journal.ts:90',
      },
      'verify-operations': { verdict: 'confirmed', reason: 'the acquire call sets no timeout' },
    };
    let synthesisPrompt = '';
    const engine = createTestEngine({
      agents: {
        '*': (call: FakeCall) => {
          const label = call.label ?? '';
          if (label.startsWith('specialist-')) {
            return JSON.stringify(reports[label]);
          }
          if (label.startsWith('verify-')) {
            return JSON.stringify(verdicts[label]);
          }
          synthesisPrompt = call.prompt;
          return 'the verified report';
        },
      },
    });
    const outcome = await engine.run(verifierLane, { task: 'review the engine' }).result;
    expect(outcome.status).toBe('ok');
    // One strongest claim per lane met the verifier; the refuted one
    // is dropped from the confirmed set, with its reason kept.
    expect(outcome.value?.confirmed.map((entry) => entry.lane).sort()).toEqual([
      'correctness',
      'operations',
    ]);
    expect(outcome.value?.confirmed.map((entry) => entry.severity)).toContain('high');
    expect(outcome.value?.refuted).toHaveLength(1);
    expect(outcome.value?.refuted[0]?.claim).toContain('clear text');
    expect(outcome.value?.synthesis).toBe('the verified report');
    // The synthesis prompt builds on the survivors and NAMES the
    // refutation instead of silently thinning the report.
    expect(synthesisPrompt).toContain('the release bracket leaks a reserve');
    expect(synthesisPrompt).toContain('REFUTED');
    expect(synthesisPrompt).toContain('redacted hash');
    expect(synthesisPrompt).not.toContain('a comment typo');
    expect(outcome.cost.totalUsd).toBe(0);
  });
});
