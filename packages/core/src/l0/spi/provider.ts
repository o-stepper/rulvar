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
import type { WireError } from '../errors.js';

/**
 * Live-only hooks the engine passes to a stream dispatch (RV1013).
 * Never journaled, never part of request identity: like transport
 * retries, they exist only on the live wire path.
 */
export interface StreamHooks {
  /**
   * Called BEFORE each provider-side continuation wire beyond the
   * first (a `pause_turn` absorption makes several wire requests
   * inside one dispatch): under the engine's opt-in hard mode
   * (`quota.reserveContinuations`) the engine reserves the segment in
   * the configured limiter before its egress. A resolved `undefined`
   * admits the wire; a resolved WireError DENIES it, and the adapter
   * must yield exactly that error as its terminal event and stop, so
   * the wire never leaves. `segment` is the ordinal of the wire about
   * to be sent (2 for the first continuation). A multi-wire adapter
   * that never calls the hook keeps the documented post-hoc
   * settlement semantics.
   */
  onContinuationSegment?: (info: { segment: number }) => Promise<WireError | undefined>;
}

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
  /**
   * ISO date (YYYY-MM-DD) of the last verification of this row against
   * the provider's documented rates or its billing categories (RV814).
   * A recorded verification event, never a guess: seed rows exist to
   * bound ceilings conservatively, actual billing truth is established
   * only by statement reconciliation over saved exports, and a
   * confirmed divergence corrects the row in its own release with a
   * changeset, never by a silent rewrite. Preflight stamps it on the
   * spawn report and the invoice text names it with its age, so the
   * consumer of a dollar figure can see how stale the rates behind it
   * are; the settle pin carries it with the rest of the row.
   */
  ratesVerifiedAt?: string;
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
  /**
   * The smallest request output cap the provider accepts (the v1.74
   * experiment review, P0.1): OpenAI's Responses API rejects
   * max_output_tokens below 16, so a dispatch under this floor is a
   * guaranteed 400. The runtime never sends a request output cap below
   * it: a budget last gasp dispatches the floor instead of one token,
   * and a remainder that cannot buy the floor is refused typed before
   * the wire. Absent means one, the historical floor.
   */
  minOutputTokensPerTurn?: number;
  /**
   * How this model's prompt caching is driven (RV2006). 'explicit'
   * means the adapter compiles ChatRequest.cacheHint into provider
   * cache directives (Anthropic cache_control) and the agent loop's
   * cache policy attaches hints by default; 'implicit' means the
   * provider caches server-side on its own and hints are neither
   * needed nor sent (OpenAI). Absent means unknown: the loop attaches
   * nothing and the wire stays byte identical to pre-RV2006 traffic.
   */
  promptCaching?: 'explicit' | 'implicit';
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
  stream(req: ChatRequest, signal?: AbortSignal, hooks?: StreamHooks): AsyncIterable<ChatEvent>;
  /**
   * Provider-side token count for the request, used to tighten the
   * admission reserve before a spawn dispatches. The request carries
   * the FULL prompt, so an implementation that goes over the network is
   * egress exactly like stream and MUST honor `opts.signal` (RV904):
   * the engine only calls this after a zero-egress admission
   * feasibility check, passes the spawn's abort signal, and treats an
   * abort as cancellation rather than falling back to the flat
   * reserve. Hosts that must not send prompts before their own
   * admission gates pass an explicit `estCost` instead, which skips
   * this call entirely.
   */
  countTokens?(req: ChatRequest, opts?: { signal?: AbortSignal }): Promise<number>;
}
