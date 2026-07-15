import { describe, expect, it } from 'vitest';

import { ConfigError, createCanonicalIdMinter, type ChatEvent, type Part } from '@rulvar/core';
import type { OpenAiClientLike } from './adapter.js';
import { openai } from './adapter.js';
import { OPENAI_MODELS, openAiModelInfo } from './caps.js';
import {
  buildChatCompletionsParams,
  buildResponsesParams,
  mapChatCompletionsStream,
  mapOpenAiEffort,
  mapResponsesStream,
  normalizeOpenAiUsage,
  OpenAiIdMap,
  type ResponsesStreamEvent,
} from './wire.js';

function ids(): OpenAiIdMap {
  return new OpenAiIdMap(createCanonicalIdMinter());
}

describe('buildResponsesParams (M1-T13)', () => {
  it('uses manual item replay: store false plus encrypted reasoning include', () => {
    const { params } = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [
          { role: 'system', parts: [{ type: 'text', text: 'be terse' }] },
          { role: 'user', parts: [{ type: 'text', text: 'go' }] },
        ],
      },
      ids(),
    );
    expect(params.store).toBe(false);
    expect(params.include).toEqual(['reasoning.encrypted_content']);
    // System messages project into top-level instructions on every request.
    expect(params.instructions).toBe('be terse');
    expect(params.input).toEqual([{ role: 'user', content: [{ type: 'input_text', text: 'go' }] }]);
  });

  it('echoes reasoning items VERBATIM between function calls', () => {
    const reasoning = {
      type: 'reasoning',
      id: 'rs_1',
      encrypted_content: 'opaque-bytes==',
      summary: [{ type: 'summary_text', text: 's' }],
    };
    const idMap = ids();
    const canonicalId = idMap.canonicalFor('call_original');
    const parts: Part[] = [
      { type: 'provider-raw', provider: 'openai', block: reasoning },
      { type: 'tool-call', id: canonicalId, name: 'search', args: { q: 'x' } },
    ];
    const { params } = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [
          { role: 'user', parts: [{ type: 'text', text: 'go' }] },
          { role: 'assistant', parts },
          {
            role: 'tool',
            parts: [{ type: 'tool-result', id: canonicalId, name: 'search', result: { hits: 1 } }],
          },
        ],
      },
      idMap,
    );
    const input = params.input as Array<Record<string, unknown>>;
    // Byte-exact echo: the reasoning item rides unmodified, ordered before
    // the function_call it precedes, with the bijective call id restored.
    expect(input[1]).toEqual(reasoning);
    expect(input[2]).toEqual({
      type: 'function_call',
      call_id: 'call_original',
      name: 'search',
      arguments: '{"q":"x"}',
    });
    expect(input[3]).toEqual({
      type: 'function_call_output',
      call_id: 'call_original',
      output: '{"hits":1}',
    });
  });

  it('rejects server-side conversation state with a typed ConfigError', () => {
    for (const key of ['previous_response_id', 'conversation']) {
      expect(() =>
        buildResponsesParams(
          {
            model: 'gpt-5.5',
            messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
            providerOptions: { openai: { [key]: 'resp_123' } },
          },
          ids(),
        ),
      ).toThrow(ConfigError);
    }
  });

  it('sends flattened function tools and explicit strict semantics', () => {
    const strictSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['q'],
      properties: { q: { type: 'string' } },
    };
    const { params } = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        tools: [
          { name: 'search', description: 'd', parameters: strictSchema },
          { name: 'loose', description: 'd', parameters: { type: 'object' } },
        ],
        schema: strictSchema,
      },
      ids(),
    );
    const tools = params.tools as Array<Record<string, unknown>>;
    // Flattened: no nested { type, function } wrapper.
    expect(tools[0]).toMatchObject({ type: 'function', name: 'search', strict: true });
    expect(tools[0]).not.toHaveProperty('function');
    expect(tools[1]?.strict).toBe(false);
    expect(params.text).toEqual({
      format: { type: 'json_schema', name: 'output', schema: strictSchema, strict: true },
    });
  });

  it("maps toolChoice 'none' to explicit none with the tools param present (M4-T01)", () => {
    const { params } = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        tools: [{ name: 'clock', description: 'd', parameters: { type: 'object' } }],
        toolChoice: 'none',
      },
      ids(),
    );
    // Function-call items in the input need their definitions: the tools
    // param stays present, the choice pins none.
    expect((params.tools as unknown[]).length).toBe(1);
    expect(params.tool_choice).toBe('none');
  });

  it('maps effort with the documented lossy max downmap and none via the namespace', () => {
    expect(mapOpenAiEffort('xhigh')).toEqual({ wire: 'xhigh', downmapped: false });
    expect(mapOpenAiEffort('max')).toEqual({ wire: 'xhigh', downmapped: true });

    const maxed = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        effort: 'max',
      },
      ids(),
    );
    expect(maxed.params.reasoning).toEqual({ effort: 'xhigh' });
    expect(maxed.effortDownmapped).toBe(true);

    const none = buildResponsesParams(
      {
        model: 'gpt-5.5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        providerOptions: { openai: { reasoningEffort: 'none' } },
      },
      ids(),
    );
    expect(none.params.reasoning).toEqual({ effort: 'none' });
  });
});

