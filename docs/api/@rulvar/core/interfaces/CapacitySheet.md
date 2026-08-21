[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CapacitySheet

# Interface: CapacitySheet

Defined in: [packages/core/src/orchestrator/capacity-sheet.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L89)

The sheet: sections of labeled figures plus the named assumptions.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-assumptions"></a> `assumptions` | `string`[] | Named assumptions; never silently zero, never silently derived. | [packages/core/src/orchestrator/capacity-sheet.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L96) |
| <a id="property-basis"></a> `basis` | `"declared-estimate"` | The provenance of the whole artifact, the RV4206 literal. | [packages/core/src/orchestrator/capacity-sheet.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L91) |
| <a id="property-estimate"></a> `estimate` | [`WireCapacityEstimate`](/api/@rulvar/core/interfaces/WireCapacityEstimate.md) | The embedded estimate, verbatim, for machine consumers. | [packages/core/src/orchestrator/capacity-sheet.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L93) |
| <a id="property-sections"></a> `sections` | [`CapacitySheetSection`](/api/@rulvar/core/interfaces/CapacitySheetSection.md)[] | - | [packages/core/src/orchestrator/capacity-sheet.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L94) |
