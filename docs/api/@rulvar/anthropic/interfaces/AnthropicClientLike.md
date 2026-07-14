[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / AnthropicClientLike

# Interface: AnthropicClientLike

Defined in: [packages/anthropic/src/adapter.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L29)

The client sub-surface the adapter consumes; injectable for tests.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-messages"></a> `messages` | \{ `countTokens`: `Promise`\&lt;\{ `input_tokens`: `number`; \}\&gt;; `create`: `Promise`\&lt;`unknown`\&gt;; \} | [packages/anthropic/src/adapter.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L30) |
| `messages.countTokens` | `Promise`\&lt;\{ `input_tokens`: `number`; \}\&gt; | [packages/anthropic/src/adapter.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L32) |
| `messages.create` | `Promise`\&lt;`unknown`\&gt; | [packages/anthropic/src/adapter.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L31) |
| <a id="property-models"></a> `models` | \{ `list`: `Promise`\&lt;\{ `data`: `Record`\&lt;`string`, `unknown`\&gt;[]; `has_more?`: `boolean`; `last_id?`: `string`; \}\&gt;; \} | [packages/anthropic/src/adapter.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L34) |
| `models.list` | `Promise`\&lt;\{ `data`: `Record`\&lt;`string`, `unknown`\&gt;[]; `has_more?`: `boolean`; `last_id?`: `string`; \}\&gt; | [packages/anthropic/src/adapter.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L35) |
