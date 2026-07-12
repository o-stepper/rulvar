import { describe, expect, it } from 'vitest';

import type { AgentIdentityInput } from './identity.js';
import { deriveContentKey, identityJcs, modelSpecIdentity } from './identity.js';

describe('content-key derivation (M1-T04; docs/03 section 1)', () => {
  /**
   * The worked example MUST reproduce byte-identically;
   * this test seeds the M2 golden fixtures.
   */
  const workedExample: AgentIdentityInput = {
    kind: 'agent',
    agentType: 'reviewer',
    modelSpec: { kind: 'model', model: 'anthropic:claude-sonnet-4', effort: 'high' },
    prompt: 'Review the attached diff for correctness.',
    schemaHash: 'f1342f68c9dbb49e8056d0414479659414776dfa4c599b3bebd166c8fdc416ba',
    toolsetHash: 'd2c59d7e8cb64de34366877e8764eab84d615942f14167d8715a15d8dbff105c',
    isolation: 'none',
  };

  it('reproduces the worked-example JCS form byte-identically', () => {
    expect(identityJcs(workedExample)).toBe(
      '{"agentType":"reviewer","isolation":"none","kind":"agent",' +
        '"modelSpec":{"effort":"high","model":"anthropic:claude-sonnet-4"},' +
        '"prompt":"Review the attached diff for correctness.",' +
        '"schemaHash":"f1342f68c9dbb49e8056d0414479659414776dfa4c599b3bebd166c8fdc416ba",' +
        '"toolsetHash":"d2c59d7e8cb64de34366877e8764eab84d615942f14167d8715a15d8dbff105c"}',
    );
  });

  it('reproduces the worked-example content key', () => {
    expect(deriveContentKey(workedExample)).toBe(
      '66ef15922e576a8f6884b28176c8c21fee9b4d3bb98c76592ed6ca1d3c8f1062',
    );
  });

  it('opts.key replaces the prompt member verbatim and changes the key', () => {
    const pinned = { ...workedExample, prompt: 'review-final' };
    expect(identityJcs(pinned)).toContain('"prompt":"review-final"');
    expect(deriveContentKey(pinned)).not.toBe(deriveContentKey(workedExample));
  });

  it('the plain-model identity projection drops the kind discriminant', () => {
    expect(modelSpecIdentity({ kind: 'model', model: 'openai:gpt-5.5', effort: 'low' })).toEqual({
      model: 'openai:gpt-5.5',
      effort: 'low',
    });
  });

  it('an unresolved effort participates as an absent member', () => {
    const projected = modelSpecIdentity({ kind: 'model', model: 'openai:gpt-5.5' });
    expect(projected).toEqual({ model: 'openai:gpt-5.5' });
    const withoutEffort = deriveContentKey({
      ...workedExample,
      modelSpec: { kind: 'model', model: 'anthropic:claude-sonnet-4' },
    });
    expect(withoutEffort).not.toBe(deriveContentKey(workedExample));
  });

  it('worktree isolation enters identity through its canonical encoding', () => {
    const isolated = deriveContentKey({
      ...workedExample,
      isolation: { kind: 'worktree', ref: 'main' },
    });
    expect(isolated).not.toBe(deriveContentKey(workedExample));
  });

  it('derives keys for every content-keyed kind', () => {
    expect(
      deriveContentKey({ kind: 'child', workflow: 'extract-invoices', args: { batch: 3 } }),
    ).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveContentKey({ kind: 'step', key: 'fetch-pr', deps: [42] })).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(deriveContentKey({ kind: 'external', key: 'approve-deploy' })).toMatch(/^[0-9a-f]{64}$/);
    expect(deriveContentKey({ kind: 'approval', toolName: 'bash', input: { cmd: 'ls' } })).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(deriveContentKey({ kind: 'rand', subtype: 'now' })).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rand identity distinguishes subtype and optional key', () => {
    const now = deriveContentKey({ kind: 'rand', subtype: 'now' });
    const random = deriveContentKey({ kind: 'rand', subtype: 'random' });
    const keyed = deriveContentKey({ kind: 'rand', subtype: 'random', key: 'jitter' });
    expect(new Set([now, random, keyed]).size).toBe(3);
    // An absent optional key participates as absent, not as null.
    expect(deriveContentKey({ kind: 'rand', subtype: 'random', key: undefined })).toBe(random);
  });

  it('step deps enter the key like useMemo dependencies', () => {
    const base = deriveContentKey({ kind: 'step', key: 'compute', deps: [1, 'a'] });
    expect(deriveContentKey({ kind: 'step', key: 'compute', deps: [1, 'b'] })).not.toBe(base);
    expect(deriveContentKey({ kind: 'step', key: 'compute', deps: [1, 'a'] })).toBe(base);
  });
});
