import { LanguageModelV4 } from "@ai-sdk/provider";
import { ModelCaps, ProviderAdapter, WireError } from "@rulvar/core";

//#region src/bridge.d.ts
interface BridgeAiSdkOptions {
  /**
  * Adapter id (the left segment of ModelRef). Defaults to the wrapped
  * model's `provider` string; pass an explicit id to register several
  * bridged models of the same provider side by side.
  */
  id?: string;
  /**
  * Provider family for provider-raw retention and projection (docs/04,
  * section 2.3). Defaults to the wrapped model's `provider` string, so
  * two bridged models of one provider share retained blocks.
  */
  provider?: string;
  /** Per-model capability overrides merged over the conservative defaults. */
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
}
/**
* Wraps a Vercel AI SDK LanguageModelV4 as a ProviderAdapter (docs/04,
* section 7). The bridge MUST check specificationVersion at runtime and
* fail with a typed ConfigError on mismatch. The published interface names
* the version V4; the wire literal carried by @ai-sdk/provider ^4 is 'v4'.
*/
declare function bridgeAiSdk(model: LanguageModelV4, options?: BridgeAiSdkOptions): ProviderAdapter;
/**
* Projects a thrown value from the wrapped model into a typed WireError.
* APICallError carries the provider's status and headers: 429 surfaces as
* a retryable rate-limit with retryAfterMs; 5xx and status-less network
* failures are retryable transport; other statuses are terminal transport
* (docs/04, section 2.2).
*/
declare function aiSdkErrorToWire(error: unknown): WireError;
//#endregion
export { type BridgeAiSdkOptions, aiSdkErrorToWire, bridgeAiSdk };