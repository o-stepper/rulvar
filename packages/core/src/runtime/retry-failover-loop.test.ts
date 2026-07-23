/**
 * RetryPolicy and transport failover in the agent loop (M4-T04/T05):
 * retries live UNDER the journal (one result, one usage total, turns
 * unaffected), retryAfterMs replaces the computed delay, exhausted
 * retries advance the sticky failover chain, and servedBy records the
 * actual server.
 */
import { describe, expect, it } from 'vitest';

import type { WireError } from '../l0/errors.js';
import type { ResolvedInvocation } from '../model/router.js';
import { recordingSink, scriptedAdapter } from '../engine/test-harness.js';
import { runAgent } from './agent-loop.js';
import { mergeUsageLimits } from './usage-limits.js';

const resolvedOf = (ref: `${string}:${string}`): ResolvedInvocation => {
  const colon = ref.indexOf(':');
  return {
    ref,
    adapterId: ref.slice(0, colon),
    model: ref.slice(colon + 1),
    canonical: { kind: 'model', model: ref },
    scrubs: [],
  };
};

const transient = (message: string): WireError => ({
  code: 'agent',
  message,
  retryable: true,
  data: { kind: 'transport' },
});

const instantRetry = (slept: number[]) => ({
  sleep: (ms: number) => {
    slept.push(ms);
    return Promise.resolve();
  },
  random: () => 1,
});

describe('RetryPolicy under the journal (M4-T05)', () => {
  it('a retried-then-successful turn is one result with one usage total and one turn', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call === 0 ? { error: transient('blip') } : { text: 'recovered' },
    );
    const slept: number[] = [];
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      retry: instantRetry(slept),
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('recovered');
    // Two wire tries, ONE turn: retries never count as turns or
    // lineage attempts (DEF-3).
    expect(adapter.calls).toHaveLength(2);
    expect(result.turns).toBe(1);
    expect(result.servedBy).toBe('fake:model');
    // Jittered default backoff at random()=1 gives the full 500ms base.
    expect(slept).toEqual([500]);
  });

  it('emits willRetry telemetry and honors backoff growth across tries', async () => {
    const adapter = scriptedAdapter((_req, call) =>
      call <= 1 ? { error: transient(`blip ${call}`) } : { text: 'third time lucky' },
    );
    const slept: number[] = [];
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      retry: instantRetry(slept),
      events,
    });
    expect(result.status).toBe('ok');
    expect(slept).toEqual([500, 1000]);
    const retries = events.ofType('agent:error').filter((e) => e.willRetry === true);
    expect(retries).toHaveLength(2);
    // The RV-207 attempt accounting: the retries surface as a counted
    // fact on the phase pair and on the result (live telemetry only,
    // never journaled).
    expect(result.transportRetries).toBe(2);
    const phaseEnds = events.ofType('agent:phase:end');
    expect(phaseEnds).toHaveLength(1);
    expect(phaseEnds[0]?.role).toBe('loop');
    expect(phaseEnds[0]?.retries).toBe(2);
  });

  it('non-retryable failures go terminal immediately (task-class never retries)', async () => {
    const adapter = scriptedAdapter(() => ({
      error: { code: 'agent', message: 'invalid request', retryable: false },
    }));
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      retry: instantRetry([]),
    });
    expect(result.status).toBe('error');
    expect(adapter.calls).toHaveLength(1);
  });

  it('respects a configured retryOn subset', async () => {
    const adapter = scriptedAdapter(() => ({
      error: {
        code: 'agent',
        message: '429',
        retryable: true,
        data: { kind: 'rate-limit' },
      },
    }));
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      retry: {
        policy: {
          attempts: 3,
          backoff: { initialMs: 1, factor: 2, maxMs: 8 },
          retryOn: ['transport'],
        },
        sleep: () => Promise.resolve(),
      },
    });
    expect(result.status).toBe('error');
    // rate-limit is outside retryOn: one try, no failover configured.
    expect(adapter.calls).toHaveLength(1);
  });
});

