/**
 * The live-test opt-in gate and the bounded live smoke: a provider key
 * alone must never run a paid call, retryable errors retry up to the
 * bound and never hang, non-retryable errors fail immediately with the
 * typed diagnostics intact.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChatEvent, ChatRequest, WireError } from '@rulvar/core';
import { FakeAdapter, fakeWireError } from './fake-adapter.js';
import { liveTestEnabled, runLiveSmoke } from './live.js';

const helloReq = (): ChatRequest => ({
  model: 'fake-model',
  messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
});

const OVERLOADED: WireError = {
  code: 'rate-limit',
  message: 'overloaded',
  retryable: true,
  data: { status: 529 },
};

const UNAUTHORIZED: WireError = {
  code: 'agent',
  message: 'invalid x-api-key',
  retryable: false,
  data: { status: 401 },
};

describe('liveTestEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false without the opt-in even when the key is present', () => {
    vi.stubEnv('RULVAR_LIVE_TESTS', '');
    vi.stubEnv('LIVE_GATE_KEY_A', 'k');
    expect(liveTestEnabled('LIVE_GATE_KEY_A')).toBe(false);
  });

  it("accepts exactly '1', not other truthy spellings", () => {
    vi.stubEnv('LIVE_GATE_KEY_A', 'k');
    vi.stubEnv('RULVAR_LIVE_TESTS', 'true');
    expect(liveTestEnabled('LIVE_GATE_KEY_A')).toBe(false);
    vi.stubEnv('RULVAR_LIVE_TESTS', '1');
    expect(liveTestEnabled('LIVE_GATE_KEY_A')).toBe(true);
  });

  it('is false with the opt-in but a missing or empty key', () => {
    vi.stubEnv('RULVAR_LIVE_TESTS', '1');
    expect(liveTestEnabled('RULVAR_LIVE_GATE_KEY_NEVER_SET')).toBe(false);
    vi.stubEnv('LIVE_GATE_KEY_A', '');
    expect(liveTestEnabled('LIVE_GATE_KEY_A')).toBe(false);
  });

  it('requires every named key, and none is a valid requirement', () => {
    vi.stubEnv('RULVAR_LIVE_TESTS', '1');
    vi.stubEnv('LIVE_GATE_KEY_A', 'a');
    expect(liveTestEnabled('LIVE_GATE_KEY_A', 'LIVE_GATE_KEY_B')).toBe(false);
    vi.stubEnv('LIVE_GATE_KEY_B', 'b');
    expect(liveTestEnabled('LIVE_GATE_KEY_A', 'LIVE_GATE_KEY_B')).toBe(true);
    expect(liveTestEnabled()).toBe(true);
  });
});

describe('runLiveSmoke', () => {
  it('passes on the first finish and reports one attempt', async () => {
    const adapter = new FakeAdapter({ agents: { '*': 'ok.' } });
    const outcome = await runLiveSmoke(adapter, helloReq());
    expect(outcome.status).toBe('ok');
    expect(outcome.attempts).toBe(1);
    if (outcome.status !== 'ok') {
      throw new Error('unreachable');
    }
    expect(outcome.events.at(-1)?.type).toBe('finish');
    expect(adapter.calls).toHaveLength(1);
  });

  it('retries a mocked 529 once and passes on the following success', async () => {
    let served = 0;
    const adapter = new FakeAdapter({
      agents: {
        '*': () => {
          served += 1;
          return served === 1 ? fakeWireError(OVERLOADED) : 'recovered.';
        },
      },
    });
    const outcome = await runLiveSmoke(adapter, helloReq(), { baseDelayMs: 0 });
    expect(outcome.status).toBe('ok');
    expect(outcome.attempts).toBe(2);
    expect(adapter.calls).toHaveLength(2);
  });

  it('stops persistent retryable failures at the bound with every error kept', async () => {
    const adapter = new FakeAdapter({ agents: { '*': fakeWireError(OVERLOADED) } });
    const outcome = await runLiveSmoke(adapter, helloReq(), { attempts: 3, baseDelayMs: 0 });
    expect(outcome.status).toBe('exhausted');
    expect(outcome.attempts).toBe(3);
    expect(adapter.calls).toHaveLength(3);
    if (outcome.status !== 'exhausted') {
      throw new Error('unreachable');
    }
    expect(outcome.errors).toHaveLength(3);
    expect(outcome.errors[0]).toEqual(OVERLOADED);
  });

  it('fails a non-retryable error immediately with the diagnostics intact', async () => {
    const adapter = new FakeAdapter({ agents: { '*': fakeWireError(UNAUTHORIZED) } });
    const outcome = await runLiveSmoke(adapter, helloReq(), { baseDelayMs: 0 });
    expect(outcome.status).toBe('failed');
    expect(outcome.attempts).toBe(1);
    expect(adapter.calls).toHaveLength(1);
    if (outcome.status !== 'failed') {
      throw new Error('unreachable');
    }
    expect(outcome.error).toEqual(UNAUTHORIZED);
    expect(outcome.error.data).toEqual({ status: 401 });
  });

  it('reports a stream without any terminal event and never retries it', async () => {
    let opened = 0;
    const adapter = {
      // eslint-disable-next-line @typescript-eslint/require-await
      stream: async function* (): AsyncIterable<ChatEvent> {
        opened += 1;
        yield { type: 'text-delta', text: 'partial' };
      },
    };
    const outcome = await runLiveSmoke(adapter, helloReq(), { baseDelayMs: 0 });
    expect(outcome.status).toBe('no-terminal');
    expect(outcome.attempts).toBe(1);
    expect(opened).toBe(1);
    if (outcome.status !== 'no-terminal') {
      throw new Error('unreachable');
    }
    expect(outcome.events).toEqual([{ type: 'text-delta', text: 'partial' }]);
  });

  it('propagates a thrown stream unchanged (adapter-contract violation)', async () => {
    const adapter = {
      stream: (): AsyncIterable<ChatEvent> => ({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.reject(new Error('boom')),
        }),
      }),
    };
    await expect(runLiveSmoke(adapter, helloReq(), { baseDelayMs: 0 })).rejects.toThrow('boom');
  });

  it('sleeps the linear backoff between retryable attempts', async () => {
    vi.useFakeTimers();
    try {
      const adapter = new FakeAdapter({ agents: { '*': fakeWireError(OVERLOADED) } });
      const pending = runLiveSmoke(adapter, helloReq(), { attempts: 2, baseDelayMs: 5_000 });
      await vi.advanceTimersByTimeAsync(0);
      // The first attempt is done, the second waits on the 5s backoff.
      expect(adapter.calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(4_999);
      expect(adapter.calls).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1);
      const outcome = await pending;
      expect(outcome.status).toBe('exhausted');
      expect(adapter.calls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
