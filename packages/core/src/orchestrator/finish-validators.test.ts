import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import {
  evidencePreservedValidator,
  headingStructureValidator,
  minMatchesValidator,
  requiredFieldsValidator,
  requiredSectionsValidator,
  sectionCitationsValidator,
  stripFencedBlocks,
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

describe('fence awareness and line anchoring (cycle 74)', () => {
  it('stripFencedBlocks removes fenced regions, delimiters included, and keeps the rest byte identical', () => {
    const body = 'alpha\n```js\nfenced one\n```\nbeta\n~~~\nfenced two\n~~~\ngamma';
    expect(stripFencedBlocks(body)).toBe('alpha\nbeta\ngamma');
    expect(stripFencedBlocks('no fences\nat all')).toBe('no fences\nat all');
  });

  it('a closing fence must be at least as long and the same character; an unclosed fence runs to the end', () => {
    const longer = 'a\n````\ncode\n```\nstill code\n````\nb';
    expect(stripFencedBlocks(longer)).toBe('a\nb');
    const mixed = 'a\n```\ncode\n~~~\nstill code\n```\nb';
    expect(stripFencedBlocks(mixed)).toBe('a\nb');
    expect(stripFencedBlocks('a\n```\nnever closed')).toBe('a');
  });

  it('closes a fence whose delimiter line ends in CRLF instead of swallowing the rest (cycle 78)', () => {
    const body = ['alpha', '```js', 'fenced', '```', 'beta', 'gamma'].join('\r\n');
    expect(stripFencedBlocks(body)).toBe('alpha\r\nbeta\r\ngamma');
    // Trailing blanks before the carriage return still close, per the LF rule.
    expect(stripFencedBlocks('a\r\n~~~\r\ncode\r\n~~~  \r\nb')).toBe('a\r\nb');
  });

  it('headingStructureValidator judges CRLF text whole: a closed fence no longer swallows declared headings (cycle 78)', () => {
    const validator = headingStructureValidator({ sections: ['## One', '## Two'] });
    const body = ['## One', '```', '## Fake', '```', 'body', '## Two', 'tail'].join('\r\n');
    expect(validator.validate(text(body)).ok).toBe(true);
  });

  it("requiredSectionsValidator match 'line' demands the marker as its own line", () => {
    const validator = requiredSectionsValidator({ sections: ['## Findings'], match: 'line' });
    expect(validator.validate(text("We will fill the '## Findings' part later.")).ok).toBe(false);
    const verdict = validator.validate(text('intro without the heading'));
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required section '## Findings' is missing (required as its own line)",
    ]);
    expect(validator.validate(text('intro\n  ## Findings  \nbody')).ok).toBe(true);
  });

  it("fencedCode 'excluded' stops a fenced marker from satisfying sections", () => {
    const validator = requiredSectionsValidator({
      sections: ['## Findings'],
      fencedCode: 'excluded',
    });
    expect(validator.validate(text('Intro.\n```\n## Findings\n```\nno real heading')).ok).toBe(
      false,
    );
    expect(validator.validate(text('## Findings\n```\ncode\n```')).ok).toBe(true);
  });

  it("wordCountValidator fencedCode 'excluded' counts only visible words", () => {
    const validator = wordCountValidator({ min: 100, fencedCode: 'excluded' });
    const padded =
      'Five real words here only.\n```\n' +
      Array.from({ length: 120 }, (unused, i) => `word${String(i)}`).join(' ') +
      '\n```';
    const verdict = validator.validate(text(padded));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons.join(' ')).toContain(
      'word count 5 (fenced code excluded)',
    );
  });

  it("minMatchesValidator fencedCode 'excluded' ignores fenced citations", () => {
    const validator = minMatchesValidator({
      pattern: '[\\w./-]+\\.\\w+:\\d+',
      min: 3,
      fencedCode: 'excluded',
    });
    const fenced = 'No visible citations.\n```\nsrc/a.ts:1 src/b.ts:2 src/c.ts:3\n```';
    const verdict = validator.validate(text(fenced));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons.join(' ')).toContain('found 0 (fenced code excluded)');
    expect(validator.validate(text('src/a.ts:1 src/b.ts:2 src/c.ts:3')).ok).toBe(true);
  });

  it('fence aware, line anchored slicing anchors sections at their real headings', () => {
    const validator = sectionCitationsValidator({
      sections: ['## A', '## B'],
      min: 1,
      match: 'line',
      fencedCode: 'excluded',
    });
    const misAnchored = [
      '```',
      '## A',
      '```',
      'src/preamble.ts:1',
      '## A',
      'zero citations in the real body',
      '## B',
      'src/b.ts:9',
    ].join('\n');
    const verdict = validator.validate(text(misAnchored));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons.join(' ')).toContain(
      "section '## A' carries 0 citations",
    );
    const honest = ['## A', 'src/a.ts:1', '## B', 'src/b.ts:9'].join('\n');
    expect(validator.validate(text(honest)).ok).toBe(true);
  });

  it('the default paths stay byte identical: anywhere matching and counted fences', () => {
    const sections = requiredSectionsValidator({ sections: ['## Findings'] });
    expect(sections.validate(text('mid sentence ## Findings mention')).ok).toBe(true);
    const words = wordCountValidator({ min: 3 });
    const verdict = words.validate(text('one two'));
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      'result word count 2 is below the required minimum 3',
    ]);
  });

  it('rejects invalid mode values at construction', () => {
    expect(() => requiredSectionsValidator({ sections: ['A'], match: 'exact' as never })).toThrow(
      ConfigError,
    );
    expect(() => wordCountValidator({ min: 1, fencedCode: 'off' as never })).toThrow(ConfigError);
  });
});

