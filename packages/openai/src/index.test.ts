import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createCanonicalIdMinter,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  priceUsdOf,
  sanitizeUsage,
  tool,
  usageViolations,
  type ChatEvent,
  type Part,
} from '@rulvar/core';
import { liveTestEnabled, runLiveSmoke } from '@rulvar/testing';
import type { OpenAiClientLike } from './adapter.js';
import { openai } from './adapter.js';
import { OPENAI_MODELS, OPENAI_PRICING, openAiModelInfo } from './caps.js';
import {
  buildChatCompletionsParams,
  buildResponsesParams,
  mapChatCompletionsStream,
  mapOpenAiEffort,
  mapResponsesStream,
  normalizeOpenAiUsage,
  openAiErrorToWire,
  OpenAiIdMap,
  type ResponsesStreamEvent,
} from './wire.js';

function ids(): OpenAiIdMap {
  return new OpenAiIdMap(createCanonicalIdMinter());
}

/** Collects every event a mapper generator yields. */
async function collect(gen: AsyncGenerator<ChatEvent, void>): Promise<ChatEvent[]> {
  const events: ChatEvent[] = [];
  for await (const event of gen) {
    events.push(event);
  }
  return events;
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
    // Models whose caps declare wire max support send it unchanged.
    expect(mapOpenAiEffort('max', { wireMaxEffort: true })).toEqual({
      wire: 'max',
      downmapped: false,
    });

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
    const events = await collect(
      mapResponsesStream(
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
        { effortDownmapped: true },
      ),
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
    // input_tokens already includes cached reads; a usage object with no
    // cache_write_tokens field reports zero writes.
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
    const events = await collect(
      mapResponsesStream(
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
      ),
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

  it('fails closed on a drained stream without a response terminal (v1.27.0 review P1)', async () => {
    const events = await collect(
      mapResponsesStream(
        fixture([{ type: 'response.output_text.delta', delta: 'PARTIAL_ONLY' }]),
        ids(),
      ),
    );
    expect(events.map((e) => e.type)).toEqual(['text-delta', 'error']);
    const error = events.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect((error.error.data as { kind?: string }).kind).toBe('transport');
    expect(error.error.message).toContain('without a response terminal event');
  });

  it('a requested abort ends the drained stream with no terminal event', async () => {
    const controller = new AbortController();
    controller.abort();
    const events = await collect(
      mapResponsesStream(
        fixture([{ type: 'response.output_text.delta', delta: 'partial' }]),
        ids(),
        {
          signal: controller.signal,
        },
      ),
    );
    expect(events.map((e) => e.type)).toEqual(['text-delta']);
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
    const events = await collect(mapChatCompletionsStream(chunks(), ids()));
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

  it('fails closed when the stream drains without a finish_reason (v1.27.0 review P1)', async () => {
    async function* cut(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({ choices: [{ delta: { content: 'PARTIAL_ONLY' } }] });
    }
    const events = await collect(mapChatCompletionsStream(cut(), ids()));
    expect(events.map((e) => e.type)).toEqual(['text-delta', 'error']);
    const error = events.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect((error.error.data as { kind?: string }).kind).toBe('transport');
    expect(error.error.message).toContain('without a finish_reason');
  });

  it('a cut stream still forwards usage the provider reported, but never synthesizes finish', async () => {
    async function* cut(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({ choices: [{ delta: { content: 'partial' } }] });
      yield { choices: [], usage: { prompt_tokens: 20, completion_tokens: 4 } };
    }
    const events = await collect(mapChatCompletionsStream(cut(), ids()));
    expect(events.map((e) => e.type)).toEqual(['text-delta', 'usage', 'error']);
    const usage = events[1] as Extract<ChatEvent, { type: 'usage' }>;
    expect(usage.usage.inputTokens).toBe(20);
    expect(usage.usage.outputTokens).toBe(4);
  });

  it('half assembled tool calls are not flushed on a cut stream', async () => {
    async function* cut(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: 'call_1', function: { name: 'search', arguments: '{"q":' } },
              ],
            },
          },
        ],
      });
    }
    const events = await collect(mapChatCompletionsStream(cut(), ids()));
    expect(events.map((e) => e.type)).toEqual(['tool-call-start', 'tool-call-delta', 'error']);
  });

  it('a requested abort ends the cut stream with no terminal event', async () => {
    const controller = new AbortController();
    controller.abort();
    async function* cut(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({ choices: [{ delta: { content: 'partial' } }] });
    }
    const events = await collect(
      mapChatCompletionsStream(cut(), ids(), { signal: controller.signal }),
    );
    expect(events.map((e) => e.type)).toEqual(['text-delta']);
  });
});

