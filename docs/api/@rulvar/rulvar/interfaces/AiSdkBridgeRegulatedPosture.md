[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AiSdkBridgeRegulatedPosture

# Interface: AiSdkBridgeRegulatedPosture

Defined in: `packages/core/dist/index.d.ts`

The posture a bridgeAiSdk() adapter chose at construction.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-kind"></a> `kind` | `"ai-sdk-bridge"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | The adapter id. | `packages/core/dist/index.d.ts` |
| <a id="property-providerexecutedtools"></a> `providerExecutedTools` | `"allow"` \| `"deny"` | Whether provider-executed tool results are admitted past the seam; 'allow' runs tools outside the permission chain and the journal, which the regulated floor refuses. | `packages/core/dist/index.d.ts` |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | `packages/core/dist/index.d.ts` |
