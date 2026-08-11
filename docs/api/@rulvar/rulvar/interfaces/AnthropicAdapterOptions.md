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
| <a id="property-capsmaxpages"></a> `capsMaxPages?` | `number` | The `refreshCaps()` pagination bound (RV2904), the MCP `maxPages` doctrine applied to the provider's own metadata surface: past this many pages with more still reported, the refresh fails typed instead of truncating, because a silently partial caps table would clamp output bounds against limits that are not the model's. Cursor cycles (a page answering the cursor it was queried with, or one this sweep already used) are refused UNCONDITIONALLY, bound or none: a cycle is never a legitimate pagination step. Unset keeps pagination unbounded exactly like MCP without a declared cap, with only the cycle guards armed. | `packages/anthropic/dist/index.d.ts` |
| <a id="property-client"></a> `client?` | `Anthropic` \| `AnthropicClientLike` | A preconstructed client instead of the construction options above (combining them is a ConfigError): the official `Anthropic` instance (production; it must be constructed with `maxRetries: 0`) or a structural `AnthropicClientLike` mock (tests). | `packages/anthropic/dist/index.d.ts` |
| <a id="property-sdkoptions"></a> `sdkOptions?` | `AnthropicSdkOptions` | Official SDK construction options; see `AnthropicSdkOptions`. | `packages/anthropic/dist/index.d.ts` |
