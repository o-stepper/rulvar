[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / StatementCoverage

# Interface: StatementCoverage

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-billablerows"></a> `billableRows` | `number` | Invoice rows carrying usage or dollars: the billable set. | `packages/core/dist/index.d.ts` |
| <a id="property-complete"></a> `complete` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-matchedrows"></a> `matchedRows` | `number` | Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). | `packages/core/dist/index.d.ts` |
| <a id="property-rowswithresponseid"></a> `rowsWithResponseId` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-statementonlyidsample"></a> `statementOnlyIdSample` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-statementonlyrows"></a> `statementOnlyRows` | `number` | Statement rows matching nothing of ours: ids (requests) or model names (categories). | `packages/core/dist/index.d.ts` |
| <a id="property-unmatchedidsample"></a> `unmatchedIdSample` | `string`[] | First unmatched response ids (at most 20), requests mode. | `packages/core/dist/index.d.ts` |
| <a id="property-unmatchedrows"></a> `unmatchedRows` | `number` | - | `packages/core/dist/index.d.ts` |
