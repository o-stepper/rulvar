/**
 * The @rulvar/openai ProviderAdapter (M1-T13): Responses API first, Chat
 * Completions as the caps-selected degraded path, SDK autoretries
 * disabled.
 *
 * Docs: https://docs.rulvar.com/guide/providers
 * The openaiCompatible factory ships in M3.
 */
import OpenAI, { type ClientOptions as OpenAiClientOptions } from 'openai';
import {
  ConfigError,
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

/**
 * Official SDK construction options forwarded verbatim to
 * `new OpenAI(...)`, minus `maxRetries`: Rulvar owns retries and
 * wall-clock, so SDK autoretries stay disabled no matter what is passed
 * here. This is the production surface for auth beyond a plain API key,
 * `workloadIdentity` federation included, plus `fetch`, `timeout`, and
 * `defaultHeaders`. The SDK's own rules still apply inside it, e.g.
 * `sdkOptions.apiKey` and `sdkOptions.workloadIdentity` are mutually
 * exclusive and rejected typed at construction.
 */
export type OpenAiSdkOptions = Omit<OpenAiClientOptions, 'maxRetries'>;

export interface OpenAiAdapterOptions {
  /** Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. */
  apiKey?: string;
  /** Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. */
  baseURL?: string;
  /** Official SDK construction options; see `OpenAiSdkOptions`. */
  sdkOptions?: OpenAiSdkOptions;
  /**
   * A preconstructed client instead of the construction options above
   * (combining them is a ConfigError): the official `OpenAI` instance
   * (production; it must be constructed with `maxRetries: 0`) or a
   * structural `OpenAiClientLike` mock (tests).
   */
  client?: OpenAI | OpenAiClientLike;
}

function resolveOpenAiClient(options: OpenAiAdapterOptions): OpenAiClientLike {
  if (options.client !== undefined) {
    if (
      options.apiKey !== undefined ||
      options.baseURL !== undefined ||
      options.sdkOptions !== undefined
    ) {
      throw new ConfigError(
        "openai(): 'client' is mutually exclusive with 'apiKey', 'baseURL', and 'sdkOptions'; configure the preconstructed client directly",
      );
    }
    // The official client would autoretry under the core's RetryPolicy
    // (its default is 2); structural mocks without the field pass.
    const maxRetries = (options.client as { maxRetries?: unknown }).maxRetries;
    if (typeof maxRetries === 'number' && maxRetries !== 0) {
      throw new ConfigError(
        `openai(): the injected client has SDK autoretries enabled (maxRetries ${String(maxRetries)}); construct it with maxRetries: 0, Rulvar owns retries and wall-clock`,
      );
    }
    // Runtime-compatible by SPI; the official class is not structurally
    // assignable to the mock seam (narrower method params), hence the
    // one widening cast for both union members.
    return options.client as OpenAiClientLike;
  }
  const sdkOptions = options.sdkOptions ?? {};
  if (options.apiKey !== undefined && sdkOptions.apiKey !== undefined) {
    throw new ConfigError(
      "openai(): 'apiKey' and 'sdkOptions.apiKey' are both set; pick one place",
    );
  }
  if (options.apiKey !== undefined && sdkOptions.workloadIdentity !== undefined) {
    throw new ConfigError(
      "openai(): 'apiKey' and 'sdkOptions.workloadIdentity' are mutually exclusive auth modes",
    );
  }
  if (options.baseURL !== undefined && sdkOptions.baseURL !== undefined) {
    throw new ConfigError(
      "openai(): 'baseURL' and 'sdkOptions.baseURL' are both set; pick one place",
    );
  }
  return new OpenAI({
    ...sdkOptions,
    ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
    ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
    // Last so nothing smuggled past the Omit at runtime re-enables it.
    maxRetries: 0,
  }) as unknown as OpenAiClientLike;
}

/** Creates the first-class OpenAI adapter (id 'openai'); maxRetries 0. */
export function openai(options: OpenAiAdapterOptions = {}): ProviderAdapter {
  const client = resolveOpenAiClient(options);
  const ids = new OpenAiIdMap(createCanonicalIdMinter());

  return {
    id: 'openai',
    // Provider family for provider-raw matching and retention (M4-T02).
    provider: 'openai',
    // v2 = the live-verified subset reading (v1.20.0): wire input_tokens
    // is the FULL prompt, cached_tokens and cache_write_tokens are
    // priced subsets passed through untouched. The never-stamped v1
    // (rulvar v1.19.0 only) added writes ON TOP of the full count,
    // double-billing them; an unstamped journal entry with cache writes
    // may carry that inflated reading (v1.20.0 review P1/P2-2).
    usageSemantics: 'openai-cache-subsets-v2',

    caps(model: string): ModelCaps {
      return openAiModelInfo(model).caps;
    },

    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const info = openAiModelInfo(req.model);
      // Each canonical event is yielded AS its provider event is
      // consumed (yield* delegates to the mapper generator): the
      // consumer's pull drives the provider read, so a slow consumer
      // slows the read and nothing buffers.
      try {
        if (info.api === 'responses') {
          const { params, effortDownmapped } = buildResponsesParams(req, ids, {
            wireMaxEffort: info.wireMaxEffort,
          });
          const stream = (await client.responses.create(
            { ...params, stream: true },
            signal === undefined ? undefined : { signal },
          )) as AsyncIterable<ResponsesStreamEvent>;
          yield* mapResponsesStream(stream, ids, { effortDownmapped });
        } else {
          // Degraded-path selection is a caps fact, visible in events,
          // never silent: the finish event carries
          // providerMetadata.openai.degradedPath.
          const params = buildChatCompletionsParams(req, ids);
          const stream = (await client.chat.completions.create(
            { ...params, stream: true, stream_options: { include_usage: true } },
            signal === undefined ? undefined : { signal },
          )) as AsyncIterable<Record<string, unknown>>;
          yield* mapChatCompletionsStream(stream, ids);
        }
      } catch (thrown) {
        if (signal?.aborted !== true) {
          yield { type: 'error', error: openAiErrorToWire(thrown) };
        }
      }
    },
  };
}

/** Static model table export for hosts that want to inspect the seed caps. */
export { OPENAI_MODELS };
