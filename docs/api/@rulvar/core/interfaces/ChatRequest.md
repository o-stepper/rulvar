[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChatRequest

# Interface: ChatRequest

Defined in: [packages/core/src/l0/messages.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L123)

The provider-neutral chat request. Sampling parameters (temperature,
top_p, top_k) are deliberately absent from the first-class surface: both
first-class providers reject them on current reasoning models; where a
target legitimately supports them they travel through the adapter's
providerOptions namespace, subject to caps scrubbing.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachehint"></a> `cacheHint?` | [`CacheHint`](/api/@rulvar/core/interfaces/CacheHint.md) | - | [packages/core/src/l0/messages.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L136) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort, already resolved and scrubbed by the router. | [packages/core/src/l0/messages.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L133) |
| <a id="property-maxoutputtokens"></a> `maxOutputTokens?` | `number` | - | [packages/core/src/l0/messages.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L134) |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] | System messages are Msg entries with role 'system'. | [packages/core/src/l0/messages.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L127) |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:' in ModelRef. | [packages/core/src/l0/messages.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L125) |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id: { anthropic: {...}, openai: {...} }. An adapter MUST read only its own namespace and MUST ignore unknown namespaces without error. Canonical fields always win where both express the same thing; a namespaced option silently contradicting a canonical field is a typed ConfigError. | [packages/core/src/l0/messages.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L144) |
| <a id="property-schema"></a> `schema?` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) | Structured-output target; tier already chosen by the router. | [packages/core/src/l0/messages.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L131) |
| <a id="property-stopsequences"></a> `stopSequences?` | `string`[] | - | [packages/core/src/l0/messages.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L135) |
| <a id="property-toolchoice"></a> `toolChoice?` | [`ToolChoice`](/api/@rulvar/core/type-aliases/ToolChoice.md) | - | [packages/core/src/l0/messages.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L129) |
| <a id="property-tools"></a> `tools?` | [`ToolContract`](/api/@rulvar/core/interfaces/ToolContract.md)[] | - | [packages/core/src/l0/messages.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L128) |
