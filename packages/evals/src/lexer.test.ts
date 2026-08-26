import { describe, expect, it } from 'vitest';

import { ConfigError } from '@rulvar/core';

import { lexContractAudit } from './lexer.js';

describe('the contract audit lexer (RV4603)', () => {
  it('counts citations with known extensions and rejects property notation', () => {
    const lex = lexContractAudit(
      'The floor lives at packages/core/src/engine/engine.ts:885 and the docs at ' +
        'docs/guide/installation.md:14, while acceptance.minSpawnedChildren:4 is a ' +
        'config property in citation clothing.',
    );
    expect(lex.citationOccurrences).toBe(2);
    expect(lex.uniqueAnchors).toEqual([
      'packages/core/src/engine/engine.ts:885',
      'docs/guide/installation.md:14',
    ]);
    expect(lex.rejected).toEqual([
      { raw: 'acceptance.minSpawnedChildren:4', reason: 'unknown-extension' },
    ]);
  });

  it('keeps range tails and dedupes unique anchors across occurrences', () => {
    const lex = lexContractAudit(
      'See src/store.ts:20-31 for the lease, src/store.ts:20-31 again, and src/store.ts:40.',
    );
    expect(lex.citationOccurrences).toBe(3);
    expect(lex.citations[0]?.endLine).toBe(31);
    expect(lex.uniqueAnchors).toEqual(['src/store.ts:20-31', 'src/store.ts:40']);
  });

  it('excludes fenced code by default and counts it only on request', () => {
    const text = 'Prose cites src/a.ts:1.\n\n```\nsrc/b.ts:2 and N01: inside the fence\n```\n';
    const excluded = lexContractAudit(text);
    expect(excluded.citationOccurrences).toBe(1);
    expect(excluded.distinctRequirementCounts.N).toBe(0);
    const counted = lexContractAudit(text, { fencedCode: 'counted' });
    expect(counted.citationOccurrences).toBe(2);
    expect(counted.distinctRequirementCounts.N).toBe(1);
  });

  it('never matches a backslash path; the citation shape is repo relative', () => {
    const lex = lexContractAudit('A windows shaped src\\store.ts:3 is not a citation.');
    // The backslash breaks the span: what remains is 'store.ts:3'.
    expect(lex.uniqueAnchors).toEqual(['store.ts:3']);
  });

  it('rejects a citation the supplied resolver cannot resolve', () => {
    const lex = lexContractAudit('Real: src/a.ts:1. Fabricated: src/ghost.ts:9.', {
      resolve: (target) => (target.path === 'src/a.ts' ? 'line one' : undefined),
    });
    expect(lex.citationOccurrences).toBe(1);
    expect(lex.rejected).toEqual([{ raw: 'src/ghost.ts:9', reason: 'unresolved' }]);
  });

  it('attributes occurrences to their H2 sections', () => {
    const lex = lexContractAudit(
      '## One\ncites src/a.ts:1 and src/a.ts:2.\n\n## Two\ncites src/a.ts:3.\n',
    );
    expect(lex.perSection).toEqual([
      { heading: '## One', citations: 2 },
      { heading: '## Two', citations: 1 },
    ]);
  });

  it('reads the colon, dash, and table id forms as one vocabulary', () => {
    const colon = 'N01: the floor refuses. N02: the roster is closed.';
    const dash = '- N01 — the floor refuses.\n- N02 – the roster is closed.';
    const table = '| id | claim |\n| --- | --- |\n| N01 | the floor refuses |\n| N02 | closed |';
    for (const [text, form] of [
      [colon, 'colon'],
      [dash, 'dash'],
      [table, 'table'],
    ] as const) {
      const lex = lexContractAudit(text);
      expect(lex.distinctRequirementCounts.N).toBe(2);
      expect(lex.requirementIds.N?.[0]?.form).toBe(form);
    }
  });

  it('a plain hyphen after a list id is the dash form too', () => {
    const lex = lexContractAudit('- R07 - owner Host Identity; STOP until signed.');
    expect(lex.requirementIds.R?.[0]?.form).toBe('dash');
    expect(lex.distinctRequirementCounts.R).toBe(1);
  });

  it('counts DISTINCT ids: repeated mentions and cross references collapse', () => {
    const lex = lexContractAudit('N01: stated once. Later N01 returns bare, and C12: appears.');
    expect(lex.distinctRequirementCounts).toEqual({ N: 1, R: 0, C: 1 });
    expect(lex.requirementIds.N).toHaveLength(2);
  });

  it('a single digit or a foreign family is never an id', () => {
    const lex = lexContractAudit('C4 explodes, P01 belongs to plans, RV4603 is a review id.');
    expect(lex.distinctRequirementCounts).toEqual({ N: 0, R: 0, C: 0 });
  });

  it('honors custom families', () => {
    const lex = lexContractAudit('P01: a plan item. N01: ignored now.', { families: ['P'] });
    expect(lex.distinctRequirementCounts).toEqual({ P: 1 });
  });

  it('refuses malformed options typed', () => {
    expect(() => lexContractAudit('', { pattern: '(' })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { pattern: 'a*' })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { extensions: [] })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { extensions: ['.ts'] })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { families: ['NN'] })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { families: ['N', 'N'] })).toThrow(ConfigError);
    expect(() => lexContractAudit('', { fencedCode: 'stripped' as unknown as 'excluded' })).toThrow(
      ConfigError,
    );
    expect(() => lexContractAudit('', { resolve: 'nope' as unknown as () => undefined })).toThrow(
      ConfigError,
    );
  });
});

describe('the seventh experiment golden shapes (RV4603)', () => {
  // Miniatures of the two real documents: the winning answer wrote its
  // requirement sets as dash led list items (the harness counted zero),
  // the candidate wrote colon runs and tables (counted fine), and the
  // winner carried one config property the harness counted as a
  // citation. Equivalent forms must count equal.
  const WINNER_SHAPE =
    '## 11. Negative scenarios\n' +
    '- N01 — Intake with `sponsor` silently drops: packages/core/src/engine/engine.ts:885.\n' +
    '- N02 — Regulated intake must refuse: packages/core/src/engine/engine.ts:1002.\n' +
    '- R01 — Critical/high; owner Host Identity.\n' +
    '- C01 — Claim about revocable approvals.\n' +
    'And a property acceptance.minSpawnedChildren:4 in prose.\n';
  const CANDIDATE_SHAPE =
    '## Negative scenarios\n' +
    'N01: Node below the floor fails. N02: mixed versions break.\n' +
    '| R01 | package incompatibility | Release |\n' +
    '**Counterexamples.** C01: evidence entries look sufficient.\n' +
    'Anchored at packages/core/src/engine/engine.ts:885 and engine.ts:1002.\n';

  it('the dash led winner and the colon and table candidate count equal sets', () => {
    const winner = lexContractAudit(WINNER_SHAPE);
    const candidate = lexContractAudit(CANDIDATE_SHAPE);
    expect(winner.distinctRequirementCounts).toEqual({ N: 2, R: 1, C: 1 });
    expect(candidate.distinctRequirementCounts).toEqual({ N: 2, R: 1, C: 1 });
    expect(winner.citationOccurrences).toBe(2);
    expect(winner.rejected).toEqual([
      { raw: 'acceptance.minSpawnedChildren:4', reason: 'unknown-extension' },
    ]);
    expect(candidate.citationOccurrences).toBe(2);
  });
});
