[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishContractSectionPattern

# Interface: FinishContractSectionPattern

Defined in: [packages/core/src/orchestrator/output-contract.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L55)

One counted per-section collection demand (RV2206).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | [packages/core/src/orchestrator/output-contract.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L60) |
| <a id="property-label"></a> `label?` | `string` | Short human name for prompts and reasons. | [packages/core/src/orchestrator/output-contract.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L70) |
| <a id="property-min"></a> `min` | `number` | Matches (distinct captures when capturing) required inside the section. | [packages/core/src/orchestrator/output-contract.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L62) |
| <a id="property-pattern"></a> `pattern` | `string` | Regex source; a capture group makes counting DISTINCT by first capture. | [packages/core/src/orchestrator/output-contract.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L59) |
| <a id="property-samples"></a> `samples` | `string`[] | Literal matches for the golden fixtures and the prompt. Single line each; with a capturing pattern they must together carry at least `min` distinct captures. | [packages/core/src/orchestrator/output-contract.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L68) |
| <a id="property-section"></a> `section` | `string` | A declared section marker this demand binds to. | [packages/core/src/orchestrator/output-contract.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/output-contract.ts#L57) |