describe('Responses stream mapping (M1-T13; docs/04 section 5.4)', () => {
  async function* fixture(events: ResponsesStreamEvent[]): AsyncIterable<ResponsesStreamEvent> {
    for (const event of events) {
      yield await Promise.resolve(event);
    }
  }

  it('maps the typed SSE catalog to ChatEvents', async () => {
    const outputItems = [
      { type: 'reasoning', id: 'rs_1', encrypted_content: 'opaque==' },
      {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_9',
        name: 'search',
        arguments: '{"q":"x"}',
      },
    ];
    const events: ChatEvent[] = [];
    await mapResponsesStream(
      fixture([
        { type: 'response.created' },
        { type: 'response.output_item.added', item: { type: 'reasoning', id: 'rs_1' } },
        { type: 'response.reasoning_summary_text.delta', delta: 'thinking...' },
        {
          type: 'response.output_item.added',
          item: { type: 'function_call', id: 'fc_1', call_id: 'call_9', name: 'search' },
        },
        { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '{"q":' },
        { type: 'response.function_call_arguments.delta', item_id: 'fc_1', delta: '"x"}' },
        {
          type: 'response.output_item.done',
          item: {
            type: 'function_call',
            id: 'fc_1',
            call_id: 'call_9',
            name: 'search',
            arguments: '{"q":"x"}',
          },
        },
        { type: 'response.output_text.delta', delta: 'partial' },
        { type: 'response.output_text.done', text: 'partial' },
        {
          type: 'response.completed',
          response: {
            id: 'resp_1',
            output: outputItems,
            usage: {
              input_tokens: 90,
              input_tokens_details: { cached_tokens: 40 },
              output_tokens: 12,
              output_tokens_details: { reasoning_tokens: 6 },
            },
          },
        },
      ]),
      ids(),
      (event) => events.push(event),
      { effortDownmapped: true },
    );

    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'reasoning-delta',
      'tool-call-start',
      'tool-call-delta',
      'tool-call-delta',
      'tool-call-end',
      'text-delta',
      'usage',
      'finish',
    ]);
    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.finish).toEqual({ reason: 'tool-calls' });
    // input_tokens already includes cached reads; no write premium.
    expect(finish.usage).toEqual({
      inputTokens: 90,
      outputTokens: 12,
      cacheReadTokens: 40,
      cacheWriteTokens: 0,
      reasoningTokens: 6,
    });
    const meta = finish.providerMetadata?.openai as Record<string, unknown>;
    // Raw output items ride providerMetadata for provider-raw retention.
    expect(meta.outputItems).toEqual(outputItems);
    // The retention payload is EXACTLY the reasoning items, in output
    // order, encrypted_content intact (M4-T02).
    expect(meta.retainedParts).toEqual([outputItems[0]]);
    expect(meta.effortDownmapped).toBe('max->xhigh');
    expect(meta.responseId).toBe('resp_1');
  });

  it('fabricates bijective wire ids for canonical ids minted elsewhere (M4-T02)', () => {
    const idMap = ids();
    const foreign = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    const wire = idMap.wireFor(foreign);
    expect(wire).toBe(`call_${foreign}`);
    expect(idMap.canonicalFor(wire)).toBe(foreign);
    expect(idMap.wireFor(foreign)).toBe(wire);
  });

  it('maps response.incomplete per incomplete_details', async () => {
    const events: ChatEvent[] = [];
    await mapResponsesStream(
      fixture([
        {
          type: 'response.incomplete',
          response: {
            incomplete_details: { reason: 'max_output_tokens' },
            usage: { input_tokens: 5, output_tokens: 64 },
          },
        },
      ]),
      ids(),
      (event) => events.push(event),
    );
    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.finish).toEqual({ reason: 'max-tokens' });
  });

  it('normalizes usage from the Responses shape', () => {
    expect(
      normalizeOpenAiUsage({
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 30 },
        output_tokens: 10,
      }),
    ).toEqual({ inputTokens: 100, outputTokens: 10, cacheReadTokens: 30, cacheWriteTokens: 0 });
  });
});

