import OpenAI, { ClientOptions } from "openai";
import { CanonicalId, ChatEvent, ChatRequest, Effort, ModelCaps, PriceTable, ProviderAdapter, Usage, WireError } from "@rulvar/core";

//#region src/caps.d.ts
interface OpenAiModelInfo {
  caps: ModelCaps;
  api: "responses" | "chat";
  /** Reasoning models reject non-default sampling parameters. */
  reasoning: boolean;
  /**
  * The model accepts wire `reasoning.effort: "max"` (GPT-5.6 Sol per
  * the official model docs). When false, canonical max downmaps to
  * wire xhigh; the downmap is recorded in providerMetadata and the
  * journal identity keeps max, so caps accept the full canonical set
  * either way.
  */
  wireMaxEffort: boolean;
}
/** Static seed table of the current model set. */
declare const OPENAI_MODELS: Record<string, OpenAiModelInfo>;
/**
* Unknown OpenAI models are assumed current-generation Responses models
* with conservative transport caps and NO pricing: a fabricated price row
* silently misprices every model newer than this table (it priced
* gpt-5.6-sol as gpt-5.4 before the 5.6 entries landed). Hosts price an
* unrecognized hosted model via a versioned createEngine({ pricing }) row;
* until then its usage surfaces in CostReport.unpriced and a run ceiling
* warns that it cannot bound the model.
*/
/**
* The seed pricing rows as a versioned price table, keyed by full
* ModelRef under the adapter's fixed id 'openai' (long-context tiers
* included; the 'gpt-5.6' alias carries the same row as its Sol
* target). Pass it to createEngine({ pricing }) so the run journals a
* concrete pricingVersion instead of 'unpriced': the versioned table
* wins over the caps fallback by rule, and a later table revision
* surfaces as explicit configuration drift on resume rather than a
* silent reinterpretation.
*/
declare const OPENAI_PRICING: PriceTable;
declare function openAiModelInfo(model: string): OpenAiModelInfo;
//#endregion
//#region src/adapter.d.ts
/** The client sub-surface the adapter consumes; injectable for tests. */
interface OpenAiClientLike {
  responses: {
    create(params: Record<string, unknown>, opts?: {
      signal?: AbortSignal;
    }): Promise<unknown>;
  };
  chat: {
    completions: {
      create(params: Record<string, unknown>, opts?: {
        signal?: AbortSignal;
      }): Promise<unknown>;
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
type OpenAiSdkOptions = Omit<ClientOptions, "maxRetries">;
interface OpenAiAdapterOptions {
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
/** Creates the first-class OpenAI adapter (id 'openai'); maxRetries 0. */
declare function openai(options?: OpenAiAdapterOptions): ProviderAdapter;
//#endregion
//#region src/compatible.d.ts
/**
* Gateways cannot be introspected reliably: when caps are not supplied
* the factory assumes the most conservative capability set. Callers
* SHOULD supply caps for anything beyond it; the
* window and output floors here are deliberately small so an unprobed
* endpoint is never overcommitted. Absent pricing is legitimate for
* local models: they surface as unpriced in CostReport.
*/
declare const CONSERVATIVE_COMPATIBLE_CAPS: ModelCaps;
interface OpenAiCompatibleConfig {
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
declare function openaiCompatible(cfg: OpenAiCompatibleConfig): ProviderAdapter;
//#endregion
//#region src/wire.d.ts
/** Bijective canonical-to-wire (call_*) id map. */
declare class OpenAiIdMap {
  private readonly toWire;
  private readonly toCanonical;
  private readonly mint;
  constructor(mint: () => CanonicalId);
  canonicalFor(wireId: string): CanonicalId;
  wireFor(canonicalId: CanonicalId): string;
}
/**
* Canonical-to-wire effort: low through xhigh pass through. Canonical
* max passes through unchanged on models whose caps declare wire max
* support (GPT-5.6 Sol); elsewhere it downmaps to xhigh (documented
* lossy; recorded in providerMetadata). Provider 'none' is reachable
* only via providerOptions.openai.reasoningEffort.
*/
declare function mapOpenAiEffort(effort: Effort, options?: {
  wireMaxEffort?: boolean;
}): {
  wire: string;
  downmapped: boolean;
};
/**
* Builds Responses API params. Manual item replay ONLY: store: false plus
* include reasoning.encrypted_content; previous_response_id and the
* Conversations API place state server-side, break replay identity, and
* are REJECTED as a typed ConfigError. Role
* 'system' messages project into top-level instructions on every request.
*/
declare function buildResponsesParams(req: ChatRequest, ids: OpenAiIdMap, options?: {
  wireMaxEffort?: boolean;
}): {
  params: Record<string, unknown>;
  effortDownmapped: boolean;
};
/** Raw Responses SSE events, structurally typed. */
type ResponsesStreamEvent = Record<string, unknown> & {
  type: string;
};
/** Normalizes Responses usage: input_tokens already includes cached reads. */
declare function normalizeOpenAiUsage(raw: Record<string, unknown> | undefined): Usage;
/**
* Maps the typed Responses SSE stream to ChatEvents, yielding each
* canonical event AS the corresponding provider event is consumed: the
* consumer's pull drives the provider read (natural backpressure, no
* buffering, no detached work). Canonical parts come from the typed
* output array, never the output_text aggregate. Raw output items ride
* finish.providerMetadata.openai.outputItems so the runtime can retain
* reasoning items as provider-raw parts.
*/
declare function mapResponsesStream(stream: AsyncIterable<ResponsesStreamEvent>, ids: OpenAiIdMap, options?: {
  effortDownmapped?: boolean;
}): AsyncGenerator<ChatEvent, void>;
/** Projects SDK/API errors into the retryable WireError vocabulary. */
declare function openAiErrorToWire(error: unknown): WireError;
/**
* The Chat Completions degraded path: delta-patched
* chunk assembly instead of typed SSE, nested function tools with explicit
* strict where supported, response_format instead of text.format, no
* reasoning item replay. Selected by caps (api: 'chat'), visible in
* events, never silent.
*/
declare function buildChatCompletionsParams(req: ChatRequest, ids: OpenAiIdMap): Record<string, unknown>;
/**
* Delta-patched chunk assembly for the degraded path; yields each
* canonical event as its chunk is consumed (same live-streaming contract
* as mapResponsesStream).
*/
declare function mapChatCompletionsStream(stream: AsyncIterable<Record<string, unknown>>, ids: OpenAiIdMap): AsyncGenerator<ChatEvent, void>;
//#endregion
export { CONSERVATIVE_COMPATIBLE_CAPS, OPENAI_MODELS, OPENAI_PRICING, type OpenAiAdapterOptions, type OpenAiClientLike, type OpenAiCompatibleConfig, OpenAiIdMap, type OpenAiModelInfo, type OpenAiSdkOptions, type ResponsesStreamEvent, buildChatCompletionsParams, buildResponsesParams, mapChatCompletionsStream, mapOpenAiEffort, mapResponsesStream, normalizeOpenAiUsage, openAiErrorToWire, openAiModelInfo, openai, openaiCompatible };