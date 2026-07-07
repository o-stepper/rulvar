/**
 * RetryPolicy and transport failover in the agent loop (M4-T04/T05):
 * retries live UNDER the journal (one result, one usage total, turns
 * unaffected), retryAfterMs replaces the computed delay, exhausted
 * retries advance the sticky failover chain, and servedBy records the
 * actual server (docs/04, sections 11.1 and 11.2).
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
