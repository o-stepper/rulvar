/**
 * The @rulvar/anthropic ProviderAdapter (M1-T12): SDK glue over the pure
 * wire mapping, with pause_turn absorption, SDK autoretries disabled, and
 * refreshCaps from the capabilities-bearing model list.
 *
 * Full contract: https://docs.rulvar.com/guide/providers.
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  createCanonicalIdMinter,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
} from '@rulvar/core';
import { ANTHROPIC_MODELS, anthropicModelInfo, type AnthropicModelInfo } from './caps.js';
import {
  anthropicErrorToWire,
  buildAnthropicParams,
  IdMap,
  mapAnthropicStream,
  type AnthropicStreamEvent,
  type TurnMapping,
} from './wire.js';

/** pause_turn continuation cap. */
export const DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS = 5;

/** The client sub-surface the adapter consumes; injectable for tests. */
export interface AnthropicClientLike {
  messages: {
    create(params: Record<string, unknown>, opts?: { signal?: AbortSignal }): Promise<unknown>;
    countTokens(params: Record<string, unknown>): Promise<{ input_tokens: number }>;
  };
  models: {
    list(params?: Record<string, unknown>): Promise<{
      data: Array<Record<string, unknown>>;
      has_more?: boolean;
      last_id?: string;
    }>;
  };
}

export interface AnthropicAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  /** Test seam: a preconstructed client; production uses @anthropic-ai/sdk. */
  client?: AnthropicClientLike;
}

/**
 * Creates the first-class Anthropic adapter (id 'anthropic'). SDK
 * autoretries are disabled (max_retries 0): the core owns retries and
 * wall-clock.
 */
export function anthropic(options: AnthropicAdapterOptions = {}): ProviderAdapter {
  const client: AnthropicClientLike =
    options.client ??
    (new Anthropic({
      ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
      ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
      maxRetries: 0,
    }) as unknown as AnthropicClientLike);
  const ids = new IdMap(createCanonicalIdMinter());
  const refreshed = new Map<string, Partial<ModelCaps>>();

  function infoFor(model: string): AnthropicModelInfo {
    const base = anthropicModelInfo(model);
    const patch = refreshed.get(model);
    if (patch === undefined) {
      return base;
    }
    return { ...base, caps: { ...base.caps, ...patch } };
  }

  return {
    id: 'anthropic',
    // Provider family for provider-raw matching and retention (M4-T02).
    provider: 'anthropic',

    caps(model: string): ModelCaps {
      return infoFor(model).caps;
    },

    async refreshCaps(): Promise<void> {
      // Capabilities-bearing GET /v1/models, paginated via after_id; the
      // wire has max_input_tokens/max_tokens, never context_window.
      let afterId: string | undefined;
      do {
        const page = await client.models.list(afterId === undefined ? {} : { after_id: afterId });
        for (const model of page.data) {
          const id = model.id;
          if (typeof id !== 'string') {
            continue;
          }
          const patch: Partial<ModelCaps> = {};
          if (typeof model.max_input_tokens === 'number') {
            patch.contextWindow = model.max_input_tokens;
          }
          if (typeof model.max_tokens === 'number') {
            patch.maxOutputTokens = model.max_tokens;
          }
          if (Object.keys(patch).length > 0) {
            refreshed.set(id, patch);
          }
        }
        afterId =
          page.has_more === true && typeof page.last_id === 'string' ? page.last_id : undefined;
      } while (afterId !== undefined);
    },

    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const info = infoFor(req.model);
      const pauseCap =
        typeof req.providerOptions?.anthropic?.pauseTurnMaxContinuations === 'number'
          ? req.providerOptions.anthropic.pauseTurnMaxContinuations
          : DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS;

      let params = buildAnthropicParams(req, {
        ids,
        maxOutputTokens: info.caps.maxOutputTokens,
        thinkingForm: info.thinkingForm,
      });

      let continuations = 0;
      // Thinking blocks from earlier pause_turn continuations of this
      // turn: the terminal finish ships the whole turn's retention
      // payload (M4-T02).
      const carryRetained: Array<Record<string, unknown>> = [];
      while (true) {
        let stream: AsyncIterable<AnthropicStreamEvent>;
        try {
          stream = (await client.messages.create(
            { ...params, stream: true },
            signal === undefined ? undefined : { signal },
          )) as AsyncIterable<AnthropicStreamEvent>;
        } catch (thrown) {
          yield { type: 'error', error: anthropicErrorToWire(thrown) };
          return;
        }
        // Manual consumption instead of yield*: each canonical event is
        // yielded AS its provider event is consumed (the consumer's pull
        // drives the provider read; a slow consumer slows the read, so
        // nothing buffers), and the generator's return value carries the
        // accumulated pause_turn state.
        const mapper = mapAnthropicStream(stream, ids, { carryRetained });
        let mapping: TurnMapping;
        try {
          while (true) {
            const next = await mapper.next();
            if (next.done === true) {
              mapping = next.value;
              break;
            }
            yield next.value;
          }
        } catch (thrown) {
          if (signal?.aborted === true) {
            return;
          }
          yield { type: 'error', error: anthropicErrorToWire(thrown) };
          return;
        }
        if (!mapping.pauseTurn) {
          return;
        }
        carryRetained.push(
          ...mapping.assistantContent.filter(
            (block) => block.type === 'thinking' || block.type === 'redacted_thinking',
          ),
        );
        // pause_turn: append the partial assistant content and re-send,
        // WITHOUT a synthetic user message, up to the continuation cap;
        // never a canonical finish.
        continuations += 1;
        if (continuations > pauseCap) {
          yield {
            type: 'error',
            error: {
              code: 'agent',
              message: `pause_turn continuation cap (${pauseCap}) exceeded`,
              retryable: true,
              data: { kind: 'transport' },
            },
          };
          return;
        }
        const messages = params.messages as Array<Record<string, unknown>>;
        params = {
          ...params,
          messages: [...messages, { role: 'assistant', content: mapping.assistantContent }],
        };
      }
    },

    async countTokens(req: ChatRequest): Promise<number> {
      const info = infoFor(req.model);
      const params = buildAnthropicParams(req, {
        ids,
        maxOutputTokens: info.caps.maxOutputTokens,
        thinkingForm: info.thinkingForm,
      });
      const body: Record<string, unknown> = {
        model: params.model,
        messages: params.messages,
      };
      if (params.system !== undefined) {
        body.system = params.system;
      }
      if (params.tools !== undefined) {
        body.tools = params.tools;
      }
      const result = await client.messages.countTokens(body);
      return result.input_tokens;
    },
  };
}

/** Static model table export for hosts that want to inspect the seed caps. */
export { ANTHROPIC_MODELS };
