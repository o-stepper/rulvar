/**
 * Failover and the degenerate fallback at the ctx layer (M4-T04):
 * transport failover is ONE journal entry whose servedBy records the
 * actual server while the content key hashes the requested spec
 * (replay-stable); the degenerate fallback is an agent-level second
 * attempt with one decision entry and a NEW content key.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createCtx } from './ctx.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const transient = { code: 'agent', message: 'down', retryable: true, data: { kind: 'transport' } };

describe('transport failover through ctx (M4-T04)', () => {
  it('journals one entry with servedBy = the fallback; replay is free and key-stable', async () => {
    const primary = scriptedAdapter(() => ({ error: transient }));
    const backup = scriptedAdapter(() => ({ text: 'served by backup' }), { id: 'backup' });
    const { internals, store } = makeInternals({
      adapters: [primary, backup],
      routing: { loop: { model: 'fake:model', fallbacks: ['backup:model-b'] } },
    });
    const ctx = createCtx(internals);
    const value = await ctx.agent('do the thing', {
      retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
    });
    expect(value).toBe('served by backup');
    expect(primary.calls).toHaveLength(2);
    expect(backup.calls).toHaveLength(1);

    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const agentEntries = prior.filter((e) => e.kind === 'agent');
    // ONE running/terminal pair; the terminal records the server.
    expect(agentEntries).toHaveLength(2);
    const terminal = agentEntries.find((e) => e.status === 'ok');
    expect(terminal?.servedBy).toBe('backup:model-b');

    // Replay: the requested spec keys the entry, so the SAME call
    // replays for free even though a fallback served it.
    const replayPrimary = scriptedAdapter(() => ({ text: 'unused' }));
    const replayBackup = scriptedAdapter(() => ({ text: 'unused' }), { id: 'backup' });
    const { internals: resumed } = makeInternals({
      adapters: [replayPrimary, replayBackup],
      routing: { loop: { model: 'fake:model', fallbacks: ['backup:model-b'] } },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('do the thing', {
      retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
    });
    expect(replayed).toBe('served by backup');
    expect(replayPrimary.calls).toHaveLength(0);
    expect(replayBackup.calls).toHaveLength(0);
  });
});

describe('degenerate fallback through ctx (docs/04, 11.3)', () => {
  const verdictSchema = z.strictObject({ verdict: z.enum(['pass', 'fail']) });

  it('re-attempts on the fallback model with one decision entry and a new content key', async () => {
    // The weak model never produces valid JSON: schema-exhausted.
    const weak = scriptedAdapter(() => ({ text: 'not json, sorry' }));
    const strong = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), { id: 'strong' });
    const { internals, store } = makeInternals({
      adapters: [weak, strong],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const value = await ctx.agent('judge this', {
      schema: verdictSchema,
      memoizeOutcome: true,
      fallback: { model: 'strong:big', on: ['schema-exhausted'] },
    });
    expect(value).toEqual({ verdict: 'pass' });
    // The weak attempt exhausted its bounded re-prompts live.
    expect(weak.calls).toHaveLength(3);
    expect(strong.calls).toHaveLength(1);

    await internals.replayer.flush();
    const prior = await store.load('test-run');
    const agentPairs = prior.filter((e) => e.kind === 'agent');
    // TWO spawns (four entries): the failed weak attempt and the
    // strong fallback attempt under its own content key.
    expect(agentPairs).toHaveLength(4);
    const decision = prior.find((e) => e.kind === 'decision');
    expect(decision?.value).toMatchObject({
      decisionType: 'model.fallback',
      trigger: 'schema-exhausted',
      model: 'strong:big',
    });
    const failedRunning = agentPairs.find(
      (e) => e.seq === (decision?.value as { targetRef?: number } | undefined)?.targetRef,
    );
    expect(failedRunning).toBeDefined();
    // Ordering: failed terminal < decision < fallback running.
    const failedTerminal = agentPairs.find(
      (e) => e.status === 'error' && e.seq !== failedRunning?.seq,
    );
    const fallbackRunning = agentPairs.find(
      (e) => e.status === 'running' && e.seq !== failedRunning?.seq,
    );
    expect((failedTerminal?.seq ?? 99) < (decision?.seq ?? -1)).toBe(true);
    expect((decision?.seq ?? 99) < (fallbackRunning?.seq ?? -1)).toBe(true);

    // Replay with the memoized primary: everything comes from the
    // journal; the hook chain stays cold and no adapter is called.
    const replayWeak = scriptedAdapter(() => ({ text: 'unused' }));
    const replayStrong = scriptedAdapter(() => ({ text: 'unused' }), { id: 'strong' });
    const { internals: resumed } = makeInternals({
      adapters: [replayWeak, replayStrong],
      routing: { loop: 'fake:model', extract: 'fake:model' },
      priorEntries: prior,
    });
    const replayCtx = createCtx(resumed);
    const replayed = await replayCtx.agent('judge this', {
      schema: verdictSchema,
      memoizeOutcome: true,
      fallback: { model: 'strong:big', on: ['schema-exhausted'] },
    });
    expect(replayed).toEqual({ verdict: 'pass' });
    expect(replayWeak.calls).toHaveLength(0);
    expect(replayStrong.calls).toHaveLength(0);
    // The decision entry was reused, never duplicated.
    const after = await store.load('test-run');
    expect(after.filter((e) => e.kind === 'decision')).toHaveLength(1);
  });

  it('does not fire for triggers outside on', async () => {
    const weak = scriptedAdapter(() => ({ text: 'not json' }));
    const strong = scriptedAdapter(() => ({ text: '{"verdict":"pass"}' }), { id: 'strong' });
    const { internals } = makeInternals({
      adapters: [weak, strong],
      routing: { loop: 'fake:model', extract: 'fake:model' },
    });
    const ctx = createCtx(internals);
    const value = await ctx.agent('judge this', {
      schema: verdictSchema,
      onError: 'null',
      fallback: { model: 'strong:big', on: ['limit'] },
    });
    // schema-exhausted is outside on: the failure surfaces per onError.
    expect(value).toBeNull();
    expect(strong.calls).toHaveLength(0);
  });
});
