[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiCompatibleConfig

# Interface: OpenAiCompatibleConfig

Defined in: [packages/openai/src/compatible.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L45)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-apikey"></a> `apiKey?` | `string` | - | [packages/openai/src/compatible.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L49) |
| <a id="property-baseurl"></a> `baseURL` | `string` | - | [packages/openai/src/compatible.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L48) |
| <a id="property-caps"></a> `caps?` | (`model`) => \| [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) \| `Partial`\&lt;[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)\&gt; | Per-model capability overrides merged over the conservative set. | [packages/openai/src/compatible.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L51) |
| <a id="property-client"></a> `client?` | [`OpenAiClientLike`](/api/@rulvar/openai/interfaces/OpenAiClientLike.md) | Test seam: a preconstructed client; production uses the openai SDK. | [packages/openai/src/compatible.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L53) |
| <a id="property-id"></a> `id` | `string` | Explicit adapter id, e.g. 'ollama', 'vllm', 'openrouter'. | [packages/openai/src/compatible.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/compatible.ts#L47) |
