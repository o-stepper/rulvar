import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';

import {
  anchorGroundingFindingsOf,
  anchorGroundingValidator,
  MAX_ANCHOR_GROUNDING_FINDINGS,
} from './anchor-grounding.js';
import type { CitationTarget } from './finish-validators.js';

const FILES: Record<string, string[]> = {
  'pkg/manifest.json': [
    '{',
    '  "name": "@acme/widget",',
    '  "version": "3.2.1",',
    '  "description": "The widget umbrella: re-exports the runtime.",',
    '  "exports": {',
    '    ".": {',
    '      "types": "./index.d.ts",',
    '      "default": "./index.js"',
    '    }',
    '  },',
    '  "sideEffects": false,',
    '  "dependencies": {',
    '    "@acme/runtime": "^3.2.1",',
    '    "@acme/telemetry": "workspace:*"',
    '  }',
    '}',
  ],
  'src/engine.ts': [
    '/**',
    ' * The retry policy of the dispatcher: every wire is retried',
    ' * with exponential backoff, and the budget layer refuses a',
    ' * retry the caller cannot afford.',
    ' */',
    'export interface RetryPolicy {',
    '  maxAttempts?: number;',
    '  backoffMs: number;',
    '}',
    '',
    'export function dispatchWithRetry(policy: RetryPolicy): void {',
    '  void policy;',
    '}',
  ],
  'guide/install.md': [
    '# Install',
    '',
    'Plain prose about nothing in particular.',
    '',
    '## The unscoped alias',
    '',
    'The bare name is a pointer that re-exports the scoped package.',
    'Projects should depend on the scoped name directly.',
    '',
    '## Verifying',
    '',
    'The `verifyInstall` helper checks the tree.',
  ],
};

const resolve = (target: CitationTarget): string | undefined =>
  FILES[target.path]?.[target.line - 1];

