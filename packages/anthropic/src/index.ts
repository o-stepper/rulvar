/**
 * @lurker/anthropic: the first-class Anthropic adapter on the July 2026
 * Messages API surface (docs/04, section "@lurker/anthropic").
 */
export { anthropic, ANTHROPIC_MODELS, DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS } from './adapter.js';
export type { AnthropicAdapterOptions, AnthropicClientLike } from './adapter.js';
export { anthropicModelInfo } from './caps.js';
export type { AnthropicModelInfo } from './caps.js';
export {
  anthropicErrorToWire,
  buildAnthropicParams,
  IdMap,
  mapAnthropicStream,
  mapStopReason,
  normalizeAnthropicUsage,
} from './wire.js';
export type { AnthropicStreamEvent, TurnMapping } from './wire.js';
