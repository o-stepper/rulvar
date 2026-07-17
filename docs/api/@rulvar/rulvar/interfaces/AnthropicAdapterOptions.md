[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AnthropicAdapterOptions

# Interface: AnthropicAdapterOptions

Defined in: `packages/anthropic/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-apikey"></a> `apiKey?` | `string` | Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. | `packages/anthropic/dist/index.d.ts` |
| <a id="property-baseurl"></a> `baseURL?` | `string` | Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. | `packages/anthropic/dist/index.d.ts` |
| <a id="property-client"></a> `client?` | `Anthropic` \| `AnthropicClientLike` | A preconstructed client instead of the construction options above (combining them is a ConfigError): the official `Anthropic` instance (production; it must be constructed with `maxRetries: 0`) or a structural `AnthropicClientLike` mock (tests). | `packages/anthropic/dist/index.d.ts` |
| <a id="property-sdkoptions"></a> `sdkOptions?` | `AnthropicSdkOptions` | Official SDK construction options; see `AnthropicSdkOptions`. | `packages/anthropic/dist/index.d.ts` |
