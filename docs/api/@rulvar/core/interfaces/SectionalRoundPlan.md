[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SectionalRoundPlan

# Interface: SectionalRoundPlan

Defined in: [packages/core/src/orchestrator/orchestrate.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L368)

The sectional round's owning sections and marker roster (RV3803).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-sections"></a> `sections` | `string`[] | Every H2 marker of the retained document, in document order. | [packages/core/src/orchestrator/orchestrate.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L370) |
| <a id="property-targets"></a> `targets` | `string`[] | The markers owning at least one finding excerpt, document order. | [packages/core/src/orchestrator/orchestrate.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L372) |
