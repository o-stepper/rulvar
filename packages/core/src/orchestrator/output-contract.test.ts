import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { requiredSectionsValidator, wordCountValidator } from './finish-validators.js';
import { finishContract, selfTestFinishValidation } from './output-contract.js';

/** The v1.71 experiment shape: the question renamed three sections. */
const OLD_SECTIONS = [
  '## 5. Failure and recovery analysis',
  '## 7. Orchestration design',
  '## 8. Capacity, cost and observability',
];
const NEW_SECTIONS = [
  '## 5. Failure, recovery and kill-point analysis',
  '## 7. Orchestration, salvage and synthesis',
  '## 8. Capacity, quota, cost and invoice',
];

describe('finishContract: one manifest generates prompt, validators, hash, and goldens', () => {
  it('derives the stock validator set with contract-prefixed names', () => {
    const contract = finishContract({
      sections: NEW_SECTIONS,
      words: { min: 40, max: 5500 },
      citations: { min: 6, perSection: 1 },
    });
    expect(contract.validators.map((v) => v.name)).toEqual([
      'contract-sections',
      'contract-words',
      'contract-citations',
      'contract-section-citations',
    ]);
    expect(contract.promptLines.join('\n')).toContain(NEW_SECTIONS[0]);
    expect(contract.promptLines.join('\n')).toContain('between 40 and 5500 words');
    expect(contract.promptLines.join('\n')).toContain('at least 6 citations');
  });

  it('the golden accept fixture passes every derived validator; the reject fails one', () => {
    const contract = finishContract({
      sections: NEW_SECTIONS,
      words: { min: 60, max: 400 },
      citations: { min: 6, perSection: 2 },
    });
    for (const validator of contract.validators) {
      expect({ [validator.name]: validator.validate(contract.goldenAccept) }).toEqual({
        [validator.name]: { ok: true },
      });
    }
    const reject = contract.goldenReject;
    expect(reject).toBeDefined();
    const rejections = contract.validators.filter(
      (v) => reject !== undefined && !v.validate(reject).ok,
    );
    expect(rejections.length).toBeGreaterThan(0);
  });

  it('hashes the normalized manifest stably and independently of key order', () => {
    const a = finishContract({ sections: NEW_SECTIONS, words: { min: 10 } });
    const b = finishContract({ words: { min: 10 }, sections: [...NEW_SECTIONS] });
    const c = finishContract({ sections: NEW_SECTIONS, words: { min: 11 } });
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(b.hash).toBe(a.hash);
    expect(c.hash).not.toBe(a.hash);
  });

  it('an upper-bound-only manifest carries no golden reject: empty is acceptable', () => {
    const contract = finishContract({ words: { max: 100 } });
    expect(contract.goldenReject).toBeUndefined();
    expect(contract.validators).toHaveLength(1);
  });

  it('rejects contradictory and underspecified manifests before any run exists', () => {
    expect(() => finishContract({})).toThrow(ConfigError);
    expect(() => finishContract({ words: {} })).toThrow(/min, max, or both/);
    expect(() => finishContract({ words: { min: 20, max: 10 } })).toThrow(/exceeds/);
    expect(() => finishContract({ citations: { min: 3 }, words: { min: 1, max: 2 } })).toThrow(
      /self contradictory/,
    );
    expect(() => finishContract({ citations: { perSection: 1 } })).toThrow(/requires sections/);
    expect(() => finishContract({ citations: { min: 2, pattern: 'RFC-\\d+' } })).toThrow(
      /sample is required/,
    );
    expect(() =>
      finishContract({ citations: { min: 2, pattern: 'RFC-\\d+', sample: 'nope' } }),
    ).toThrow(/does not match/);
  });

  it('a custom pattern with a matching sample generates passing goldens', () => {
    const contract = finishContract({
      sections: ['FINDINGS'],
      citations: { min: 4, perSection: 2, pattern: 'RFC-\\d+', sample: 'RFC-9110' },
    });
    for (const validator of contract.validators) {
      expect(validator.validate(contract.goldenAccept).ok).toBe(true);
    }
  });
});

