import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import {
  evidencePreservedValidator,
  minMatchesValidator,
  requiredFieldsValidator,
  requiredSectionsValidator,
  sectionCitationsValidator,
  wordCountValidator,
  type FinishValidationChild,
  type FinishValidationInput,
} from './finish-validators.js';

const text = (value: string): FinishValidationInput => ({ result: value, text: value });

const child = (body: string, status = 'ok', handle = 2): FinishValidationChild => ({
  handle,
  nodeId: `node-${String(handle)}`,
  status,
  text: body,
});

const withChildren = (
  result: string,
  children: FinishValidationChild[],
): FinishValidationInput => ({ result, text: result, children });

describe('requiredSectionsValidator', () => {
  it('accepts when every section appears and lists each missing one', () => {
    const validator = requiredSectionsValidator({ sections: ['FINDINGS', 'EVIDENCE'] });
    expect(validator.name).toBe('required-sections');
    expect(validator.validate(text('FINDINGS: x. EVIDENCE: y.'))).toEqual({ ok: true });
    const verdict = validator.validate(text('nothing here'));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required section 'FINDINGS' is missing",
      "required section 'EVIDENCE' is missing",
    ]);
  });

  it('rejects empty or non string section lists at construction', () => {
    expect(() => requiredSectionsValidator({ sections: [] })).toThrow(ConfigError);
    expect(() => requiredSectionsValidator({ sections: [''] })).toThrow(/non empty strings/);
  });
});

describe('requiredFieldsValidator', () => {
  const validator = requiredFieldsValidator({ fields: ['summary', 'evidence'] });

  it('accepts substantial fields; zero, false, and empty arrays count as present', () => {
    expect(
      validator.validate({
        result: { summary: 's', evidence: [], count: 0 },
        text: '',
      }),
    ).toEqual({ ok: true });
  });

  it('rejects non objects, missing fields, and whitespace only strings', () => {
    expect(validator.validate(text('a plain string'))).toEqual({
      ok: false,
      reasons: ['the finish result is not a JSON object'],
    });
    const verdict = validator.validate({ result: { summary: '   ' }, text: '' });
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required field 'summary' is empty",
      "required field 'evidence' is missing",
    ]);
  });
});

