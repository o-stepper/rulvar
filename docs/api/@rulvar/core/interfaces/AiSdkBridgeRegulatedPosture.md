[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AiSdkBridgeRegulatedPosture

# Interface: AiSdkBridgeRegulatedPosture

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L51)

The posture a bridgeAiSdk() adapter chose at construction.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-kind"></a> `kind` | `"ai-sdk-bridge"` | - | [packages/core/src/l0/spi/regulated-posture.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L54) |
| <a id="property-name"></a> `name` | `string` | The adapter id. | [packages/core/src/l0/spi/regulated-posture.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L56) |
| <a id="property-providerexecutedtools"></a> `providerExecutedTools` | `"allow"` \| `"deny"` | Whether provider-executed tool results are admitted past the seam; 'allow' runs tools outside the permission chain and the journal, which the regulated floor refuses. | [packages/core/src/l0/spi/regulated-posture.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L62) |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | [packages/core/src/l0/spi/regulated-posture.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L53) |
