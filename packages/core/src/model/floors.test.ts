/**
 * Quality floors (M4-T09): hard router constraints enforced at
 * resolution, before any live call, on every invocation the chain
 * produces (docs/04, section 9).
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { checkFloors, type QualityFloors } from './floors.js';
import { resolveModelInvocation } from './router.js';
import { testCaps } from '../engine/test-harness.js';

const floors: QualityFloors = {
  byRole: {
    orchestrate: { allow: ['strong:big'] },
    loop: { deny: ['weak:tiny'] },
  },
  byTaskClass: {
    'code-edit': { deny: ['weak:tiny', 'cheap:small'] },
  },
};

describe('checkFloors', () => {
  it('deny wins; allow lists are exclusive; absent constraint passes', () => {
    expect(() => checkFloors({ ref: 'weak:tiny', role: 'loop', floors })).toThrow(ConfigError);
    expect(() => checkFloors({ ref: 'cheap:small', role: 'loop', floors })).not.toThrow();
    expect(() => checkFloors({ ref: 'cheap:small', role: 'orchestrate', floors })).toThrow(
      ConfigError,
    );
    expect(() => checkFloors({ ref: 'strong:big', role: 'orchestrate', floors })).not.toThrow();
    expect(() => checkFloors({ ref: 'weak:tiny', role: 'extract', floors })).not.toThrow();
    expect(() => checkFloors({ ref: 'weak:tiny', role: 'loop' })).not.toThrow();
  });

  it('byTaskClass applies only when a class is declared (default unclassified)', () => {
    expect(() =>
      checkFloors({ ref: 'cheap:small', role: 'extract', floors, taskClass: 'code-edit' }),
    ).toThrow(ConfigError);
    expect(() => checkFloors({ ref: 'cheap:small', role: 'extract', floors })).not.toThrow();
    expect(() =>
      checkFloors({ ref: 'cheap:small', role: 'extract', floors, taskClass: 'summarize-ish' }),
    ).not.toThrow();
  });
});

describe('floors inside the router (before any live call)', () => {
  it('a floored-out resolution throws the typed ConfigError', () => {
    expect(() =>
      resolveModelInvocation({
        role: 'loop',
        call: { model: 'weak:tiny' },
        capsOf: () => testCaps(),
        floors,
      }),
    ).toThrow(ConfigError);
    expect(
      resolveModelInvocation({
        role: 'loop',
        call: { model: 'cheap:small' },
        capsOf: () => testCaps(),
        floors,
      }).ref,
    ).toBe('cheap:small');
  });
});
