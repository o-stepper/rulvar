[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExtractNecessityInput

# Interface: ExtractNecessityInput

Defined in: [packages/core/src/model/roles.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L44)

The inputs of the extract-necessity rule (docs/04, section 8.3, extract row).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extractref"></a> `extractRef` | `` `${string}:${string}` `` | The extract-resolved model (same chain, role 'extract'). | [packages/core/src/model/roles.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L50) |
| <a id="property-finalizerouted"></a> `finalizeRouted` | `boolean` | Finalize is configured in routing (`finalizeConfigured`). | [packages/core/src/model/roles.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L56) |
| <a id="property-loopref"></a> `loopRef` | `` `${string}:${string}` `` | The loop-resolved model. | [packages/core/src/model/roles.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L48) |
| <a id="property-looptier"></a> `loopTier` | [`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) | The required tier for the schema on the LOOP model (docs/04, section 8.4). | [packages/core/src/model/roles.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L52) |
| <a id="property-schemaset"></a> `schemaSet` | `boolean` | A schema is set on the call; without one extract never fires. | [packages/core/src/model/roles.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L46) |
| <a id="property-toolsavailable"></a> `toolsAvailable` | `boolean` | The agent's toolset is non-empty (escalate opt-in counts). | [packages/core/src/model/roles.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L54) |