describe('evidencePreservedValidator', () => {
  const CITED = 'EVIDENCE: src/auth.ts:10 src/auth.ts:42 src/db.ts:7 src/api.ts:99.';

  it('rejects a result that lost citations, listing exactly the missing ones', () => {
    const validator = evidencePreservedValidator();
    expect(validator.name).toBe('evidence-preserved');
    const verdict = validator.validate(withChildren('kept src/auth.ts:10 only', [child(CITED)]));
    expect(verdict.ok).toBe(false);
    const reason = verdict.ok ? '' : verdict.reasons[0];
    expect(reason).toContain('1 of 4 child citations');
    expect(reason).toContain('src/auth.ts:42, src/db.ts:7, src/api.ts:99');
    expect(reason).not.toContain('src/auth.ts:10,');
  });

  it('accepts full preservation and the exact 19 of 20 boundary at the default share', () => {
    const validator = evidencePreservedValidator();
    expect(validator.validate(withChildren(CITED, [child(CITED)]))).toEqual({ ok: true });
    const twenty = Array.from({ length: 20 }, (_, i) => `src/f${String(i)}.ts:${String(i + 1)}`);
    const nineteen = twenty.slice(0, 19).join(' ');
    expect(validator.validate(withChildren(nineteen, [child(twenty.join(' '))]))).toEqual({
      ok: true,
    });
  });

  it('deduplicates citations across children and ignores non ok children', () => {
    const validator = evidencePreservedValidator();
    const verdict = validator.validate(
      withChildren('src/a.ts:1', [
        child('src/a.ts:1 src/a.ts:1', 'ok', 2),
        child('src/a.ts:1', 'ok', 3),
        child('src/lost.ts:9 from a FAILED child', 'error', 4),
        child('', 'running', 5),
      ]),
    );
    expect(verdict).toEqual({ ok: true });
  });

  it('requireKnown rejects fabricated citations even when preservation holds', () => {
    const validator = evidencePreservedValidator({ requireKnown: true });
    const verdict = validator.validate(
      withChildren('src/auth.ts:10 src/auth.ts:42 src/db.ts:7 src/api.ts:99 src/fake.ts:3', [
        child(CITED),
      ]),
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain(
      'unknown citations not present in any child report: src/fake.ts:3',
    );
  });

  it('zero child citations pass vacuously; requireKnown still flags orphans', () => {
    expect(evidencePreservedValidator().validate(withChildren('src/anything.ts:1', []))).toEqual({
      ok: true,
    });
    expect(evidencePreservedValidator().validate(text('no children field at all'))).toEqual({
      ok: true,
    });
    const strict = evidencePreservedValidator({ requireKnown: true });
    const verdict = strict.validate(withChildren('cites src/orphan.ts:5', []));
    expect(verdict.ok).toBe(false);
  });

  it('caps the listed citations at 20 and counts the rest', () => {
    const many = Array.from({ length: 25 }, (_, i) => `src/m${String(i)}.ts:${String(i + 1)}`);
    const verdict = evidencePreservedValidator({ minShare: 1 }).validate(
      withChildren('none kept', [child(many.join(' '))]),
    );
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('and 5 more');
  });

  it('rejects invalid patterns and out of range minShare at construction', () => {
    expect(() => evidencePreservedValidator({ pattern: '(' })).toThrow(/does not compile/);
    expect(() => evidencePreservedValidator({ minShare: 0 })).toThrow(/in \(0, 1\]/);
    expect(() => evidencePreservedValidator({ minShare: 1.5 })).toThrow(/in \(0, 1\]/);
    expect(() => evidencePreservedValidator({ minShare: Number.NaN })).toThrow(/in \(0, 1\]/);
  });

  it('honors a custom name and a custom share', () => {
    const lax = evidencePreservedValidator({ name: 'half', minShare: 0.5 });
    expect(lax.name).toBe('half');
    expect(lax.validate(withChildren('src/auth.ts:10 src/auth.ts:42', [child(CITED)]))).toEqual({
      ok: true,
    });
  });
});

describe('minMatchesValidator', () => {
  it('counts global matches and reports the shortfall', () => {
    const validator = minMatchesValidator({ pattern: 'src/[a-z]+\\.ts:\\d+', min: 2 });
    expect(validator.name).toBe('min-matches');
    expect(validator.validate(text('src/a.ts:1 and src/b.ts:2'))).toEqual({ ok: true });
    const verdict = validator.validate(text('only src/a.ts:1'));
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('expected at least 2 matches');
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('found 1');
  });

  it('is stateless across verdicts despite the forced g flag', () => {
    const validator = minMatchesValidator({ pattern: 'x', min: 1 });
    expect(validator.validate(text('x'))).toEqual({ ok: true });
    expect(validator.validate(text('x'))).toEqual({ ok: true });
  });

  it('rejects invalid patterns and a non positive min at construction', () => {
    expect(() => minMatchesValidator({ pattern: '(', min: 1 })).toThrow(/does not compile/);
    expect(() => minMatchesValidator({ pattern: 'x', min: 0 })).toThrow(/positive integer/);
    expect(() => minMatchesValidator({ pattern: 'x', min: 1.5 })).toThrow(/positive integer/);
  });

  it('honors a custom name so several instances can coexist', () => {
    expect(minMatchesValidator({ pattern: 'x', min: 1, name: 'citations' }).name).toBe('citations');
  });
});

describe('wordCountValidator (the v1.71 experiment review, P0.7)', () => {
  it('holds the whitespace-token count inside the bounds, boundaries inclusive', () => {
    const validator = wordCountValidator({ min: 3, max: 4 });
    expect(validator.name).toBe('word-count');
    expect(validator.validate(text('one two three'))).toEqual({ ok: true });
    expect(validator.validate(text('  one\n two\tthree four  '))).toEqual({ ok: true });
    const below = validator.validate(text('one two'));
    expect(below.ok ? [] : below.reasons).toEqual([
      'result word count 2 is below the required minimum 3',
    ]);
    const above = validator.validate(text('a b c d e'));
    expect(above.ok ? [] : above.reasons).toEqual(['result word count 5 exceeds the maximum 4']);
  });

  it('counts the empty text as zero words', () => {
    const verdict = wordCountValidator({ min: 1 }).validate(text('   '));
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      'result word count 0 is below the required minimum 1',
    ]);
    expect(wordCountValidator({ max: 10 }).validate(text(''))).toEqual({ ok: true });
  });

  it('rejects missing, non positive, and inverted bounds at construction', () => {
    expect(() => wordCountValidator({})).toThrow(/min, max, or both/);
    expect(() => wordCountValidator({ min: 0 })).toThrow(/positive integer/);
    expect(() => wordCountValidator({ max: 2.5 })).toThrow(/positive integer/);
    expect(() => wordCountValidator({ min: 5, max: 4 })).toThrow(/exceeds max/);
  });
});

describe('sectionCitationsValidator (the v1.71 experiment review, P1.2)', () => {
  const BODY = '## A\nsrc/a.ts:1 src/a.ts:2\n## B\nsrc/b.ts:3\n## C\nno provenance whatsoever here';

  it('judges every section slice separately and names the starved ones', () => {
    const validator = sectionCitationsValidator({ sections: ['## A', '## B', '## C'], min: 2 });
    expect(validator.name).toBe('section-citations');
    const verdict = validator.validate(text(BODY));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "section '## B' carries 1 citations matching /[\\w./-]+\\.\\w+:\\d+/; at least 2 required",
      "section '## C' carries 0 citations matching /[\\w./-]+\\.\\w+:\\d+/; at least 2 required",
    ]);
    expect(sectionCitationsValidator({ sections: ['## A'], min: 2 }).validate(text(BODY))).toEqual({
      ok: true,
    });
  });

  it('slices by text position even when sections appear out of declared order', () => {
    const swapped = '## B\nsrc/b.ts:3\n## A\nsrc/a.ts:1';
    const validator = sectionCitationsValidator({ sections: ['## A', '## B'], min: 1 });
    expect(validator.validate(text(swapped))).toEqual({ ok: true });
  });

  it('a missing section is its own reason, never a silent zero', () => {
    const validator = sectionCitationsValidator({ sections: ['## Z'], min: 1 });
    const verdict = validator.validate(text(BODY));
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required section '## Z' is missing, so its citation coverage cannot be judged",
    ]);
  });

  it('rejects invalid patterns, sections, and min at construction', () => {
    expect(() => sectionCitationsValidator({ sections: [], min: 1 })).toThrow(ConfigError);
    expect(() => sectionCitationsValidator({ sections: ['A'], pattern: '(', min: 1 })).toThrow(
      /does not compile/,
    );
    expect(() => sectionCitationsValidator({ sections: ['A'], min: 0 })).toThrow(
      /positive integer/,
    );
  });
});
