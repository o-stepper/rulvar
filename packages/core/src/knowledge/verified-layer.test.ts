/**
 * The verified-layer compiler (M11-T06; docs/05, sections "Read path"
 * and "Composition with the model layer"): the one-rung clamp as a
 * PROPERTY over random snapshots, editorial exclusion, and
 * determinism. The generator is a seeded LCG: reproducible, no wall
 * clock, no Math.random.
 */
import { describe, expect, it } from 'vitest';

import type { ModelClaim, ModelRef } from '../index.js';
import { compileVerifiedLayer, type DeclaredLadder } from './card.js';

/** Deterministic LCG (Numerical Recipes constants). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const MODELS: ModelRef[] = ['fake:a', 'fake:b', 'fake:c', 'fake:d', 'fake:e'];
const TASK_CLASSES = ['code-edit', 'investigation', 'judging'];

function randomLadder(rand: () => number, name: string): DeclaredLadder {
  const size = 1 + Math.floor(rand() * 4);
  const rungs = Array.from({ length: size }, (_, index) => ({
    model: MODELS[(index + Math.floor(rand() * MODELS.length)) % MODELS.length],
  }));
  return { name, startTier: Math.floor(rand() * size), rungs };
}

function randomClaim(rand: () => number, index: number): ModelClaim {
  const evalClass = rand() < 0.6;
  return {
    id: `c${String(index)}`,
    subject: { model: MODELS[Math.floor(rand() * MODELS.length)] },
    taskClass: TASK_CLASSES[Math.floor(rand() * TASK_CLASSES.length)],
    polarity: rand() < 0.5 ? 'strength' : 'weakness',
    statement: 'generated',
    class: evalClass ? 'eval-measured' : 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'eval', reportId: 'r', caseIds: ['x'] }],
    ...(evalClass ? { metrics: { passRate: rand(), n: 24, graderId: 'g' } } : {}),
    confidence: 'medium',
    observedAt: '2026-07-10',
    expiresAt: '9999-01-01',
    author: evalClass
      ? { kind: 'eval-pipeline' as const, id: 'ci' }
      : { kind: 'human' as const, id: 'f' },
  };
}

describe('the verified-layer compiler (M11-T06)', () => {
  it('property: no recommendation ever exceeds one rung of displacement', () => {
    const rand = lcg(0x5eed);
    for (let round = 0; round < 300; round += 1) {
      const ladders = Array.from({ length: 1 + Math.floor(rand() * 3) }, (_, index) =>
        randomLadder(rand, `ladder${String(index)}`),
      );
      const claims = Array.from({ length: Math.floor(rand() * 24) }, (_, index) =>
        randomClaim(rand, index),
      );
      const rows = compileVerifiedLayer(claims, ladders);
      for (const row of rows) {
        const ladder = ladders.find((entry) => entry.name === row.ladder);
        expect(ladder).toBeDefined();
        const size = (ladder as DeclaredLadder).rungs.length;
        // The clamp: exactly one rung of displacement, inside the ladder.
        expect(Math.abs(row.recommendedTier - row.defaultTier)).toBe(1);
        expect(row.recommendedTier).toBeGreaterThanOrEqual(0);
        expect(row.recommendedTier).toBeLessThan(size);
        expect(row.votes).toBeGreaterThan(0);
      }
      // Determinism: byte-identical on recompilation.
      expect(compileVerifiedLayer(claims, ladders)).toEqual(rows);
    }
  });

  it('property: editorial claims never compile', () => {
    const rand = lcg(0xbeef);
    for (let round = 0; round < 100; round += 1) {
      const ladders = [randomLadder(rand, 'only')];
      const editorialOnly = Array.from({ length: Math.floor(rand() * 16) }, (_, index) => ({
        ...randomClaim(rand, index),
        class: 'human-editorial' as const,
        metrics: undefined,
        author: { kind: 'human' as const, id: 'f' },
      }));
      expect(compileVerifiedLayer(editorialOnly, ladders)).toEqual([]);
    }
  });

  it('ties hold the default and compile nothing', () => {
    const ladder: DeclaredLadder = {
      name: 'worker',
      startTier: 1,
      rungs: [{ model: 'fake:a' }, { model: 'fake:b' }, { model: 'fake:c' }],
    };
    const strengthBelow: ModelClaim = {
      ...randomClaim(lcg(1), 0),
      subject: { model: 'fake:a' },
      taskClass: 'code-edit',
      polarity: 'strength',
      class: 'eval-measured',
      metrics: { passRate: 0.95, n: 24, graderId: 'g' },
    };
    const weaknessAtStart: ModelClaim = {
      ...strengthBelow,
      id: 'w',
      subject: { model: 'fake:b' },
      polarity: 'weakness',
      metrics: { passRate: 0.3, n: 24, graderId: 'g' },
    };
    // One vote down plus one vote up nets zero: no row.
    expect(compileVerifiedLayer([strengthBelow, weaknessAtStart], [ladder])).toEqual([]);
    // The single down vote alone shifts exactly one rung.
    const down = compileVerifiedLayer([strengthBelow], [ladder]);
    expect(down).toEqual([
      {
        ladder: 'worker',
        taskClass: 'code-edit',
        defaultTier: 1,
        recommendedTier: 0,
        votes: 1,
      },
    ]);
  });
});
