[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CapacitySheetFigure

# Interface: CapacitySheetFigure

Defined in: [packages/core/src/orchestrator/capacity-sheet.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L40)

One figure of the sheet: a number, its unit, and where it came from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | - | [packages/core/src/orchestrator/capacity-sheet.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L41) |
| <a id="property-note"></a> `note?` | `string` | The formula, the source, or the assumption's own statement. | [packages/core/src/orchestrator/capacity-sheet.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L46) |
| <a id="property-provenance"></a> `provenance` | `"given"` \| `"derived"` \| `"assumption"` \| `"observed"` | - | [packages/core/src/orchestrator/capacity-sheet.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L44) |
| <a id="property-unit"></a> `unit` | [`CapacitySheetUnit`](/api/@rulvar/core/type-aliases/CapacitySheetUnit.md) | - | [packages/core/src/orchestrator/capacity-sheet.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L43) |
| <a id="property-value"></a> `value` | `number` | - | [packages/core/src/orchestrator/capacity-sheet.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L42) |
