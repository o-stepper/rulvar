/**
 * @lurker/openai: the first-class OpenAI Responses API adapter with the
 * Chat Completions degraded path (docs/04, section "@lurker/openai").
 * The openaiCompatible factory ships in M3.
 */
export { openai, OPENAI_MODELS } from './adapter.js';
export type { OpenAiAdapterOptions, OpenAiClientLike } from './adapter.js';
export { openAiModelInfo } from './caps.js';
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
