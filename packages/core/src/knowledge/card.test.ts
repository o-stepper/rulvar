import { describe, expect, it } from 'vitest';

import type { ModelClaim } from '../l0/spi/knowledge.js';
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
