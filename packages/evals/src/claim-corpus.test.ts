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
      'bounded-coverage',
      'inverted-default',
      'live-fact',
      'modality-overclaim',
      'negation',
      'numeric-range',
      'package-identity',
      'scope-ambiguity',
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
