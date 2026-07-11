import { CanonicalId, ChatEvent, ChatRequest, FinishInfo, ModelCaps, ProviderAdapter, Usage, WireError } from "@rulvar/core";

//#region src/caps.d.ts
interface AnthropicModelInfo {
  caps: ModelCaps;
  /**
  * Wire thinking form: current models accept only adaptive; the
  * enabled/budget form remains functional only on Opus 4.6 and Sonnet
  * 4.6 (docs/04, section "Thinking and sampling parameters").
  */
  thinkingForm: "adaptive" | "enabled-budget";
  /** Minimum cacheable prefix in tokens (docs/04, section "Prompt caching"). */
  cacheMinTokens: number;
}
/** Static seed table; docs/04 section 4 names the current model set. */
declare const ANTHROPIC_MODELS: Record<string, AnthropicModelInfo>;
/**
* Unknown Anthropic models are assumed current-generation: adaptive
* thinking, native structured outputs, no sampling parameters. refreshCaps
* corrects window/output figures from the live model list.
*/
declare function anthropicModelInfo(model: string): AnthropicModelInfo;
//#endregion
//#region src/adapter.d.ts
/** pause_turn continuation cap (docs/06 Appendix A; docs/04, section 4.6). */
declare const DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS = 5;
/** The client sub-surface the adapter consumes; injectable for tests. */
interface AnthropicClientLike {
  messages: {
    create(params: Record<string, unknown>, opts?: {
      signal?: AbortSignal;
    }): Promise<unknown>;
    countTokens(params: Record<string, unknown>): Promise<{
      input_tokens: number;
    }>;
  };
  models: {
    list(params?: Record<string, unknown>): Promise<{
      data: Array<Record<string, unknown>>;
      has_more?: boolean;
      last_id?: string;
    }>;
  };
}
interface AnthropicAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  /** Test seam: a preconstructed client; production uses @anthropic-ai/sdk. */
  client?: AnthropicClientLike;
}
/**
* Creates the first-class Anthropic adapter (id 'anthropic'). SDK
* autoretries are disabled (max_retries 0): the core owns retries and
* wall-clock (docs/04, section "Retries belong to the core").
*/
declare function anthropic(options?: AnthropicAdapterOptions): ProviderAdapter;
//#endregion
//#region src/wire.d.ts
/** Bijective canonical-to-wire tool-call id map (docs/04, section 1.2). */
declare class IdMap {
  private readonly toWire;
  private readonly toCanonical;
  private readonly mint;
  constructor(mint: () => CanonicalId);
  canonicalFor(wireId: string): CanonicalId;
  wireFor(canonicalId: CanonicalId): string;
}
type Block = Record<string, unknown>;
/**
* Builds Messages API params from a ChatRequest. cacheHint compiles into
* cache_control breakpoints; beyond the provider cap of 4 the DEEPEST
* breakpoints are kept and the shallowest dropped, deterministically
* (docs/04, sections 1.7 and 4.4).
*/
declare function buildAnthropicParams(req: ChatRequest, options: {
  ids: IdMap;
  maxOutputTokens: number;
  thinkingForm: "adaptive" | "enabled-budget";
}): Record<string, unknown>;
/** Raw Messages API stream events, structurally typed. */
type AnthropicStreamEvent = Record<string, unknown> & {
  type: string;
};
interface MappedStop {
  finish?: FinishInfo;
  pauseTurn: boolean;
}
/**
* The docs/04 section 4.7 stop-reason table. pause_turn never surfaces as
* a canonical finish: the adapter continues internally.
*/
declare function mapStopReason(stopReason: string | null | undefined, stopDetails: Record<string, unknown> | null | undefined): MappedStop;
/**
* Normalizes Messages API usage under the Usage invariant: Anthropic
* reports input_tokens EXCLUDING cache reads and writes, so the canonical
* inputTokens is the sum of all three (docs/04, sections 1.6 and 4.4).
*/
declare function normalizeAnthropicUsage(raw: Record<string, unknown> | undefined): Usage;
interface TurnMapping {
  events: ChatEvent[];
  /** Assistant content blocks collected verbatim (pause_turn continuation). */
  assistantContent: Block[];
  pauseTurn: boolean;
  finished: boolean;
}
/**
* Maps one Messages API stream into ChatEvents. Emits an early usage event
* from message_start (the input side is known immediately) and exactly one
* terminal finish unless the turn paused (pause_turn) or errored.
* `carryRetained` holds thinking blocks from earlier pause_turn
* continuations of the same turn so the terminal finish ships the whole
* turn's retention payload (docs/04, section 2.3, M4-T02).
*/
declare function mapAnthropicStream(stream: AsyncIterable<AnthropicStreamEvent>, ids: IdMap, emit: (event: ChatEvent) => void, options?: {
  carryRetained?: Block[];
}): Promise<TurnMapping>;
/**
* Projects an SDK/API error into the retryable WireError vocabulary:
* 429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529
* overloaded and 5xx are retryable transport; everything else is terminal
* transport (docs/04, section 4.9). Adapters never sleep internally.
*/
declare function anthropicErrorToWire(error: unknown): WireError;
//#endregion
export { ANTHROPIC_MODELS, type AnthropicAdapterOptions, type AnthropicClientLike, type AnthropicModelInfo, type AnthropicStreamEvent, DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS, IdMap, type TurnMapping, anthropic, anthropicErrorToWire, anthropicModelInfo, buildAnthropicParams, mapAnthropicStream, mapStopReason, normalizeAnthropicUsage };