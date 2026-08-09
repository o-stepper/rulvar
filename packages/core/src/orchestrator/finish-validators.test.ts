import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import {
  citationTargetsValidator,
  citedValueValidator,
  evidenceGradeValidator,
  evidencePreservedValidator,
  formatCharacterValidator,
  headingStructureValidator,
  minMatchesValidator,
  requiredFieldsValidator,
  requiredSectionsValidator,
  sectionCitationsValidator,
  spliceSections,
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

  it('counts a salvage-accepted partial child only when marked (RV1403)', () => {
    const validator = evidencePreservedValidator({ requireKnown: true });
    const partialChild = {
      handle: 3,
      nodeId: 'n3',
      status: 'limit',
      text: '{"error":"turn budget exhausted","partial":{"facts":["cache.ts:12 doubles at dawn"]}}',
      salvageablePartial: true,
    };
    // Marked: the accepted partial IS evidence, so quoting it passes.
    expect(
      validator.validate({
        result: 'summary citing cache.ts:12',
        text: 'summary citing cache.ts:12',
        children: [partialChild],
      }).ok,
    ).toBe(true);
    // Unmarked: the pool is empty and the quote reads as fabricated.
    const { salvageablePartial: _dropped, ...unmarked } = partialChild;
    expect(
      validator.validate({
        result: 'summary citing cache.ts:12',
        text: 'summary citing cache.ts:12',
        children: [unmarked],
      }).ok,
    ).toBe(false);
  });

  it('requireNonEmptyPool refuses the empty known pool instead of passing vacuously (RV507)', () => {
    const strict = evidencePreservedValidator({ requireNonEmptyPool: true });
    // An ok child that produced NO citation used to make the whole
    // contract vacuous: nothing to preserve, verdict ok. For an
    // evidence-critical run that silence is the failure.
    const empty = strict.validate(
      withChildren('summary with no citations', [child('child found nothing')]),
    );
    expect(empty.ok).toBe(false);
    expect(empty.ok ? '' : empty.reasons[0]).toContain('empty child citation pool');
    // No children at all is the same empty pool.
    const none = strict.validate(withChildren('anything', []));
    expect(none.ok).toBe(false);
  });

  it('requireNonEmptyPool leaves non-empty pools to the ordinary verdict, and defaults stay vacuous', () => {
    const strict = evidencePreservedValidator({ requireNonEmptyPool: true });
    expect(strict.validate(withChildren('kept src/a.ts:12', [child('src/a.ts:12')]))).toEqual({
      ok: true,
    });
    const lost = strict.validate(withChildren('kept nothing', [child('src/a.ts:12')]));
    expect(lost.ok).toBe(false);
    expect(lost.ok ? '' : lost.reasons[0]).toContain('below the required share');
    // The default keeps the historical vacuous pass byte for byte.
    expect(
      evidencePreservedValidator().validate(withChildren('x', [child('no citations here')])),
    ).toEqual({ ok: true });
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

describe('evidencePreservedValidator fail-closed intake and pool (RV610)', () => {
  it('refuses a pattern that can match the empty string, typed at construction', () => {
    // An empty-matchable pattern manufactures a non-empty "evidence"
    // pool out of nothing: '' enters the set, requireNonEmptyPool
    // passes, and preserving '' trivially succeeds.
    expect(() => evidencePreservedValidator({ pattern: '' })).toThrow(ConfigError);
    expect(() => evidencePreservedValidator({ pattern: 'x*' })).toThrow(/empty string/);
    expect(() => evidencePreservedValidator({ pattern: '(?:src/a\\.ts:1)?' })).toThrow(
      /empty string/,
    );
    expect(() => evidencePreservedValidator({ pattern: '[A-Z]+-\\d+' })).not.toThrow();
    expect(() => evidencePreservedValidator()).not.toThrow();
  });

  it('refuses non-boolean strict options instead of silently disabling them', () => {
    expect(() => evidencePreservedValidator({ requireNonEmptyPool: 'true' as never })).toThrow(
      /requireNonEmptyPool must be a boolean/,
    );
    expect(() => evidencePreservedValidator({ requireKnown: 1 as never })).toThrow(
      /requireKnown must be a boolean/,
    );
    expect(() =>
      evidencePreservedValidator({ requireNonEmptyPool: true, requireKnown: false }),
    ).not.toThrow();
  });

  it('zero-length matches never enter the pool even when the pattern slips past intake', () => {
    // A lookbehind matches empty AFTER its anchor but not in '': the
    // construction probe cannot see it, so the pool filter is the
    // layer that holds.
    const validator = evidencePreservedValidator({
      pattern: '(?<=anchor )[\\w./:-]*',
      requireNonEmptyPool: true,
    });
    const verdict = validator.validate(withChildren('no citations kept', [child('anchor ')]));
    expect(verdict.ok).toBe(false);
    const reason = verdict.ok ? '' : (verdict.reasons[0] ?? '');
    expect(reason).toContain('empty child citation pool');
  });
});

describe('spliceSections (RV808b)', () => {
  // The sectional bounded repair: a repair exchange used to resend the
  // WHOLE document for one violated section, and the twelfth comparison
  // run paid 406 s of coordination draft plus repair exactly that way.
  // The splice is the deterministic host half: the model resubmits only
  // the repaired sections and this function reconstructs the full
  // document from the retained prior attempt.
  const PRIOR = [
    'preamble line',
    '## Alpha',
    'alpha body one',
    'alpha body two',
    '## Beta',
    'beta body',
  ].join('\n');
  const DECLARED = ['## Alpha', '## Beta', '## Gamma'];

  it('replaces exactly the patched section, preserving preamble and siblings byte for byte', () => {
    const out = spliceSections(PRIOR, DECLARED, { '## Alpha': 'repaired alpha' });
    expect(out).toBe(
      ['preamble line', '## Alpha', 'repaired alpha', '## Beta', 'beta body'].join('\n'),
    );
  });

  it('replaces the last section, running its slice to the end of the text', () => {
    const out = spliceSections(PRIOR, DECLARED, { '## Beta': 'repaired beta' });
    expect(out).toBe(
      [
        'preamble line',
        '## Alpha',
        'alpha body one',
        'alpha body two',
        '## Beta',
        'repaired beta',
      ].join('\n'),
    );
  });

  it('appends missing declared sections at the end, in declared order', () => {
    const out = spliceSections(PRIOR, DECLARED, {
      '## Gamma': 'gamma body',
      '## Beta': 'repaired beta',
    });
    expect(out).toBe(
      [
        'preamble line',
        '## Alpha',
        'alpha body one',
        'alpha body two',
        '## Beta',
        'repaired beta',
        '## Gamma',
        'gamma body',
      ].join('\n'),
    );
  });

  it('anchors at marker LINES only: a mid sentence mention never anchors a splice', () => {
    const tricky = ['the words ## Alpha mid sentence do not anchor', '## Alpha', 'real body'].join(
      '\n',
    );
    const out = spliceSections(tricky, ['## Alpha'], { '## Alpha': 'patched' });
    expect(out).toBe(
      ['the words ## Alpha mid sentence do not anchor', '## Alpha', 'patched'].join('\n'),
    );
  });

  it('refuses an undeclared patch marker and prototype keyed patches typed', () => {
    expect(() => spliceSections(PRIOR, DECLARED, { '## Nope': 'x' })).toThrow(ConfigError);
    expect(() => spliceSections(PRIOR, DECLARED, { '## Nope': 'x' })).toThrow(/undeclared section/);
    expect(() => spliceSections(PRIOR, ['## Alpha'], { constructor: 'x' })).toThrow(
      /undeclared section/,
    );
  });

  it('refuses an empty declared set typed', () => {
    expect(() => spliceSections(PRIOR, [], { '## Alpha': 'x' })).toThrow(ConfigError);
  });
});

describe('evidenceGradeValidator (RV1212, the sixteenth experiment P2-3)', () => {
  const GRADED =
    'The loop is live-observed to retry three times.\n\n' + 'Cost came from the provider bill.\n';

  it('refuses a graded claim that cites no artifact in its own sentence', () => {
    const verdict = evidenceGradeValidator().validate(text(GRADED));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons.join(' ')).toContain('live-observed');
    expect(verdict.reasons.join(' ')).toContain('provider bill');
  });

  it('accepts the same claims once each sentence carries an artifact reference', () => {
    const cited =
      'The loop is live-observed to retry three times (run 01JABC, src/retry.ts:33).\n\n' +
      'Cost came from the provider bill (run 01JABC).\n';
    expect(evidenceGradeValidator().validate(text(cited)).ok).toBe(true);
  });

  it('does not accept an artifact that sits in a different sentence', () => {
    // The evidence must travel with the claim: a run id three
    // sentences away is exactly the shape that made the sixteenth
    // run's answer read as observed when it was not.
    const separated =
      'The loop is live-observed to retry three times.\n\n' +
      'Separately, we also read run 01JABC.\n';
    expect(evidenceGradeValidator().validate(text(separated)).ok).toBe(false);
  });

  it('names every graded phrase it found, and passes text that makes no graded claim', () => {
    expect(evidenceGradeValidator().validate(text('The loop retries three times.')).ok).toBe(true);
    const verdict = evidenceGradeValidator({ phrases: ['production-proven'] }).validate(
      text('This path is production-proven.'),
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reasons[0]).toContain('production-proven');
    }
  });

  it('refuses malformed intake typed', () => {
    expect(() => evidenceGradeValidator({ phrases: [] })).toThrow(ConfigError);
    expect(() => evidenceGradeValidator({ phrases: [''] })).toThrow(ConfigError);
    expect(() => evidenceGradeValidator({ artifactPattern: 'x*' })).toThrow(/empty string/);
    expect(() => evidenceGradeValidator({ artifactPattern: '([' })).toThrow(/does not compile/);
  });

  it('names the offending sentences verbatim, never the cited ones (RV2105)', () => {
    // The eighth parity run's repair blindness: the phrase-only reason
    // sent the synthesis hunting a 5000-word document; both granted
    // repairs missed the sentences and the run failed closed.
    const mixed =
      'The loop is live-observed to retry three times.\n\n' +
      'The clamp is live-observed at src/budget.ts:12 in the same sentence.\n\n' +
      'Cost came from the provider bill.\n';
    const verdict = evidenceGradeValidator().validate(text(mixed));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons).toContain(
      'offending sentence: "The loop is live-observed to retry three times."',
    );
    expect(verdict.reasons).toContain('offending sentence: "Cost came from the provider bill."');
    expect(verdict.reasons.join(' ')).not.toContain('src/budget.ts:12');
  });

  it('bounds the named sentences and truncates a long one (RV2105)', () => {
    const many = Array.from(
      { length: 7 },
      (_, i) => `Claim number ${String(i + 1)} is live-observed in the field.`,
    ).join('\n\n');
    const verdict = evidenceGradeValidator().validate(text(many));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons.filter((r) => r.startsWith('offending sentence:'))).toHaveLength(5);
    expect(verdict.reasons).toContain('and 2 more offending sentences');
    const long = `This claim is live-observed ${'and elaborated '.repeat(30)}at great length.`;
    const longVerdict = evidenceGradeValidator().validate(text(long));
    expect(longVerdict.ok).toBe(false);
    if (longVerdict.ok) {
      return;
    }
    const named = longVerdict.reasons.find((r) => r.startsWith('offending sentence:'));
    expect(named).toBeDefined();
    expect(named?.endsWith('..."')).toBe(true);
    expect((named ?? '').length).toBeLessThanOrEqual('offending sentence: ""...'.length + 240);
  });
});

