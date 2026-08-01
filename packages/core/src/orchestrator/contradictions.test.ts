/**
 * The bounded contradiction pass, pure half (RV1301). Reproduced on
 * published 1.149.0: nothing anywhere compares one child's claims
 * against another's, so two children crediting one source line with
 * different values both rode into synthesis and the model silently
 * picked one. These tests pin the narrow rule that makes a finding
 * always explainable in one sentence (two DIFFERENT children credit the
 * same cited location with different values for the same key), its
 * deliberate non-findings, and the bounds that keep the fold cheap.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';

import { findContradictions } from './contradictions.js';

describe('findContradictions (RV1301)', () => {
  it('reports two children crediting one cited line with different values for one key', () => {
    expect(
      findContradictions([
        { nodeId: 'reader-a', text: 'The retry default is `attempts: 3` (`src/retry.ts:33`).' },
        { nodeId: 'reader-b', text: 'The retry default is `attempts: 5` (`src/retry.ts:33`).' },
      ]),
    ).toEqual([
      {
        anchor: 'src/retry.ts:33',
        key: 'attempts',
        claims: [
          {
            value: '3',
            nodeIds: ['reader-a'],
            excerpt: 'The retry default is `attempts: 3` (`src/retry.ts:33`).',
          },
          {
            value: '5',
            nodeIds: ['reader-b'],
            excerpt: 'The retry default is `attempts: 5` (`src/retry.ts:33`).',
          },
        ],
      },
    ]);
  });

  it('groups every reporter of each reading, in first-seen order', () => {
    const found = findContradictions([
      { nodeId: 'a', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
      { nodeId: 'b', text: 'It is `attempts: 5` at `src/retry.ts:33`.' },
      { nodeId: 'c', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].claims.map((claim) => [claim.value, claim.nodeIds])).toEqual([
      ['3', ['a', 'c']],
      ['5', ['b']],
    ]);
  });

  it('does not fire on two different keys of the same line: they are aspects, not a dispute', () => {
    expect(
      findContradictions([
        { nodeId: 'a', text: 'The policy sets `attempts: 3` at `src/retry.ts:33`.' },
        { nodeId: 'b', text: 'The policy sets `backoffMs: 100` at `src/retry.ts:33`.' },
      ]),
    ).toEqual([]);
  });

  it('does not fire on a value with no separator: it asserts nothing comparable', () => {
    expect(
      findContradictions([
        { nodeId: 'a', text: 'The field `attempts` lives at `src/retry.ts:33`.' },
        { nodeId: 'b', text: 'The field `backoff` lives at `src/retry.ts:33`.' },
      ]),
    ).toEqual([]);
  });

  it('does not fire when one child disagrees with itself: the pool is what this judges', () => {
    expect(
      findContradictions([
        {
          nodeId: 'a',
          text:
            'Early it was `attempts: 3` at `src/retry.ts:33`. ' +
            'Later the same line reads `attempts: 5` at `src/retry.ts:33`.',
        },
      ]),
    ).toEqual([]);
  });

  it('does not fire on agreement, nor across different cited lines', () => {
    expect(
      findContradictions([
        { nodeId: 'a', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
        { nodeId: 'b', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
      ]),
    ).toEqual([]);
    expect(
      findContradictions([
        { nodeId: 'a', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
        { nodeId: 'b', text: 'It is `attempts: 5` at `src/retry.ts:40`.' },
      ]),
    ).toEqual([]);
  });

  it('reads an equals separator too, and takes the FIRST separator only', () => {
    const found = findContradictions([
      { nodeId: 'a', text: 'The flag is `mode=fast:2` at `src/run.ts:7`.' },
      { nodeId: 'b', text: 'The flag is `mode=slow:9` at `src/run.ts:7`.' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].key).toBe('mode');
    expect(found[0].claims.map((claim) => claim.value)).toEqual(['fast:2', 'slow:9']);
  });

  it('bounds the output by max and the excerpt by maxExcerptChars', () => {
    const rows = [
      {
        nodeId: 'a',
        text: 'One `attempts: 3` at `src/a.ts:1`. Two `attempts: 3` at `src/b.ts:2`.',
      },
      {
        nodeId: 'b',
        text: 'One `attempts: 5` at `src/a.ts:1`. Two `attempts: 5` at `src/b.ts:2`.',
      },
    ];
    expect(findContradictions(rows)).toHaveLength(2);
    const capped = findContradictions(rows, { max: 1 });
    expect(capped).toHaveLength(1);
    expect(capped[0].anchor).toBe('src/a.ts:1');
    const short = findContradictions(rows, { maxExcerptChars: 10 });
    expect(short[0].claims[0].excerpt).toBe('One `attem');
  });

  it('collapses whitespace in the excerpt so a wrapped sentence stays one line', () => {
    const found = findContradictions([
      { nodeId: 'a', text: 'It reads\n  `attempts: 3`\n  at `src/retry.ts:33`.' },
      { nodeId: 'b', text: 'It reads `attempts: 5` at `src/retry.ts:33`.' },
    ]);
    expect(found[0].claims[0].excerpt).toBe('It reads `attempts: 3` at `src/retry.ts:33`.');
  });

  it('refuses an anchor pattern that can match the empty string, fail closed', () => {
    expect(() => findContradictions([], { pattern: '\\d*' })).toThrow(ConfigError);
    expect(() => findContradictions([], { pattern: '[' })).toThrow(ConfigError);
  });

  it('refuses non positive integer bounds', () => {
    expect(() => findContradictions([], { max: 0 })).toThrow(ConfigError);
    expect(() => findContradictions([], { max: 1.5 })).toThrow(ConfigError);
    expect(() => findContradictions([], { maxExcerptChars: -1 })).toThrow(ConfigError);
  });

  it('is deterministic: identical input folds to deep-equal output', () => {
    const rows = [
      { nodeId: 'a', text: 'It is `attempts: 3` at `src/retry.ts:33`.' },
      { nodeId: 'b', text: 'It is `attempts: 5` at `src/retry.ts:33`.' },
    ];
    expect(findContradictions(rows)).toEqual(findContradictions(rows));
  });
});
