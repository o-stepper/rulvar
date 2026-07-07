/**
 * openaiCompatible factory (M3-T06): a ProviderAdapter for
 * OpenAI-compatible endpoints (Ollama, vLLM, Mistral, OpenRouter,
 * arbitrary gateways) speaking the Chat Completions dialect by
 * construction. Explicit ids let several endpoints coexist in one
 * engine; a duplicate adapterId at createEngine is a typed ConfigError
 * raised by the adapter registry.
 *
 * Owning spec: docs/04-model-layer-spec.md, section "openaiCompatible
 * factory".
 */
import OpenAI from 'openai';
import {
  ConfigError,
  createCanonicalIdMinter,
  type ChatEvent,
  type ChatRequest,
  type ModelCaps,
  type ProviderAdapter,
} from '@lurker/core';
import type { OpenAiClientLike } from './adapter.js';
import {
  buildChatCompletionsParams,
  mapChatCompletionsStream,
  OpenAiIdMap,
  openAiErrorToWire,
} from './wire.js';

/**
 * Gateways cannot be introspected reliably: when caps are not supplied
 * the factory assumes the most conservative capability set (docs/04,
 * section 6). Callers SHOULD supply caps for anything beyond it; the
 * window and output floors here are deliberately small so an unprobed
 * endpoint is never overcommitted. Absent pricing is legitimate for
 * local models: they surface as unpriced in CostReport.
 */
export const CONSERVATIVE_COMPATIBLE_CAPS: ModelCaps = {
  structuredOutput: 'prompt',
  supportsTemperature: true,
  supportsParallelTools: false,
  reasoningEfforts: [],
  contextWindow: 8_192,
  maxOutputTokens: 4_096,
};

export interface OpenAiCompatibleConfig {
  /** Explicit adapter id, e.g. 'ollama', 'vllm', 'openrouter'. */
  id: string;
  baseURL: string;
  apiKey?: string;
  /** Per-model capability overrides merged over the conservative set. */
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
  /** Test seam: a preconstructed client; production uses the openai SDK. */
  client?: OpenAiClientLike;
}

/** Creates a Chat Completions dialect adapter for a compatible endpoint. */
export function openaiCompatible(cfg: OpenAiCompatibleConfig): ProviderAdapter {
  if (cfg.id === undefined || cfg.id === '') {
    throw new ConfigError(
      "openaiCompatible requires an explicit non-empty 'id' (docs/04, section 6)",
    );
  }
  if (cfg.baseURL === undefined || cfg.baseURL === '') {
    throw new ConfigError("openaiCompatible requires 'baseURL'");
  }
  const client: OpenAiClientLike =
    cfg.client ??
    (new OpenAI({
      baseURL: cfg.baseURL,
      // Local endpoints (Ollama, vLLM) need no key; the SDK requires a
      // non-empty string, so a placeholder stands in when none is given.
      apiKey: cfg.apiKey ?? 'lurker-no-key',
      maxRetries: 0,
    }) as unknown as OpenAiClientLike);
  const ids = new OpenAiIdMap(createCanonicalIdMinter());

  return {
    id: cfg.id,
    // The provider FAMILY stays 'openai' whatever the custom adapter id:
    // gateways of the same dialect share projections; the chat dialect
    // itself never ships retainedParts (docs/04, sections 2.3 and 5.6).
    provider: 'openai',

    caps(model: string): ModelCaps {
      const overrides = cfg.caps?.(model);
      return overrides === undefined
        ? CONSERVATIVE_COMPATIBLE_CAPS
        : { ...CONSERVATIVE_COMPATIBLE_CAPS, ...overrides };
    },

    async *stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent> {
      const pending: ChatEvent[] = [];
      const emit = (event: ChatEvent): void => {
        pending.push(event);
      };
      try {
        const params = buildChatCompletionsParams(req, ids);
        const stream = (await client.chat.completions.create(
          { ...params, stream: true, stream_options: { include_usage: true } },
          signal === undefined ? undefined : { signal },
        )) as AsyncIterable<Record<string, unknown>>;
        await mapChatCompletionsStream(stream, ids, emit);
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