describe('the anchor grounding lint (RV4601)', () => {
  it('flags a json leaf anchor whose claim asserts identifiers living in another block', () => {
    const findings = anchorGroundingFindingsOf(
      'The widget depends on Runtime and OpenTelemetry pkg/manifest.json:2; nothing else matters.',
      { resolve },
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.anchor).toBe('pkg/manifest.json:2');
    expect(finding?.scope).toBe('clause');
    expect(finding?.windowFirstLine).toBe(1);
    expect(finding?.windowLastLine).toBe(4);
    expect(finding?.suggestions.map((entry) => entry.line)).toContain(14);
  });

  it('convicts the json anchor of a compound sentence through the sentence pass', () => {
    // The caret is asserted in the FIRST clause; both anchors sit in
    // the second. The clause pass has nothing to decide with, and the
    // sentence pass convicts the file that carries the caret.
    const findings = anchorGroundingFindingsOf(
      'The alias has a caret dependency, so pin the scoped name directly ' +
        'guide/install.md:5 pkg/manifest.json:5.',
      { resolve },
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.anchor).toBe('pkg/manifest.json:5');
    expect(finding?.scope).toBe('sentence');
    expect(finding?.tokens).toEqual(['^']);
    expect(finding?.suggestions[0]?.line).toBe(13);
  });

  it('passes a json block anchor whose block carries the asserted identifier', () => {
    const findings = anchorGroundingFindingsOf(
      'The dependencies block pins `@acme/runtime` pkg/manifest.json:12.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('passes a block comment anchor whose declaration below carries the identifier', () => {
    // `backoffMs` lives at line 8, below the comment unit, inside the
    // grace tail: a comment documents what follows it.
    const findings = anchorGroundingFindingsOf(
      'Dispatch retries with `backoffMs` src/engine.ts:2.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('passes a function declaration anchor matched through its camel parts', () => {
    const findings = anchorGroundingFindingsOf(
      'The dispatcher entry point is dispatchWithRetry src/engine.ts:11.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('passes an optional qualifier claim anchored at the interface field', () => {
    const findings = anchorGroundingFindingsOf(
      'The `maxAttempts` field is optional src/engine.ts:7.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('passes a heading anchor whose section body carries the assertion', () => {
    const findings = anchorGroundingFindingsOf(
      'The pointer re-exports the scoped package guide/install.md:5.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('plain words never decide: a lowercase word absent from the window cannot flag', () => {
    // 'telemetry' lives at line 14, outside the cited block, but a
    // plain prose word is too weak a signal against paraphrase.
    const findings = anchorGroundingFindingsOf(
      'The manifest declares telemetry pkg/manifest.json:5.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('never flags a negated claim whose token the file nowhere contains', () => {
    // The file truthfully contains no such identifier: claim truth is
    // the semantic judges' question, and the lint has no better line
    // to point at.
    const findings = anchorGroundingFindingsOf(
      'The manifest never declares a `postinstall` hook pkg/manifest.json:2.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('excludes identity spans: versions never convict an anchor', () => {
    const findings = anchorGroundingFindingsOf('The manifest is at 9.9.9 pkg/manifest.json:5.', {
      resolve,
    });
    expect(findings).toEqual([]);
  });

  it('excludes tokens naming the anchor path itself', () => {
    const findings = anchorGroundingFindingsOf(
      'The manifest shape is declared pkg/manifest.json:5.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('skips an anchor nothing resolves; existence is citation-targets territory', () => {
    const findings = anchorGroundingFindingsOf(
      'The caret dependency of `@acme/runtime` lives at missing/file.json:3.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('ignores anchors inside fenced code', () => {
    const findings = anchorGroundingFindingsOf(
      'Prose before.\n\n```\nThe widget depends on OpenTelemetry pkg/manifest.json:2.\n```\n',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('lints every anchor of a compound sentence against its own clause', () => {
    // Each clause names an identifier its own anchor carries; neither
    // anchor is convicted by the other clause's vocabulary.
    const findings = anchorGroundingFindingsOf(
      'The `RetryPolicy` interface is exported src/engine.ts:6, and the `verifyInstall` ' +
        'helper checks the tree guide/install.md:12.',
      { resolve },
    );
    expect(findings).toEqual([]);
  });

  it('honors host stop words and lexicon extensions', () => {
    const flagged = anchorGroundingFindingsOf(
      'The alias uses a hat dependency pkg/manifest.json:5.',
      {
        resolve,
        lexicon: { hat: '^' },
      },
    );
    expect(flagged).toHaveLength(1);
    const silenced = anchorGroundingFindingsOf(
      'The Widget depends on OpenTelemetry pkg/manifest.json:2.',
      { resolve, stopWords: ['opentelemetry', 'widget'] },
    );
    expect(silenced).toEqual([]);
  });

  it('caps the findings list', () => {
    const sentence = Array.from(
      { length: MAX_ANCHOR_GROUNDING_FINDINGS + 3 },
      (_, index) => `Claim ${String(index)} asserts OpenTelemetry pkg/manifest.json:2.`,
    ).join(' ');
    const findings = anchorGroundingFindingsOf(sentence, { resolve });
    expect(findings.length).toBeLessThanOrEqual(MAX_ANCHOR_GROUNDING_FINDINGS);
  });

  it('refuses a resolve that is not a function, a bad pattern, and empty stop words', () => {
    expect(() =>
      anchorGroundingFindingsOf('', { resolve: 'nope' as unknown as typeof resolve }),
    ).toThrow(ConfigError);
    expect(() => anchorGroundingFindingsOf('', { resolve, pattern: '(' })).toThrow(ConfigError);
    expect(() => anchorGroundingFindingsOf('', { resolve, pattern: 'a*' })).toThrow(ConfigError);
    expect(() => anchorGroundingFindingsOf('', { resolve, stopWords: [''] })).toThrow(ConfigError);
    expect(() => anchorGroundingFindingsOf('', { resolve, lexicon: { hat: '' } })).toThrow(
      ConfigError,
    );
  });
});

describe('the anchor grounding validator surface (RV4601)', () => {
  it('carries the default name and accepts an override', () => {
    expect(anchorGroundingValidator({ resolve }).name).toBe('anchor-grounding');
    expect(anchorGroundingValidator({ resolve, name: 'grounding' }).name).toBe('grounding');
  });

  it('renders one reason per finding, naming the window, the tokens, and the exact lines', () => {
    const validator = anchorGroundingValidator({ resolve });
    const verdict = validator.validate({
      result: null,
      text: 'The widget depends on Runtime and OpenTelemetry pkg/manifest.json:2.',
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reasons).toHaveLength(1);
      expect(verdict.reasons[0]).toContain('pkg/manifest.json:2');
      expect(verdict.reasons[0]).toContain('lines 1..4');
      expect(verdict.reasons[0]).toContain('line 14');
      expect(verdict.reasons[0]).toContain('move the citation');
    }
  });

  it('rejects bad options at construction, never as a repair turn', () => {
    expect(() => anchorGroundingValidator({ resolve, pattern: '(' })).toThrow(ConfigError);
  });
});

describe("the seventh candidate's two wrong anchors (RV4601)", () => {
  // The two cited files of the frozen 1.248.0 tree, structure intact
  // with long strings shortened (the fixture's own line numbers
  // therefore differ from the frozen file's): the seventh comparison
  // experiment's independent audit found exactly these two wrong line
  // citations, and this corpus pins that both are caught with an
  // exact line suggestion while the audited correct anchors of the
  // same shape stay silent.
  const SEVENTH: Record<string, string[]> = {
    'pointer/package.json': [
      '{',
      '  "name": "rulvar",',
      '  "version": "1.248.0",',
      '  "description": "Pointer to the Rulvar umbrella package: install @rulvar/rulvar (or ' +
        'this alias, which re-exports it).",',
      '  "type": "module",',
      '  "license": "Apache-2.0",',
      '  "engines": {',
      '    "node": ">=22.12.0"',
      '  },',
      '  "exports": {',
      '    ".": {',
      '      "types": "./index.d.ts",',
      '      "default": "./index.js"',
      '    },',
      '    "./package.json": "./package.json"',
      '  },',
      '  "files": [',
      '    "index.js",',
      '    "index.d.ts"',
      '  ],',
      '  "sideEffects": false,',
      '  "dependencies": {',
      '    "@rulvar/rulvar": "^1.248.0"',
      '  }',
      '}',
    ],
    'packages/rulvar/package.json': [
      '{',
      '  "name": "@rulvar/rulvar",',
      '  "version": "1.248.0",',
      '  "description": "Rulvar umbrella package: re-exports @rulvar/core, both first-class ' +
        'adapters, the file store, and the terminal progress renderer.",',
      '  "type": "module",',
      '  "license": "Apache-2.0",',
      '  "engines": {',
      '    "node": ">=22.12.0"',
      '  },',
      '  "exports": {',
      '    ".": {',
      '      "types": "./dist/index.d.ts",',
      '      "default": "./dist/index.js"',
      '    },',
      '    "./package.json": "./package.json"',
      '  },',
      '  "files": [',
      '    "dist"',
      '  ],',
      '  "sideEffects": false,',
      '  "publishConfig": {',
      '    "access": "public"',
      '  },',
      '  "scripts": {',
      '    "build": "tsdown"',
      '  },',
      '  "dependencies": {',
      '    "@rulvar/core": "workspace:*",',
      '    "@rulvar/anthropic": "workspace:*",',
      '    "@rulvar/openai": "workspace:*"',
      '  }',
      '}',
    ],
  };
  const seventhResolve = (target: CitationTarget): string | undefined =>
    SEVENTH[target.path]?.[target.line - 1];

  it('catches the umbrella dependencies cited at the name line, suggesting the exact lines', () => {
    // The candidate wrote the claim in Russian; the fixture carries an
    // English rendering with the identifier tokens and the clause
    // shape byte compatible (the source Cyrillic gate keeps fixtures
    // English), and the PR corpus run reads the original bytes.
    const findings = anchorGroundingFindingsOf(
      'The umbrella depends on core, Anthropic and OpenAI packages/rulvar/package.json:2; ' +
        'plan, planner, stores and executor install explicitly.',
      { resolve: seventhResolve },
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.anchor).toBe('packages/rulvar/package.json:2');
    expect(finding?.tokens).toContain('OpenAI');
    expect(finding?.suggestions.map((entry) => entry.line)).toContain(30);
  });

  it('catches the caret dependency cited at the exports block, suggesting the caret line', () => {
    const findings = anchorGroundingFindingsOf(
      'The unscoped pointer has a caret dependency, so production pins the scoped ' +
        'umbrella directly pointer/package.json:10.',
      { resolve: seventhResolve },
    );
    expect(findings).toHaveLength(1);
    const finding = findings[0];
    expect(finding?.anchor).toBe('pointer/package.json:10');
    expect(finding?.tokens).toEqual(['^']);
    expect(finding?.windowFirstLine).toBe(10);
    expect(finding?.windowLastLine).toBe(16);
    expect(finding?.suggestions[0]?.line).toBe(23);
  });

  it('stays silent on the audited correct anchors of the same files', () => {
    const findings = anchorGroundingFindingsOf(
      'The umbrella depends on core, Anthropic and OpenAI packages/rulvar/package.json:27. ' +
        'The unscoped pointer has a caret dependency pointer/package.json:22.',
      { resolve: seventhResolve },
    );
    expect(findings).toEqual([]);
  });
});
