[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SectionPatternEntry

# Interface: SectionPatternEntry

Defined in: `packages/core/dist/index.d.ts`

One counted per-section pattern demand of
[sectionPatternCountValidator](/api/@rulvar/rulvar/functions/sectionPatternCountValidator.md) (RV2206).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flags"></a> `flags?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | Short human name for reasons (e.g. 'numbered negative scenarios'). | `packages/core/dist/index.d.ts` |
| <a id="property-min"></a> `min` | `number` | Matches (distinct captures when capturing) required in the slice. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern` | `string` | Regex source. A capture group makes the count DISTINCT by the first capture (the parity contract's N01..N48 ids count once each, however often an id repeats); without a capture the raw match count applies. | `packages/core/dist/index.d.ts` |
| <a id="property-section"></a> `section` | `string` | The section marker the demand binds to. | `packages/core/dist/index.d.ts` |
