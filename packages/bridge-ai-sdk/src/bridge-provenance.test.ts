/**
 * Bridge provenance parity (RV401, the eighth comparison experiment).
 *
 * The bridge accumulated the provider response id but shipped it ONLY as
 * the AI SDK's nested `response.id`, while the core reconciliation
 * record reads the first-class adapters' flat `responseId`; and the
 * error finish dropped the accumulated metadata entirely. A bridge-served
 * run therefore produced invoice rows with no provider id to join on.
 * These tests pin the parity end to end: the mapped events themselves,
 * and a real engine run whose per-call reconciliation records carry the
 * id on the success, retry, and billed-failure paths alike.
 */
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
} from '@ai-sdk/provider';
import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  type ChatEvent,
  type ProviderCallRecord,
} from '@rulvar/core';
import { describe, expect, it } from 'vitest';

import { bridgeAiSdk } from './bridge.js';

function fakeModel(
  parts: LanguageModelV4StreamPart[] | (() => LanguageModelV4StreamPart[]),
): LanguageModelV4 {
  return {
    specificationVersion: 'v4',
    provider: 'fakeprov',
    modelId: 'fake-model-1',
    supportedUrls: {},
    doGenerate() {
      return Promise.reject(new Error('doGenerate is not used by the bridge'));
    },
    doStream(_options: LanguageModelV4CallOptions) {
      const resolved = typeof parts === 'function' ? parts() : parts;
      return Promise.resolve({
        stream: new ReadableStream<LanguageModelV4StreamPart>({
          start(controller) {
            for (const part of resolved) {
              controller.enqueue(part);
            }
            controller.close();
          },
        }),
      });
    },
  };
}

async function collect(events: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const out: ChatEvent[] = [];
  for await (const event of events) {
    out.push(event);
  }
  return out;
}

const NESTED_USAGE = {
  inputTokens: { total: 100, noCache: 80, cacheRead: 15, cacheWrite: 5 },
  outputTokens: { total: 42, text: 30, reasoning: 12 },
};

const okStream = (id: string): LanguageModelV4StreamPart[] => [
  { type: 'response-metadata', id, modelId: 'fake-model-1' },
  { type: 'text-start', id: 't1' },
  { type: 'text-delta', id: 't1', delta: 'done' },
  { type: 'text-end', id: 't1' },
  { type: 'finish', usage: NESTED_USAGE, finishReason: { unified: 'stop', raw: 'stop' } },
];

const errorStream = (id: string): LanguageModelV4StreamPart[] => [
  { type: 'response-metadata', id, modelId: 'fake-model-1' },
  { type: 'finish', usage: NESTED_USAGE, finishReason: { unified: 'error', raw: 'boom' } },
];

describe('the mapped events carry the flat responseId (RV401)', () => {
  it('a normal finish ships the flat responseId beside the nested response object', async () => {
    const events = await collect(
      bridgeAiSdk(fakeModel(okStream('resp_1'))).stream({ model: 'fake-model-1', messages: [] }),
    );
    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    const bag = finish.providerMetadata?.['fakeprov'] as {
      responseId?: string;
      response?: { id?: string };
    };
    expect(bag.responseId).toBe('resp_1');
    // The AI SDK's own nested shape stays for callers that read it.
    expect(bag.response?.id).toBe('resp_1');
  });

  it('an error finish carries the accumulated provenance on the error event', async () => {
    const events = await collect(
      bridgeAiSdk(fakeModel(errorStream('resp_err'))).stream({
        model: 'fake-model-1',
        messages: [],
      }),
    );
    // The billing order of cycle 82 is untouched: usage, then the error.
    expect(events.map((event) => event.type)).toEqual(['usage', 'error']);
    const error = events.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    const bag = error.providerMetadata?.['fakeprov'] as {
      responseId?: string;
      response?: { id?: string };
    };
    expect(bag?.responseId).toBe('resp_err');
    expect(bag?.response?.id).toBe('resp_err');
  });

  it('an error finish with no accumulated metadata attaches nothing', async () => {
    const events = await collect(
      bridgeAiSdk(
        fakeModel([
          { type: 'finish', usage: NESTED_USAGE, finishReason: { unified: 'error', raw: 'boom' } },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    const error = events.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    expect(error.type).toBe('error');
    expect(error.providerMetadata).toBeUndefined();
  });
});

describe('bridge to reconciliation record parity, end to end (RV401)', () => {
  function scripts(...runs: LanguageModelV4StreamPart[][]): () => LanguageModelV4StreamPart[] {
    const queue = [...runs];
    return () => queue.shift() ?? [];
  }

  function engineFor(model: LanguageModelV4): ReturnType<typeof createEngine> {
    return createEngine({
      adapters: [bridgeAiSdk(model)],
      stores: { journal: new InMemoryStore({ quiet: true }) },
    });
  }

  const wf = defineWorkflow({ name: 'bridge-provenance' }, async (ctx) => {
    const result = await ctx.agent('report provenance', {
      model: 'fakeprov:fake-model-1',
      retry: { attempts: 2, backoff: { initialMs: 1, factor: 2, maxMs: 4 } },
      result: 'full',
    });
    return (result as { providerCalls?: ProviderCallRecord[] }).providerCalls;
  });

  it('a bridged run records the provider response id on its reconciliation record', async () => {
    const outcome = await engineFor(fakeModel(okStream('resp_live'))).run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    const calls = outcome.value as ProviderCallRecord[];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ outcome: 'ok', responseId: 'resp_live' });
  });

  it('a billed failed attempt and its retry both join: each record carries its own id', async () => {
    const outcome = await engineFor(
      fakeModel(scripts(errorStream('resp_dead'), okStream('resp_alive'))),
    ).run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    const calls = outcome.value as ProviderCallRecord[];
    expect(calls.map((record) => [record.attempt, record.outcome, record.responseId])).toEqual([
      [1, 'error', 'resp_dead'],
      [2, 'ok', 'resp_alive'],
    ]);
  });
});
