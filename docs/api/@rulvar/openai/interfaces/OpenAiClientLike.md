[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiClientLike

# Interface: OpenAiClientLike

Defined in: [packages/openai/src/adapter.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L30)

The client sub-surface the adapter consumes; injectable for tests.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-chat"></a> `chat` | \{ `completions`: \{ `create`: `Promise`\&lt;`unknown`\&gt;; \}; \} | [packages/openai/src/adapter.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L34) |
| `chat.completions` | \{ `create`: `Promise`\&lt;`unknown`\&gt;; \} | [packages/openai/src/adapter.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L35) |
| `chat.completions.create` | `Promise`\&lt;`unknown`\&gt; | [packages/openai/src/adapter.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L36) |
| <a id="property-responses"></a> `responses` | \{ `create`: `Promise`\&lt;`unknown`\&gt;; \} | [packages/openai/src/adapter.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L31) |
| `responses.create` | `Promise`\&lt;`unknown`\&gt; | [packages/openai/src/adapter.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L32) |