describe('citedValueValidator (RV1212, the sixteenth experiment P2-2)', () => {
  // The judge's own repro: retry.ts:24 declares the interface, and the
  // default attempts: 3 lives at 33.
  const LINES: Record<number, string> = {
    24: 'export interface RetryPolicy {',
    33: '  attempts: 3,',
  };
  // A realistic snapshot: every line of the file resolves, most of
  // them to blanks, and only past the end does the resolver refuse.
  const resolve = (citation: { path: string; line: number }): string | undefined =>
    citation.path === 'src/retry.ts' && citation.line >= 1 && citation.line <= 40
      ? (LINES[citation.line] ?? '')
      : undefined;

  it('refuses a citation whose line does not carry the value the sentence asserts', () => {
    const verdict = citedValueValidator({ resolve }).validate(
      text('The default is `attempts: 3` (`src/retry.ts:24`).'),
    );
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons[0]).toContain('src/retry.ts:24');
    expect(verdict.reasons[0]).toContain('attempts: 3');
  });

  it('accepts the same assertion once it cites the line that carries the value', () => {
    expect(
      citedValueValidator({ resolve }).validate(
        text('The default is `attempts: 3` (`src/retry.ts:33`).'),
      ).ok,
    ).toBe(true);
  });

  it('refuses a citation the resolver cannot resolve at all', () => {
    const verdict = citedValueValidator({ resolve }).validate(
      text('The default is `attempts: 3` (`src/retry.ts:900`).'),
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reasons[0]).toContain('resolves to no source line');
    }
  });

  it('searches a window of lines when the host allows one', () => {
    const windowed = citedValueValidator({ resolve, window: 9 });
    expect(windowed.validate(text('The default is `attempts: 3` (`src/retry.ts:24`).')).ok).toBe(
      true,
    );
    // The window never reaches backwards past the cited line.
    expect(windowed.validate(text('The interface is `RetryPolicy` (`src/retry.ts:33`).')).ok).toBe(
      false,
    );
  });

  it('passes sentences that cite without asserting an inline value', () => {
    expect(citedValueValidator({ resolve }).validate(text('See `src/retry.ts:24`.')).ok).toBe(true);
  });

  it('refuses malformed intake typed', () => {
    expect(() => citedValueValidator({ resolve, window: -1 })).toThrow(ConfigError);
    expect(() => citedValueValidator({ resolve, window: 1.5 })).toThrow(ConfigError);
    expect(() => citedValueValidator({ resolve: 'no' as never })).toThrow(ConfigError);
  });
});

