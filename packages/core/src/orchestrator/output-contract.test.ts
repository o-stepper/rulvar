import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { requiredSectionsValidator } from './finish-validators.js';
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
