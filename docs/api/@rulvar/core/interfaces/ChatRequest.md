[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChatRequest

# Interface: ChatRequest

Defined in: [packages/core/src/l0/messages.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L108)

The provider-neutral chat request. Sampling parameters (temperature,
top_p, top_k) are deliberately absent from the first-class surface: both
first-class providers reject them on current reasoning models; where a
target legitimately supports them they travel through the adapter's
providerOptions namespace, subject to caps scrubbing (docs/04, section
"ChatRequest").

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachehint"></a> `cacheHint?` | [`CacheHint`](/api/@rulvar/core/interfaces/CacheHint.md) | - | [packages/core/src/l0/messages.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L121) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort, already resolved and scrubbed by the router. | [packages/core/src/l0/messages.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L118) |
| <a id="property-maxoutputtokens"></a> `maxOutputTokens?` | `number` | - | [packages/core/src/l0/messages.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L119) |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] | System messages are Msg entries with role 'system'. | [packages/core/src/l0/messages.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L112) |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:' in ModelRef. | [packages/core/src/l0/messages.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L110) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id: { anthropic: {...}, openai: {...} }. An adapter MUST read only its own namespace and MUST ignore unknown namespaces without error. Canonical fields always win where both express the same thing; a namespaced option silently contradicting a canonical field is a typed ConfigError (docs/04, section "providerOptions and providerMetadata namespacing"). | [packages/core/src/l0/messages.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L130) |
| <a id="property-schema"></a> `schema?` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) | Structured-output target; tier already chosen by the router. | [packages/core/src/l0/messages.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L116) |
| <a id="property-stopsequences"></a> `stopSequences?` | `string`[] | - | [packages/core/src/l0/messages.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L120) |
| <a id="property-toolchoice"></a> `toolChoice?` | [`ToolChoice`](/api/@rulvar/core/type-aliases/ToolChoice.md) | - | [packages/core/src/l0/messages.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L114) |
| <a id="property-tools"></a> `tools?` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | - | [packages/core/src/l0/messages.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L113) |
