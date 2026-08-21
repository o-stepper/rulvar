[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CapacitySheetFigure

# Interface: CapacitySheetFigure

Defined in: `packages/core/dist/index.d.ts`

One figure of the sheet: a number, its unit, and where it came from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-note"></a> `note?` | `string` | The formula, the source, or the assumption's own statement. | `packages/core/dist/index.d.ts` |
| <a id="property-provenance"></a> `provenance` | `"given"` \| `"derived"` \| `"assumption"` \| `"observed"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-unit"></a> `unit` | [`CapacitySheetUnit`](/api/@rulvar/rulvar/type-aliases/CapacitySheetUnit.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value` | `number` | - | `packages/core/dist/index.d.ts` |
