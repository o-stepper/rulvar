import Anthropic, { ClientOptions } from "@anthropic-ai/sdk";
import { CanonicalId, ChatEvent, ChatRequest, FinishInfo, ModelCaps, PriceTable, ProviderAdapter, Usage, WireError } from "@rulvar/core";

//#region src/caps.d.ts
interface AnthropicModelInfo {
  caps: ModelCaps;
  /**
  * Wire thinking form: current models accept only adaptive; the
  * enabled/budget form remains functional only on Opus 4.6 and Sonnet
  * 4.6.
  */
  thinkingForm: "adaptive" | "enabled-budget";
  /** Minimum cacheable prefix in tokens. */
  cacheMinTokens: number;
}
/** Static seed table naming the current model set. */
declare const ANTHROPIC_MODELS: Record<string, AnthropicModelInfo>;
/**
* Unknown Anthropic models are assumed current-generation: adaptive
* thinking, native structured outputs, no sampling parameters. refreshCaps
* corrects window/output figures from the live model list. Pricing stays
* ABSENT for an unknown model: a fabricated row silently misprices every
* model newer than this table. Hosts price it via a versioned
* createEngine({ pricing }) row; until then its usage surfaces in
* CostReport.unpriced and a run ceiling warns that it cannot bound the
* model.
*/
/**
* The seed pricing rows as a versioned price table, keyed by full
* ModelRef under the adapter's fixed id 'anthropic'. Pass it to
* createEngine({ pricing }) so the run journals a concrete
* pricingVersion instead of 'unpriced': the versioned table wins over
* the caps fallback by rule, and a later table revision surfaces as
* explicit configuration drift on resume rather than a silent
* reinterpretation. Extend or override rows by spreading `models` into
* your own table with a new version string (the documented path for the
* Sonnet 5 promotion ending on 2026-08-31).
*/
declare const ANTHROPIC_PRICING: PriceTable;
declare function anthropicModelInfo(model: string): AnthropicModelInfo;
//#endregion
//#region src/adapter.d.ts
/** pause_turn continuation cap. */
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
/**
* Official SDK construction options forwarded verbatim to
* `new Anthropic(...)`, minus `maxRetries`: Rulvar owns retries and
* wall-clock, so SDK autoretries stay disabled no matter what is passed
* here. This is the production surface for every credential mode the
* SDK supports beyond a plain API key: bearer `authToken`, an
* `AccessTokenProvider` via `credentials`, an `AnthropicConfig` via
* `config` (OIDC/workload-identity federation included), a named
* `profile`, plus `fetch`, `timeout`, and `defaultHeaders`.
*/
type AnthropicSdkOptions = Omit<ClientOptions, "maxRetries">;
interface AnthropicAdapterOptions {
  /** Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. */
  apiKey?: string;
  /** Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. */
  baseURL?: string;
  /** Official SDK construction options; see `AnthropicSdkOptions`. */
  sdkOptions?: AnthropicSdkOptions;
  /**
  * A preconstructed client instead of the construction options above
  * (combining them is a ConfigError): the official `Anthropic` instance
  * (production; it must be constructed with `maxRetries: 0`) or a
  * structural `AnthropicClientLike` mock (tests).
  */
  client?: Anthropic | AnthropicClientLike;
}
/**
* Creates the first-class Anthropic adapter (id 'anthropic'). SDK
* autoretries are disabled (max_retries 0): the core owns retries and
* wall-clock. With no auth option at all, the underlying SDK resolves
* credentials itself: it reads `ANTHROPIC_API_KEY` and
* `ANTHROPIC_AUTH_TOKEN` as INDEPENDENT credentials, never a
* precedence chain between the two; requests carry `x-api-key` for the
* key, bearer `Authorization` for the token, and BOTH headers when
* both are set (the server decides). The SDK's config-file credential
* chain (`credentials`, else `config`, else `profile`) is consulted
* ONLY when apiKey and authToken are both null; either one set, an
* env-read one included, means a configured token provider is never
* even built. When `sdkOptions` carries structured auth and no
* `apiKey`/`authToken` is set to a string anywhere, ambient
* environment credentials are suppressed (explicit
* `apiKey: null, authToken: null` are passed to the SDK), so the
* configured provider is the one that authenticates; the SDK itself
* would otherwise let an environment `ANTHROPIC_API_KEY` or
* `ANTHROPIC_AUTH_TOKEN` win over the provider. An explicit
* `apiKey: null` or `authToken: null` counts as absence for this rule,
* never as a chosen credential. The full matrix lives in the providers
* guide under anthropic-credential-precedence.
*/
declare function anthropic(options?: AnthropicAdapterOptions): ProviderAdapter;
//#endregion
//#region src/wire.d.ts
/** Bijective canonical-to-wire tool-call id map. */
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
* Returns a deep copy of the schema with the unsupported keywords
* removed at SCHEMA positions only: a property literally named
* "minimum" (a key inside `properties`) survives. The input is never
* mutated; unrecognized keywords are copied through untouched.
*/
/**
* Builds Messages API params from a ChatRequest. cacheHint compiles into
* cache_control breakpoints; beyond the provider cap of 4 the DEEPEST
* breakpoints are kept and the shallowest dropped, deterministically.
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
* The stop-reason table. pause_turn never surfaces as
* a canonical finish: the adapter continues internally.
*/
declare function mapStopReason(stopReason: string | null | undefined, stopDetails: Record<string, unknown> | null | undefined): MappedStop;
/**
* Normalizes Messages API usage under the Usage invariant: Anthropic
* reports input_tokens EXCLUDING cache reads and writes, so the canonical
* inputTokens is the sum of all three.
*/
declare function normalizeAnthropicUsage(raw: Record<string, unknown> | undefined): Usage;
interface TurnMapping {
  /** Assistant content blocks collected verbatim (pause_turn continuation). */
  assistantContent: Block[];
  pauseTurn: boolean;
  finished: boolean;
}
/**
* Maps one Messages API stream into ChatEvents, yielding each canonical
* event AS the corresponding provider event is consumed: the consumer's
* pull drives the provider read (natural backpressure, no buffering, no
* detached work). The generator's RETURN value carries the accumulated
* turn state the adapter needs for pause_turn continuation. Yields an
* early usage event from message_start (the input side is known
* immediately) and exactly one terminal finish unless the turn paused
* (pause_turn) or errored. `carryRetained` holds thinking blocks from
* earlier pause_turn continuations of the same turn so the terminal
* finish ships the whole turn's retention payload (M4-T02).
*/
declare function mapAnthropicStream(stream: AsyncIterable<AnthropicStreamEvent>, ids: IdMap, options?: {
  carryRetained?: Block[];
}): AsyncGenerator<ChatEvent, TurnMapping>;
/**
* Projects an SDK/API error into the retryable WireError vocabulary:
* 429 rate limits surface retryAfterMs and the x-ratelimit-* buckets; 529
* overloaded and 5xx are retryable transport; everything else is terminal
* transport. Adapters never sleep internally.
*/
declare function anthropicErrorToWire(error: unknown): WireError;
//#endregion
export { ANTHROPIC_MODELS, ANTHROPIC_PRICING, type AnthropicAdapterOptions, type AnthropicClientLike, type AnthropicModelInfo, type AnthropicSdkOptions, type AnthropicStreamEvent, DEFAULT_PAUSE_TURN_MAX_CONTINUATIONS, IdMap, type TurnMapping, anthropic, anthropicErrorToWire, anthropicModelInfo, buildAnthropicParams, mapAnthropicStream, mapStopReason, normalizeAnthropicUsage };