/**
 * Whole-turn usage across pause_turn segments (RV1003) and the
 * continuation-cap intake (RV1004). The fourteenth experiment drove the
 * REAL adapter through the real engine and a legitimate two-segment
 * pause_turn killed the run: every segment's message_start emitted its
 * own usage mid-stream (5 then 6), the terminal finish carried only the
 * LAST segment's count, and core's midstream<=finish invariant read
 * 11 > 6. The finish must carry the whole logical turn's usage summed
 * across segments while mid-stream events stay per-segment deltas. The
 * same experiment fed `pauseTurnMaxContinuations: NaN` and the cap
 * silently disarmed (`continuations > NaN` is always false): an invalid
 * cap must refuse typed before the first wire, because every absorbed
 * continuation is a paid provider request.
 */
import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  invoiceFromJournal,
  memoryQuotaLimiter,
  type ChatEvent,
  type Usage,
} from '@rulvar/core';
import type { AnthropicClientLike } from './adapter.js';
import { anthropic } from './adapter.js';
import type { AnthropicStreamEvent } from './wire.js';

async function* fixture(events: AnthropicStreamEvent[]): AsyncIterable<AnthropicStreamEvent> {
  await Promise.resolve();
  yield* events;
}

/**
 * The experiment's exact two-segment shape: a pause_turn segment with 5
 * input tokens, then the terminal segment with 6 input and 2 output.
 */
function twoSegmentClient(overrides?: {
  firstUsage?: Record<string, unknown>;
  secondUsage?: Record<string, unknown>;
}): AnthropicClientLike & { calls: number } {
  const holder = {
    calls: 0,
    messages: {
      create(): Promise<unknown> {
        holder.calls += 1;
        const first = holder.calls === 1;
        const events: AnthropicStreamEvent[] = first
          ? [
              {
                type: 'message_start',
                message: { id: 'm1', usage: overrides?.firstUsage ?? { input_tokens: 5 } },
              },
              { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
              { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'a ' } },
              { type: 'content_block_stop', index: 0 },
              { type: 'message_delta', delta: { stop_reason: 'pause_turn' }, usage: {} },
              { type: 'message_stop' },
            ]
          : [
              {
                type: 'message_start',
                message: { id: 'm2', usage: overrides?.secondUsage ?? { input_tokens: 6 } },
              },
              { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
              { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'b' } },
              { type: 'content_block_stop', index: 0 },
              {
                type: 'message_delta',
                delta: { stop_reason: 'end_turn' },
                usage: { output_tokens: 2 },
              },
              { type: 'message_stop' },
            ];
        return Promise.resolve(fixture(events));
      },
      countTokens: () => Promise.resolve({ input_tokens: 1 }),
    },
    models: { list: () => Promise.resolve({ data: [] }) },
  };
  return holder;
}

async function collect(
  client: AnthropicClientLike,
  providerOptions?: unknown,
): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of anthropic({ client }).stream({
    model: 'claude-fable-5',
    messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
    ...(providerOptions === undefined
      ? {}
      : { providerOptions: providerOptions as { anthropic?: Record<string, unknown> } }),
  })) {
    events.push(event);
  }
  return events;
}

