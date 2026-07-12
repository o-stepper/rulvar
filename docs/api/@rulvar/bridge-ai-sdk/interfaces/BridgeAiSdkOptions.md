[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/bridge-ai-sdk](/api/@rulvar/bridge-ai-sdk/index.md) / BridgeAiSdkOptions

# Interface: BridgeAiSdkOptions

Defined in: [packages/bridge-ai-sdk/src/bridge.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L102)

@rulvar/bridge-ai-sdk: wraps any Vercel AI SDK LanguageModelV4 as a
rulvar ProviderAdapter (https://docs.rulvar.com/guide/providers).
Documented as the highest-churn package of the
set: it tracks the @ai-sdk/provider major line and its provider-major
bumps are the most likely driver of post-1.0 BREAKING majors.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-caps"></a> `caps?` | (`model`) => \| [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) \| `Partial`\&lt;[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)\&gt; | Per-model capability overrides merged over the conservative defaults. | [packages/bridge-ai-sdk/src/bridge.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L116) |
| <a id="property-id"></a> `id?` | `string` | Adapter id (the left segment of ModelRef). Defaults to the wrapped model's `provider` string; pass an explicit id to register several bridged models of the same provider side by side. | [packages/bridge-ai-sdk/src/bridge.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L108) |
| <a id="property-provider"></a> `provider?` | `string` | Provider family for provider-raw retention and projection. Defaults to the wrapped model's `provider` string, so two bridged models of one provider share retained blocks. | [packages/bridge-ai-sdk/src/bridge.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L114) |
