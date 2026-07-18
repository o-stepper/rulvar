import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createCanonicalIdMinter,
  createEngine,
  defineWorkflow,
  InMemoryStore,
  priceUsdOf,
  tool,
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

  it('sends wire effort max for Sol and records the downmap elsewhere', async () => {
    // Fake transport (v1.17.0 review): the request the SDK client sees
    // must carry effort max unchanged for Sol; Terra and Luna keep the
    // documented lossy downmap, visible in providerMetadata.
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
      { effort: 'xhigh' },
      { effort: 'xhigh' },
    ]);
    const metaOf = (finish: Extract<ChatEvent, { type: 'finish' }>) =>
      (finish.providerMetadata?.openai as Record<string, unknown>).effortDownmapped;
    expect(metaOf(finishes[0])).toBeUndefined();
    expect(metaOf(finishes[1])).toBe('max->xhigh');
    expect(metaOf(finishes[2])).toBe('max->xhigh');
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
    'live smoke: Sol accepts wire effort max and Luna answers on its own row (opt-in, spends budget)',
    async () => {
      // The wire-max contract (v1.17.0 review): a real Sol request at
      // effort max must succeed WITHOUT the lossy downmap. Bounded
      // output keeps the spend small.
      const sol = await runLiveSmoke(openai({}), {
        model: 'gpt-5.6-sol',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        effort: 'max',
        maxOutputTokens: 2048,
      });
      if (sol.status !== 'ok') {
        throw new Error(`Sol max live smoke did not reach finish: ${JSON.stringify(sol)}`);
      }
      const finish = sol.events.find(
        (event): event is Extract<ChatEvent, { type: 'finish' }> => event.type === 'finish',
      );
      const meta = finish?.providerMetadata?.openai as Record<string, unknown> | undefined;
      expect(meta?.effortDownmapped).toBeUndefined();

      const luna = await runLiveSmoke(openai({}), {
        model: 'gpt-5.6-luna',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 32,
      });
      if (luna.status !== 'ok') {
        throw new Error(`Luna live smoke did not reach finish: ${JSON.stringify(luna)}`);
      }
    },
    180_000,
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
      });
      const wf = defineWorkflow({ name: 'live-finalize' }, async (ctx) =>
        ctx.agent('Use the sum_numbers tool to compute 31 + 11, then state the sum.', {
          tools: [sumNumbers],
          routing: { loop: 'openai:gpt-5.6-luna', finalize: 'openai:gpt-5.6-luna' },
        }),
      );
      const outcome = await engine.run(wf, undefined, { budgetUsd: 0.25 }).result;
      if (outcome.status !== 'ok') {
        throw new Error(`finalize live smoke did not finish ok: ${JSON.stringify(outcome)}`);
      }
      expect(String(outcome.value)).toContain('42');
      expect(String(outcome.value)).not.toMatch(/how can i (help|assist)/iu);
    },
    240_000,
  );
});

describe('the GPT-5.6 family entries and unknown-model safety (v1.17.0 review P1-1)', () => {
  const GPT_56_EXPECTED = {
    'gpt-5.6-sol': { input: 5, output: 30, cacheRead: 0.5, cacheWrite: 6.25, wireMax: true },
    'gpt-5.6-terra': { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 3.125, wireMax: false },
    'gpt-5.6-luna': { input: 1, output: 6, cacheRead: 0.1, cacheWrite: 1.25, wireMax: false },
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
    expect(OPENAI_PRICING.pricingVersion).toBe('openai-2026-07-18');
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

  it('sends wire max unchanged for Sol and downmaps it visibly elsewhere', () => {
    const request = (model: string) => ({
      model,
      messages: [{ role: 'user' as const, parts: [{ type: 'text' as const, text: 'go' }] }],
      effort: 'max' as const,
    });
    const sol = buildResponsesParams(request('gpt-5.6-sol'), ids(), {
      wireMaxEffort: openAiModelInfo('gpt-5.6-sol').wireMaxEffort,
    });
    expect(sol.params.reasoning).toEqual({ effort: 'max' });
    expect(sol.effortDownmapped).toBe(false);
    for (const model of ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5']) {
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