describe('whole-turn usage across pause_turn segments (RV1003)', () => {
  it('the terminal finish carries the sum of every segment, mid-stream events stay per-segment deltas', async () => {
    const client = twoSegmentClient();
    const events = await collect(client);
    expect(client.calls).toBe(2);
    const usageEvents = events.filter((e) => e.type === 'usage');
    expect(usageEvents.map((e) => (e as { usage: Usage }).usage.inputTokens)).toEqual([5, 6]);
    const finish = events.find((e) => e.type === 'finish') as { usage: Usage } | undefined;
    // The whole logical turn: 5 + 6 input, 2 output. Before RV1003 the
    // finish carried only the last segment (6) and core's invariant
    // killed the legitimate run with 11 > 6.
    expect(finish?.usage.inputTokens).toBe(11);
    expect(finish?.usage.outputTokens).toBe(2);
  });

  it('cache counts and the TTL split accumulate canonically across segments', async () => {
    const client = twoSegmentClient({
      firstUsage: {
        input_tokens: 5,
        cache_creation_input_tokens: 100,
        cache_creation: { ephemeral_5m_input_tokens: 100, ephemeral_1h_input_tokens: 0 },
      },
      secondUsage: {
        input_tokens: 6,
        cache_read_input_tokens: 40,
        cache_creation_input_tokens: 30,
        cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 30 },
      },
    });
    const events = await collect(client);
    const finish = events.find((e) => e.type === 'finish') as { usage: Usage } | undefined;
    // Segment 1 normalizes to input 105 (5 + 100 write); segment 2 to
    // input 76 (6 + 40 read + 30 write).
    expect(finish?.usage).toEqual({
      inputTokens: 181,
      outputTokens: 2,
      cacheReadTokens: 40,
      cacheWriteTokens: 130,
      cacheWrite5mTokens: 100,
      cacheWrite1hTokens: 30,
    });
  });

  it('a legitimate pause_turn survives the real engine end to end with true wire units', async () => {
    const client = twoSegmentClient();
    const limiter = memoryQuotaLimiter([{ provider: 'anthropic', requestsPerMinute: 30 }]);
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [anthropic({ client })],
      stores: { journal: store },
      defaults: { routing: { loop: 'anthropic:claude-fable-5' } },
      quota: { limiter },
    });
    const workflow = defineWorkflow({ name: 'pause-e2e' }, async (ctx) => {
      await ctx.agent('go', { estCost: 0.01 });
      return 'done';
    });
    const outcome = await engine.run(workflow, undefined, { runId: 'pause-e2e' }).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.usage.inputTokens).toBe(11);
    expect(outcome.usage.outputTokens).toBe(2);
    const entries = await store.load('pause-e2e');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(terminal?.providerCalls?.[0]?.usage).toEqual({
      inputTokens: 11,
      outputTokens: 2,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    const invoice = invoiceFromJournal(entries, () => undefined);
    const row = invoice.rows.find((r) => r.servedBy === 'anthropic:claude-fable-5');
    expect(row?.responseId).toBe('m2');
    expect(row?.wireResponseIds).toEqual(['m1', 'm2']);
    // The quota window settled at the TRUE wire count: the reservation
    // admitted one request and reconcile added the second segment.
    const snapshot = limiter.snapshot() as unknown as Array<{ requests?: number }> & {
      windows?: Array<{ requests?: number }>;
    };
    const requests = snapshot.windows?.[0]?.requests ?? snapshot[0]?.requests;
    expect(requests).toBe(2);
  });
});

describe('the continuation-cap intake (RV1004)', () => {
  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['-1', -1],
    ['1.5', 1.5],
    ["'5'", '5'],
  ])('refuses %s typed before the first wire', async (_label, cap) => {
    const client = twoSegmentClient();
    await expect(
      collect(client, { anthropic: { pauseTurnMaxContinuations: cap } }),
    ).rejects.toThrow(ConfigError);
    await expect(
      collect(client, { anthropic: { pauseTurnMaxContinuations: cap } }),
    ).rejects.toThrow(/pauseTurnMaxContinuations/);
    expect(client.calls).toBe(0);
  });

  it('cap 0 still refuses the first continuation with the typed transport error', async () => {
    const client = twoSegmentClient();
    const events = await collect(client, { anthropic: { pauseTurnMaxContinuations: 0 } });
    expect(client.calls).toBe(1);
    const error = events.find((e) => e.type === 'error') as
      { error: { message: string } } | undefined;
    expect(error?.error.message).toContain('pause_turn continuation cap (0) exceeded');
  });

  it('a valid explicit cap keeps absorbing', async () => {
    const client = twoSegmentClient();
    const events = await collect(client, { anthropic: { pauseTurnMaxContinuations: 3 } });
    expect(client.calls).toBe(2);
    expect(events.filter((e) => e.type === 'finish')).toHaveLength(1);
  });
});

