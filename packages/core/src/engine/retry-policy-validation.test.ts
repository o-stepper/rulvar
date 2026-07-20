/**
 * RetryPolicy validation at the engine surface (v1.29.0 review P2),
 * reproduced on published 1.29.0 before the fix: attempts 0, 1.5, and
 * NaN, initialMs -1, factor NaN, and maxMs -1 were all accepted and
 * the adapter was dispatched under them. An invalid policy must fail
 * as a typed ConfigError naming its config source, before any
 * provider call or journal write for the agent.
 */
import { describe, expect, it } from 'vitest';

import type { ChatEvent, ChatRequest } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';
import type { RetryPolicy } from '../model/retry.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { testCaps } from './test-harness.js';

function countingAdapter(): { adapter: ProviderAdapter; calls: ChatRequest[] } {
  const calls: ChatRequest[] = [];
  const adapter: ProviderAdapter = {
    id: 'fake',
    caps: () => testCaps(),
    // eslint-disable-next-line @typescript-eslint/require-await
    async *stream(req: ChatRequest): AsyncIterable<ChatEvent> {
      calls.push(req);
      yield { type: 'text-delta', text: 'x' };
      yield {
        type: 'finish',
        finish: { reason: 'stop' },
        usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    },
  };
  return { adapter, calls };
}

function engineWith(adapter: ProviderAdapter, retry?: RetryPolicy) {
  return createEngine({
    adapters: [adapter],
    stores: { journal: new InMemoryStore({ quiet: true }) },
    defaults: {
      routing: { loop: 'fake:model' },
      ...(retry === undefined ? {} : { retry }),
    },
  });
}

const backoff = { initialMs: 1, factor: 1, maxMs: 1 };

describe('RetryPolicy validation before dispatch (v1.29.0 review P2)', () => {
  const invalid: Array<[string, RetryPolicy, RegExp]> = [
    ['attempts 0', { attempts: 0, backoff }, /attempts must be a positive safe integer/],
    ['attempts 1.5', { attempts: 1.5, backoff }, /attempts must be a positive safe integer/],
    ['attempts NaN', { attempts: NaN, backoff }, /attempts must be a positive safe integer/],
    [
      'initialMs -1',
      { attempts: 2, backoff: { ...backoff, initialMs: -1 } },
      /backoff\.initialMs must be an integer between 0 and 2147483647/,
    ],
    [
      'factor NaN',
      { attempts: 2, backoff: { ...backoff, factor: NaN } },
      /backoff\.factor must be a finite number above zero/,
    ],
    [
      'maxMs -1',
      { attempts: 2, backoff: { ...backoff, maxMs: -1 } },
      /backoff\.maxMs must be an integer between 0 and 2147483647/,
    ],
  ];

  it.each(invalid)(
    'a call-level policy with %s fails typed with zero provider calls',
    async (_label, retry, message) => {
      const { adapter, calls } = countingAdapter();
      const wf = defineWorkflow({ name: 'bad-retry' }, (ctx) => ctx.agent('go', { retry }));
      const outcome = await engineWith(adapter).run(wf, undefined).result;

      expect(outcome.status).toBe('error');
      expect(outcome.error?.message).toMatch(message);
      expect(outcome.error?.message).toContain('the agent retry option');
      expect(calls).toHaveLength(0);
    },
  );

  it('an invalid engine defaults.retry fails at createEngine, before any run', () => {
    const { adapter } = countingAdapter();
    expect(() => engineWith(adapter, { attempts: 0, backoff })).toThrow(
      /createEngine defaults\.retry: attempts must be a positive safe integer/,
    );
  });

  it('an invalid profile retry fails at createEngine naming the profile', () => {
    const { adapter } = countingAdapter();
    expect(() =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        defaults: {
          routing: { loop: 'fake:model' },
          profiles: { writer: { retry: { attempts: 2, backoff: { ...backoff, factor: 0 } } } },
        },
      }),
    ).toThrow(/defaults\.profiles\['writer'\]\.retry: backoff\.factor must be a finite number/);
  });

  it('a profile retry that survives createEngine also validates the call merge source', async () => {
    // The call option wins the merge and is the one validated: an
    // invalid call override fails even when the profile policy is fine.
    const { adapter, calls } = countingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: {
        routing: { loop: 'fake:model' },
        profiles: { writer: { retry: { attempts: 2, backoff } } },
      },
    });
    const wf = defineWorkflow({ name: 'merge' }, (ctx) =>
      ctx.agent('go', { agentType: 'writer', retry: { attempts: NaN, backoff } }),
    );
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('the agent retry option');
    expect(calls).toHaveLength(0);
  });

  it('unknown and duplicate retryOn classes and a non boolean jitter are rejected', async () => {
    const cases: Array<[RetryPolicy, RegExp]> = [
      [
        { attempts: 2, backoff, retryOn: ['transport', 'network' as never] },
        /retryOn must contain only 'transport', 'rate-limit', or 'overloaded'/,
      ],
      [
        { attempts: 2, backoff, retryOn: ['transport', 'transport'] },
        /retryOn must not repeat a retry class/,
      ],
      [
        { attempts: 2, backoff: { ...backoff, jitter: 'yes' as never } },
        /backoff\.jitter must be a boolean when given/,
      ],
    ];
    for (const [retry, message] of cases) {
      const { adapter, calls } = countingAdapter();
      const wf = defineWorkflow({ name: 'bad-retry' }, (ctx) => ctx.agent('go', { retry }));
      const outcome = await engineWith(adapter).run(wf, undefined).result;
      expect(outcome.status).toBe('error');
      expect(outcome.error?.message).toMatch(message);
      expect(calls).toHaveLength(0);
    }
  });

  it('a decaying factor below 1, an empty retryOn, and maxMs below initialMs stay legal', async () => {
    const legal: RetryPolicy[] = [
      { attempts: 2, backoff: { initialMs: 4, factor: 0.5, maxMs: 4 } },
      { attempts: 2, backoff, retryOn: [] },
      { attempts: 2, backoff: { initialMs: 10, factor: 2, maxMs: 1 } },
    ];
    for (const retry of legal) {
      const { adapter, calls } = countingAdapter();
      const wf = defineWorkflow({ name: 'ok-retry' }, (ctx) => ctx.agent('go', { retry }));
      const outcome = await engineWith(adapter).run(wf, undefined).result;
      expect(outcome.status).toBe('ok');
      expect(calls).toHaveLength(1);
    }
  });
});