describe('cache subset usage normalization (v1.19.0 review P1-1)', () => {
  // On the OpenAI wire input_tokens/prompt_tokens is the FULL prompt:
  // cached_tokens and cache_write_tokens (GPT-5.6 and later) are priced
  // SUBSETS of it, never additional tokens. Verified live 2026-07-18:
  // two identical long prompts report the same input_tokens while the
  // details flip from write to read. Adding writes on top (the v1.19.0
  // reading) double-billed every written token at 1x + 1.25x.
  it('normalizes the documented detail fields: none, read only, write only, read plus write', () => {
    expect(normalizeOpenAiUsage({ input_tokens: 1000, output_tokens: 10 })).toEqual({
      inputTokens: 1000,
      outputTokens: 10,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(
      normalizeOpenAiUsage({
        input_tokens: 1000,
        input_tokens_details: { cached_tokens: 400 },
        output_tokens: 10,
      }),
    ).toEqual({ inputTokens: 1000, outputTokens: 10, cacheReadTokens: 400, cacheWriteTokens: 0 });
    expect(
      normalizeOpenAiUsage({
        input_tokens: 1000,
        input_tokens_details: { cache_write_tokens: 200 },
        output_tokens: 10,
      }),
    ).toEqual({ inputTokens: 1000, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 200 });
    // The review's shape: input_tokens 1200 of which 100 were cache
    // reads and 200 were written to cache; 900 remain uncached and
    // inputTokens stays the full 1200.
    expect(
      normalizeOpenAiUsage({
        input_tokens: 1200,
        input_tokens_details: { cached_tokens: 100, cache_write_tokens: 200 },
        output_tokens: 10,
      }),
    ).toEqual({ inputTokens: 1200, outputTokens: 10, cacheReadTokens: 100, cacheWriteTokens: 200 });
  });

  it('clamps impossible telemetry into the subset domain instead of rejecting paid evidence', () => {
    // Negative details are floored to zero.
    expect(
      normalizeOpenAiUsage({
        input_tokens: 1000,
        input_tokens_details: { cached_tokens: -5, cache_write_tokens: -7 },
        output_tokens: 1,
      }),
    ).toEqual({ inputTokens: 1000, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 });
    // Overlapping subsets: reads keep priority, writes take what remains,
    // so reads + writes never exceed the full input.
    expect(
      normalizeOpenAiUsage({
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 80, cache_write_tokens: 50 },
        output_tokens: 1,
      }),
    ).toEqual({ inputTokens: 100, outputTokens: 1, cacheReadTokens: 80, cacheWriteTokens: 20 });
    // A lone oversized write clamps to the full input.
    expect(
      normalizeOpenAiUsage({
        input_tokens: 100,
        input_tokens_details: { cache_write_tokens: 250 },
        output_tokens: 1,
      }),
    ).toEqual({ inputTokens: 100, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 100 });
  });

  it('a Responses stream with cache writes emits usage exactly once and the premium prices', async () => {
    async function* events(): AsyncIterable<ResponsesStreamEvent> {
      yield await Promise.resolve({
        type: 'response.output_item.added',
        item: { type: 'message', id: 'msg_1' },
      });
      yield { type: 'response.output_text.delta', delta: 'ok' };
      yield {
        type: 'response.completed',
        response: {
          id: 'resp_cache',
          output: [],
          usage: {
            input_tokens: 1200,
            input_tokens_details: { cached_tokens: 100, cache_write_tokens: 200 },
            output_tokens: 10,
          },
        },
      };
    }
    const mapped = await collect(mapResponsesStream(events(), ids()));
    const usageEvents = mapped.filter((e) => e.type === 'usage');
    // Exactly one usage emission per response: the budget debits once.
    expect(usageEvents).toHaveLength(1);
    const finish = mapped.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    const expected = {
      inputTokens: 1200,
      outputTokens: 10,
      cacheReadTokens: 100,
      cacheWriteTokens: 200,
    };
    expect(usageEvents[0]?.usage).toEqual(expected);
    expect(finish.usage).toEqual(expected);
    // Priced on the Sol row: 900 uncached at $5 + 100 reads at $0.5 +
    // 200 writes at $6.25 (the 1.25x premium) + 10 output at $30, per MTok.
    const sol = OPENAI_MODELS['gpt-5.6-sol']?.caps.pricing;
    expect(sol).toBeDefined();
    expect(priceUsdOf(sol as NonNullable<typeof sol>, finish.usage)).toBeCloseTo(
      (900 / 1e6) * 5 + (100 / 1e6) * 0.5 + (200 / 1e6) * 6.25 + (10 / 1e6) * 30,
      12,
    );
  });

  it('the Chat Completions degraded path maps the same write field', async () => {
    async function* chunks(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({ choices: [{ delta: { content: 'ok' } }] });
      yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
      yield {
        choices: [],
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 4,
          prompt_tokens_details: { cached_tokens: 100, cache_write_tokens: 200 },
        },
      };
    }
    const mapped = await collect(mapChatCompletionsStream(chunks(), ids()));
    const finish = mapped.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 4,
      cacheReadTokens: 100,
      cacheWriteTokens: 200,
    });
  });

  it('numeric hygiene stays with the core boundary validator: garbage passes through and is flagged there (v1.20.0 review P1-1)', async () => {
    // The adapter maps wire SHAPE only; the engine enforces the full
    // telemetry invariant for every adapter uniformly and fails the
    // call loud. This test pins the pair contract per hostile field on
    // BOTH the Responses and the Chat path.
    const negative = normalizeOpenAiUsage({ input_tokens: 100, output_tokens: -100 });
    expect(negative.outputTokens).toBe(-100);
    expect(usageViolations(negative).join()).toContain('outputTokens is negative (-100)');

    const fractional = normalizeOpenAiUsage({
      input_tokens: 10.5,
      output_tokens: 2.25,
      input_tokens_details: { cached_tokens: 1.5, cache_write_tokens: 2.5 },
    });
    expect(fractional).toEqual({
      inputTokens: 10.5,
      outputTokens: 2.25,
      cacheReadTokens: 1.5,
      cacheWriteTokens: 2.5,
    });
    expect(usageViolations(fractional)).toHaveLength(4);

    const nan = normalizeOpenAiUsage({ input_tokens: 100, output_tokens: Number.NaN });
    expect(Number.isNaN(nan.outputTokens)).toBe(true);
    expect(usageViolations(nan).join()).toContain('outputTokens is NaN');

    const infinite = normalizeOpenAiUsage({
      input_tokens: Number.POSITIVE_INFINITY,
      output_tokens: 1,
    });
    expect(usageViolations(infinite).join()).toContain('inputTokens is Infinity');

    async function* chunks(): AsyncIterable<Record<string, unknown>> {
      yield await Promise.resolve({ choices: [{ delta: { content: 'ok' } }] });
      yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
      yield {
        choices: [],
        usage: { prompt_tokens: -3, completion_tokens: Number.NaN },
      };
    }
    const mapped = await collect(mapChatCompletionsStream(chunks(), ids()));
    const finish = mapped.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    const violations = usageViolations(finish.usage).join();
    expect(violations).toContain('inputTokens is negative (-3)');
    expect(violations).toContain('outputTokens is NaN');
    // And the conservative repair the engine accounts with never
    // credits: sanitize of this shape is all zeros.
    expect(sanitizeUsage(finish.usage)).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  });

  it('every field on both wire paths is flagged for every garbage class', async () => {
    // The reviewer acceptance matrix: negative, fraction, NaN, Infinity
    // in EVERY field, Responses and Chat alike. The adapter passes the
    // number through; the shared validator names the exact field.
    const GARBAGE: Array<[number, string]> = [
      [-5, 'negative'],
      [2.5, 'fractional'],
      [Number.NaN, 'not a finite number'],
      [Number.POSITIVE_INFINITY, 'not a finite number'],
    ];
    const RESPONSES_FIELDS: Array<[string, (v: number) => Record<string, unknown>]> = [
      ['inputTokens', (v) => ({ input_tokens: v, output_tokens: 1 })],
      ['outputTokens', (v) => ({ input_tokens: 10, output_tokens: v })],
      [
        'cacheReadTokens',
        (v) => ({
          input_tokens: 1e9,
          output_tokens: 1,
          input_tokens_details: { cached_tokens: v },
        }),
      ],
      [
        'cacheWriteTokens',
        (v) => ({
          input_tokens: 1e9,
          output_tokens: 1,
          input_tokens_details: { cache_write_tokens: v },
        }),
      ],
      [
        'reasoningTokens',
        (v) => ({
          input_tokens: 10,
          output_tokens: 1,
          output_tokens_details: { reasoning_tokens: v },
        }),
      ],
    ];
    for (const [field, shape] of RESPONSES_FIELDS) {
      for (const [value, expected] of GARBAGE) {
        const usage = normalizeOpenAiUsage(shape(value));
        const violations = usageViolations(usage).join();
        // The subset clamp repairs some garbage BEFORE the validator
        // sees it, which is itself the documented conservative repair:
        // negative cache details floor to zero and an Infinity detail
        // clamps to the full input; reasoning_tokens that are not a
        // positive number are dropped at the wire.
        const clampedAway =
          (field.startsWith('cache') && (value < 0 || value === Number.POSITIVE_INFINITY)) ||
          (field === 'reasoningTokens' && !(value > 0));
        if (clampedAway) {
          expect(usageViolations(usage)).toEqual([]);
        } else {
          expect(violations, `${field} ${String(value)}`).toContain(field);
          expect(violations, `${field} ${String(value)}`).toContain(expected);
        }
      }
    }
    const CHAT_FIELDS: Array<[string, (v: number) => Record<string, unknown>]> = [
      ['inputTokens', (v) => ({ prompt_tokens: v, completion_tokens: 1 })],
      ['outputTokens', (v) => ({ prompt_tokens: 10, completion_tokens: v })],
      [
        'cacheReadTokens',
        (v) => ({
          prompt_tokens: 1e9,
          completion_tokens: 1,
          prompt_tokens_details: { cached_tokens: v },
        }),
      ],
      [
        'cacheWriteTokens',
        (v) => ({
          prompt_tokens: 1e9,
          completion_tokens: 1,
          prompt_tokens_details: { cache_write_tokens: v },
        }),
      ],
    ];
    for (const [field, shape] of CHAT_FIELDS) {
      for (const [value, expected] of GARBAGE) {
        async function* chatChunks(): AsyncIterable<Record<string, unknown>> {
          yield await Promise.resolve({ choices: [{ delta: { content: 'x' } }] });
          yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
          yield { choices: [], usage: shape(value) };
        }
        const mappedChat = await collect(mapChatCompletionsStream(chatChunks(), ids()));
        const chatFinish = mappedChat.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
        const violations = usageViolations(chatFinish.usage).join();
        if (field.startsWith('cache') && (value < 0 || value === Number.POSITIVE_INFINITY)) {
          expect(usageViolations(chatFinish.usage)).toEqual([]);
        } else {
          expect(violations, `chat ${field} ${String(value)}`).toContain(field);
          expect(violations, `chat ${field} ${String(value)}`).toContain(expected);
        }
      }
    }
  });

  it('an injected client reporting garbage fails the call loud through the FULL engine path', async () => {
    const client: OpenAiClientLike = {
      responses: {
        create(): Promise<unknown> {
          return Promise.resolve(
            (async function* stream(): AsyncIterable<ResponsesStreamEvent> {
              yield await Promise.resolve({ type: 'response.output_text.delta', delta: 'ok' });
              yield {
                type: 'response.completed',
                response: {
                  id: 'r1',
                  output: [],
                  usage: { input_tokens: 100, output_tokens: -100 },
                },
              };
            })(),
          );
        },
      },
      chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
    };
    const engine = createEngine({
      adapters: [openai({ client })],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'openai:gpt-5.6-terra' } },
      pricing: OPENAI_PRICING,
    });
    const wf = defineWorkflow({ name: 'hostile-injected' }, (ctx) => ctx.agent('go'));
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('violated the Usage invariant');
    expect(outcome.cost.totalUsd).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(outcome.cost.totalUsd)).toBe(true);
  });

  it('both factories declare the subset usage semantics', () => {
    const stub: OpenAiClientLike = {
      responses: { create: () => Promise.reject(new Error('unused')) },
      chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
    };
    expect(openai({ client: stub }).usageSemantics).toBe('openai-cache-subsets-v2');
  });
});

