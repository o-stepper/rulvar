/**
 * Unit matrix for the financial-telemetry validator (v1.20.0 review
 * P1-1): every canonical count must be a finite nonnegative integer,
 * with the cache subsets inside the input, and the conservative repair
 * never credits the budget or undercharges.
 */
import { describe, expect, it } from 'vitest';

import type { Usage } from './messages.js';
import { sanitizeTokenCount, sanitizeUsage, sumUsage, usageViolations } from './usage.js';

const VALID: Usage = {
  inputTokens: 100,
  outputTokens: 10,
  cacheReadTokens: 30,
  cacheWriteTokens: 20,
};

describe('usageViolations', () => {
  it('accepts a valid usage, reasoningTokens present or absent', () => {
    expect(usageViolations(VALID)).toEqual([]);
    expect(usageViolations({ ...VALID, reasoningTokens: 0 })).toEqual([]);
    expect(usageViolations({ ...VALID, reasoningTokens: 7 })).toEqual([]);
  });

  it.each([
    'inputTokens',
    'outputTokens',
    'cacheReadTokens',
    'cacheWriteTokens',
    'reasoningTokens',
  ] as const)('flags NaN in %s', (field) => {
    const violations = usageViolations({ ...VALID, [field]: Number.NaN });
    expect(violations.join('; ')).toContain(`${field} is NaN, not a finite number`);
  });

  it('flags Infinity, negatives, and fractions per field', () => {
    expect(usageViolations({ ...VALID, inputTokens: Number.POSITIVE_INFINITY }).join()).toContain(
      'not a finite number',
    );
    expect(usageViolations({ ...VALID, outputTokens: -1 }).join()).toContain(
      'outputTokens is negative (-1)',
    );
    expect(usageViolations({ ...VALID, cacheWriteTokens: 2.5 }).join()).toContain(
      'cacheWriteTokens is fractional (2.5)',
    );
  });

  it('flags a non-number smuggled through a loose cast', () => {
    const violations = usageViolations({ ...VALID, outputTokens: 'x' as unknown as number });
    expect(violations.join()).toContain('outputTokens is x, not a finite number');
  });

  it('flags the subset bound, and a NaN operand cannot vacuously pass it', () => {
    expect(
      usageViolations({
        inputTokens: 10,
        outputTokens: 0,
        cacheReadTokens: 8,
        cacheWriteTokens: 5,
      }).join(),
    ).toContain('inputTokens (10) < cacheReadTokens + cacheWriteTokens (8 + 5)');
    const nanInput = usageViolations({ ...VALID, inputTokens: Number.NaN });
    expect(nanInput.join()).toContain('< cacheReadTokens + cacheWriteTokens');
  });
});

describe('sanitizeTokenCount', () => {
  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [Number.NEGATIVE_INFINITY, 0],
    [-5, 0],
    [-0.5, 0],
    [0, 0],
    [2.25, 3],
    [7, 7],
  ])('repairs %s to %s', (value, expected) => {
    expect(sanitizeTokenCount(value)).toBe(expected);
  });
});

describe('sanitizeUsage', () => {
  it('passes valid usage through structurally unchanged', () => {
    expect(sanitizeUsage(VALID)).toEqual(VALID);
    expect(sanitizeUsage({ ...VALID, reasoningTokens: 0 })).toEqual({
      ...VALID,
      reasoningTokens: 0,
    });
  });

  it('floors garbage to zero and rounds fractions UP, never down', () => {
    expect(
      sanitizeUsage({
        inputTokens: 10.5,
        outputTokens: -3,
        cacheReadTokens: Number.NaN,
        cacheWriteTokens: 2.25,
      }),
    ).toEqual({ inputTokens: 11, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 3 });
  });

  it('clamps the subsets into the input with reads keeping priority', () => {
    expect(
      sanitizeUsage({
        inputTokens: 100,
        outputTokens: 0,
        cacheReadTokens: 80,
        cacheWriteTokens: 50,
      }),
    ).toEqual({ inputTokens: 100, outputTokens: 0, cacheReadTokens: 80, cacheWriteTokens: 20 });
  });

  it('a repaired usage always passes the validator', () => {
    // Deterministic LCG sweep across hostile mixes; the pair contract is
    // that sanitize output is always violation-free.
    let seed = 0x2f6e2b1;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 0x80000000;
      return seed / 0x80000000;
    };
    const hostile = (): number => {
      const roll = next();
      if (roll < 0.15) return Number.NaN;
      if (roll < 0.3) return Number.POSITIVE_INFINITY;
      if (roll < 0.45) return -Math.floor(next() * 1e9);
      if (roll < 0.6) return next() * 1000;
      return Math.floor(next() * 1e9);
    };
    for (let i = 0; i < 500; i += 1) {
      const usage: Usage = {
        inputTokens: hostile(),
        outputTokens: hostile(),
        cacheReadTokens: hostile(),
        cacheWriteTokens: hostile(),
      };
      if (next() > 0.5) {
        usage.reasoningTokens = hostile();
      }
      expect(usageViolations(sanitizeUsage(usage))).toEqual([]);
    }
  });
});