describe('transport failover (M4-T04)', () => {
  it('advances to the fallback after retries exhaust; servedBy records the server; sticky', async () => {
    const primary = scriptedAdapter(() => ({ error: transient('down') }));
    const backup = scriptedAdapter(
      (_req, call) =>
        call === 0 ? { toolCall: { name: 'nope', args: {} } } : { text: 'served by backup' },
      { id: 'backup' },
    );
    const slept: number[] = [];
    const events = recordingSink();
    const result = await runAgent({
      prompt: 'x',
      adapter: primary,
      resolved: resolvedOf('fake:model'),
      fallbacks: [{ adapter: backup, resolved: resolvedOf('backup:model-b') }],
      limits: mergeUsageLimits(),
      retry: instantRetry(slept),
      events,
      // An empty toolset: the unknown-tool call round-trips as an error
      // result, forcing a SECOND turn to prove the failover is sticky.
      tools: {
        defs: [],
        contracts: [],
        contextFor: () => ({
          runId: 'run-1',
          spanId: 'span',
          agent: { agentType: '' },
          cwd: process.cwd(),
          isolation: 'none',
          signal: new AbortController().signal,
          log: () => undefined,
        }),
      },
    });
    expect(result.status).toBe('ok');
    expect(result.output).toBe('served by backup');
    // Three tries on the primary, then the chain advanced.
    expect(primary.calls).toHaveLength(3);
    expect(slept).toEqual([500, 1000]);
    // Sticky: the SECOND turn (after the unknown-tool result round trip)
    // dispatched straight to the backup with no primary re-probe.
    expect(backup.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.servedBy).toBe('backup:model-b');
    const warns = events.ofType('log').filter((e) => String(e.msg).includes('failover'));
    expect(warns).toHaveLength(1);
  });

  it("surfaces the takeover target's scrubs visibly at failover time (M4-T08)", async () => {
    const primary = scriptedAdapter(() => ({ error: transient('down') }));
    const backup = scriptedAdapter(() => ({ text: 'served' }), { id: 'backup' });
    const events = recordingSink();
    const scrubbed = {
      ...resolvedOf('backup:model-b'),
      scrubs: [
        {
          scrubbed: 'effort' as const,
          model: 'backup:model-b' as const,
          detail: "effort 'max' is not in caps.reasoningEfforts for backup:model-b",
        },
      ],
    };
    const result = await runAgent({
      prompt: 'x',
      adapter: primary,
      resolved: resolvedOf('fake:model'),
      fallbacks: [{ adapter: backup, resolved: scrubbed }],
      limits: mergeUsageLimits(),
      retry: instantRetry([]),
      events,
    });
    expect(result.status).toBe('ok');
    const warns = events.ofType('log').map((e) => String(e.msg));
    expect(warns.some((msg) => msg.includes("effort 'max' is not in caps.reasoningEfforts"))).toBe(
      true,
    );
  });

  it('exhausting the whole chain surfaces the last error', async () => {
    const primary = scriptedAdapter(() => ({ error: transient('down A') }));
    const backup = scriptedAdapter(() => ({ error: transient('down B') }), { id: 'backup' });
    const result = await runAgent({
      prompt: 'x',
      adapter: primary,
      resolved: resolvedOf('fake:model'),
      fallbacks: [{ adapter: backup, resolved: resolvedOf('backup:model-b') }],
      limits: mergeUsageLimits(),
      retry: instantRetry([]),
    });
    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe('down B');
    expect(primary.calls).toHaveLength(3);
    expect(backup.calls).toHaveLength(3);
    expect(result.servedBy).toBe('backup:model-b');
  });
});

