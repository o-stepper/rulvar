[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / AnthropicAdapterOptions

# Interface: AnthropicAdapterOptions

Defined in: [packages/anthropic/src/adapter.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L63)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-apikey"></a> `apiKey?` | `string` | Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. | [packages/anthropic/src/adapter.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L65) |
| <a id="property-baseurl"></a> `baseURL?` | `string` | Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. | [packages/anthropic/src/adapter.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L67) |
| <a id="property-client"></a> `client?` | \| `Anthropic` \| [`AnthropicClientLike`](/api/@rulvar/anthropic/interfaces/AnthropicClientLike.md) | A preconstructed client instead of the construction options above (combining them is a ConfigError): the official `Anthropic` instance (production; it must be constructed with `maxRetries: 0`) or a structural `AnthropicClientLike` mock (tests). | [packages/anthropic/src/adapter.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L76) |
| <a id="property-sdkoptions"></a> `sdkOptions?` | [`AnthropicSdkOptions`](/api/@rulvar/anthropic/type-aliases/AnthropicSdkOptions.md) | Official SDK construction options; see `AnthropicSdkOptions`. | [packages/anthropic/src/adapter.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L69) |
