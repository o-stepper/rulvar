/**
 * M9-T01 acceptance: a V4 model streams through the full ChatEvent
 * vocabulary; a wrong specificationVersion errors clearly (docs/10,
 * section "M9-T01 @lurker/bridge-ai-sdk").
 */
import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4StreamPart,
} from '@ai-sdk/provider';
import { APICallError } from '@ai-sdk/provider';
import { ConfigError, type ChatEvent, type ChatRequest } from '@lurker/core';
import { describe, expect, it } from 'vitest';

import { aiSdkErrorToWire, bridgeAiSdk } from './bridge.js';

interface FakeModel extends LanguageModelV4 {
  calls: LanguageModelV4CallOptions[];
}

function fakeModel(
  parts: LanguageModelV4StreamPart[] | (() => LanguageModelV4StreamPart[]),
  overrides: Partial<{ specificationVersion: string; provider: string; modelId: string }> = {},
): FakeModel {
  const calls: LanguageModelV4CallOptions[] = [];
  return {
    specificationVersion: (overrides.specificationVersion ?? 'v4') as 'v4',
    provider: overrides.provider ?? 'fakeprov',
    modelId: overrides.modelId ?? 'fake-model-1',
    supportedUrls: {},
    calls,
    doGenerate() {
      return Promise.reject(new Error('doGenerate is not used by the bridge'));
    },
    doStream(options: LanguageModelV4CallOptions) {
      calls.push(options);
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

describe('bridgeAiSdk construction', () => {
  it('rejects a wrong specificationVersion with a typed ConfigError', () => {
    const model = fakeModel([], { specificationVersion: 'v2' });
    expect(() => bridgeAiSdk(model)).toThrowError(ConfigError);
    expect(() => bridgeAiSdk(model)).toThrowError(/specificationVersion 'v4'.*"v2"/);
  });

  it('defaults id and provider family to the wrapped model provider', () => {
    const adapter = bridgeAiSdk(fakeModel([]));
    expect(adapter.id).toBe('fakeprov');
    expect(adapter.provider).toBe('fakeprov');
  });

  it('honors explicit id and provider options', () => {
    const adapter = bridgeAiSdk(fakeModel([]), { id: 'google-a', provider: 'google' });
    expect(adapter.id).toBe('google-a');
    expect(adapter.provider).toBe('google');
  });

  it('serves conservative caps with per-model overrides', () => {
    const adapter = bridgeAiSdk(fakeModel([]), {
      caps: (model) => (model === 'fake-model-1' ? { contextWindow: 1_000_000 } : {}),
    });
    const caps = adapter.caps('fake-model-1');
    expect(caps.contextWindow).toBe(1_000_000);
    expect(caps.structuredOutput).toBe('native');
    expect(caps.reasoningEfforts).toEqual([]);
    expect(adapter.caps('other-model').contextWindow).toBe(8_192);
  });
});

describe('bridgeAiSdk stream mapping', () => {
  it('maps the full V4 vocabulary onto ChatEvents with minted canonical ids', async () => {
    const model = fakeModel([
      { type: 'stream-start', warnings: [] },
      { type: 'response-metadata', id: 'resp_1', modelId: 'fake-model-1' },
      { type: 'text-start', id: 't1' },
      { type: 'text-delta', id: 't1', delta: 'Hel' },
      { type: 'text-delta', id: 't1', delta: 'lo' },
      { type: 'text-end', id: 't1' },
      { type: 'reasoning-start', id: 'r1' },
      { type: 'reasoning-delta', id: 'r1', delta: 'thinking' },
      { type: 'reasoning-end', id: 'r1', providerMetadata: { fakeprov: { signature: 'sig-1' } } },
      { type: 'tool-input-start', id: 'w1', toolName: 'lookup' },
      { type: 'tool-input-delta', id: 'w1', delta: '{"q":' },
      { type: 'tool-input-delta', id: 'w1', delta: '"x"}' },
      { type: 'tool-input-end', id: 'w1' },
      { type: 'tool-call', toolCallId: 'w1', toolName: 'lookup', input: '{"q":"x"}' },
      {
        type: 'finish',
        usage: NESTED_USAGE,
        finishReason: { unified: 'tool-calls', raw: 'tool_use' },
        providerMetadata: { fakeprov: { served: true } },
      },
    ]);
    const adapter = bridgeAiSdk(model);
    const events = await collect(adapter.stream({ model: 'fake-model-1', messages: [] }));

    expect(events.map((event) => event.type)).toEqual([
      'text-delta',
      'text-delta',
      'reasoning-delta',
      'tool-call-start',
      'tool-call-delta',
      'tool-call-delta',
      'tool-call-end',
      'finish',
    ]);

    const start = events[3] as Extract<ChatEvent, { type: 'tool-call-start' }>;
    const end = events[6] as Extract<ChatEvent, { type: 'tool-call-end' }>;
    expect(start.name).toBe('lookup');
    expect(start.id).not.toBe('w1');
    expect(end.id).toBe(start.id);
    expect(end.args).toEqual({ q: 'x' });

    const finish = events[7] as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.finish).toEqual({ reason: 'tool-calls' });
    expect(finish.usage).toEqual({
      inputTokens: 100,
      outputTokens: 42,
      cacheReadTokens: 15,
      cacheWriteTokens: 5,
      reasoningTokens: 12,
    });
    const bag = finish.providerMetadata?.fakeprov as Record<string, unknown>;
    expect(bag.upstream).toEqual({ fakeprov: { served: true } });
    expect(bag.response).toEqual({ id: 'resp_1', modelId: 'fake-model-1' });
    expect(bag.retainedParts).toEqual([
      {
        type: 'reasoning',
        text: 'thinking',
        providerMetadata: { fakeprov: { signature: 'sig-1' } },
      },
    ]);
  });

  it('derives the Usage invariant from components when totals are absent', async () => {
    const model = fakeModel([
      {
        type: 'finish',
        usage: {
          inputTokens: { total: undefined, noCache: 80, cacheRead: 15, cacheWrite: 5 },
          outputTokens: { total: undefined, text: 30, reasoning: 12 },
        },
        finishReason: { unified: 'stop', raw: 'stop' },
      },
    ]);
    const events = await collect(
      bridgeAiSdk(model).stream({ model: 'fake-model-1', messages: [] }),
    );
    const finish = events[0] as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.usage.inputTokens).toBe(100);
    expect(finish.usage.outputTokens).toBe(42);
    expect(finish.usage.inputTokens).toBeGreaterThanOrEqual(
      finish.usage.cacheReadTokens + finish.usage.cacheWriteTokens,
    );
  });

  it('maps length to max-tokens and content-filter to a typed refusal', async () => {
    const lengthEvents = await collect(
      bridgeAiSdk(
        fakeModel([
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'length', raw: 'MAX_TOKENS' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect((lengthEvents[0] as Extract<ChatEvent, { type: 'finish' }>).finish).toEqual({
      reason: 'max-tokens',
    });

    const refusalEvents = await collect(
      bridgeAiSdk(
        fakeModel([
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'content-filter', raw: 'SAFETY' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    const refusal = refusalEvents[0] as Extract<ChatEvent, { type: 'finish' }>;
    expect(refusal.finish).toEqual({
      reason: 'refusal',
      refusal: { provider: 'fakeprov', stopDetails: { type: 'SAFETY' } },
    });
  });

  it('surfaces an error finish, an error part, and a finish-less stream as single terminal errors', async () => {
    const errorFinish = await collect(
      bridgeAiSdk(
        fakeModel([
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'error', raw: 'boom' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(errorFinish).toHaveLength(1);
    expect(errorFinish[0]?.type).toBe('error');

    const errorPart = await collect(
      bridgeAiSdk(
        fakeModel([
          { type: 'error', error: new Error('mid-stream failure') },
          { type: 'text-delta', id: 't', delta: 'never' },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(errorPart).toHaveLength(1);
    expect(errorPart[0]?.type).toBe('error');

    const noFinish = await collect(
      bridgeAiSdk(fakeModel([{ type: 'text-delta', id: 't', delta: 'hi' }])).stream({
        model: 'fake-model-1',
        messages: [],
      }),
    );
    expect(noFinish.map((event) => event.type)).toEqual(['text-delta', 'error']);
    const terminal = noFinish[1] as Extract<ChatEvent, { type: 'error' }>;
    expect(terminal.error.retryable).toBe(true);
    expect(terminal.error.message).toMatch(/without a finish part/);
  });

  it('absorbs provider-executed tool exchanges into retention and rejects approval requests', async () => {
    const providerExecuted = await collect(
      bridgeAiSdk(
        fakeModel([
          { type: 'tool-input-start', id: 'px', toolName: 'web_search', providerExecuted: true },
          { type: 'tool-input-delta', id: 'px', delta: '{"q":"news"}' },
          {
            type: 'tool-call',
            toolCallId: 'px',
            toolName: 'web_search',
            input: '{"q":"news"}',
            providerExecuted: true,
          },
          {
            type: 'tool-result',
            toolCallId: 'px',
            toolName: 'web_search',
            result: { hits: 3 },
          },
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'stop', raw: 'stop' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(providerExecuted.map((event) => event.type)).toEqual(['finish']);
    const finish = providerExecuted[0] as Extract<ChatEvent, { type: 'finish' }>;
    const bag = finish.providerMetadata?.fakeprov as { retainedParts: unknown[] };
    expect(bag.retainedParts).toEqual([
      {
        type: 'tool-call',
        toolCallId: 'px',
        toolName: 'web_search',
        input: { q: 'news' },
        providerExecuted: true,
      },
      { type: 'tool-result', toolCallId: 'px', toolName: 'web_search', result: { hits: 3 } },
    ]);

    const approval = await collect(
      bridgeAiSdk(
        fakeModel([
          { type: 'tool-approval-request', approvalId: 'ap1', toolCallId: 'px' },
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'stop', raw: 'stop' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(approval).toHaveLength(1);
    const error = approval[0] as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(false);
    expect(error.error.message).toMatch(/approval/);
  });

  it('synthesizes tool-call-start when a provider emits the tool-call part alone', async () => {
    const events = await collect(
      bridgeAiSdk(
        fakeModel([
          { type: 'tool-call', toolCallId: 'solo', toolName: 'ping', input: '' },
          {
            type: 'finish',
            usage: NESTED_USAGE,
            finishReason: { unified: 'tool-calls', raw: 'tool_use' },
          },
        ]),
      ).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(events.map((event) => event.type)).toEqual([
      'tool-call-start',
      'tool-call-end',
      'finish',
    ]);
    expect((events[1] as Extract<ChatEvent, { type: 'tool-call-end' }>).args).toEqual({});
  });

  it('throws ConfigError when the requested wire model diverges from the wrapped model', async () => {
    const adapter = bridgeAiSdk(fakeModel([]));
    await expect(
      collect(adapter.stream({ model: 'some-other-model', messages: [] })),
    ).rejects.toThrowError(ConfigError);
  });
});

describe('bridgeAiSdk request projection', () => {
  it('projects messages, tools, schema, effort, and namespaced options into V4 call options', async () => {
    // The first stream returns a tool call so the adapter's id map holds
    // wire id 'w1'; the second stream receives the projected history.
    let call = 0;
    const switching = fakeModel(() => {
      call += 1;
      return call === 1
        ? [
            { type: 'tool-input-start', id: 'w1', toolName: 'lookup' },
            { type: 'tool-call', toolCallId: 'w1', toolName: 'lookup', input: '{"q":"x"}' },
            {
              type: 'finish',
              usage: NESTED_USAGE,
              finishReason: { unified: 'tool-calls', raw: 'tool_use' },
            },
          ]
        : [
            {
              type: 'finish',
              usage: NESTED_USAGE,
              finishReason: { unified: 'stop', raw: 'stop' },
            },
          ];
    });
    const switchingAdapter = bridgeAiSdk(switching);
    const first = await collect(switchingAdapter.stream({ model: 'fake-model-1', messages: [] }));
    const canonical = (first[0] as Extract<ChatEvent, { type: 'tool-call-start' }>).id;

    const req: ChatRequest = {
      model: 'fake-model-1',
      messages: [
        { role: 'system', parts: [{ type: 'text', text: 'be terse' }] },
        { role: 'user', parts: [{ type: 'text', text: 'look x up' }] },
        {
          role: 'assistant',
          parts: [
            {
              type: 'provider-raw',
              provider: 'fakeprov',
              block: {
                type: 'reasoning',
                text: 'thinking',
                providerMetadata: { fakeprov: { signature: 'sig-1' } },
              },
            },
            { type: 'text', text: 'calling lookup' },
            { type: 'tool-call', id: canonical, name: 'lookup', args: { q: 'x' } },
          ],
        },
        {
          role: 'tool',
          parts: [{ type: 'tool-result', id: canonical, name: 'lookup', result: { answer: 42 } }],
        },
        {
          role: 'assistant',
          parts: [
            {
              type: 'provider-raw',
              provider: 'otherprov',
              block: { type: 'reasoning', text: 'foreign, must be dropped' },
            },
            { type: 'text', text: 'done' },
          ],
        },
      ],
      tools: [
        {
          name: 'lookup',
          description: 'looks things up',
          parameters: { type: 'object', properties: { q: { type: 'string' } } },
        },
      ],
      toolChoice: 'required',
      schema: { type: 'object', properties: { answer: { type: 'number' } } },
      effort: 'high',
      maxOutputTokens: 512,
      stopSequences: ['END'],
      cacheHint: { breakpoints: [{ after: 'system' }] },
      providerOptions: {
        fakeprov: {
          temperature: 0.3,
          providerOptions: { upstream: { tuning: true } },
        },
        ignoredprov: { anything: 1 },
      },
    };
    await collect(switchingAdapter.stream(req));

    const options = switching.calls[1];
    expect(options).toBeDefined();
    if (options === undefined) {
      return;
    }
    expect(options.prompt[0]).toEqual({ role: 'system', content: 'be terse' });
    expect(options.prompt[1]).toEqual({
      role: 'user',
      content: [{ type: 'text', text: 'look x up' }],
    });
    expect(options.prompt[2]).toEqual({
      role: 'assistant',
      content: [
        {
          type: 'reasoning',
          text: 'thinking',
          providerOptions: { fakeprov: { signature: 'sig-1' } },
        },
        { type: 'text', text: 'calling lookup' },
        { type: 'tool-call', toolCallId: 'w1', toolName: 'lookup', input: { q: 'x' } },
      ],
    });
    expect(options.prompt[3]).toEqual({
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: 'w1',
          toolName: 'lookup',
          output: { type: 'json', value: { answer: 42 } },
        },
      ],
    });
    expect(options.prompt[4]).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'done' }],
    });
    expect(options.tools).toEqual([
      {
        type: 'function',
        name: 'lookup',
        description: 'looks things up',
        inputSchema: { type: 'object', properties: { q: { type: 'string' } } },
      },
    ]);
    expect(options.toolChoice).toEqual({ type: 'required' });
    expect(options.responseFormat).toEqual({
      type: 'json',
      schema: { type: 'object', properties: { answer: { type: 'number' } } },
    });
    expect(options.reasoning).toBe('high');
    expect(options.maxOutputTokens).toBe(512);
    expect(options.stopSequences).toEqual(['END']);
    expect(options.temperature).toBe(0.3);
    expect(options.providerOptions).toEqual({ upstream: { tuning: true } });
    expect('anything' in options).toBe(false);
  });

  it('downmaps canonical max to xhigh and records the downmap', async () => {
    const model = fakeModel([
      {
        type: 'finish',
        usage: NESTED_USAGE,
        finishReason: { unified: 'stop', raw: 'stop' },
      },
    ]);
    const adapter = bridgeAiSdk(model);
    const events = await collect(
      adapter.stream({ model: 'fake-model-1', messages: [], effort: 'max' }),
    );
    expect(model.calls[0]?.reasoning).toBe('xhigh');
    const finish = events[0] as Extract<ChatEvent, { type: 'finish' }>;
    const bag = finish.providerMetadata?.fakeprov as Record<string, unknown>;
    expect(bag.effortDownmap).toBe('max->xhigh');
  });

  it('rejects a namespaced option contradicting a canonical field', async () => {
    const adapter = bridgeAiSdk(fakeModel([]));
    await expect(
      collect(
        adapter.stream({
          model: 'fake-model-1',
          messages: [],
          maxOutputTokens: 100,
          providerOptions: { fakeprov: { maxOutputTokens: 200 } },
        }),
      ),
    ).rejects.toThrowError(ConfigError);
  });
});

describe('aiSdkErrorToWire', () => {
  it('maps a 429 APICallError to a retryable rate-limit with retryAfterMs', () => {
    const error = new APICallError({
      message: 'rate limited',
      url: 'https://provider.example/v1',
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: { 'retry-after': '7' },
      isRetryable: true,
    });
    expect(aiSdkErrorToWire(error)).toEqual({
      code: 'agent',
      message: 'rate limited',
      retryable: true,
      data: { kind: 'rate-limit', retryAfterMs: 7000, status: 429 },
    });
  });

  it('maps 5xx and status-less failures as retryable transport, 4xx as terminal', () => {
    const server = new APICallError({
      message: 'overloaded',
      url: 'https://provider.example/v1',
      requestBodyValues: {},
      statusCode: 503,
      isRetryable: true,
    });
    expect(aiSdkErrorToWire(server)).toMatchObject({
      retryable: true,
      data: { kind: 'transport', status: 503 },
    });

    expect(aiSdkErrorToWire(new Error('socket hang up'))).toMatchObject({
      retryable: true,
      data: { kind: 'transport' },
    });

    const badRequest = new APICallError({
      message: 'bad request',
      url: 'https://provider.example/v1',
      requestBodyValues: {},
      statusCode: 400,
      isRetryable: false,
    });
    expect(aiSdkErrorToWire(badRequest)).toMatchObject({
      retryable: false,
      data: { kind: 'transport', status: 400 },
    });
  });

  it('is the projection used for a doStream rejection', async () => {
    const model = fakeModel([]);
    model.doStream = () =>
      Promise.reject(
        new APICallError({
          message: 'rate limited',
          url: 'https://provider.example/v1',
          requestBodyValues: {},
          statusCode: 429,
          responseHeaders: { 'retry-after': '2' },
          isRetryable: true,
        }),
      );
    const events = await collect(
      bridgeAiSdk(model).stream({ model: 'fake-model-1', messages: [] }),
    );
    expect(events).toHaveLength(1);
    const error = events[0] as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.data).toMatchObject({ kind: 'rate-limit', retryAfterMs: 2000 });
  });
});
