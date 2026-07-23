/**
 * Repeated-claim deduplication (RV-211 remainder). Reproduced on
 * published 1.53.0: two children reporting the byte-identical claim put
 * it into the synthesis model call twice, verbatim, with no index. These
 * tests pin the pure fold: first occurrence survives verbatim, later
 * occurrences vanish, matching is whitespace-collapsed exact equality
 * and never fuzzy, empty lines are structure, and the whole fold is
 * deterministic.
 */
import { describe, expect, it } from 'vitest';

import { dedupeRepeatedClaims } from './claims.js';

describe('dedupeRepeatedClaims (RV-211 remainder)', () => {
  it('keeps the first occurrence and drops later ones across rows', () => {
    const out = dedupeRepeatedClaims([
      { nodeId: 'a', text: 'CLAIM: cache is stale\nunique to a' },
      { nodeId: 'b', text: 'CLAIM: cache is stale\nunique to b' },
      { nodeId: 'c', text: 'unique to c\nCLAIM: cache is stale' },
    ]);
    expect(out.rows).toEqual([
      { nodeId: 'a', text: 'CLAIM: cache is stale\nunique to a' },
      { nodeId: 'b', text: 'unique to b' },
      { nodeId: 'c', text: 'unique to c' },
    ]);
    expect(out.repeated).toEqual([
      { claim: 'CLAIM: cache is stale', nodeIds: ['a', 'b', 'c'], count: 3 },
    ]);
  });

  it('matches whitespace-collapsed but never fuzzily', () => {
    const out = dedupeRepeatedClaims([
      { nodeId: 'a', text: 'the   cache is\tstale' },
      { nodeId: 'b', text: '  the cache is stale  ' },
      { nodeId: 'c', text: 'The cache is stale' },
    ]);
    // b collapses to the same key as a; c differs by case and is a
    // DISTINCT claim that must never merge.
    expect(out.rows).toEqual([
      { nodeId: 'a', text: 'the   cache is\tstale' },
      { nodeId: 'b', text: '' },
      { nodeId: 'c', text: 'The cache is stale' },
    ]);
    expect(out.repeated).toEqual([
      { claim: 'the   cache is\tstale', nodeIds: ['a', 'b'], count: 2 },
    ]);
  });

  it('keeps empty lines as structure and counts within-row repeats once per reporter', () => {
    const out = dedupeRepeatedClaims([
      { nodeId: 'a', text: 'same line\n\nsame line' },
      { nodeId: 'b', text: '\nsame line\n' },
    ]);
    expect(out.rows).toEqual([
      { nodeId: 'a', text: 'same line\n' },
      { nodeId: 'b', text: '\n' },
    ]);
    expect(out.repeated).toEqual([{ claim: 'same line', nodeIds: ['a', 'b'], count: 3 }]);
  });

  it('reports nothing repeated when every line is unique', () => {
    const input = [
      { nodeId: 'a', text: 'alpha' },
      { nodeId: 'b', text: 'beta' },
    ];
    const out = dedupeRepeatedClaims(input);
    expect(out.rows).toEqual(input);
    expect(out.repeated).toEqual([]);
  });

  it('is deterministic: identical input folds to deep-equal output', () => {
    const input = [
      { nodeId: 'a', text: 'x\ny\nx' },
      { nodeId: 'b', text: 'y\nz' },
    ];
    expect(dedupeRepeatedClaims(input)).toEqual(dedupeRepeatedClaims(input));
  });
});
