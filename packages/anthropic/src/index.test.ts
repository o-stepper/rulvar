import { describe, expect, it } from 'vitest';

import { createCanonicalIdMinter, type ChatEvent, type ChatRequest } from '@rulvar/core';
import type { AnthropicClientLike } from './adapter.js';
import { anthropic } from './adapter.js';
import { anthropicModelInfo } from './caps.js';
import {
  anthropicErrorToWire,
  buildAnthropicParams,
  IdMap,
  mapAnthropicStream,
  mapStopReason,
  normalizeAnthropicUsage,
  type AnthropicStreamEvent,
} from './wire.js';

function ids(): IdMap {
  return new IdMap(createCanonicalIdMinter());
}

const baseReq: ChatRequest = {
  model: 'claude-fable-5',
  messages: [
    { role: 'system', parts: [{ type: 'text', text: 'be terse' }] },
    { role: 'user', parts: [{ type: 'text', text: 'review this' }] },
  ],
};

describe('buildAnthropicParams (M1-T12)', () => {
  it('splits system, applies output_config with effort passthrough including max', () => {
    const params = buildAnthropicParams(
      { ...baseReq, effort: 'max', schema: { type: 'object' } },
      { ids: ids(), maxOutputTokens: 64_000, thinkingForm: 'adaptive' },
    );
    expect(params.system).toEqual([{ type: 'text', text: 'be terse' }]);
    expect((params.messages as unknown[]).length).toBe(1);
    expect(params.output_config).toEqual({
      effort: 'max',
      format: { type: 'json_schema', schema: { type: 'object' } },
    });
    expect(params.thinking).toEqual({ type: 'adaptive' });
    expect(params.max_tokens).toBe(64_000);
    // Sampling params never appear unless providerOptions carries them.
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('output_format');
  });

  it('marks strict-compatible tools strict and maps toolChoice', () => {
    const strictSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['x'],
      properties: { x: { type: 'string' } },
    };
    const params = buildAnthropicParams(
      {
        ...baseReq,
        tools: [
          { name: 'emit_result', description: 'd', parameters: strictSchema },
          { name: 'loose', description: 'd', parameters: { type: 'object' } },
        ],
        toolChoice: { name: 'emit_result' },
      },
      { ids: ids(), maxOutputTokens: 1024, thinkingForm: 'adaptive' },
    );
    const tools = params.tools as Array<Record<string, unknown>>;
    expect(tools[0]?.strict).toBe(true);
    expect(tools[1]?.strict).toBeUndefined();
    expect(params.tool_choice).toEqual({ type: 'tool', name: 'emit_result' });
  });

  it('scrubs constrained-decoding keywords from strict tools and format schemas only', () => {
    // The live validator behind strict tools and output_config.format
    // rejects numeric bounds and maxItems (probed 2026-07-11; found by
    // the M12 checkpoint: the orchestrator's spawn tools carry integer
    // minimums, so every orchestrate run died with a 400 at zero cost).
    const strictSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['count', 'minimum', 'handles', 'pick'],
      properties: {
        count: { type: 'integer', minimum: 0, maximum: 9, description: 'kept' },
        // A property literally NAMED minimum must survive the scrub.
        minimum: { type: 'number', exclusiveMinimum: 0 },
        handles: { type: 'array', items: { type: 'integer', minimum: 1 }, maxItems: 4 },
        pick: {
          anyOf: [
            { type: 'integer', multipleOf: 2 },
            { type: 'string', maxLength: 8 },
          ],
        },
      },
      $defs: { tier: { type: 'integer', minimum: 0, exclusiveMaximum: 5 } },
    };
    const loose = { type: 'object', properties: { n: { type: 'integer', minimum: 1 } } };
    const params = buildAnthropicParams(
      {
        ...baseReq,
        tools: [
          { name: 'spawn', description: 'd', parameters: strictSchema },
          { name: 'loose', description: 'd', parameters: loose },
        ],
        schema: loose,
      },
      { ids: ids(), maxOutputTokens: 1024, thinkingForm: 'adaptive' },
    );
    const tools = params.tools as Array<Record<string, unknown>>;
    expect(tools[0]?.strict).toBe(true);
    expect(tools[0]?.input_schema).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['count', 'minimum', 'handles', 'pick'],
      properties: {
        count: { type: 'integer', description: 'kept' },
        minimum: { type: 'number' },
        handles: { type: 'array', items: { type: 'integer' } },
        pick: { anyOf: [{ type: 'integer' }, { type: 'string', maxLength: 8 }] },
      },
      $defs: { tier: { type: 'integer' } },
    });
    // The engine-side schema object is never mutated (it stays the
    // validation source for tool args).
    expect(strictSchema.properties.count.minimum).toBe(0);
    expect(strictSchema.properties.handles.maxItems).toBe(4);
    // Non-strict tools skip the validator and keep full hints; the
    // output format schema is scrubbed even though it is not strict.
    expect(tools[1]?.input_schema).toEqual(loose);
    expect((params.output_config as { format: { schema: unknown } }).format.schema).toEqual({
      type: 'object',
      properties: { n: { type: 'integer' } },
    });
  });

  it("maps toolChoice 'none' to explicit none with the tools param present (M4-T01)", () => {
    const params = buildAnthropicParams(
      {
        ...baseReq,
        tools: [{ name: 'clock', description: 'd', parameters: { type: 'object' } }],
        toolChoice: 'none',
      },
      { ids: ids(), maxOutputTokens: 1024, thinkingForm: 'adaptive' },
    );
    // Tool-use history without tool definitions is rejected by the API:
    // the tools param stays present, the choice pins none (docs/04, 8.4).
    expect((params.tools as unknown[]).length).toBe(1);
    expect(params.tool_choice).toEqual({ type: 'none' });
  });

  it('compiles cacheHint keeping the deepest breakpoints at the cap', () => {
    const params = buildAnthropicParams(
      {
        ...baseReq,
        messages: [
          { role: 'system', parts: [{ type: 'text', text: 's' }] },
          { role: 'user', parts: [{ type: 'text', text: 'u0' }] },
          { role: 'assistant', parts: [{ type: 'text', text: 'a0' }] },
          { role: 'user', parts: [{ type: 'text', text: 'u1' }] },
          { role: 'user', parts: [{ type: 'text', text: 'u2' }] },
        ],
        cacheHint: {
          breakpoints: [
            { after: 'system' },
            { after: { messageIndex: 0 } },
            { after: { messageIndex: 1 }, ttl: '1h' },
            { after: { messageIndex: 2 } },
            { after: { messageIndex: 3 } },
          ],
        },
      },
      { ids: ids(), maxOutputTokens: 1024, thinkingForm: 'adaptive' },
    );
    const system = params.system as Array<Record<string, unknown>>;
    const messages = params.messages as Array<{ content: Array<Record<string, unknown>> }>;
    // The shallowest breakpoint (system) was dropped; the deepest four kept.
    expect(system[0]?.cache_control).toBeUndefined();
    expect(messages[0]?.content[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(messages[1]?.content[0]?.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
    expect(messages[2]?.content[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(messages[3]?.content[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('round-trips provider-raw thinking blocks to anthropic targets only', () => {
    const thinking = { type: 'thinking', thinking: 'chain', signature: 'sig' };
    const params = buildAnthropicParams(
      {
        ...baseReq,
        messages: [
          {
            role: 'assistant',
            parts: [
              { type: 'provider-raw', provider: 'anthropic', block: thinking },
              { type: 'provider-raw', provider: 'openai', block: { type: 'reasoning' } },
              { type: 'text', text: 'answer' },
            ],
          },
        ],
      },
      { ids: ids(), maxOutputTokens: 1024, thinkingForm: 'adaptive' },
    );
    const content = (params.messages as Array<{ content: unknown[] }>)[0]?.content;
    expect(content).toEqual([thinking, { type: 'text', text: 'answer' }]);
  });
});

describe('stream mapping (M1-T12)', () => {
  async function* fixture(events: AnthropicStreamEvent[]): AsyncIterable<AnthropicStreamEvent> {
    for (const event of events) {
      yield await Promise.resolve(event);
    }
  }

  const toolTurn: AnthropicStreamEvent[] = [
    {
      type: 'message_start',
      message: {
        id: 'msg_1',
        usage: { input_tokens: 100, cache_read_input_tokens: 20, cache_creation_input_tokens: 30 },
      },
    },
    { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'calling ' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'a tool' } },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'tool_use', id: 'toolu_abc', name: 'emit_result' },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '{"verdict":' },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '"pass"}' },
    },
    { type: 'content_block_stop', index: 1 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 12 } },
    { type: 'message_stop' },
  ];

  it('maps a tool turn with bijective canonical ids and the Usage invariant', async () => {
    const idMap = ids();
    const events: ChatEvent[] = [];
    const mapping = await mapAnthropicStream(fixture(toolTurn), idMap, (e) => events.push(e));
    expect(mapping.finished).toBe(true);

    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'usage',
      'text-delta',
      'text-delta',
      'tool-call-start',
      'tool-call-delta',
      'tool-call-delta',
      'tool-call-end',
      'finish',
    ]);
    const start = events.find((e) => e.type === 'tool-call-start');
    const end = events.find((e) => e.type === 'tool-call-end');
    expect(start && 'id' in start && start.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(end && 'args' in end && end.args).toEqual({ verdict: 'pass' });
    // Bijective: the same wire id maps to the same canonical id, and back.
    const canonical = (start as { id: string }).id;
    expect(idMap.canonicalFor('toolu_abc')).toBe(canonical);
    expect(idMap.wireFor(canonical)).toBe('toolu_abc');

    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    expect(finish.finish).toEqual({ reason: 'tool-calls' });
    // Usage invariant: inputTokens is the FULL prompt including cache.
    expect(finish.usage).toEqual({
      inputTokens: 150,
      outputTokens: 12,
      cacheReadTokens: 20,
      cacheWriteTokens: 30,
    });
    expect((finish.providerMetadata?.anthropic as Record<string, unknown>).responseId).toBe(
      'msg_1',
    );
  });

  it('ships thinking blocks as the retention payload, carry included (M4-T02)', async () => {
    const thinkingTurn: AnthropicStreamEvent[] = [
      {
        type: 'message_start',
        message: { id: 'msg_2', usage: { input_tokens: 10, output_tokens: 0 } },
      },
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'hm' } },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: 'sig-1' },
      },
      { type: 'content_block_stop', index: 0 },
      { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'answer' } },
      { type: 'content_block_stop', index: 1 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 4 } },
      { type: 'message_stop' },
    ];
    const carried = { type: 'thinking', thinking: 'earlier continuation', signature: 'sig-0' };
    const events: ChatEvent[] = [];
    await mapAnthropicStream(fixture(thinkingTurn), ids(), (e) => events.push(e), {
      carryRetained: [carried],
    });
    const finish = events.at(-1) as Extract<ChatEvent, { type: 'finish' }>;
    const meta = finish.providerMetadata?.anthropic as Record<string, unknown>;
    // Whole-turn payload in stream order: the pause_turn carry first,
    // then this continuation's block, signature intact (docs/04, 4.5).
    expect(meta.retainedParts).toEqual([
      carried,
      { type: 'thinking', thinking: 'hm', signature: 'sig-1' },
    ]);
  });

  it('fabricates bijective wire ids for canonical ids minted elsewhere (M4-T02)', () => {
    const idMap = ids();
    const foreign = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
    const wire = idMap.wireFor(foreign);
    expect(wire).toBe(`toolu_${foreign}`);
    // Round-trip: the fabricated wire id maps back to the SAME canonical.
    expect(idMap.canonicalFor(wire)).toBe(foreign);
    expect(idMap.wireFor(foreign)).toBe(wire);
  });

  it('maps every stop reason to its typed outcome', () => {
    expect(mapStopReason('end_turn', null).finish).toEqual({ reason: 'stop' });
    expect(mapStopReason('stop_sequence', null).finish).toEqual({ reason: 'stop' });
    expect(mapStopReason('tool_use', null).finish).toEqual({ reason: 'tool-calls' });
    expect(mapStopReason('max_tokens', null).finish).toEqual({ reason: 'max-tokens' });
    expect(mapStopReason('model_context_window_exceeded', null).finish).toEqual({
      reason: 'context-window-exceeded',
    });
    expect(mapStopReason('pause_turn', null)).toEqual({ pauseTurn: true });
    const refusal = mapStopReason('refusal', {
      type: 'refusal',
      category: 'safety',
      explanation: 'declined',
    }).finish;
    expect(refusal).toEqual({
      reason: 'refusal',
      refusal: {
        provider: 'anthropic',
        stopDetails: { type: 'refusal', category: 'safety', explanation: 'declined' },
      },
    });
  });

  it('normalizes usage under the invariant', () => {
    expect(
      normalizeAnthropicUsage({
        input_tokens: 10,
        output_tokens: 3,
        cache_read_input_tokens: 5,
        cache_creation_input_tokens: 7,
      }),
    ).toEqual({ inputTokens: 22, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 7 });
  });

  it('absorbs pause_turn without a synthetic user message', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const client: AnthropicClientLike = {
      messages: {
        create(params: Record<string, unknown>): Promise<unknown> {
          calls.push(params);
          const first = calls.length === 1;
          const events: AnthropicStreamEvent[] = first
            ? [
                { type: 'message_start', message: { id: 'm1', usage: { input_tokens: 5 } } },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                {
                  type: 'content_block_delta',
                  index: 0,
                  delta: { type: 'text_delta', text: 'partial ' },
                },
                { type: 'content_block_stop', index: 0 },
                { type: 'message_delta', delta: { stop_reason: 'pause_turn' }, usage: {} },
                { type: 'message_stop' },
              ]
            : [
                { type: 'message_start', message: { id: 'm2', usage: { input_tokens: 6 } } },
                { type: 'content_block_start', index: 0, content_block: { type: 'text' } },
                {
                  type: 'content_block_delta',
                  index: 0,
                  delta: { type: 'text_delta', text: 'done' },
                },
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
        countTokens: () => Promise.resolve({ input_tokens: 0 }),
      },
      models: { list: () => Promise.resolve({ data: [] }) },
    };
    const adapter = anthropic({ client });
    const events: ChatEvent[] = [];
    for await (const event of adapter.stream({
      model: 'claude-fable-5',
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'go' }] }],
    })) {
      events.push(event);
    }
    expect(calls).toHaveLength(2);
    // Exactly one canonical finish; pause_turn never surfaces.
    expect(events.filter((e) => e.type === 'finish')).toHaveLength(1);
    // The continuation appended the partial assistant content and no
    // synthetic user message.
    const secondMessages = calls[1]?.messages as Array<{ role: string; content: unknown[] }>;
    expect(secondMessages.at(-1)?.role).toBe('assistant');
    expect(secondMessages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  it('projects 429 and 529 into the retryable vocabulary', () => {
    const rateLimited = anthropicErrorToWire({
      status: 429,
      message: 'rate limited',
      headers: {
        'retry-after': '7',
        'x-ratelimit-remaining-requests': '0',
      },
    });
    expect(rateLimited.retryable).toBe(true);
    expect(rateLimited.data).toMatchObject({
      kind: 'rate-limit',
      retryAfterMs: 7000,
      buckets: { 'x-ratelimit-remaining-requests': '0' },
    });
    expect(anthropicErrorToWire({ status: 529, message: 'overloaded' }).retryable).toBe(true);
    expect(anthropicErrorToWire({ status: 400, message: 'bad' }).retryable).toBe(false);
  });
});

