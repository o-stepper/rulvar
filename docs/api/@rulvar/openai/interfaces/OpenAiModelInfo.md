[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiModelInfo

# Interface: OpenAiModelInfo

Defined in: [packages/openai/src/caps.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L12)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-api"></a> `api` | `"responses"` \| `"chat"` | - | [packages/openai/src/caps.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L14) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | - | [packages/openai/src/caps.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L13) |
| <a id="property-reasoning"></a> `reasoning` | `boolean` | Reasoning models reject non-default sampling parameters (docs/04, section 5.1). | [packages/openai/src/caps.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L16) |