describe('Chat Completions degraded path (M1-T13; docs/04 section 5.6)', () => {
  it('builds nested tools and response_format', () => {
    const strictSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['q'],
      properties: { q: { type: 'string' } },
    };
    const params = buildChatCompletionsParams(
      {
        model: 'legacy-model',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        tools: [{ name: 'search', description: 'd', parameters: strictSchema }],
        schema: strictSchema,
      },
      ids(),
    );
    const tools = params.tools as Array<Record<string, unknown>>;
    // The chat dialect keeps the nested { type, function } wrapper.
    expect(tools[0]).toEqual({
      type: 'function',
      function: { name: 'search', description: 'd', parameters: strictSchema, strict: true },
    });
    expect(params.response_format).toMatchObject({ type: 'json_schema' });
  });

  it("maps toolChoice 'none' explicitly with tools present (M4-T01)", () => {
    const params = buildChatCompletionsParams(
      {
        model: 'legacy-model',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
        tools: [{ name: 'clock', description: 'd', parameters: { type: 'object' } }],
        toolChoice: 'none',
      },
      ids(),
    );
    expect((params.tools as unknown[]).length).toBe(1);
    expect(params.tool_choice).toBe('none');
  });

  it('assembles delta-patched chunks into canonical events', async () => {
    async function* chunks(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({
        choices: [{ delta: { content: 'hel' } }],
      });
      yield {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: 'call_1', function: { name: 'search', arguments: '{"q":' } },
              ],
            },
          },
        ],
      };
      yield {
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"x"}' } }] } }],
      };
      yield { choices: [{ delta: {}, finish_reason: 'tool_calls' }] };
      yield {
        choices: [],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 4,
          prompt_tokens_details: { cached_tokens: 8 },
        },
      };
    }
    const events: ChatEvent[] = [];
    await mapChatCompletionsStream(chunks(), ids(), (event) => events.push(event));
    expect(events.map((e) => e.type)).toEqual([
      'text-delta',
      'tool-call-start',
      'tool-call-delta',
      'tool-call-delta',
      'tool-call-end',
      'usage',
      'finish',
    ]);
    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.finish).toEqual({ reason: 'tool-calls' });
    expect(finish.usage.cacheReadTokens).toBe(8);
    expect((finish.providerMetadata?.openai as Record<string, unknown>).degradedPath).toBe('chat');
  });
});

