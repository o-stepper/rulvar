[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementCoverage

# Interface: StatementCoverage

Defined in: [packages/openai/src/reconcile.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L105)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-billablerows"></a> `billableRows` | `number` | Invoice rows carrying usage or dollars: the billable set. | [packages/openai/src/reconcile.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L107) |
| <a id="property-complete"></a> `complete` | `boolean` | - | [packages/openai/src/reconcile.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L117) |
| <a id="property-matchedrows"></a> `matchedRows` | `number` | Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). | [packages/openai/src/reconcile.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L110) |
| <a id="property-rowswithresponseid"></a> `rowsWithResponseId` | `number` | - | [packages/openai/src/reconcile.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L108) |
| <a id="property-statementonlyidsample"></a> `statementOnlyIdSample` | `string`[] | - | [packages/openai/src/reconcile.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L116) |
| <a id="property-statementonlyrows"></a> `statementOnlyRows` | `number` | Statement rows matching nothing of ours: ids (requests) or model names (categories). | [packages/openai/src/reconcile.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L115) |
| <a id="property-unmatchedidsample"></a> `unmatchedIdSample` | `string`[] | First unmatched response ids (at most 20), requests mode. | [packages/openai/src/reconcile.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L113) |
| <a id="property-unmatchedrows"></a> `unmatchedRows` | `number` | - | [packages/openai/src/reconcile.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L111) |
