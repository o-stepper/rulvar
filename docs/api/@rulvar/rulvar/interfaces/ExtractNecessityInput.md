[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ExtractNecessityInput

# Interface: ExtractNecessityInput

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The inputs of the extract-necessity rule (docs/04, section 8.3, extract row).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extractref"></a> `extractRef` | `` `${string}:${string}` `` | The extract-resolved model (same chain, role 'extract'). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-finalizerouted"></a> `finalizeRouted` | `boolean` | Finalize is configured in routing (`finalizeConfigured`). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-loopref"></a> `loopRef` | `` `${string}:${string}` `` | The loop-resolved model. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-looptier"></a> `loopTier` | [`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md) | The required tier for the schema on the LOOP model (docs/04, section 8.4). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-schemaset"></a> `schemaSet` | `boolean` | A schema is set on the call; without one extract never fires. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-toolsavailable"></a> `toolsAvailable` | `boolean` | The agent's toolset is non-empty (escalate opt-in counts). | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
