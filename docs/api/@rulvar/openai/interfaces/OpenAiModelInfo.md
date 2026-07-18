[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiModelInfo

# Interface: OpenAiModelInfo

Defined in: [packages/openai/src/caps.ts:11](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L11)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-api"></a> `api` | `"responses"` \| `"chat"` | - | [packages/openai/src/caps.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L13) |
| <a id="property-caps"></a> `caps` | [`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md) | - | [packages/openai/src/caps.ts:12](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L12) |
| <a id="property-reasoning"></a> `reasoning` | `boolean` | Reasoning models reject non-default sampling parameters. | [packages/openai/src/caps.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L15) |
| <a id="property-wiremaxeffort"></a> `wireMaxEffort` | `boolean` | The model accepts wire `reasoning.effort: "max"` (the whole GPT-5.6 family per the official model guidance, each sibling verified live 2026-07-18). When false, canonical max downmaps to wire xhigh; the downmap is recorded in providerMetadata and the journal identity keeps max, so caps accept the full canonical set either way. Flip this to true ONLY on a per-model live verification, never from the family page alone. | [packages/openai/src/caps.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/caps.ts#L25) |
