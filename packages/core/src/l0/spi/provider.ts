/**
 * ProviderAdapter SPI: one of the six SPI seams frozen at 1.0.
 *
 * Owning spec: docs/04-model-layer-spec.md, section "ProviderAdapter SPI".
 * Contract highlights adapters MUST honor:
 *
 * - Provider SDK autoretries are DISABLED (max_retries 0 or equivalent).
 *   The core owns retries, backoff, and wall-clock via RetryPolicy;
 *   adapters surface retry-after and rate-limit headers as typed,
 *   retryable WireErrors with retryAfterMs in data and never sleep
 *   internally (docs/04, section "Retries belong to the core").
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
 * Per-model pricing in USD per million tokens (docs/04, section
 * "Pricing"). The registry's versioned price table wins over adapter-
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
   * Provider family for provider-raw matching and retention (docs/04,
   * section 2.3; committed during M4-T02). Two adapters of the same
   * family share retained blocks and projections; default = id.
   */
  provider?: string;
  caps(model: string): ModelCaps;
  /** Refresh the capability table from live model lists. */
  refreshCaps?(): Promise<void>;
  stream(req: ChatRequest, signal?: AbortSignal): AsyncIterable<ChatEvent>;
  countTokens?(req: ChatRequest): Promise<number>;
}
