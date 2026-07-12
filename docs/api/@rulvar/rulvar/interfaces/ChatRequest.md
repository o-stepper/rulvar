[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ChatRequest

# Interface: ChatRequest

Defined in: `packages/core/dist/index.d.ts`

The provider-neutral chat request. Sampling parameters (temperature,
top_p, top_k) are deliberately absent from the first-class surface: both
first-class providers reject them on current reasoning models; where a
target legitimately supports them they travel through the adapter's
providerOptions namespace, subject to caps scrubbing.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachehint"></a> `cacheHint?` | [`CacheHint`](/api/@rulvar/rulvar/interfaces/CacheHint.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Canonical effort, already resolved and scrubbed by the router. | `packages/core/dist/index.d.ts` |
| <a id="property-maxoutputtokens"></a> `maxOutputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-messages"></a> `messages` | [`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)[] | System messages are Msg entries with role 'system'. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model` | `string` | Wire model id: the segment after 'adapterId:' in ModelRef. | `packages/core/dist/index.d.ts` |
| <a id="property-provideroptions"></a> `providerOptions?` | `Record`\&lt;`string`, `Record`\&lt;`string`, `unknown`\&gt;\&gt; | Namespaced by adapter id: { anthropic: {...}, openai: {...} }. An adapter MUST read only its own namespace and MUST ignore unknown namespaces without error. Canonical fields always win where both express the same thing; a namespaced option silently contradicting a canonical field is a typed ConfigError. | `packages/core/dist/index.d.ts` |
| <a id="property-schema"></a> `schema?` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) | Structured-output target; tier already chosen by the router. | `packages/core/dist/index.d.ts` |
| <a id="property-stopsequences"></a> `stopSequences?` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-toolchoice"></a> `toolChoice?` | [`ToolChoice`](/api/@rulvar/rulvar/type-aliases/ToolChoice.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | [`ToolContract`](/api/@rulvar/rulvar/interfaces/ToolContract.md)[] | - | `packages/core/dist/index.d.ts` |