describe('backoff abort short circuit (v1.28.0 review P1)', () => {
  it('host cancellation during backoff wakes the sleep and forbids the next dispatch', async () => {
    const adapter = scriptedAdapter(() => ({ error: transient('blip') }));
    const controller = new AbortController();
    const slept: number[] = [];
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      signal: controller.signal,
      retry: {
        sleep: (ms) => {
          slept.push(ms);
          // The hook never resolves on its own: only the abort race
          // can wake the loop.
          queueMicrotask(() => controller.abort('cancel during backoff'));
          return new Promise<void>(() => undefined);
        },
        random: () => 1,
      },
    });
    expect(result.status).toBe('cancelled');
    expect(adapter.calls).toHaveLength(1);
    expect(slept).toEqual([500]);
  });

  it('a budget ceiling abort during backoff settles without another dispatch', async () => {
    const adapter = scriptedAdapter(() => ({ error: transient('blip') }));
    const controller = new AbortController();
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      budget: {
        beforeTurn: () => undefined,
        onUsage: () => undefined,
        signal: controller.signal,
      },
      retry: {
        sleep: () => {
          queueMicrotask(() => controller.abort('rulvar:budget-ceiling'));
          return new Promise<void>(() => undefined);
        },
      },
    });
    expect(result.status).toBe('cancelled');
    expect(result.error?.kind).toBe('budget');
    expect(adapter.calls).toHaveLength(1);
  });

  it('an abort the sleep hook ignores still stops the retry after the wake', async () => {
    const adapter = scriptedAdapter(() => ({ error: transient('blip') }));
    const controller = new AbortController();
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      signal: controller.signal,
      retry: {
        sleep: () => {
          // The hook aborts and then resolves normally anyway; the
          // post sleep check must still stop the retry.
          controller.abort('cancel');
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('cancelled');
    expect(adapter.calls).toHaveLength(1);
  });

  it('an abort that landed before the retryable error skips the willRetry promise entirely', async () => {
    const controller = new AbortController();
    const adapter = scriptedAdapter(() => {
      controller.abort('cancelled mid stream');
      return { error: transient('blip') };
    });
    const events = recordingSink();
    const slept: number[] = [];
    const result = await runAgent({
      prompt: 'x',
      adapter,
      resolved: resolvedOf('fake:model'),
      limits: mergeUsageLimits(),
      signal: controller.signal,
      events,
      retry: {
        sleep: (ms) => {
          slept.push(ms);
          return Promise.resolve();
        },
      },
    });
    expect(result.status).toBe('cancelled');
    expect(adapter.calls).toHaveLength(1);
    expect(slept).toEqual([]);
    expect(events.ofType('agent:error').filter((e) => e.willRetry === true)).toHaveLength(0);
  });

  it('a rejection from an abandoned sleep hook never becomes an unhandled rejection', async () => {
    const adapter = scriptedAdapter(() => ({ error: transient('blip') }));
    const controller = new AbortController();
    let rejectSleep: ((reason: Error) => void) | undefined;
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      const result = await runAgent({
        prompt: 'x',
        adapter,
        resolved: resolvedOf('fake:model'),
        limits: mergeUsageLimits(),
        signal: controller.signal,
        retry: {
          sleep: () => {
            queueMicrotask(() => controller.abort('cancel'));
            return new Promise<void>((_resolve, reject) => {
              rejectSleep = reject;
            });
          },
        },
      });
      expect(result.status).toBe('cancelled');
      rejectSleep?.(new Error('late sleep failure'));
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
    } finally {
      process.removeListener('unhandledRejection', onUnhandled);
    }
  });

  it('a sleep hook rejection with no abort in flight still propagates', async () => {
    const adapter = scriptedAdapter(() => ({ error: transient('blip') }));
    const controller = new AbortController();
    await expect(
      runAgent({
        prompt: 'x',
        adapter,
        resolved: resolvedOf('fake:model'),
        limits: mergeUsageLimits(),
        signal: controller.signal,
        retry: { sleep: () => Promise.reject(new Error('sleep infra broke')) },
      }),
    ).rejects.toThrow('sleep infra broke');
  });
});
