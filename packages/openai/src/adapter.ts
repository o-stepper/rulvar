/**
 * The @rulvar/openai ProviderAdapter (M1-T13): Responses API first, Chat
 * Completions as the caps-selected degraded path, SDK autoretries
 * disabled.
 *
 * Docs: https://docs.rulvar.com/guide/providers
 * The openaiCompatible factory ships in M3.
 */
import OpenAI from 'openai';
import {
  createCanonicalIdMinter,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
} from '@rulvar/core';
import { OPENAI_MODELS, openAiModelInfo } from './caps.js';
import {
  buildChatCompletionsParams,
  buildResponsesParams,
  mapChatCompletionsStream,
  mapResponsesStream,
  OpenAiIdMap,
  openAiErrorToWire,
  type ResponsesStreamEvent,
} from './wire.js';

/** The client sub-surface the adapter consumes; injectable for tests. */
export interface OpenAiClientLike {
  responses: {
    create(params: Record<string, unknown>, opts?: { signal?: AbortSignal }): Promise<unknown>;
  };
  chat: {
    completions: {
      create(params: Record<string, unknown>, opts?: { signal?: AbortSignal }): Promise<unknown>;
    };
  };
}

export interface OpenAiAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  /** Test seam: a preconstructed client; production uses the openai SDK. */
  client?: OpenAiClientLike;
}

/** Creates the first-class OpenAI adapter (id 'openai'); maxRetries 0. */
export function openai(options: OpenAiAdapterOptions = {}): ProviderAdapter {
  const client: OpenAiClientLike =
    options.client ??
    (new OpenAI({
      ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
      ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
      maxRetries: 0,
    }) as unknown as OpenAiClientLike);
  const ids = new OpenAiIdMap(createCanonicalIdMinter());

  return {
    id: 'openai',
    // Provider family for provider-raw matching and retention (M4-T02).
    provider: 'openai',

    caps(model: string): ModelCaps {
      return openAiModelInfo(model).caps;
    },

    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const info = openAiModelInfo(req.model);
      const pending: ChatEvent[] = [];
      const emit = (event: ChatEvent): void => {
        pending.push(event);
      };
      try {
        if (info.api === 'responses') {
          const { params, effortDownmapped } = buildResponsesParams(req, ids);
          const stream = (await client.responses.create(
            { ...params, stream: true },
            signal === undefined ? undefined : { signal },
          )) as AsyncIterable<ResponsesStreamEvent>;
          await mapResponsesStream(stream, ids, emit, { effortDownmapped });
        } else {
          // Degraded-path selection is a caps fact, visible in events,
          // never silent: the finish event carries
          // providerMetadata.openai.degradedPath.
          const params = buildChatCompletionsParams(req, ids);
          const stream = (await client.chat.completions.create(
            { ...params, stream: true, stream_options: { include_usage: true } },
            signal === undefined ? undefined : { signal },
          )) as AsyncIterable<Record<string, unknown>>;
          await mapChatCompletionsStream(stream, ids, emit);
        }
      } catch (thrown) {
        if (signal?.aborted !== true) {
          pending.push({ type: 'error', error: openAiErrorToWire(thrown) });
        }
      }
      for (const event of pending) {
        yield event;
      }
    },
  };
}

/** Static model table export for hosts that want to inspect the seed caps. */
export { OPENAI_MODELS };
