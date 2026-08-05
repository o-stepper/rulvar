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
  * Provider family for provider-raw retention and projection. Defaults
  * to the wrapped model's `provider` string, so
  * two bridged models of one provider share retained blocks.
  */
  provider?: string;
  /** Per-model capability overrides merged over the conservative defaults. */
  caps?: (model: string) => ModelCaps | Partial<ModelCaps>;
  /**
  * Provider-executed tool policy (RV1806). The wrapped provider can
  * run tools SERVER-SIDE (web search, code execution, computer use):
  * those calls never pass the engine's ToolDef registry, risk
  * classes, ask rules, or approvals, and their effects happen on
  * provider infrastructure regardless of any engine permission chain.
  * The default 'deny' fails the turn with a typed terminal error the
  * moment a provider-executed exchange appears, because a policy
  * surface that cannot see a call must not silently absorb it.
  * 'allow' opts in: the exchange is retained for prompt
  * reconstruction exactly as before, and the finish metadata
  * additionally names every provider-executed call
  * (`providerExecutedTools: [{ toolName, toolCallId }]`) so the
  * journaled record of the turn says what the provider ran.
  */
  providerExecutedTools?: "allow" | "deny";
}
/**
* Wraps a Vercel AI SDK LanguageModelV4 as a ProviderAdapter. The bridge
* MUST check specificationVersion at runtime and
* fail with a typed ConfigError on mismatch. The published interface names
* the version V4; the wire literal carried by @ai-sdk/provider ^4 is 'v4'.
*/
declare function bridgeAiSdk(model: LanguageModelV4, options?: BridgeAiSdkOptions): ProviderAdapter;
/**
* Projects a thrown value from the wrapped model into a typed WireError.
* APICallError carries the provider's status and headers: 429 surfaces as
* a retryable rate-limit with retryAfterMs; 5xx and status-less network
* failures are retryable transport; other statuses are terminal transport.
*/
declare function aiSdkErrorToWire(error: unknown): WireError;
//#endregion
export { type BridgeAiSdkOptions, aiSdkErrorToWire, bridgeAiSdk };