describe('the cache-write TTL split (RV810)', () => {
  const base: Usage = {
    inputTokens: 100,
    outputTokens: 5,
    cacheReadTokens: 20,
    cacheWriteTokens: 30,
  };

  it('accepts a split that sums to cacheWriteTokens and rejects one that does not', () => {
    expect(usageViolations({ ...base, cacheWrite5mTokens: 10, cacheWrite1hTokens: 20 })).toEqual(
      [],
    );
    const short = usageViolations({ ...base, cacheWrite5mTokens: 10, cacheWrite1hTokens: 5 });
    expect(short.join(' ')).toContain('cacheWrite5mTokens + cacheWrite1hTokens');
    expect(short.join(' ')).toContain('30');
  });

  it('a single present split field must equal the whole cacheWriteTokens', () => {
    expect(usageViolations({ ...base, cacheWrite1hTokens: 30 })).toEqual([]);
    expect(usageViolations({ ...base, cacheWrite1hTokens: 29 }).join(' ')).toContain(
      'cacheWrite5mTokens + cacheWrite1hTokens',
    );
  });

  it('split fields obey the count rules: fractional and negative are violations', () => {
    expect(
      usageViolations({ ...base, cacheWrite5mTokens: 10.5, cacheWrite1hTokens: 19.5 }).join(' '),
    ).toContain('cacheWrite5mTokens is fractional');
    expect(
      usageViolations({ ...base, cacheWrite5mTokens: -1, cacheWrite1hTokens: 31 }).join(' '),
    ).toContain('cacheWrite5mTokens is negative');
  });

  it('sanitizeUsage is the identity on a valid split and repairs garbage with 1h priority', () => {
    const valid: Usage = { ...base, cacheWrite5mTokens: 10, cacheWrite1hTokens: 20 };
    expect(sanitizeUsage(valid)).toEqual(valid);
    // Garbage split: the repair keeps the priciest attribution first
    // (1h clamps into the write total, 5m into the remainder), so a
    // repaired charge is never an undercharge.
    const repaired = sanitizeUsage({
      ...base,
      cacheWrite5mTokens: Number.NaN,
      cacheWrite1hTokens: 99,
    });
    expect(repaired.cacheWrite1hTokens).toBe(30);
    expect(repaired.cacheWrite5mTokens).toBe(0);
    expect(usageViolations(repaired)).toEqual([]);
  });

  it('sanitized hostile splits always satisfy the whole invariant', () => {
    let seed = 41;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const hostile = (): number => {
      const roll = next();
      if (roll < 0.2) return Number.NaN;
      if (roll < 0.4) return -Math.floor(next() * 1e6);
      if (roll < 0.6) return next() * 1000;
      return Math.floor(next() * 1e9);
    };
    for (let i = 0; i < 300; i += 1) {
      const usage: Usage = {
        inputTokens: hostile(),
        outputTokens: hostile(),
        cacheReadTokens: hostile(),
        cacheWriteTokens: hostile(),
        cacheWrite5mTokens: hostile(),
        cacheWrite1hTokens: hostile(),
      };
      expect(usageViolations(sanitizeUsage(usage))).toEqual([]);
    }
  });
});

describe('sumUsage (RV1001)', () => {
  it('sums undifferentiated usage byte for byte like the historical fold', () => {
    const sum = sumUsage(VALID, { ...VALID, reasoningTokens: 5 });
    expect(sum).toEqual({
      inputTokens: 200,
      outputTokens: 20,
      cacheReadTokens: 60,
      cacheWriteTokens: 40,
      reasoningTokens: 5,
    });
    expect(sumUsage(VALID, VALID)).not.toHaveProperty('reasoningTokens');
    expect(sumUsage(VALID, VALID)).not.toHaveProperty('cacheWrite5mTokens');
    expect(sumUsage(VALID, VALID)).not.toHaveProperty('cacheWrite1hTokens');
  });

  it('keeps the TTL split when both sides differentiate', () => {
    const split: Usage = {
      inputTokens: 300,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 300,
      cacheWrite5mTokens: 200,
      cacheWrite1hTokens: 100,
    };
    const sum = sumUsage(split, split);
    expect(sum.cacheWriteTokens).toBe(600);
    expect(sum.cacheWrite5mTokens).toBe(400);
    expect(sum.cacheWrite1hTokens).toBe(200);
    expect(usageViolations(sum)).toEqual([]);
  });

  it('counts an undifferentiated side as the 5m share, keeping the sum canonical', () => {
    const split: Usage = {
      inputTokens: 300,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 300,
      cacheWrite5mTokens: 200,
      cacheWrite1hTokens: 100,
    };
    const unsplit: Usage = {
      inputTokens: 50,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 50,
    };
    for (const sum of [sumUsage(split, unsplit), sumUsage(unsplit, split)]) {
      expect(sum.cacheWriteTokens).toBe(350);
      expect(sum.cacheWrite5mTokens).toBe(250);
      expect(sum.cacheWrite1hTokens).toBe(100);
      expect(usageViolations(sum)).toEqual([]);
    }
  });

  it('derives the missing 5m share from the write total on a 1h-only side', () => {
    const oneHourOnly: Usage = {
      inputTokens: 300,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 300,
      cacheWrite1hTokens: 300,
    };
    const partial: Usage = {
      inputTokens: 100,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 100,
      cacheWrite1hTokens: 40,
    };
    const sum = sumUsage(oneHourOnly, partial);
    expect(sum.cacheWriteTokens).toBe(400);
    expect(sum.cacheWrite1hTokens).toBe(340);
    expect(sum.cacheWrite5mTokens).toBe(60);
    expect(usageViolations(sum)).toEqual([]);
  });
});
