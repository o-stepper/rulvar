[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExtractNecessityInput

# Interface: ExtractNecessityInput

Defined in: [packages/core/src/model/roles.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L43)

The inputs of the extract-necessity rule.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-extractref"></a> `extractRef` | `` `${string}:${string}` `` | The extract-resolved model (same chain, role 'extract'). | [packages/core/src/model/roles.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L49) |
| <a id="property-finalizerouted"></a> `finalizeRouted` | `boolean` | Finalize is configured in routing (`finalizeConfigured`). | [packages/core/src/model/roles.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L55) |
| <a id="property-loopref"></a> `loopRef` | `` `${string}:${string}` `` | The loop-resolved model. | [packages/core/src/model/roles.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L47) |
| <a id="property-looptier"></a> `loopTier` | [`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) | The required tier for the schema on the LOOP model. | [packages/core/src/model/roles.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L51) |
| <a id="property-schemaset"></a> `schemaSet` | `boolean` | A schema is set on the call; without one extract never fires. | [packages/core/src/model/roles.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L45) |
| <a id="property-toolsavailable"></a> `toolsAvailable` | `boolean` | The agent's toolset is non-empty (escalate opt-in counts). | [packages/core/src/model/roles.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/roles.ts#L53) |