describe('adapter surface (M1-T12)', () => {
  it('exposes caps for the July 2026 family and refreshes from the model list', async () => {
    const client: AnthropicClientLike = {
      messages: {
        create: () => Promise.reject(new Error('unused')),
        countTokens: () => Promise.resolve({ input_tokens: 42 }),
      },
      models: {
        list: (params?: Record<string, unknown>) =>
          params?.after_id === undefined
            ? Promise.resolve({
                data: [{ id: 'claude-fable-5', max_input_tokens: 2_000_000, max_tokens: 256_000 }],
                has_more: true,
                last_id: 'claude-fable-5',
              })
            : Promise.resolve({
                data: [{ id: 'claude-sonnet-5', max_input_tokens: 500_000 }],
                has_more: false,
              }),
      },
    };
    const adapter = anthropic({ client });
    expect(adapter.id).toBe('anthropic');
    expect(adapter.caps('claude-fable-5').supportsTemperature).toBe(false);
    expect(adapter.caps('claude-fable-5').structuredOutput).toBe('native');
    expect(adapter.caps('claude-fable-5').reasoningEfforts).toContain('max');

    await adapter.refreshCaps?.();
    expect(adapter.caps('claude-fable-5').contextWindow).toBe(2_000_000);
    expect(adapter.caps('claude-fable-5').maxOutputTokens).toBe(256_000);
    expect(adapter.caps('claude-sonnet-5').contextWindow).toBe(500_000);

    expect(
      await adapter.countTokens?.({
        model: 'claude-fable-5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'x' }] }],
      }),
    ).toBe(42);
  });

  it.skipIf(process.env.ANTHROPIC_API_KEY === undefined)(
    'live smoke: one small call (manual, key-gated)',
    async () => {
      const adapter = anthropic({});
      const events: ChatEvent[] = [];
      for await (const event of adapter.stream({
        model: 'claude-sonnet-5',
        messages: [{ role: 'user', parts: [{ type: 'text', text: 'Reply with the word ok.' }] }],
        maxOutputTokens: 32,
      })) {
        events.push(event);
      }
      const finish = events.find((e) => e.type === 'finish');
      expect(finish).toBeDefined();
    },
    30_000,
  );
});

describe('the Haiku 4.5 caps entry (found by the M12 checkpoint)', () => {
  it('resolves the dated id to the enabled-budget form with haiku pricing', () => {
    for (const id of ['claude-haiku-4-5', 'claude-haiku-4-5-20251001']) {
      const info = anthropicModelInfo(id);
      expect(info.thinkingForm).toBe('enabled-budget');
      expect(info.caps.pricing?.inputUsdPerMTok).toBe(1);
      expect(info.caps.pricing?.outputUsdPerMTok).toBe(5);
      expect(info.caps.contextWindow).toBe(200_000);
      // The effort parameter 400s on this model: the router must scrub.
      expect(info.caps.reasoningEfforts).toEqual([]);
    }
    // Unknown ids still assume the current generation.
    expect(anthropicModelInfo('claude-nova-9').thinkingForm).toBe('adaptive');
  });
});