describe('headingStructureValidator (the sixth comparison experiment, cycle 77)', () => {
  // Judge P1.3: line presence proves each declared heading EXISTS, not
  // that the document carries them in order without extras.
  const SECTIONS = ['## 1. Verdict', '## 2. Evidence', '## 3. Actions'];
  const doc = (...headings: string[]): FinishValidationInput =>
    text(headings.map((h) => `${h}\nprose body of the section.`).join('\n'));

  it('accepts the declared headings in order with sub-headings and fenced fakes around', () => {
    const validator = headingStructureValidator({ sections: SECTIONS });
    expect(validator.name).toBe('heading-structure');
    const body = [
      'preamble prose',
      '## 1. Verdict',
      'prose',
      '### 1.1 nuance',
      '```md',
      '## fenced fake heading',
      '```',
      '## 2. Evidence',
      '#### deep nuance',
      '## 3. Actions',
      'closing prose',
    ].join('\n');
    expect(validator.validate(text(body)).ok).toBe(true);
  });

  it('a missing declared heading and an undeclared extra each get a reason', () => {
    const validator = headingStructureValidator({ sections: SECTIONS });
    const verdict = validator.validate(doc('## 1. Verdict', '## Appendix', '## 3. Actions'));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required heading '## 2. Evidence' is missing",
      "undeclared level 2 heading '## Appendix'",
    ]);
  });

  it('order violations name the first mismatch position', () => {
    const validator = headingStructureValidator({ sections: SECTIONS });
    const verdict = validator.validate(doc('## 2. Evidence', '## 1. Verdict', '## 3. Actions'));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "heading order mismatch at position 1: found '## 2. Evidence' where '## 1. Verdict' is declared",
    ]);
  });

  it('a duplicated declared heading violates the exactly-once structure', () => {
    const validator = headingStructureValidator({ sections: SECTIONS });
    const verdict = validator.validate(
      doc('## 1. Verdict', '## 2. Evidence', '## 2. Evidence', '## 3. Actions'),
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual(["duplicate heading '## 2. Evidence'"]);
  });

  it('a declared heading hiding inside a fence is missing, not present', () => {
    const validator = headingStructureValidator({ sections: SECTIONS });
    const body = ['## 1. Verdict', 'prose', '```', '## 2. Evidence', '```', '## 3. Actions'].join(
      '\n',
    );
    const verdict = validator.validate(text(body));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? [] : verdict.reasons).toEqual([
      "required heading '## 2. Evidence' is missing",
    ]);
  });

  it('ordered false tolerates shuffles; exclusive false tolerates extras and duplicates', () => {
    const shuffled = headingStructureValidator({ sections: SECTIONS, ordered: false });
    expect(shuffled.validate(doc('## 3. Actions', '## 1. Verdict', '## 2. Evidence')).ok).toBe(
      true,
    );
    const inclusive = headingStructureValidator({ sections: SECTIONS, exclusive: false });
    expect(
      inclusive.validate(
        doc('## 1. Verdict', '## Appendix', '## 2. Evidence', '## 2. Evidence', '## 3. Actions'),
      ).ok,
    ).toBe(true);
  });

  it('extras beyond the listing cap fold into a remainder count', () => {
    const validator = headingStructureValidator({ sections: ['## Only'] });
    const extras = Array.from({ length: 7 }, (_, i) => `## Extra ${String(i + 1)}`);
    const verdict = validator.validate(doc('## Only', ...extras));
    expect(verdict.ok).toBe(false);
    const reasons = verdict.ok ? [] : verdict.reasons;
    expect(reasons).toHaveLength(6);
    expect(reasons[4]).toBe("undeclared level 2 heading '## Extra 5'");
    expect(reasons[5]).toBe('and 2 more undeclared level 2 headings');
  });

  it('level derives from the shared marker: level 3 contracts govern level 3 only', () => {
    const validator = headingStructureValidator({
      sections: ['### a', '### b'],
      exclusive: true,
    });
    const body = ['## outer chapter', '### a', 'prose', '### b', '## another chapter'].join('\n');
    expect(validator.validate(text(body)).ok).toBe(true);
  });

  it('construction rejects mixed levels, non-heading sections, duplicates, and bad flags', () => {
    expect(() => headingStructureValidator({ sections: ['## a', '### b'] })).toThrow(
      /same markdown heading marker/,
    );
    expect(() => headingStructureValidator({ sections: ['plain title'] })).toThrow(ConfigError);
    expect(() => headingStructureValidator({ sections: ['## a', '## a'] })).toThrow(/duplicate/);
    expect(() => headingStructureValidator({ sections: [] })).toThrow(ConfigError);
    expect(() =>
      headingStructureValidator({ sections: ['## a'], ordered: 'yes' as never }),
    ).toThrow(ConfigError);
  });
});
