// The adversarial claim corpus (RV1704): every shipped case must hold
// its mechanical precondition, so a change that stops forming the
// pair, the trigger, or the grade for any named failure class fails
// here by case id, not in the next paid benchmark.
import { describe, expect, it } from 'vitest';

import { CLAIM_CORPUS, runClaimCorpus } from './index.js';

describe('the adversarial claim corpus (RV1704)', () => {
  it('covers every named failure class exactly once', () => {
    const classes = CLAIM_CORPUS.map((corpusCase) => corpusCase.class).sort();
    expect(classes).toEqual([
      'bound-conflation',
      'bounded-coverage',
      'cost-basis',
      'derived-premise',
      'inverted-default',
      'live-fact',
      'modality-overclaim',
      'negation',
      'numeric-range',
      'package-identity',
      'scope-ambiguity',
      'stale-doctrine-echo',
    ]);
  });

  it('every shipped case passes its mechanical expectations', () => {
    const verdicts = runClaimCorpus();
    const failed = verdicts.filter((verdict) => !verdict.pass);
    expect(failed.map((verdict) => `${verdict.id}: ${verdict.failures.join('; ')}`)).toEqual([]);
  });

  it('the formed pairs carry both polarities for the judge handoff', () => {
    const verdicts = runClaimCorpus();
    const inverted = verdicts.find((verdict) => verdict.id === 'inverted-default-repair-on-load');
    expect(inverted?.pairs[0]?.draftExcerpt).toContain('disabled by default');
    expect(inverted?.pairs[0]?.pool[0]?.excerpt).toContain('BY DEFAULT');
    const liveFact = verdicts.find((verdict) => verdict.id === 'live-fact-models-not-run');
    expect(liveFact?.runFactPairs[0]?.draftExcerpt).toContain('real models were not run');
    expect(liveFact?.runFactPairs[0]?.pool[0]?.excerpt).toContain('125 wire requests');
  });

  it('the bounded case grades partial through the same helper the envelope uses', () => {
    const bounded = runClaimCorpus().find(
      (verdict) => verdict.id === 'bounded-coverage-grades-partial',
    );
    expect(bounded?.coverage).toBe('partial');
    expect(bounded?.pairs).toHaveLength(1);
  });

  it('the third-experiment classes form judge-gradeable pairs with both polarities (RV3804)', () => {
    const verdicts = runClaimCorpus();
    const conflation = verdicts.find(
      (verdict) => verdict.id === 'bound-conflation-mcp-caps-guards',
    );
    expect(conflation?.pairs[0]?.draftExcerpt).toContain('bounded unconditionally');
    expect(conflation?.pairs[0]?.pool[0]?.excerpt).toContain('OPT-IN');
    expect(conflation?.coverage).toBe('full');
    const derived = verdicts.find((verdict) => verdict.id === 'derived-premise-slot-arithmetic');
    expect(derived?.runFactPairs[0]?.draftExcerpt).toContain('2000 slots');
    expect(derived?.runFactPairs[0]?.pool[0]?.excerpt).toContain('1333 slots');
    const basis = verdicts.find((verdict) => verdict.id === 'cost-basis-local-estimate-as-bill');
    expect(basis?.runFactPairs[0]?.draftExcerpt).toContain('provider bill');
    expect(basis?.runFactPairs[0]?.pool[0]?.excerpt).toContain('locally-estimated');
  });

  it('the stale-doctrine echo pairs the doc claim against the diverging source fact (RV3909)', () => {
    // The fourth comparison experiment's decisive miss: the answer
    // echoed the stale guide ("immutable after start ... resume
    // accepts no budget parameter") and the pool never held the source
    // side, so no judge could flag it. With both sides in the pool the
    // pair forms on the shared source anchor and the judge handoff
    // carries the divergence in both polarities.
    const echo = runClaimCorpus().find(
      (verdict) => verdict.id === 'stale-doctrine-echo-budget-override',
    );
    expect(echo?.pass).toBe(true);
    expect(echo?.pairs[0]?.draftExcerpt).toContain('immutable after start');
    expect(echo?.pairs[0]?.pool[0]?.excerpt).toContain('ResumeOptions.run');
    expect(echo?.pairs[0]?.pool[0]?.excerpt).toContain('WITHIN a segment');
    expect(echo?.coverage).toBe('full');
  });

  it('the honest formulation of the doctrine still pairs, for the judge to exonerate (RV3909)', () => {
    // Unlike the RV3804 run-fact controls (whose TRIGGERS stay quiet on
    // honest prose), the source-claim pairing is polarity-blind by
    // design: an honest sentence citing the same anchor forms the same
    // pair, and the exoneration belongs to the judge half, which now
    // holds both sides. The control pins that the pairing never
    // depends on the sentence being wrong.
    const honest = runClaimCorpus([
      {
        id: 'honest-doctrine-echo',
        class: 'stale-doctrine-echo',
        draft:
          'The run budget ceiling is immutable within a segment, and the one explicit door ' +
          'is ResumeOptions.run at resume, journaled as a run_budget_override decision ' +
          '(packages/core/src/engine/engine.ts:588).',
        pool: [
          {
            nodeId: 'agent:3',
            text:
              'ResumeOptions.run raises budgetUsd and maxInFlightExposureUsd at resume, ' +
              'validated and journaled as a run_budget_override decision with a typed floor ' +
              'at the settled spend (packages/core/src/engine/engine.ts:588-604); the ' +
              'doctrine in force is immutability WITHIN a segment.',
          },
        ],
        expect: { minPairs: 1, anchors: ['packages/core/src/engine/engine.ts:588'] },
      },
    ]);
    expect(honest[0]?.pass).toBe(true);
    expect(honest[0]?.pairs[0]?.draftExcerpt).toContain('immutable within a segment');
  });

  it('honest formulations of the third-experiment classes trigger no pair (RV3804)', () => {
    // The triggers fire on the CLASS commitment, never on innocent
    // prose: an honest sentence that neither uses the conflating
    // register, the derived figure, nor the provider-bill wording
    // forms nothing for a judge to rule on.
    const honest = runClaimCorpus([
      {
        id: 'honest-bound-split',
        class: 'bound-conflation',
        draft:
          'Cursor echo and visited-cursor guards refuse cycles unconditionally, while the ' +
          'byte and page caps are an opt-in production posture.',
        pool: [
          {
            nodeId: 'agent:2',
            text:
              'The MCP read caps are OPT-IN (packages/core/src/tools/mcp.ts:44-57); the ' +
              'cursor guards are unconditional (packages/core/src/tools/mcp.ts:168-174).',
          },
        ],
        expect: {},
      },
      {
        id: 'honest-derived-window',
        class: 'derived-premise',
        draft:
          'The gateway arithmetic follows the declared twenty minute burst window at the ' +
          'recorded admission rate.',
        runFacts: {
          text: 'The declared burst window is 20 minutes; a 20 minute window admits 1333 slots.',
          ids: ['comparison-run-aug13'],
          numbers: [20, 1333, 2000],
        },
        runFactTerms: ['2000 slots', '30 minute window'],
        expect: {},
      },
      {
        id: 'honest-cost-basis',
        class: 'cost-basis',
        draft:
          'The locally estimated cost of this run at the pinned rate table is a little ' +
          'under six dollars; no provider statement has been reconciled.',
        runFacts: {
          text: "The invoice cost basis is 'locally-estimated'; no statement was reconciled.",
          ids: ['comparison-run-aug13'],
          numbers: [],
        },
        runFactTerms: ['provider bill', 'charged and settled'],
        expect: {},
      },
    ]);
    expect(honest.map((verdict) => verdict.pairs.length)).toEqual([0, 0, 0]);
    expect(honest.map((verdict) => verdict.runFactPairs.length)).toEqual([0, 0, 0]);
    expect(honest.every((verdict) => verdict.pass)).toBe(true);
  });

  it('a case whose expectation is not met reports failure instead of passing quietly', () => {
    const sabotaged = runClaimCorpus([
      {
        id: 'synthetic-unpairable',
        class: 'package-identity',
        draft: 'A sentence citing nothing at all.',
        pool: [{ nodeId: 'agent:1', text: 'A reading citing nothing either.' }],
        expect: { minPairs: 1 },
      },
    ]);
    expect(sabotaged[0]?.pass).toBe(false);
    expect(sabotaged[0]?.failures[0]).toMatch(/formed 0 source-claim pair/u);
  });
});