describe('selfTestFinishValidation: the golden self test (P0.3)', () => {
  it('catches the v1.71 experiment drift: a stale validator rejects the fresh golden', () => {
    const contract = finishContract({ sections: NEW_SECTIONS, citations: { min: 3 } });
    const stale = requiredSectionsValidator({ sections: OLD_SECTIONS, name: 'legacy-sections' });
    const report = selfTestFinishValidation({
      validators: [...contract.validators, stale],
      accept: contract.goldenAccept,
      reject: contract.goldenReject,
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.validator).toBe('legacy-sections');
    expect(report.failures[0]?.reasons.join('; ')).toContain(OLD_SECTIONS[0]);
  });

  it('passes when the validator set and the contract agree', () => {
    const contract = finishContract({ sections: NEW_SECTIONS, words: { min: 10, max: 500 } });
    const report = selfTestFinishValidation({
      validators: contract.validators,
      accept: contract.goldenAccept,
      reject: contract.goldenReject,
    });
    expect(report).toEqual({ ok: true, failures: [] });
  });

  it('flags a vacuous validator set that accepts the known-bad fixture', () => {
    const report = selfTestFinishValidation({
      validators: [{ name: 'lenient', validate: () => ({ ok: true }) }],
      reject: { result: '', text: '', children: [] },
    });
    expect(report.ok).toBe(false);
    expect(report.failures[0]?.fixture).toBe('reject');
    expect(report.failures[0]?.reasons.join(' ')).toContain('vacuous');
  });

  it('a throwing validator is a host defect: ConfigError, same as the live loop', () => {
    expect(() =>
      selfTestFinishValidation({
        validators: [
          {
            name: 'broken',
            validate: () => {
              throw new Error('boom');
            },
          },
        ],
        accept: { result: 'x', text: 'x', children: [] },
      }),
    ).toThrow(ConfigError);
  });
});

describe('contract exactness: the deep freeze, the per validator goldens, the knobs (cycle 74)', () => {
  it('the bundle is DEEPLY frozen: every post-hash mutation path throws', () => {
    const contract = finishContract({
      sections: NEW_SECTIONS,
      words: { min: 10, max: 500 },
      citations: { min: 3 },
    });
    expect(() => contract.manifest.sections?.push('## Injected')).toThrow(TypeError);
    expect(() => {
      (contract.manifest.words as { min?: number }).min = 1;
    }).toThrow(TypeError);
    expect(() => {
      (contract.manifest.citations as { min?: number }).min = 99;
    }).toThrow(TypeError);
    expect(() => contract.validators.pop()).toThrow(TypeError);
    expect(() => {
      (contract.validators[0] as { validate: unknown }).validate = () => ({ ok: true });
    }).toThrow(TypeError);
    expect(() => (contract.goldenRejects as unknown[]).pop()).toThrow(TypeError);
  });

  it('every contract validator carries a reject golden its configured instance rejects', () => {
    const contract = finishContract({
      sections: NEW_SECTIONS,
      words: { min: 60, max: 400 },
      citations: { min: 6, perSection: 1 },
    });
    expect(contract.goldenRejects.map((golden) => golden.validator)).toEqual([
      'contract-sections',
      'contract-words',
      'contract-citations',
      'contract-section-citations',
    ]);
    for (const golden of contract.goldenRejects) {
      const validator = contract.validators.find((v) => v.name === golden.validator);
      expect({ [golden.validator]: validator?.validate(golden.input).ok }).toEqual({
        [golden.validator]: false,
      });
    }
  });

  it('the words reject golden sits at the exact boundary: min minus one words', () => {
    const contract = finishContract({ words: { min: 40 } });
    const golden = contract.goldenRejects.find((entry) => entry.validator === 'contract-words');
    expect(golden?.input.text.trim().split(/\s+/)).toHaveLength(39);
  });

  it('an upper-bound-only manifest still gets a words reject golden: max plus one', () => {
    const contract = finishContract({ words: { max: 20 } });
    expect(contract.goldenReject).toBeUndefined();
    const golden = contract.goldenRejects.find((entry) => entry.validator === 'contract-words');
    expect(golden?.input.text.split(/\s+/)).toHaveLength(21);
  });

  it('catches a same-name WEAKENED replacement through the per validator goldens', () => {
    const strict = finishContract({ sections: ['## Report'], words: { min: 50 } });
    const weakSet = [
      requiredSectionsValidator({ sections: ['## Report'], name: 'contract-sections' }),
      wordCountValidator({ min: 1, name: 'contract-words' }),
    ];
    const single = selfTestFinishValidation({
      validators: weakSet,
      accept: strict.goldenAccept,
      reject: strict.goldenReject,
    });
    expect(single.ok).toBe(true);
    const report = selfTestFinishValidation({
      validators: weakSet,
      accept: strict.goldenAccept,
      reject: strict.goldenReject,
      rejects: strict.goldenRejects,
    });
    expect(report.ok).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.fixture).toBe('reject');
    expect(report.failures[0]?.validator).toBe('contract-words');
    expect(report.failures[0]?.reasons.join(' ')).toContain('replacement');
  });

  it('a reject golden naming an absent validator is its own failure', () => {
    const contract = finishContract({ sections: ['## Report'] });
    const report = selfTestFinishValidation({ validators: [], rejects: contract.goldenRejects });
    expect(report.ok).toBe(false);
    expect(report.failures[0]?.fixture).toBe('reject');
    expect(report.failures[0]?.validator).toBe('contract-sections');
    expect(report.failures[0]?.reasons.join(' ')).toContain(
      "no configured validator is named 'contract-sections'",
    );
  });

  it('the honest spread passes the per validator goldens', () => {
    const contract = finishContract({
      sections: NEW_SECTIONS,
      words: { min: 10, max: 400 },
      citations: { min: 3, perSection: 1 },
    });
    const report = selfTestFinishValidation({
      validators: contract.validators,
      accept: contract.goldenAccept,
      reject: contract.goldenReject,
      rejects: contract.goldenRejects,
    });
    expect(report).toEqual({ ok: true, failures: [] });
  });

  it("sectionsMatch 'line' and fencedCode 'excluded' join the hash exactly when non default", () => {
    const plain = finishContract({ sections: ['## Findings'], words: { min: 5 } });
    const explicitDefaults = finishContract({
      sections: ['## Findings'],
      words: { min: 5 },
      sectionsMatch: 'anywhere',
      fencedCode: 'counted',
    });
    const line = finishContract({
      sections: ['## Findings'],
      words: { min: 5 },
      sectionsMatch: 'line',
    });
    const fenceless = finishContract({
      sections: ['## Findings'],
      words: { min: 5 },
      fencedCode: 'excluded',
    });
    expect(explicitDefaults.hash).toBe(plain.hash);
    expect(line.hash).not.toBe(plain.hash);
    expect(fenceless.hash).not.toBe(plain.hash);
    expect(fenceless.hash).not.toBe(line.hash);
    expect(line.manifest.sectionsMatch).toBe('line');
    expect(explicitDefaults.manifest.sectionsMatch).toBeUndefined();
    expect(explicitDefaults.manifest.fencedCode).toBeUndefined();
  });

  it('the knobbed contract enforces line anchoring and fence exclusion through its validators', () => {
    const contract = finishContract({
      sections: ['## Findings'],
      sectionsMatch: 'line',
      fencedCode: 'excluded',
    });
    const validator = contract.validators[0];
    const midline = "We will fill the '## Findings' part in a later draft.";
    const fenced = 'Intro.\n```\n## Findings\n```\nno real heading';
    expect(validator?.validate({ result: midline, text: midline }).ok).toBe(false);
    expect(validator?.validate({ result: fenced, text: fenced }).ok).toBe(false);
    const anchored = 'preamble\n## Findings\nbody';
    expect(validator?.validate({ result: anchored, text: anchored }).ok).toBe(true);
    for (const each of contract.validators) {
      expect(each.validate(contract.goldenAccept).ok).toBe(true);
    }
  });

  it('the knob statements ride promptLines only when declared', () => {
    const knobbed = finishContract({
      sections: ['## Findings'],
      words: { min: 5 },
      sectionsMatch: 'line',
      fencedCode: 'excluded',
    });
    const joined = knobbed.promptLines.join('\n');
    expect(joined).toContain('each on its own line');
    expect(joined).toContain('fenced code blocks');
    const plain = finishContract({ sections: ['## Findings'], words: { min: 5 } });
    expect(plain.promptLines.join('\n')).not.toContain('own line');
    expect(plain.promptLines.join('\n')).not.toContain('fenced');
  });

  it('rejects bad knob values, a sectionsMatch without sections, and fence-opening content under exclusion', () => {
    expect(() => finishContract({ words: { min: 5 }, sectionsMatch: 'line' })).toThrow(
      /requires sections/,
    );
    expect(() => finishContract({ sections: ['A'], sectionsMatch: 'exact' as never })).toThrow(
      ConfigError,
    );
    expect(() => finishContract({ sections: ['A'], fencedCode: 'stripped' as never })).toThrow(
      ConfigError,
    );
    expect(() => finishContract({ sections: ['``` output'], fencedCode: 'excluded' })).toThrow(
      /fence/,
    );
    expect(() =>
      finishContract({
        sections: ['## A'],
        citations: { min: 1, sample: '```x.md:1' },
        fencedCode: 'excluded',
      }),
    ).toThrow(/fence/);
    expect(() => finishContract({ sections: ['``` output'] })).not.toThrow();
  });
});
