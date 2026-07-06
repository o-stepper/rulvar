import { CanonicalId, ChatEvent, ChatRequest, Effort, ModelCaps, ProviderAdapter, Usage, WireError } from "@lurker/core";

//#region src/caps.d.ts
interface OpenAiModelInfo {
  caps: ModelCaps;
  api: "responses" | "chat";
  /** Reasoning models reject non-default sampling parameters (docs/04, section 5.1). */
  reasoning: boolean;
}
/** Static seed table; docs/04 section 5 names the current model set. */
declare const OPENAI_MODELS: Record<string, OpenAiModelInfo>;
/** Unknown OpenAI models are assumed current-generation Responses models. */
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
interface OpenAiAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  /** Test seam: a preconstructed client; production uses the openai SDK. */
  client?: OpenAiClientLike;
}
/** Creates the first-class OpenAI adapter (id 'openai'); maxRetries 0. */
declare function openai(options?: OpenAiAdapterOptions): ProviderAdapter;
//#endregion
//#region src/wire.d.ts
/** Bijective canonical-to-wire (call_*) id map (docs/04, section 1.2). */
declare class OpenAiIdMap {
  private readonly toWire;
  private readonly toCanonical;
  private readonly mint;
  constructor(mint: () => CanonicalId);
  canonicalFor(wireId: string): CanonicalId;
  wireFor(canonicalId: CanonicalId): string;
}
/**
* Canonical-to-wire effort (docs/04, sections 3.3 and 5.5): low through
* xhigh pass through; canonical max downmaps to xhigh (documented lossy;
* recorded in providerMetadata); provider 'none' is reachable only via
* providerOptions.openai.reasoningEffort.
*/
declare function mapOpenAiEffort(effort: Effort): {
  wire: string;
  downmapped: boolean;
};
/**
* Builds Responses API params. Manual item replay ONLY: store: false plus
* include reasoning.encrypted_content; previous_response_id and the
* Conversations API place state server-side, break replay identity, and
* are REJECTED as a typed ConfigError (docs/04, section 5.1). Role
* 'system' messages project into top-level instructions on every request.
*/
declare function buildResponsesParams(req: ChatRequest, ids: OpenAiIdMap): {
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
* Maps the typed Responses SSE stream to ChatEvents per the docs/04
* section 5.4 table. Canonical parts come from the typed output array,
* never the output_text aggregate. Raw output items ride
* finish.providerMetadata.openai.outputItems so the runtime can retain
* reasoning items as provider-raw parts.
*/
declare function mapResponsesStream(stream: AsyncIterable<ResponsesStreamEvent>, ids: OpenAiIdMap, emit: (event: ChatEvent) => void, options?: {
  effortDownmapped?: boolean;
}): Promise<void>;
/** Projects SDK/API errors into the retryable WireError vocabulary. */
declare function openAiErrorToWire(error: unknown): WireError;
/**
* The Chat Completions degraded path (docs/04, section 5.6): delta-patched
* chunk assembly instead of typed SSE, nested function tools with explicit
* strict where supported, response_format instead of text.format, no
* reasoning item replay. Selected by caps (api: 'chat'), visible in
* events, never silent.
*/
declare function buildChatCompletionsParams(req: ChatRequest, ids: OpenAiIdMap): Record<string, unknown>;
/** Delta-patched chunk assembly for the degraded path. */
declare function mapChatCompletionsStream(stream: AsyncIterable<Record<string, unknown>>, ids: OpenAiIdMap, emit: (event: ChatEvent) => void): Promise<void>;
//#endregion
export { OPENAI_MODELS, type OpenAiAdapterOptions, type OpenAiClientLike, OpenAiIdMap, type OpenAiModelInfo, type ResponsesStreamEvent, buildChatCompletionsParams, buildResponsesParams, mapChatCompletionsStream, mapOpenAiEffort, mapResponsesStream, normalizeOpenAiUsage, openAiErrorToWire, openAiModelInfo, openai };