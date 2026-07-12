[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / AnthropicModelInfo

# Interface: AnthropicModelInfo

Defined in: [packages/anthropic/src/caps.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L14)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachemintokens"></a> `cacheMinTokens` | `number` | Minimum cacheable prefix in tokens (docs/04, section "Prompt caching"). | [packages/anthropic/src/caps.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L23) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | - | [packages/anthropic/src/caps.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L15) |
| <a id="property-thinkingform"></a> `thinkingForm` | `"adaptive"` \| `"enabled-budget"` | Wire thinking form: current models accept only adaptive; the enabled/budget form remains functional only on Opus 4.6 and Sonnet 4.6 (docs/04, section "Thinking and sampling parameters"). | [packages/anthropic/src/caps.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/caps.ts#L21) |