describe('adapter surface (M1-T13)', () => {
  it('streams through the Responses API with caps from the July 2026 family', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client: OpenAiClientLike = {
      responses: {
        create(params: Record<string, unknown>): Promise<unknown> {
          calls.push(params);
          return Promise.resolve(
            (async function* stream(): AsyncIterable<ResponsesStreamEvent> {
              yield await Promise.resolve({
                type: 'response.output_text.delta',
                delta: 'ok',
              });
              yield {
                type: 'response.completed',
                response: { id: 'r1', output: [], usage: { input_tokens: 3, output_tokens: 1 } },
              };
            })(),
          );
        },
      },
      chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
    };
    const adapter = openai({ client });
    expect(adapter.id).toBe('openai');
    expect(adapter.caps('gpt-5.5').structuredOutput).toBe('native');
    expect(adapter.caps('gpt-5.5').supportsTemperature).toBe(false);
    expect(adapter.caps('gpt-5.5').reasoningEfforts).toContain('max');

    const events: ChatEvent[] = [];
    for await (const event of adapter.stream({
      model: 'gpt-5.5',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
      effort: 'high',
    })) {
      events.push(event);
    }
    expect(events.map((e) => e.type)).toEqual(['text-delta', 'usage', 'finish']);
    expect(calls[0]?.store).toBe(false);
    expect(calls[0]?.stream).toBe(true);
    expect(calls[0]?.reasoning).toEqual({ effort: 'high' });
  });

  it('projects request errors into the retryable vocabulary', async () => {
    const client: OpenAiClientLike = {
      responses: {
        create: () =>
          Promise.reject(
            Object.assign(new Error('rate limited'), {
              status: 429,
              headers: { 'retry-after': '3' },
            }),
          ),
      },
      chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
    };
    const adapter = openai({ client });
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream({
      model: 'gpt-5.5',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
    })) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    const error = events[0] as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect(error.error.data).toMatchObject({ kind: 'rate-limit', retryAfterMs: 3000 });
  });

  it.skipIf(process.env.OPENAI_API_KEY === undefined)(
    'live smoke: one small call (manual, key-gated)',
    async () => {
      const adapter = openai({});
      const events: ChatEvent[] = [];
      for await (const event of adapter.stream({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 32,
      })) {
        events.push(event);
      }
      expect(events.find((e) => e.type === 'finish')).toBeDefined();
    },
    30_000,
  );
});

describe('the GPT-5.6 caps entries and unknown-model safety', () => {
  it('seeds gpt-5.6-sol and its alias with the official caps and tiered pricing', () => {
    for (const model of ['gpt-5.6-sol', 'gpt-5.6']) {
      const info = openAiModelInfo(model);
      expect(info.api).toBe('responses');
      expect(info.reasoning).toBe(true);
      expect(info.caps.contextWindow).toBe(1_050_000);
      expect(info.caps.maxOutputTokens).toBe(128_000);
      expect(info.caps.reasoningEfforts).toContain('max');
      expect(info.caps.pricing).toEqual({
        inputUsdPerMTok: 5,
        outputUsdPerMTok: 30,
        cacheReadUsdPerMTok: 0.5,
        cacheWriteUsdPerMTok: 6.25,
        tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
      });
    }
  });

  it('passes the gpt-5.6-sol wire id through the Responses params unchanged', () => {
    const { params } = buildResponsesParams(
      {
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
        effort: 'high',
      },
      ids(),
    );
    expect(params.model).toBe('gpt-5.6-sol');
    expect(params.reasoning).toEqual({ effort: 'high' });
  });

  it('resolves dated snapshots by the longest matching prefix', () => {
    // 'gpt-5.5-pro-...' must reach the pro entry, never the shorter
    // 'gpt-5.5' sibling.
    expect(openAiModelInfo('gpt-5.5-pro-2026-07-01')).toBe(OPENAI_MODELS['gpt-5.5-pro']);
    expect(openAiModelInfo('gpt-5.6-sol-2026-08-01').caps.contextWindow).toBe(1_050_000);
  });

  it('unknown models keep conservative transport caps but are never silently priced', () => {
    const info = openAiModelInfo('gpt-7-hyperion');
    expect(info.api).toBe('responses');
    expect(info.caps.contextWindow).toBe(272_000);
    expect(info.caps.maxOutputTokens).toBe(100_000);
    // No fabricated price row: the usage surfaces in CostReport.unpriced
    // and a run ceiling warns, instead of silently billing a wrong rate.
    expect(info.caps.pricing).toBeUndefined();
  });
});