/** Three segments: two pause_turn absorptions, then the terminal. */
function threeSegmentClient(): AnthropicClientLike & { calls: number } {
  const holder = {
    calls: 0,
    messages: {
      create(): Promise<unknown> {
        holder.calls += 1;
        const n = holder.calls;
        const events: AnthropicStreamEvent[] =
          n < 3
            ? [
                {
                  type: 'message_start',
                  message: { id: `m${String(n)}`, usage: { input_tokens: 5 } },
                },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                {
                  type: 'content_block_delta',
                  index: 0,
                  delta: { type: 'text_delta', text: 'a ' },
                },
                { type: 'content_block_stop', index: 0 },
                { type: 'message_delta', delta: { stop_reason: 'pause_turn' }, usage: {} },
                { type: 'message_stop' },
              ]
            : [
                {
                  type: 'message_start',
                  message: { id: 'm3', usage: { input_tokens: 4 } },
                },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'b' } },
                { type: 'content_block_stop', index: 0 },
                {
                  type: 'message_delta',
                  delta: { stop_reason: 'end_turn' },
                  usage: { output_tokens: 2 },
                },
                { type: 'message_stop' },
              ];
        return Promise.resolve(fixture(events));
      },
      countTokens: () => Promise.resolve({ input_tokens: 1 }),
    },
    models: { list: () => Promise.resolve({ data: [] }) },
  };
  return holder;
}

describe('pre-wire continuation reservation (RV1013)', () => {
  const engineWith = (
    client: AnthropicClientLike,
    limiter: ReturnType<typeof memoryQuotaLimiter>,
    reserveContinuations: boolean,
  ) =>
    createEngine({
      adapters: [anthropic({ client })],
      stores: { journal: new InMemoryStore() },
      defaults: { routing: { loop: 'anthropic:claude-fable-5' } },
      quota: { limiter, ...(reserveContinuations ? { reserveContinuations: true } : {}) },
    });
  const wf = defineWorkflow({ name: 'quota-pause' }, async (ctx) => {
    await ctx.agent('go', {
      retry: { attempts: 1, backoff: { initialMs: 1, factor: 1, maxMs: 1 } },
    });
    return 'done';
  });

  it('cap 2 under reserveContinuations: the third wire never leaves and the denial is typed', async () => {
    // The hard-RPM contract (RV1013): post-hoc reconcile is accounting,
    // and only a pre-wire reservation can keep the THIRD wire of one
    // absorbed dispatch inside a 2-request window from leaving at all.
    const client = threeSegmentClient();
    const limiter = memoryQuotaLimiter([{ provider: 'anthropic', requestsPerMinute: 2 }]);
    const outcome = await engineWith(client, limiter, true).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('continuation');
    expect(client.calls).toBe(2);
    expect(limiter.snapshot()[0]?.requests).toBe(2);
  });

  it('the default stays post-hoc: all three wires fly and the window settles at the true count', async () => {
    const client = threeSegmentClient();
    const limiter = memoryQuotaLimiter([{ provider: 'anthropic', requestsPerMinute: 2 }]);
    const outcome = await engineWith(client, limiter, false).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(client.calls).toBe(3);
    // Documented post-hoc semantics: the window records the overrun
    // after the fact; nothing was denied retroactively.
    expect(limiter.snapshot()[0]?.requests).toBe(3);
  });

  it('cap 3 under reserveContinuations: the absorption completes and the window carries EXACTLY the true wire count', async () => {
    const client = threeSegmentClient();
    const limiter = memoryQuotaLimiter([{ provider: 'anthropic', requestsPerMinute: 3 }]);
    const outcome = await engineWith(client, limiter, true).run(wf, undefined, {}).result;
    expect(outcome.status).toBe('ok');
    expect(client.calls).toBe(3);
    // One main admission plus two segment admissions, and the main
    // settlement adds nothing on top (the double-count guard): the
    // window equals the true wire count.
    expect(limiter.snapshot()[0]?.requests).toBe(3);
    expect(outcome.usage.inputTokens).toBe(14);
    expect(outcome.usage.outputTokens).toBe(2);
  });
});
