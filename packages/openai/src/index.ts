/**
 * @rulvar/openai: the first-class OpenAI Responses API adapter with the
 * Chat Completions degraded path, plus the openaiCompatible factory for
 * Ollama, vLLM, and gateways.
 */
export { openai, OPENAI_MODELS } from './adapter.js';
export { openaiCompatible, CONSERVATIVE_COMPATIBLE_CAPS } from './compatible.js';
export type { OpenAiCompatibleConfig } from './compatible.js';
export type { OpenAiAdapterOptions, OpenAiClientLike } from './adapter.js';
export { openAiModelInfo, OPENAI_PRICING } from './caps.js';
export type { OpenAiModelInfo } from './caps.js';
export {
  buildChatCompletionsParams,
  buildResponsesParams,
  mapChatCompletionsStream,
  mapOpenAiEffort,
  mapResponsesStream,
  normalizeOpenAiUsage,
  OpenAiIdMap,
  openAiErrorToWire,
} from './wire.js';
export type { ResponsesStreamEvent } from './wire.js';
