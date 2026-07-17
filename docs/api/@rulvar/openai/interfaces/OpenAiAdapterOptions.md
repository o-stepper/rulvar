[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiAdapterOptions

# Interface: OpenAiAdapterOptions

Defined in: [packages/openai/src/adapter.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L53)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-apikey"></a> `apiKey?` | `string` | Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. | [packages/openai/src/adapter.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L55) |
| <a id="property-baseurl"></a> `baseURL?` | `string` | Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. | [packages/openai/src/adapter.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L57) |
| <a id="property-client"></a> `client?` | \| [`OpenAiClientLike`](/api/@rulvar/openai/interfaces/OpenAiClientLike.md) \| `OpenAI` | A preconstructed client instead of the construction options above (combining them is a ConfigError): the official `OpenAI` instance (production; it must be constructed with `maxRetries: 0`) or a structural `OpenAiClientLike` mock (tests). | [packages/openai/src/adapter.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L66) |
| <a id="property-sdkoptions"></a> `sdkOptions?` | [`OpenAiSdkOptions`](/api/@rulvar/openai/type-aliases/OpenAiSdkOptions.md) | Official SDK construction options; see `OpenAiSdkOptions`. | [packages/openai/src/adapter.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L59) |
