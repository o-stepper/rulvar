[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / StatementCoverage

# Interface: StatementCoverage

Defined in: [packages/core/src/engine/reconcile-statement.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L131)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-billablerows"></a> `billableRows` | `number` | Invoice rows carrying usage or dollars: the billable set. | [packages/core/src/engine/reconcile-statement.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L133) |
| <a id="property-complete"></a> `complete` | `boolean` | - | [packages/core/src/engine/reconcile-statement.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L143) |
| <a id="property-matchedrows"></a> `matchedRows` | `number` | Requests mode: rows the export covered. Categories mode: equals billableRows (totals claim the set). | [packages/core/src/engine/reconcile-statement.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L136) |
| <a id="property-rowswithresponseid"></a> `rowsWithResponseId` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L134) |
| <a id="property-statementonlyidsample"></a> `statementOnlyIdSample` | `string`[] | - | [packages/core/src/engine/reconcile-statement.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L142) |
| <a id="property-statementonlyrows"></a> `statementOnlyRows` | `number` | Statement rows matching nothing of ours: ids (requests) or model names (categories). | [packages/core/src/engine/reconcile-statement.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L141) |
| <a id="property-unmatchedidsample"></a> `unmatchedIdSample` | `string`[] | First unmatched response ids (at most 20), requests mode. | [packages/core/src/engine/reconcile-statement.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L139) |
| <a id="property-unmatchedrows"></a> `unmatchedRows` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L137) |
