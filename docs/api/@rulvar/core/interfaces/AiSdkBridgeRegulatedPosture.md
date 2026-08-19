[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AiSdkBridgeRegulatedPosture

# Interface: AiSdkBridgeRegulatedPosture

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L55)

The posture a bridgeAiSdk() adapter chose at construction.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-kind"></a> `kind` | `"ai-sdk-bridge"` | - | [packages/core/src/l0/spi/regulated-posture.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L58) |
| <a id="property-name"></a> `name` | `string` | The adapter id. | [packages/core/src/l0/spi/regulated-posture.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L60) |
| <a id="property-providerexecutedtools"></a> `providerExecutedTools` | `"allow"` \| `"deny"` | Whether provider-executed tool results are admitted past the seam; 'allow' runs tools outside the permission chain and the journal, which the regulated floor refuses. | [packages/core/src/l0/spi/regulated-posture.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L66) |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | [packages/core/src/l0/spi/regulated-posture.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L57) |
