/**
 * RunProfile application (M5-T07): a profile is a pure data merge under
 * host options. Effort hints seed routing entries that carry none; an
 * explicit host effort wins; roles the host does not route stay
 * unrouted; ladder specs stay untouched.
 */
import { describe, expect, it } from 'vitest';

import { runProfile, type ModelSpec, type RunProfile } from '@rulvar/core';

import { applyRunProfile } from './engine-assembly.js';

function shippedProfile(name: string): RunProfile {
  const profile = runProfile(name);
  if (profile === undefined) {
    throw new Error(`shipped profile '${name}' is missing`);
  }
  return profile;
}

describe('applyRunProfile effort seeding', () => {
  it('seeds profile effort onto routing entries that carry none, host effort wins', () => {
    const merged = applyRunProfile(shippedProfile('ultra'), {
      defaults: {
        routing: {
          orchestrate: 'fake:model',
          plan: { model: 'fake:model', effort: 'low' },
          summarize: { model: 'fake:model' },
        },
      },
    });
    expect(merged.defaults?.routing).toEqual({
      orchestrate: { model: 'fake:model', effort: 'max' },
      plan: { model: 'fake:model', effort: 'low' },
      summarize: { model: 'fake:model', effort: 'high' },
    });
  });

  it('roles the host does not route stay unrouted; ladder specs stay untouched', () => {
    const ladderSpec = { ladder: { rungs: [] } } as unknown as ModelSpec;
    const merged = applyRunProfile(shippedProfile('fast'), {
      defaults: { routing: { loop: 'fake:model', orchestrate: ladderSpec } },
    });
    // fast carries no loop hint, so loop stays a bare ref; orchestrate
    // has a hint, but a ladder entry is never rewritten into a
    // ModelChoice (every rung carries its own effort).
    expect(merged.defaults?.routing?.loop).toBe('fake:model');
    expect(merged.defaults?.routing?.orchestrate).toEqual({ ladder: { rungs: [] } });
  });

  it('composes with the permission preset instead of overwriting it', () => {
    const merged = applyRunProfile(shippedProfile('ultra'), {
      defaults: { routing: { orchestrate: 'fake:model' } },
    });
    expect(merged.defaults?.permissions).toBeDefined();
    expect(merged.defaults?.routing?.orchestrate).toEqual({ model: 'fake:model', effort: 'max' });
  });
});