describe('citedValueValidator whole token matching (RV1402, the seventeenth experiment P0-1)', () => {
  // The seventeenth judge's repro: substring matching credited an
  // asserted `3` against a line that says `30`, so the validator
  // judged agreement where the source said otherwise.
  const SOURCE: Record<string, string> = {
    'src/limits.ts:12': 'const maxRetries = 30;',
    'src/limits.ts:13': 'const backoff = 3.5;',
    'src/limits.ts:14': 'const attempts = 3;',
    'src/imports.ts:3': "import { policy } from './myretry.ts';",
    'src/imports.ts:4': "import { policy } from './retry.ts';",
    'src/math.ts:8': 'const sum = a+b;',
    'src/math.ts:9': 'const label = aab;',
  };
  const resolve = (citation: { path: string; line: number }): string | undefined =>
    SOURCE[`${citation.path}:${String(citation.line)}`];
  const validator = citedValueValidator({ resolve });

  it('refuses `3` against a line saying `30`: a substring is not the asserted value', () => {
    const verdict = validator.validate(text('The cap is `3` (`src/limits.ts:12`).'));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('src/limits.ts:12');
  });

  it('refuses `3` against `3.5`: the dot joins a token instead of ending one', () => {
    expect(validator.validate(text('The backoff is `3` (`src/limits.ts:13`).')).ok).toBe(false);
  });

  it('accepts `3` where the line carries 3 as its own token', () => {
    expect(validator.validate(text('The default is `3` (`src/limits.ts:14`).')).ok).toBe(true);
  });

  it('refuses a dotted name inside a longer one and accepts the exact token', () => {
    expect(validator.validate(text('Imported from `retry.ts` (`src/imports.ts:3`).')).ok).toBe(
      false,
    );
    expect(validator.validate(text('Imported from `retry.ts` (`src/imports.ts:4`).')).ok).toBe(
      true,
    );
  });

  it('escapes regex metacharacters in the asserted value', () => {
    expect(validator.validate(text('The sum is `a+b` (`src/math.ts:8`).')).ok).toBe(true);
    expect(validator.validate(text('The sum is `a+b` (`src/math.ts:9`).')).ok).toBe(false);
  });
});

