/**
 * ProviderAdapter SPI: one of the six SPI seams frozen at 1.0.
 *
 * Full contract: https://docs.rulvar.com/guide/adapter-authors.
 * Contract highlights adapters MUST honor:
 *
 * - Provider SDK autoretries are DISABLED (max_retries 0 or equivalent).
 *   The core owns retries, backoff, and wall-clock via RetryPolicy;
 *   adapters surface retry-after and rate-limit headers as typed,
 *   retryable WireErrors with retryAfterMs in data and never sleep
 *   internally; retries belong to the core.
 * - stream() MUST emit exactly one terminal event per stream (finish or
 *   error) and absorb provider quirks invisibly (pause_turn continuation,
 *   JSON tool-argument assembly, cacheHint compilation, usage
 *   normalization, typed refusal surfacing).
 * - Usage MUST satisfy the Usage invariant: inputTokens is the full
 *   prompt including cache reads and writes; the core verifies it at the
 *   adapter boundary.
 */
import type { ChatEvent, ChatRequest, Effort } from '../messages.js';

/**
 * One long-context price tier. When the full prompt (canonical
 * inputTokens, cache included) is strictly above `aboveInputTokens`, the
 * ENTIRE request is re-priced with these multipliers, not only the tokens
 * past the threshold (how providers state their long-context rules).
 * `inputMultiplier` scales every input-side rate: input, cache read, and
 * cache write.
 * `outputMultiplier` scales the output rate. Provider pricing pages state
 * multipliers for "input" without saying whether cache rates scale;
 * scaling them with input is the conservative reading for budget
 * enforcement (it never underestimates spend). With several tiers, the
 * highest threshold below the prompt size wins, independent of array
 * order.
 */
export interface PricingTier {
  aboveInputTokens: number;
  inputMultiplier: number;
  outputMultiplier: number;
}

/**
 * Per-model pricing in USD per million tokens. The registry's
 * versioned price table wins over adapter-
 * reported caps.pricing, which is a fallback only.
 */
export interface Pricing {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
  cacheReadUsdPerMTok?: number;
  /** 5m write premium rate. */
  cacheWriteUsdPerMTok?: number;
  /** 1h write premium rate where the provider distinguishes. */
  cacheWrite1hUsdPerMTok?: number;
  /** Long-context tiers; a row without them is one linear price. */
  tiers?: PricingTier[];
}

/** Capability facts the router consumes for tier selection and scrubbing. */
export type ModelCaps = {
  structuredOutput: 'native' | 'forced-tool' | 'prompt';
  supportsTemperature: boolean;
  supportsParallelTools: boolean;
  /** Canonical efforts this model accepts after mapping. */
  reasoningEfforts: Effort[];
  contextWindow: number;
  maxOutputTokens: number;
  /** Adapter-reported fallback only; the versioned price table wins. */
  pricing?: Pricing;
};

export interface ProviderAdapter {
  /** Stable adapter id; the left segment of ModelRef. */
  id: string;
  /**
   * Provider family for provider-raw matching and retention (committed
   * during M4-T02). Two adapters of the same
   * family share retained blocks and projections; default = id.
   */
  provider?: string;
  /**
   * Declares WHICH reading of the provider's usage telemetry this
   * adapter normalizes under; the engine stamps it on usage-bearing
   * terminal entries so a journal records not only the numbers but the
   * semantics they were produced under (v1.20.0 review P1/P2-2). Bump
   * the string whenever the MEANING of a reported Usage field changes,
   * even when no pricing rate moves; a rate change is a PriceTable
   * pricingVersion bump instead. Entries persisted before this shipped
   * carry no stamp, which is itself information: an unstamped OpenAI
   * entry with cache writes may predate the v1.20.0 cache-subset
   * correction. Optional; adapters that never changed semantics can
   * omit it.
   */
  usageSemantics?: string;
  caps(model: string): ModelCaps;
  /** Refresh the capability table from live model lists. */
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
