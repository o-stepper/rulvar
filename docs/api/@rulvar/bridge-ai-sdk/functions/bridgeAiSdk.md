[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/bridge-ai-sdk](/api/@rulvar/bridge-ai-sdk/index.md) / bridgeAiSdk

# Function: bridgeAiSdk()

```ts
function bridgeAiSdk(model, options?): ProviderAdapter;
```

Defined in: [packages/bridge-ai-sdk/src/bridge.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/bridge-ai-sdk/src/bridge.ts#L162)

Wraps a Vercel AI SDK LanguageModelV4 as a ProviderAdapter. The bridge
MUST check specificationVersion at runtime and
fail with a typed ConfigError on mismatch. The published interface names
the version V4; the wire literal carried by @ai-sdk/provider ^4 is 'v4'.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `LanguageModelV4` |
| `options` | [`BridgeAiSdkOptions`](/api/@rulvar/bridge-ai-sdk/interfaces/BridgeAiSdkOptions.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)
