/**
 * Floors at the ctx layer (M4-T09): a violation is a typed ConfigError
 * BEFORE any live call and before any journal entry, and the constraint
 * covers failover fallbacks and the profile-declared taskClass axis.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

describe('ctx floors (M4-T09)', () => {
  it('rejects a floored-out loop model before any call or entry', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'never' }));
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      floors: { byRole: { loop: { deny: ['fake:model'] } } },
    });
    const ctx = createCtx(internals);
    await expect(ctx.agent('do it')).rejects.toThrow(ConfigError);
    expect(adapter.calls).toHaveLength(0);
    await internals.replayer.flush();
    expect(await store.load('test-run')).toHaveLength(0);
  });

  it('covers failover fallbacks: a floored fallback fails resolution at spawn', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'never' }));
    const weak = scriptedAdapter(() => ({ text: 'never' }), { id: 'weak' });
    const { internals } = makeInternals({
      adapters: [adapter, weak],
      routing: { loop: { model: 'fake:model', fallbacks: ['weak:tiny'] } },
      floors: { byRole: { loop: { deny: ['weak:tiny'] } } },
    });
    const ctx = createCtx(internals);
    await expect(ctx.agent('do it')).rejects.toThrow(ConfigError);
    expect(adapter.calls).toHaveLength(0);
  });

  it('applies byTaskClass floors through the profile-declared class', async () => {
    const adapter = scriptedAdapter(() => ({ text: 'fine elsewhere' }));
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
      profiles: { coder: { taskClass: 'code-edit' }, chatter: {} },
      floors: { byTaskClass: { 'code-edit': { deny: ['fake:model'] } } },
    });
    const ctx = createCtx(internals);
    await expect(ctx.agent('edit the code', { agentType: 'coder' })).rejects.toThrow(ConfigError);
    // The unclassified profile is untouched by the byTaskClass axis.
    const value = await ctx.agent('just chat', { agentType: 'chatter' });
    expect(value).toBe('fine elsewhere');
  });
});
