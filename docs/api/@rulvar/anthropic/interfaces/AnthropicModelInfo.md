[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / AnthropicModelInfo

# Interface: AnthropicModelInfo

Defined in: [packages/anthropic/src/caps.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L54)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachemintokens"></a> `cacheMinTokens` | `number` | Minimum cacheable prefix in tokens. | [packages/anthropic/src/caps.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L63) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | - | [packages/anthropic/src/caps.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L55) |
| <a id="property-thinkingform"></a> `thinkingForm` | `"adaptive"` \| `"enabled-budget"` | Wire thinking form: current models accept only adaptive; the enabled/budget form remains functional only on Opus 4.6 and Sonnet 4.6. | [packages/anthropic/src/caps.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L61) |
