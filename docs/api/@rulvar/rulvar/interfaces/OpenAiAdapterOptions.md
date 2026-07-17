[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OpenAiAdapterOptions

# Interface: OpenAiAdapterOptions

Defined in: `packages/openai/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-apikey"></a> `apiKey?` | `string` | Shorthand for `sdkOptions.apiKey`; setting both is a ConfigError. | `packages/openai/dist/index.d.ts` |
| <a id="property-baseurl"></a> `baseURL?` | `string` | Shorthand for `sdkOptions.baseURL`; setting both is a ConfigError. | `packages/openai/dist/index.d.ts` |
| <a id="property-client"></a> `client?` | `OpenAI` \| `OpenAiClientLike` | A preconstructed client instead of the construction options above (combining them is a ConfigError): the official `OpenAI` instance (production; it must be constructed with `maxRetries: 0`) or a structural `OpenAiClientLike` mock (tests). | `packages/openai/dist/index.d.ts` |
| <a id="property-sdkoptions"></a> `sdkOptions?` | `OpenAiSdkOptions` | Official SDK construction options; see `OpenAiSdkOptions`. | `packages/openai/dist/index.d.ts` |
