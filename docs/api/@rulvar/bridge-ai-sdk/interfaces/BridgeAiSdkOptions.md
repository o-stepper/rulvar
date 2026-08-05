[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/bridge-ai-sdk](/api/@rulvar/bridge-ai-sdk/index.md) / BridgeAiSdkOptions

# Interface: BridgeAiSdkOptions

Defined in: [packages/bridge-ai-sdk/src/bridge.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L102)

@rulvar/bridge-ai-sdk: wraps any Vercel AI SDK LanguageModelV4 as a
Rulvar ProviderAdapter (https://docs.rulvar.com/guide/providers).
Documented as the highest-churn package of the
set: it tracks the @ai-sdk/provider major line and its provider-major
bumps are the most likely driver of post-1.0 BREAKING majors.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-caps"></a> `caps?` | (`model`) => \| [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) \| `Partial`\&lt;[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)\&gt; | Per-model capability overrides merged over the conservative defaults. | [packages/bridge-ai-sdk/src/bridge.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L116) |
| <a id="property-id"></a> `id?` | `string` | Adapter id (the left segment of ModelRef). Defaults to the wrapped model's `provider` string; pass an explicit id to register several bridged models of the same provider side by side. | [packages/bridge-ai-sdk/src/bridge.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L108) |
| <a id="property-provider"></a> `provider?` | `string` | Provider family for provider-raw retention and projection. Defaults to the wrapped model's `provider` string, so two bridged models of one provider share retained blocks. | [packages/bridge-ai-sdk/src/bridge.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L114) |
| <a id="property-providerexecutedtools"></a> `providerExecutedTools?` | `"allow"` \| `"deny"` | Provider-executed tool policy (RV1806). The wrapped provider can run tools SERVER-SIDE (web search, code execution, computer use): those calls never pass the engine's ToolDef registry, risk classes, ask rules, or approvals, and their effects happen on provider infrastructure regardless of any engine permission chain. The default 'deny' fails the turn with a typed terminal error the moment a provider-executed exchange appears, because a policy surface that cannot see a call must not silently absorb it. 'allow' opts in: the exchange is retained for prompt reconstruction exactly as before, and the finish metadata additionally names every provider-executed call (`providerExecutedTools: [{ toolName, toolCallId }]`) so the journaled record of the turn says what the provider ran. | [packages/bridge-ai-sdk/src/bridge.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L132) |
