[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CapacitySheet

# Interface: CapacitySheet

Defined in: `packages/core/dist/index.d.ts`

The sheet: sections of labeled figures plus the named assumptions.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-assumptions"></a> `assumptions` | `string`[] | Named assumptions; never silently zero, never silently derived. | `packages/core/dist/index.d.ts` |
| <a id="property-basis"></a> `basis` | `"declared-estimate"` | The provenance of the whole artifact, the RV4206 literal. | `packages/core/dist/index.d.ts` |
| <a id="property-estimate"></a> `estimate` | [`WireCapacityEstimate`](/api/@rulvar/rulvar/interfaces/WireCapacityEstimate.md) | The embedded estimate, verbatim, for machine consumers. | `packages/core/dist/index.d.ts` |
| <a id="property-sections"></a> `sections` | [`CapacitySheetSection`](/api/@rulvar/rulvar/interfaces/CapacitySheetSection.md)[] | - | `packages/core/dist/index.d.ts` |
