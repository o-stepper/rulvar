import { describe, expect, it } from 'vitest';

import { TRUNCATION_MARKER, truncateToBudget } from './truncate.js';

describe('truncateToBudget (v1.35.0 review P2-2)', () => {
  it('returns strings within the budget unchanged', () => {
    expect(truncateToBudget('abc', 3)).toBe('abc');
    expect(truncateToBudget('abc', 10)).toBe('abc');
    expect(truncateToBudget('', 0)).toBe('');
  });

  it('bounds longer strings to EXACTLY the budget, marker included', () => {
    expect(truncateToBudget('abcdefgh', 6)).toBe('abc...');
    expect(truncateToBudget('W'.repeat(264), 32)).toBe(`${'W'.repeat(29)}...`);
    expect(truncateToBudget('W'.repeat(264), 32)).toHaveLength(32);
  });

  it('keeps the bound below the marker length with a bare slice', () => {
    expect(truncateToBudget('abcdefgh', 0)).toBe('');
    expect(truncateToBudget('abcdefgh', 1)).toBe('a');
    expect(truncateToBudget('abcdefgh', 2)).toBe('ab');
    expect(truncateToBudget('abcdefgh', 3)).toBe(TRUNCATION_MARKER);
  });

  it('never exceeds the budget for any length', () => {
    for (const budget of [0, 1, 2, 3, 4, 32, 400]) {
      for (const length of [0, 1, 2, 3, 4, 31, 32, 33, 399, 400, 401, 4000]) {
        expect(truncateToBudget('x'.repeat(length), budget).length).toBeLessThanOrEqual(budget);
      }
    }
  });
});