describe('response.failed usage and retry classification (v1.18.0 review P1-3)', () => {
  function failedStream(
    error: Record<string, unknown>,
    usage?: Record<string, unknown>,
  ): AsyncIterable<ResponsesStreamEvent> {
    async function* events(): AsyncIterable<ResponsesStreamEvent> {
      yield await Promise.resolve({ type: 'response.output_text.delta', delta: 'partial' });
      yield {
        type: 'response.failed',
        response: { id: 'resp_fail', error, ...(usage === undefined ? {} : { usage }) },
      };
    }
    return events();
  }

  it('a paid failure emits its usage exactly once before the error termination', async () => {
    const mapped = await collect(
      mapResponsesStream(
        failedStream(
          { code: 'server_error', message: 'The server had an error.' },
          { input_tokens: 500, output_tokens: 120 },
        ),
        ids(),
      ),
    );
    expect(mapped.map((e) => e.type)).toEqual(['text-delta', 'usage', 'error']);
    const usage = mapped[1] as Extract<ChatEvent, { type: 'usage' }>;
    expect(usage.usage).toEqual({
      inputTokens: 500,
      outputTokens: 120,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    const error = mapped[2] as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect(error.error.data).toMatchObject({ kind: 'transport', providerCode: 'server_error' });
  });

  it('rate_limit_exceeded classifies as a retryable rate limit', async () => {
    const mapped = await collect(
      mapResponsesStream(
        failedStream({ code: 'rate_limit_exceeded', message: 'Rate limit reached.' }),
        ids(),
      ),
    );
    const error = mapped.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect(error.error.data).toMatchObject({
      kind: 'rate-limit',
      providerCode: 'rate_limit_exceeded',
    });
    // No usage on the wire means no usage event, never a zero debit.
    expect(mapped.some((e) => e.type === 'usage')).toBe(false);
  });

  it('validation and unknown codes stay non-retryable (fail closed)', async () => {
    for (const code of ['invalid_prompt', 'brand_new_code']) {
      const mapped = await collect(
        mapResponsesStream(failedStream({ code, message: 'nope' }), ids()),
      );
      const error = mapped.at(-1) as Extract<ChatEvent, { type: 'error' }>;
      expect(error.error.retryable, code).toBe(false);
      expect(error.error.data).toMatchObject({ kind: 'transport', providerCode: code });
    }
  });

  it('the top-level SSE error event classifies by the same table', async () => {
    async function* events(): AsyncIterable<ResponsesStreamEvent> {
      yield await Promise.resolve({
        type: 'error',
        code: 'server_error',
        message: 'stream broke',
      });
    }
    const mapped = await collect(mapResponsesStream(events(), ids()));
    const error = mapped.at(-1) as Extract<ChatEvent, { type: 'error' }>;
    expect(error.error.retryable).toBe(true);
    expect(error.error.message).toBe('stream broke');
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

  it('sends wire effort max unchanged for every GPT-5.6 sibling', async () => {
    // Fake transport (v1.17.0 review): the request the SDK client sees
    // must carry effort max unchanged for Sol, Terra, AND Luna (v1.20.0
    // review P2-3, each sibling verified live 2026-07-18); no downmap
    // metadata may appear for any of them.
    const calls: Array<Record<string, unknown>> = [];
    const client: OpenAiClientLike = {
      responses: {
        create(params: Record<string, unknown>): Promise<unknown> {
          calls.push(params);
          return Promise.resolve(
            (async function* stream(): AsyncIterable<ResponsesStreamEvent> {
              yield await Promise.resolve({ type: 'response.output_text.delta', delta: 'ok' });
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
    const finishes: Array<Extract<ChatEvent, { type: 'finish' }>> = [];
    for (const model of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      for await (const event of adapter.stream({
        model,
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
        effort: 'max',
      })) {
        if (event.type === 'finish') {
          finishes.push(event);
        }
      }
    }
    expect(calls.map((call) => call.model)).toEqual([
      'gpt-5.6-sol',
      'gpt-5.6-terra',
      'gpt-5.6-luna',
    ]);
    expect(calls.map((call) => call.reasoning)).toEqual([
      { effort: 'max' },
      { effort: 'max' },
      { effort: 'max' },
    ]);
    const metaOf = (finish: Extract<ChatEvent, { type: 'finish' }>) =>
      (finish.providerMetadata?.openai as Record<string, unknown> | undefined)?.effortDownmapped;
    expect(metaOf(finishes[0])).toBeUndefined();
    expect(metaOf(finishes[1])).toBeUndefined();
    expect(metaOf(finishes[2])).toBeUndefined();
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

  it('an unparsable or huge Retry-After never emits NaN or an overflowing delay (v1.28.0 review P2)', async () => {
    const errorFor = async (retryAfter: string) => {
      const client: OpenAiClientLike = {
        responses: {
          create: () =>
            Promise.reject(
              Object.assign(new Error('rate limited'), {
                status: 429,
                headers: { 'retry-after': retryAfter },
              }),
            ),
        },
        chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
      };
      const events: ChatEvent[] = [];
      for await (const event of openai({ client }).stream({
        model: 'gpt-5.5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
      })) {
        events.push(event);
      }
      return (events[0] as Extract<ChatEvent, { type: 'error' }>).error;
    };

    // The HTTP date form and garbage both fall back to policy backoff:
    // the field is absent, never NaN (which would also serialize to
    // null and break the WireError.data Json invariant).
    for (const malformed of ['not-a-delay', 'Fri, 31 Dec 2027 23:59:59 GMT', '-5']) {
      const error = await errorFor(malformed);
      expect(error.data).toMatchObject({ kind: 'rate-limit', status: 429 });
      expect((error.data as { retryAfterMs?: number }).retryAfterMs).toBeUndefined();
    }
    // A huge but finite value clamps to the Node timer maximum
    // instead of overflowing into an almost immediate retry.
    const huge = await errorFor('3000000');
    expect((huge.data as { retryAfterMs?: number }).retryAfterMs).toBe(2_147_483_647);
  });

  it('Retry-After honors only the RFC delta-seconds grammar (v1.29.0 review P3)', () => {
    const msOf = (value: string): number | undefined =>
      (
        openAiErrorToWire({
          status: 429,
          message: 'rate limited',
          headers: { 'retry-after': value },
        }).data as { retryAfterMs?: number }
      ).retryAfterMs;

    // Number() alone accepted every one of these; the grammar is a
    // nonempty digit run after optional whitespace, nothing else.
    for (const malformed of [
      '',
      ' ',
      '0x10',
      '1e3',
      '1.5',
      '+3',
      '-5',
      'Wed, 21 Oct 2026 07:28:00 GMT',
    ]) {
      expect(msOf(malformed)).toBeUndefined();
    }
    expect(msOf('3')).toBe(3000);
    expect(msOf(' 3 ')).toBe(3000);
    expect(msOf('0')).toBe(0);
    expect(msOf('007')).toBe(7000);
    expect(msOf('99999999999999999999999')).toBe(2_147_483_647);
  });

  it.skipIf(!liveTestEnabled('OPENAI_API_KEY'))(
    'live smoke: one small call (opt-in via RULVAR_LIVE_TESTS=1, spends budget)',
    async () => {
      // Bounded retry so a transient 529/429 gets a second chance while a
      // non-retryable error (auth, invalid model) fails immediately with
      // the typed diagnostics intact (v1.13 review P3-1).
      const outcome = await runLiveSmoke(openai({}), {
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 32,
      });
      if (outcome.status !== 'ok') {
        throw new Error(`live smoke did not reach finish: ${JSON.stringify(outcome)}`);
      }
    },
    90_000,
  );

  it.skipIf(!liveTestEnabled('OPENAI_API_KEY'))(
    'live contract: every GPT-5.6 sibling accepts wire effort max without a downmap (opt-in, spends budget)',
    async () => {
      // The wire-max contract (v1.17.0 review, family-wide per the
      // v1.20.0 review P2-3): a real request at canonical effort max
      // must reach the wire as max and succeed. The API 400s an invalid
      // effort with an enumeration of the supported values, so a finish
      // here IS acceptance, and the absent downmap metadata proves the
      // adapter sent max verbatim. Bounded output keeps the spend small.
      for (const model of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
        const outcome = await runLiveSmoke(openai({}), {
          model,
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
          effort: 'max',
          maxOutputTokens: 2048,
        });
        if (outcome.status !== 'ok') {
          throw new Error(
            `${model} max live smoke did not reach finish: ${JSON.stringify(outcome)}`,
          );
        }
        const finish = outcome.events.find(
          (event): event is Extract<ChatEvent, { type: 'finish' }> => event.type === 'finish',
        );
        const meta = finish?.providerMetadata?.openai as Record<string, unknown> | undefined;
        expect(meta?.effortDownmapped, model).toBeUndefined();
      }
    },
    360_000,
  );

  it.skipIf(!liveTestEnabled('OPENAI_API_KEY'))(
    'live smoke: routed finalize on Luna synthesizes the tool answer, never a greeting (opt-in, spends budget)',
    async () => {
      // The v1.18.0 review P1-1 live scenario: without the deterministic
      // synthesis instruction a real model treated the assistant-ended
      // transcript as a fresh conversation and replaced the correct
      // answer with a greeting. This smoke pins the fixed contract on a
      // real provider under a hard run ceiling.
      const sumNumbers = tool({
        name: 'sum_numbers',
        description: 'Adds two numbers and returns the sum.',
        parameters: {
          type: 'object',
          properties: { a: { type: 'number' }, b: { type: 'number' } },
          required: ['a', 'b'],
          additionalProperties: false,
        },
        execute: (input) => {
          const { a, b } = input as { a: number; b: number };
          return Promise.resolve({ sum: a + b });
        },
      });
      const engine = createEngine({
        adapters: [openai({})],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        // The versioned table lets projected admission price the turns;
        // without it the engine falls back to the flat per-spawn reserve
        // and a small ceiling refuses before the first call.
        pricing: OPENAI_PRICING,
      });
      const wf = defineWorkflow({ name: 'live-finalize' }, async (ctx) =>
        ctx.agent('Use the sum_numbers tool to compute 31 + 11, then state the sum.', {
          tools: [sumNumbers],
          routing: { loop: 'openai:gpt-5.6-luna', finalize: 'openai:gpt-5.6-luna' },
        }),
      );
      const outcome = await engine.run(wf, undefined, { budgetUsd: 0.5 }).result;
      if (outcome.status !== 'ok') {
        throw new Error(`finalize live smoke did not finish ok: ${JSON.stringify(outcome)}`);
      }
      expect(String(outcome.value)).toContain('42');
      expect(String(outcome.value)).not.toMatch(/how can i (help|assist)/iu);
    },
    240_000,
  );

  it.skipIf(!liveTestEnabled('OPENAI_API_KEY'))(
    'live contract: cache write and read are subsets of an invariant full input (opt-in, spends budget)',
    async () => {
      // The v1.19.0 review P1-1 contract, pinned on the real wire: for
      // identical long prompts input_tokens is the SAME full count on
      // the write call and on the read call while the details flip from
      // write to read; nothing may be added on top. A unique nonce
      // forces a fresh cache key, so an earlier run within the provider
      // cache TTL cannot turn the first call into a read.
      const paragraph =
        'The lighthouse keeper catalogued every storm in a ledger of salt-stained pages, ' +
        'noting wind direction, barometric drift, and the exact minute the lamp wick was ' +
        'trimmed. Decades of entries formed a private meteorology, unread by anyone. ';
      const text =
        `Session ${randomUUID()}. Read the archive notes below and reply with the single ` +
        `word DONE.\n${paragraph.repeat(38)}`;
      const request = {
        model: 'gpt-5.6-terra',
        messages: [{ role: 'user' as const, parts: [{ type: 'text' as const, text }] }],
        maxOutputTokens: 16,
      };
      const usageOf = (outcome: Awaited<ReturnType<typeof runLiveSmoke>>) => {
        if (outcome.status !== 'ok') {
          throw new Error(`cache contract call did not finish ok: ${JSON.stringify(outcome)}`);
        }
        const finish = outcome.events.find(
          (event): event is Extract<ChatEvent, { type: 'finish' }> => event.type === 'finish',
        );
        if (finish === undefined) {
          throw new Error('cache contract call produced no finish event');
        }
        return finish.usage;
      };
      const first = usageOf(await runLiveSmoke(openai({}), request));
      const second = usageOf(await runLiveSmoke(openai({}), request));
      // The decisive invariant: identical prompts, identical FULL input
      // counts. The double-add defect inflated the write call's
      // inputTokens by the write count and broke this equality.
      expect(second.inputTokens).toBe(first.inputTokens);
      expect(first.cacheReadTokens + first.cacheWriteTokens).toBeLessThanOrEqual(first.inputTokens);
      expect(second.cacheReadTokens + second.cacheWriteTokens).toBeLessThanOrEqual(
        second.inputTokens,
      );
      // A legitimate hit after a write, or a documented no-hit (the
      // provider may decline to cache); never a double count either way.
      if (first.cacheWriteTokens > 0) {
        expect(second.cacheReadTokens).toBeGreaterThan(0);
      }

      // Raw-wire leg of the contract: total_tokens covers exactly
      // input + output (no extra bucket for writes), and the normalizer
      // preserves the provider's full input count verbatim.
      const key = process.env.OPENAI_API_KEY as string;
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          input: [{ role: 'user', content: [{ type: 'input_text', text }] }],
          max_output_tokens: 16,
        }),
      });
      expect(res.ok).toBe(true);
      const raw = ((await res.json()) as { usage: Record<string, unknown> }).usage;
      const rawInput = raw.input_tokens as number;
      const rawOutput = raw.output_tokens as number;
      expect(raw.total_tokens).toBe(rawInput + rawOutput);
      expect(normalizeOpenAiUsage(raw).inputTokens).toBe(rawInput);
    },
    240_000,
  );
});

describe('the GPT-5.6 family entries and unknown-model safety (v1.17.0 review P1-1)', () => {
  // wireMax true for the whole family (v1.20.0 review P2-3): each
  // sibling verified live 2026-07-18 with a max-effort Responses call
  // returning 200 and the effort echoed.
  const GPT_56_EXPECTED = {
    'gpt-5.6-sol': { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25, wireMax: true },
    'gpt-5.6-terra': { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 3.125, wireMax: true },
    'gpt-5.6-luna': { input: 1, output: 6, cacheRead: 0.1, cacheWrite: 1.25, wireMax: true },
  } as const;

  it('seeds exact Sol, Terra, and Luna rows with the official rates', () => {
    for (const [model, expected] of Object.entries(GPT_56_EXPECTED)) {
      const info = openAiModelInfo(model);
      expect(info.api, model).toBe('responses');
      expect(info.reasoning, model).toBe(true);
      expect(info.wireMaxEffort, model).toBe(expected.wireMax);
      expect(info.caps.contextWindow, model).toBe(1_050_000);
      expect(info.caps.maxOutputTokens, model).toBe(128_000);
      expect(info.caps.reasoningEfforts, model).toContain('max');
      expect(info.caps.pricing, model).toEqual({
        inputUsdPerMTok: expected.input,
        outputUsdPerMTok: expected.output,
        cacheReadUsdPerMTok: expected.cacheRead,
        cacheWriteUsdPerMTok: expected.cacheWrite,
        tiers: [{ aboveInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 }],
      });
    }
  });

  it('the published gpt-5.6 alias equals Sol as an exact alias only', () => {
    expect(openAiModelInfo('gpt-5.6')).toBe(OPENAI_MODELS['gpt-5.6-sol']);
  });

  it('every gpt-5.6 family member has its own versioned OPENAI_PRICING row', () => {
    expect(OPENAI_PRICING.pricingVersion).toBe('openai-2026-07-18-r2');
    for (const [model, expected] of Object.entries(GPT_56_EXPECTED)) {
      expect(OPENAI_PRICING.models[`openai:${model}`]?.inputUsdPerMTok, model).toBe(expected.input);
      expect(OPENAI_PRICING.models[`openai:${model}`]?.outputUsdPerMTok, model).toBe(
        expected.output,
      );
    }
    expect(OPENAI_PRICING.models['openai:gpt-5.6']).toEqual(
      OPENAI_PRICING.models['openai:gpt-5.6-sol'],
    );
  });

  it('sibling models never inherit another row; only dated snapshots inherit', () => {
    // The defect: 'gpt-5.6-luna' prefix-matched the family alias and was
    // priced as Sol. Siblings now resolve their own exact rows.
    expect(openAiModelInfo('gpt-5.6-luna')).toBe(OPENAI_MODELS['gpt-5.6-luna']);
    expect(openAiModelInfo('gpt-5.6-terra')).toBe(OPENAI_MODELS['gpt-5.6-terra']);
    // Documented dated snapshots inherit their exact model's row.
    expect(openAiModelInfo('gpt-5.6-sol-2026-08-01')).toBe(OPENAI_MODELS['gpt-5.6-sol']);
    expect(openAiModelInfo('gpt-5.6-terra-2026-08-01')).toBe(OPENAI_MODELS['gpt-5.6-terra']);
    expect(openAiModelInfo('gpt-5.6-luna-2026-08-01')).toBe(OPENAI_MODELS['gpt-5.6-luna']);
    expect(openAiModelInfo('gpt-5.5-pro-2026-07-01')).toBe(OPENAI_MODELS['gpt-5.5-pro']);
    // An unknown sibling or preview suffix is NOT a snapshot: it gets
    // conservative unpriced caps, never the nearest alias's price.
    for (const unknown of ['gpt-5.6-unknownx', 'gpt-5.6-sol-preview', 'gpt-5.6-luna-mini']) {
      const info = openAiModelInfo(unknown);
      expect(info.caps.pricing, unknown).toBeUndefined();
      expect(info.caps.contextWindow, unknown).toBe(272_000);
    }
  });

  it('carries the official pre-5.6 rows re-verified 2026-07-18, with no write premium', () => {
    // The provider dropped the pre-5.6 prices when the 5.6 family
    // shipped (v1.18.0 review P1-6); these are the official rates. None
    // of these families reports cache_write_tokens or bills a write
    // premium, and gpt-5.5-pro lists NO cached-input rate at all, so its
    // row omits the field rather than fabricating a discount or a zero.
    expect(OPENAI_MODELS['gpt-5.5']?.caps.pricing).toEqual({
      inputUsdPerMTok: 5,
      outputUsdPerMTok: 30,
      cacheReadUsdPerMTok: 0.5,
    });
    expect(OPENAI_MODELS['gpt-5.5-pro']?.caps.pricing).toEqual({
      inputUsdPerMTok: 30,
      outputUsdPerMTok: 180,
    });
    expect(OPENAI_MODELS['gpt-5.4']?.caps.pricing).toEqual({
      inputUsdPerMTok: 2.5,
      outputUsdPerMTok: 15,
      cacheReadUsdPerMTok: 0.25,
    });
    expect(OPENAI_MODELS['gpt-5.4-mini']?.caps.pricing).toEqual({
      inputUsdPerMTok: 0.75,
      outputUsdPerMTok: 4.5,
      cacheReadUsdPerMTok: 0.075,
    });
  });

  it('prices the long-context tier strictly above 272000 input tokens', () => {
    const luna = openAiModelInfo('gpt-5.6-luna').caps.pricing;
    expect(luna).toBeDefined();
    const at = priceUsdOf(luna as NonNullable<typeof luna>, {
      inputTokens: 272_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    const above = priceUsdOf(luna as NonNullable<typeof luna>, {
      inputTokens: 272_001,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    // At the boundary: 0.272M input at $1 + 1M output at $6.
    expect(at).toBeCloseTo(0.272 + 6, 10);
    // One token above: the FULL request reprices at 2x input, 1.5x output.
    expect(above).toBeCloseTo(0.272001 * 2 + 6 * 1.5, 10);
  });

  it('passes every gpt-5.6 wire id through the Responses params unchanged', () => {
    for (const model of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.6']) {
      const { params } = buildResponsesParams(
        {
          model,
          messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
          effort: 'high',
        },
        ids(),
      );
      expect(params.model, model).toBe(model);
      expect(params.reasoning, model).toEqual({ effort: 'high' });
    }
  });

  it('sends wire max unchanged across the GPT-5.6 family and downmaps it visibly elsewhere', () => {
    const request = (model: string) => ({
      model,
      messages: [{ role: 'user' as const, parts: [{ type: 'text' as const, text: 'go' }] }],
      effort: 'max' as const,
    });
    // The whole family passes max through (v1.20.0 review P2-3).
    for (const model of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      const info = openAiModelInfo(model);
      expect(info.wireMaxEffort, model).toBe(true);
      const built = buildResponsesParams(request(model), ids(), {
        wireMaxEffort: info.wireMaxEffort,
      });
      expect(built.params.reasoning, model).toEqual({ effort: 'max' });
      expect(built.effortDownmapped, model).toBe(false);
    }
    // Unverified and legacy families keep the safe, visible downmap.
    for (const model of ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.4-mini', 'gpt-7-hyperion']) {
      const info = openAiModelInfo(model);
      expect(info.wireMaxEffort, model).toBe(false);
      const built = buildResponsesParams(request(model), ids(), {
        wireMaxEffort: info.wireMaxEffort,
      });
      expect(built.params.reasoning, model).toEqual({ effort: 'xhigh' });
      expect(built.effortDownmapped, model).toBe(true);
    }
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

describe('live incremental streaming (the reliability-review P0)', () => {
  const HEAD: ResponsesStreamEvent[] = [
    { type: 'response.output_text.delta', delta: 'live' },
    { type: 'response.output_text.delta', delta: ' text' },
  ];
  const TAIL: ResponsesStreamEvent[] = [
    {
      type: 'response.completed',
      response: {
        id: 'resp_live',
        output: [],
        usage: { input_tokens: 5, output_tokens: 2 },
      },
    },
  ];
  const req = {
    model: 'gpt-5.5',
    messages: [{ role: 'user' as const, parts: [{ type: 'text' as const, text: 'go' }] }],
  };

  function gatedClient(): {
    client: OpenAiClientLike;
    release: () => void;
    pulls: () => number;
  } {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let pulls = 0;
    const client: OpenAiClientLike = {
      responses: {
        create: (_params: Record<string, unknown>, opts?: { signal?: AbortSignal }) =>
          Promise.resolve(
            (async function* stream(): AsyncIterable<ResponsesStreamEvent> {
              for (const event of HEAD) {
                if (opts?.signal?.aborted === true) {
                  throw Object.assign(new Error('aborted'), { name: 'AbortError' });
                }
                pulls += 1;
                yield event;
              }
              await gate;
              for (const event of TAIL) {
                if (opts?.signal?.aborted === true) {
                  throw Object.assign(new Error('aborted'), { name: 'AbortError' });
                }
                pulls += 1;
                yield event;
              }
            })(),
          ),
      },
      chat: { completions: { create: () => Promise.reject(new Error('unused')) } },
    };
    return { client, release, pulls: () => pulls };
  }

  it('yields events while the provider is still mid-stream', async () => {
    const { client, release } = gatedClient();
    const adapter = openai({ client });
    const iterator = adapter.stream(req)[Symbol.asyncIterator]();
    // A buffering adapter deadlocks here: the gate only opens below.
    const first = await iterator.next();
    expect((first.value as ChatEvent).type).toBe('text-delta');
    release();
    const rest: ChatEvent[] = [];
    while (true) {
      const next = await iterator.next();
      if (next.done === true) {
        break;
      }
      rest.push(next.value);
    }
    expect(rest.at(-1)?.type).toBe('finish');
    expect(rest.filter((e) => e.type === 'finish' || e.type === 'error')).toHaveLength(1);
  }, 5_000);

  it('an abort after the first delta reaches the in-flight provider stream', async () => {
    const { client, release } = gatedClient();
    const adapter = openai({ client });
    const controller = new AbortController();
    const iterator = adapter.stream(req, controller.signal)[Symbol.asyncIterator]();
    await iterator.next(); // the first delta
    controller.abort();
    release();
    const rest: ChatEvent[] = [];
    while (true) {
      const next = await iterator.next();
      if (next.done === true) {
        break;
      }
      rest.push(next.value);
    }
    // The provider iterable observed the signal; no normal terminal, no
    // fabricated one either.
    expect(rest.find((e) => e.type === 'finish')).toBeUndefined();
    expect(rest.find((e) => e.type === 'error')).toBeUndefined();
  }, 5_000);

  it('a slow consumer never causes read-ahead buffering (lock-step pulls)', async () => {
    const { client, release, pulls } = gatedClient();
    release();
    const adapter = openai({ client });
    const iterator = adapter.stream(req)[Symbol.asyncIterator]();
    await iterator.next(); // first delta (pull 1)
    // The consumer paused: nothing further may have been read ahead.
    expect(pulls()).toBeLessThanOrEqual(2);
    while (true) {
      const next = await iterator.next();
      if (next.done === true) {
        break;
      }
    }
    expect(pulls()).toBe(HEAD.length + TAIL.length);
  }, 5_000);

  it('the degraded chat path also yields chunk by chunk', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    async function* chunks(): AsyncIterable<Record<string, unknown>> {
      yield { choices: [{ index: 0, delta: { content: 'early' } }] };
      await gate;
      yield {
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        usage: { prompt_tokens: 3, completion_tokens: 1 },
      };
    }
    const gen = mapChatCompletionsStream(chunks(), ids());
    const first = await gen.next();
    expect((first.value as ChatEvent).type).toBe('text-delta');
    release();
    const rest: ChatEvent[] = [];
    for await (const event of gen) {
      rest.push(event);
    }
    expect(rest.map((e) => e.type)).toEqual(['usage', 'finish']);
  }, 5_000);
});
