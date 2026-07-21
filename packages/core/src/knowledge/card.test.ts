import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import type { ModelClaim } from '../l0/spi/knowledge.js';
import type { AgentProfile } from '../engine/ctx.js';
import {
  collectDeclaredLadders,
  filterClaimsForRun,
  KB_CARD_RENDER_BUDGET_CHARS,
  modelKnowledgeCard,
  type DeclaredLadder,
} from './card.js';

function claim(id: string, extra?: Partial<ModelClaim>): ModelClaim {
  return {
    id,
    subject: { model: 'fake:cheap' },
    taskClass: 'code-edit',
    polarity: 'strength',
    statement: 'reliable on small mechanical edits',
    class: 'human-editorial',
    status: 'active',
    evidence: [{ kind: 'journal', runId: 'r1', entryRef: 7 }],
    confidence: 'medium',
    observedAt: '2026-07-01',
    expiresAt: '9999-01-01',
    author: { kind: 'human', id: 'founder' },
    ...extra,
  };
}

const LADDER: DeclaredLadder = {
  name: 'worker',
  startTier: 1,
  rungs: [{ model: 'fake:cheap' }, { model: 'fake:mid' }, { model: 'fake:strong' }],
};

const NOW = '2026-07-10T00:00:00.000Z';

describe('the knowledge card (M10-T03; docs/05, sections 4.1 and 4.3)', () => {
  it('collects declared ladders from advertised profiles, sorted by name', () => {
    const ladders = collectDeclaredLadders({
      zeta: {
        model: {
          ladder: {
            rungs: [{ model: 'fake:a', maxTurns: 4, maxTokens: 1000 }],
            startTier: 0,
            escalateOn: ['error'],
          },
        },
      },
      alpha: { model: 'fake:solid' },
    });
    expect(ladders).toHaveLength(1);
    expect(ladders[0]?.name).toBe('zeta');
    expect(ladders[0]?.rungs).toEqual([{ model: 'fake:a' }]);
  });

  it('filters by status, expiry, ladder reachability, and floors', () => {
    const claims = [
      claim('keep'),
      claim('archived', { status: 'archived' }),
      claim('expired', { expiresAt: '2000-01-01' }),
      claim('offladder', { subject: { model: 'fake:elsewhere' } }),
      claim('floored', { subject: { model: 'fake:strong' } }),
    ];
    const filtered = filterClaimsForRun(claims, {
      ladders: [LADDER],
      floors: { byRole: { loop: { deny: ['fake:strong'] } } },
      now: NOW,
    });
    expect(filtered.map((entry) => entry.id)).toEqual(['keep']);
  });

  it('renders tier-relative editorial notes without model names, newest first', () => {
    const text = modelKnowledgeCard(
      [
        claim('older', { observedAt: '2026-06-01', statement: 'older note' }),
        claim('newer', {
          observedAt: '2026-07-01',
          subject: { model: 'fake:mid' },
          polarity: 'weakness',
          taskClass: 'judging',
          statement: 'misses subtle rubric violations',
        }),
      ],
      [LADDER],
    );
    expect(text).toContain('Verified layer: empty (no eval-measured claims).');
    expect(text).toContain('editorial note, no metrics, not confirmed by evals');
    expect(text).toContain('[worker tier 1] judging weakness');
    expect(text).toContain('[worker tier 0] code-edit strength');
    expect(text.indexOf('misses subtle rubric violations')).toBeLessThan(
      text.indexOf('older note'),
    );
    // The round-2 invariant: the orchestrator never sees model names.
    expect(text).not.toContain('fake:');
    // Deterministic: byte-identical on re-render.
    expect(
      modelKnowledgeCard(
        [
          claim('older', { observedAt: '2026-06-01', statement: 'older note' }),
          claim('newer', {
            observedAt: '2026-07-01',
            subject: { model: 'fake:mid' },
            polarity: 'weakness',
            taskClass: 'judging',
            statement: 'misses subtle rubric violations',
          }),
        ],
        [LADDER],
      ),
    ).toBe(text);
  });

  it('projects eval evidence onto concrete advertised profiles (docs/05 4.3 as amended)', () => {
    const claims = [
      claim('e-extract', {
        class: 'eval-measured',
        subject: { model: 'fake:cheap', effort: 'medium' },
        taskClass: 'extraction',
        metrics: { passRate: 1, n: 10, graderId: 'g' },
      }),
      claim('e-judge-med', {
        class: 'eval-measured',
        subject: { model: 'fake:cheap', effort: 'medium' },
        taskClass: 'judging',
        polarity: 'weakness',
        metrics: { passRate: 0.5, n: 10, graderId: 'g' },
      }),
      // The conservative fold: a strength at another effort never
      // overrides a weakness when the profile pins no effort.
      claim('e-judge-high', {
        class: 'eval-measured',
        subject: { model: 'fake:cheap', effort: 'high' },
        taskClass: 'judging',
        metrics: { passRate: 0.9, n: 10, graderId: 'g' },
      }),
      // Editorial claims never enter the section.
      claim('n-editorial', { taskClass: 'judging' }),
    ];
    const profiles: Record<string, AgentProfile> = {
      fast: { description: 'cheap worker', model: 'fake:cheap' },
      declarer: {
        description: 'ladder declarer',
        model: {
          ladder: {
            rungs: [{ model: 'fake:cheap', maxTurns: 4, maxTokens: 1000 }],
            startTier: 0,
            escalateOn: ['error' as const],
          },
        },
      },
      unmatched: { description: 'other model', model: 'fake:elsewhere' },
      modelless: { description: 'routes by engine defaults' },
    };
    const text = modelKnowledgeCard(claims, [LADDER], { profiles });
    expect(text).toContain('Profile evidence (eval-measured, folded over each profile model):');
    expect(text).toContain('- fast: strong extraction; weak judging');
    expect(text).toContain('Spawn guidance: prefer the cheapest profile marked strong');
    // Declarers, unmatched and model-less profiles contribute no lines.
    expect(text).not.toContain('- declarer:');
    expect(text).not.toContain('- unmatched:');
    expect(text).not.toContain('- modelless:');
    expect(text).not.toContain('fake:');
    // An effort-pinned profile restricts to its effort: only the high
    // judging strength matches, so the fold turns strong.
    const pinned = modelKnowledgeCard(claims, [LADDER], {
      profiles: { picky: { description: 'high only', model: 'fake:cheap', effort: 'high' } },
    });
    expect(pinned).toContain('- picky: strong judging');
    // Byte-stability: no profiles option, empty profiles, and no
    // matches all render the pre-amendment card exactly.
    const bare = modelKnowledgeCard(claims, [LADDER]);
    expect(bare).not.toContain('Profile evidence');
    expect(modelKnowledgeCard(claims, [LADDER], { profiles: {} })).toBe(bare);
    expect(
      modelKnowledgeCard(claims, [LADDER], {
        profiles: { unmatched: { description: 'other', model: 'fake:elsewhere' } },
      }),
    ).toBe(bare);
  });

  it('compiles the verified layer from eval-measured claims only, one-rung clamped', () => {
    const evalStrengthBelow = claim('e1', {
      class: 'eval-measured',
      subject: { model: 'fake:cheap' },
      metrics: { passRate: 0.94, n: 40, graderId: 'g' },
    });
    const text = modelKnowledgeCard([evalStrengthBelow], [LADDER]);
    expect(text).toContain(
      "- ladder 'worker', taskClass 'code-edit': start tier 0 (default 1, eval evidence, 1 claim)",
    );
    expect(text).not.toContain('fake:');

    // A weakness on the start rung pushes one rung up, never further.
    const weakStart = claim('e2', {
      class: 'eval-measured',
      subject: { model: 'fake:mid' },
      polarity: 'weakness',
      metrics: { passRate: 0.4, n: 40, graderId: 'g' },
    });
    const up = modelKnowledgeCard([weakStart, weakStart, weakStart], [LADDER]);
    expect(up).toContain('start tier 2 (default 1');

    // Editorial claims NEVER compile into a tier.
    const editorialOnly = modelKnowledgeCard([claim('n1')], [LADDER]);
    expect(editorialOnly).toContain('Verified layer: empty');
  });

  it('withholds oldest notes behind the render budget marker', () => {
    const many = Array.from({ length: 60 }, (_, index) =>
      claim(`c${String(index).padStart(2, '0')}`, {
        observedAt: `2026-06-${String((index % 28) + 1).padStart(2, '0')}`,
        statement: `note ${String(index)} ${'x'.repeat(120)}`,
      }),
    );
    const text = modelKnowledgeCard(many, [LADDER]);
    expect(text.length).toBeLessThanOrEqual(KB_CARD_RENDER_BUDGET_CHARS);
    expect(text).toMatch(/\(\d+ older notes withheld by the render budget\)/);
  });
});

describe('budgetChars intake and the hard bound (v1.35.0 review P2-5)', () => {
  it.each([[Number.NaN], [-1], [32.5], [Number.POSITIVE_INFINITY]])(
    'refuses budgetChars %s typed',
    (budgetChars) => {
      expect(() => modelKnowledgeCard([], [], { budgetChars })).toThrow(ConfigError);
      expect(() => modelKnowledgeCard([], [], { budgetChars })).toThrow(
        /budgetChars must be a nonnegative integer/,
      );
    },
  );

  it('the budget is a hard upper bound even below the mandatory sections', () => {
    // The old render only withheld editorial notes: a budget of 32
    // returned the full 136-char header form.
    const bounded = modelKnowledgeCard([], [], { budgetChars: 32 });
    expect(bounded.length).toBeLessThanOrEqual(32);
    expect(bounded.endsWith('...')).toBe(true);
    expect(modelKnowledgeCard([], [], { budgetChars: 0 })).toBe('');
    // A generous budget keeps the untruncated render byte identical.
    const full = modelKnowledgeCard([], []);
    expect(modelKnowledgeCard([], [], { budgetChars: 4096 })).toBe(full);
  });
});
