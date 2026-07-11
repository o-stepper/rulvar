import { describe, expect, it } from 'vitest';

import { deriverV0Synthetic } from './index.js';

describe('@rulvar/compat (M2-T05)', () => {
  it('ships the synthetic out-of-window deriver for the DEF-6 cassettes', () => {
    expect(deriverV0Synthetic.hashVersion).toBe(0);
    expect(deriverV0Synthetic.foldDefaults).toEqual({
      effort: 'medium',
      memoizeOutcome: false,
      budgetAccount: 'root',
    });
    const projected = deriverV0Synthetic.project({
      kind: 'agent',
      agentType: 'r',
      modelSpec: { kind: 'model', model: 'a:m', effort: 'high' },
      prompt: 'p',
      schemaHash: 'x',
      toolsetHash: 'y',
      isolation: 'none',
    });
    // Round-1 projection: effort-insensitive by construction.
    expect(projected).not.toBe('incomparable');
    expect((projected as { modelSpec: Record<string, unknown> }).modelSpec).toEqual({
      model: 'a:m',
    });
  });
});
