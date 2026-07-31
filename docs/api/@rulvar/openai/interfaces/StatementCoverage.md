[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementCoverage

# Interface: StatementCoverage

Defined in: [packages/openai/src/reconcile.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L128)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-billablerows"></a> `billableRows` | `number` | Invoice rows carrying usage or dollars: the billable set. | [packages/openai/src/reconcile.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L130) |
| <a id="property-complete"></a> `complete` | `boolean` | - | [packages/openai/src/reconcile.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L140) |
| <a id="property-matchedrows"></a> `matchedRows` | `number` | Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). | [packages/openai/src/reconcile.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L133) |
| <a id="property-rowswithresponseid"></a> `rowsWithResponseId` | `number` | - | [packages/openai/src/reconcile.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L131) |
| <a id="property-statementonlyidsample"></a> `statementOnlyIdSample` | `string`[] | - | [packages/openai/src/reconcile.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L139) |
| <a id="property-statementonlyrows"></a> `statementOnlyRows` | `number` | Statement rows matching nothing of ours: ids (requests) or model names (categories). | [packages/openai/src/reconcile.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L138) |
| <a id="property-unmatchedidsample"></a> `unmatchedIdSample` | `string`[] | First unmatched response ids (at most 20), requests mode. | [packages/openai/src/reconcile.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L136) |
| <a id="property-unmatchedrows"></a> `unmatchedRows` | `number` | - | [packages/openai/src/reconcile.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L134) |