describe('citationTargetsValidator (RV1401, the seventeenth experiment P0-1)', () => {
  // The seventeenth run's answer carried `ghost.ts:0`, a location no
  // checkout ever held, and every configured check passed. This
  // validator resolves EVERY citation of the result text against the
  // host snapshot, with no sentence-level precondition.
  const KNOWN = new Set(['src/auth.ts:10', 'src/auth.ts:11', 'docs/guide.md:4']);
  const calls: { path: string; line: number }[] = [];
  const resolve = (citation: { path: string; line: number }): string | undefined => {
    calls.push({ ...citation });
    return KNOWN.has(`${citation.path}:${String(citation.line)}`) ? 'source line' : undefined;
  };

  it('accepts a text whose citations all resolve, judging repeats once', () => {
    calls.length = 0;
    const validator = citationTargetsValidator({ resolve });
    expect(validator.name).toBe('citation-targets');
    const verdict = validator.validate(
      text('See src/auth.ts:10 and `src/auth.ts:11`; src/auth.ts:10 again (docs/guide.md:4).'),
    );
    expect(verdict).toEqual({ ok: true });
    expect(calls.filter((c) => c.path === 'src/auth.ts' && c.line === 10)).toHaveLength(1);
  });

  it('refuses a fabricated location the resolver does not know', () => {
    const verdict = citationTargetsValidator({ resolve }).validate(
      text('Proven at src/auth.ts:10 and ghost.ts:12.'),
    );
    expect(verdict.ok).toBe(false);
    const reason = verdict.ok ? '' : verdict.reasons[0];
    expect(reason).toContain('ghost.ts:12');
    expect(reason).not.toContain('src/auth.ts:10');
  });

  it('refuses line 0 before the resolver runs: source lines are 1-based', () => {
    calls.length = 0;
    const verdict = citationTargetsValidator({ resolve }).validate(text('Held at ghost.ts:0.'));
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('1-based');
    expect(calls).toHaveLength(0);
  });

  it('refuses a line too large for a safe integer instead of resolving it', () => {
    calls.length = 0;
    const digits = '9'.repeat(20);
    const verdict = citationTargetsValidator({ resolve }).validate(
      text(`Held at src/auth.ts:${digits}.`),
    );
    expect(verdict.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('refuses a custom-pattern match that does not parse as path:line', () => {
    const verdict = citationTargetsValidator({ resolve, pattern: 'REF \\d+' }).validate(
      text('Recorded as REF 12.'),
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('REF 12');
  });

  it("fencedCode 'excluded' strips fenced code first; the default still counts it", () => {
    const body = 'Real src/auth.ts:10.\n```\nghost.ts:12\n```\n';
    expect(
      citationTargetsValidator({ resolve, fencedCode: 'excluded' }).validate(text(body)),
    ).toEqual({ ok: true });
    expect(citationTargetsValidator({ resolve }).validate(text(body)).ok).toBe(false);
  });

  it('passes a text carrying no citation at all: counting is another validator', () => {
    expect(citationTargetsValidator({ resolve }).validate(text('no provenance here'))).toEqual({
      ok: true,
    });
  });

  it('caps the listed citations at 20 and counts the rest', () => {
    const many = Array.from({ length: 25 }, (_, i) => `src/miss${String(i)}.ts:1`);
    const verdict = citationTargetsValidator({ resolve }).validate(text(many.join(' ')));
    expect(verdict.ok ? '' : verdict.reasons[0]).toContain('and 5 more');
  });

  it('refuses malformed intake typed', () => {
    expect(() => citationTargetsValidator({ resolve: 'no' as never })).toThrow(ConfigError);
    expect(() => citationTargetsValidator({ resolve, pattern: '(' })).toThrow(/does not compile/);
    expect(() => citationTargetsValidator({ resolve, pattern: '\\d*' })).toThrow(/empty string/);
    expect(() => citationTargetsValidator({ resolve, fencedCode: 'nope' as never })).toThrow(
      ConfigError,
    );
  });
});

/**
 * The invisible format character lint (RV1509). The seventeenth
 * comparison run's answer carried five U+200B characters immediately
 * before hidden-file citations, and every configured check passed
 * because the citation regex simply excluded the invisible byte from
 * the match: the literal text was not byte-identical to any repo path,
 * and nothing said so.
 */
describe('formatCharacterValidator (RV1509)', () => {
  it('rejects a zero-width character with its codepoint, index, and context', () => {
    const validator = formatCharacterValidator();
    const text = 'A citation [​.github/workflows/ci.yml:82] rides here.';
    const verdict = validator.validate({ result: text, text });
    expect(verdict.ok).toBe(false);
    const reasons = (verdict as { reasons: string[] }).reasons;
    expect(reasons.join(' ')).toContain('U+200B');
    expect(reasons.join(' ')).toContain('index 12');
    expect(reasons.join(' ')).toContain('.github');
  });

  it('passes clean text and lists each distinct character once with a count', () => {
    const validator = formatCharacterValidator();
    const clean = validator.validate({ result: 'plain text', text: 'plain text' });
    expect(clean.ok).toBe(true);
    const text = 'a​b​c⁠d';
    const verdict = validator.validate({ result: text, text });
    const reasons = (verdict as { reasons: string[] }).reasons;
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toContain('U+200B');
    expect(reasons[0]).toContain('2 occurrence');
    expect(reasons[1]).toContain('U+2060');
  });

  it('an allow list admits exactly the named characters', () => {
    const validator = formatCharacterValidator({ allow: ['‍'] });
    const joined = 'emoji joiner ‍ only';
    expect(validator.validate({ result: joined, text: joined }).ok).toBe(true);
    const mixed = 'joiner ‍ and zwsp ​';
    expect(validator.validate({ result: mixed, text: mixed }).ok).toBe(false);
  });

  it('refuses a non format character in the allow list, fail closed', () => {
    expect(() => formatCharacterValidator({ allow: ['x'] })).toThrow(ConfigError);
  });
});

describe('the repair guidance composes across the bundle (RV2202, the RV2106 mirror run)', () => {
  const LINES: Record<number, string> = { 12: 'const maxAttempts = 3;' };
  const resolve = (citation: { path: string; line: number }): string | undefined =>
    citation.path === 'src/retry.ts' && citation.line >= 1 && citation.line <= 40
      ? (LINES[citation.line] ?? '')
      : undefined;

  it('the verdict steers toward the separate-sentence composition', () => {
    const verdict = evidenceGradeValidator().validate(
      text('The loop is live-observed to retry three times.'),
    );
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons[0]).toContain('SEPARATE sentence carrying no source citation');
    expect(verdict.reasons[0]).toContain('trades this failure for a cited-value one');
    expect(verdict.reasons[0]).not.toContain('beside it');
  });

  it('text following the guidance passes evidence-grade AND cited-value together', () => {
    // A value sentence with its citation, and the graded claim in its
    // own sentence carrying the run id: the shape the verdict steers to.
    const guided =
      'The retry loop caps attempts at `3` (`src/retry.ts:12`). ' +
      'That cap is live-observed in run 01KZGBNQJJMPX512BTHP0F5GNZ.';
    expect(evidenceGradeValidator().validate(text(guided)).ok).toBe(true);
    expect(citedValueValidator({ resolve }).validate(text(guided)).ok).toBe(true);
  });

  it('the mirror-run trap shape still fails cited-value, never both repairs', () => {
    // What the older wording produced: an inline run id woven into the
    // citation-bearing sentence. evidence-grade is satisfied (a run
    // artifact rides the sentence), and cited-value rejects the run id
    // against the cited window: the exact c3 collision, now named by
    // the guidance instead of steered into.
    const trap = 'The cap is live-observed as `01KZGBNQJJMPX512BTHP0F5GNZ` at `src/retry.ts:12`.';
    expect(evidenceGradeValidator().validate(text(trap)).ok).toBe(true);
    const verdict = citedValueValidator({ resolve }).validate(text(trap));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons.join(' ')).toContain('01KZGBNQJJMPX512BTHP0F5GNZ');
  });
});

describe("the run's own id is an artifact (RV2501, the 1.226.0 comparison run)", () => {
  // The two sentence SHAPES the comparison run died on at journal seq
  // 122, translated (the framework is English only, fixtures
  // included). The first quotes the engine's own RUN FACTS line, the
  // second DENIES the grade it names; neither can carry a file:line
  // citation honestly, and the run id the verdict told the model to
  // write matched no artifact pattern at all.
  const RUN_ID = 'comparison-rulvar-v12260-aug09-1786272840549';
  const LIVE =
    '**Live-observed in this workflow**, strictly per the RUN FACTS sheet: scope ' +
    '`settled-children-only`; children 4; wireRequests 70.';
  const DENIAL = '**Production-proven** evidence was not established.';

  const withId = (value: string): FinishValidationInput => ({
    result: value,
    text: value,
    runId: RUN_ID,
  });

  it('rejects the frozen pair when no id is supplied, the historical verdict', () => {
    const verdict = evidenceGradeValidator().validate(text(`${LIVE} ${DENIAL}`));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons[0]).toContain('live-observed, production-proven');
    expect(verdict.reasons[0]).toContain('SEPARATE sentence carrying no source citation');
    expect(verdict.reasons).toHaveLength(3);
  });

  it('accepts the same claims once each sentence carries the run id', () => {
    const repaired =
      `${LIVE.slice(0, -1)}, run ${RUN_ID}. ` + `${DENIAL.slice(0, -1)} in run ${RUN_ID}.`;
    expect(evidenceGradeValidator().validate(withId(repaired)).ok).toBe(true);
    // The repair is composition safe: the graded sentences carry no
    // source citation, so cited-value never judges the id against a
    // cited window (RV2202).
    expect(
      citedValueValidator({ resolve: () => 'const maxAttempts = 3;' }).validate(withId(repaired))
        .ok,
    ).toBe(true);
  });

  it('names the id it wants written, so the repair instruction is executable', () => {
    const verdict = evidenceGradeValidator().validate(withId(DENIAL));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) {
      return;
    }
    expect(verdict.reasons[0]).toContain(`write this run's id ${RUN_ID}`);
    expect(verdict.reasons[0]).toContain('keep that sentence free of source citations');
    expect(verdict.reasons[0]).toContain('trades this failure for a cited-value one');
    expect(verdict.reasons[0]).not.toContain('beside it');
  });

  it('supplying the id changes nothing for a sentence that does not carry it', () => {
    const bare = evidenceGradeValidator().validate(text(LIVE));
    const withRun = evidenceGradeValidator().validate(withId(LIVE));
    expect(bare.ok).toBe(false);
    expect(withRun.ok).toBe(false);
    if (bare.ok || withRun.ok) {
      return;
    }
    expect(withRun.reasons.slice(1)).toEqual(bare.reasons.slice(1));
  });

  it('credits the id only in the sentence that makes the claim', () => {
    // RV2501 rides RV1212, it does not soften it: an id in a header
    // three paragraphs up licenses nothing.
    const split = `Run ${RUN_ID} settled ok. The loop is live-observed to retry three times.`;
    expect(evidenceGradeValidator().validate(withId(split)).ok).toBe(false);
  });

  it('credits the id only as a whole token', () => {
    const glued = `The loop is live-observed in x${RUN_ID}y.`;
    expect(evidenceGradeValidator().validate(withId(glued)).ok).toBe(false);
    const quoted = `The loop is live-observed in \`${RUN_ID}\`.`;
    expect(evidenceGradeValidator().validate(withId(quoted)).ok).toBe(true);
  });

  it('ignores an id too short to be an identifier, never a fail open', () => {
    const short = { result: 'a live-observed run', text: 'a live-observed run', runId: 'a' };
    expect(evidenceGradeValidator().validate(short).ok).toBe(false);
    const blank = { result: 'a live-observed run', text: 'a live-observed run', runId: '   ' };
    expect(evidenceGradeValidator().validate(blank).ok).toBe(false);
  });

  it('still accepts the historical artifact shapes when an id is supplied', () => {
    const cited = 'The cap is live-observed at `src/retry.ts:12`.';
    expect(evidenceGradeValidator().validate(withId(cited)).ok).toBe(true);
  });
});
