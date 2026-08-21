[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SectionalRoundPlan

# Interface: SectionalRoundPlan

Defined in: [packages/core/src/orchestrator/orchestrate.ts:384](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L384)

The sectional round's owning sections and marker roster (RV3803).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-sections"></a> `sections` | `string`[] | Every H2 marker of the retained document, in document order. | [packages/core/src/orchestrator/orchestrate.ts:386](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L386) |
| <a id="property-targets"></a> `targets` | `string`[] | The markers owning at least one finding excerpt, document order. | [packages/core/src/orchestrator/orchestrate.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L388) |
