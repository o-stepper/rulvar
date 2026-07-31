[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementReconciliation

# Interface: StatementReconciliation

Defined in: [packages/openai/src/reconcile.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L143)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-components"></a> `components` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | Every (model, component) line, models sorted, components in canonical order. | [packages/openai/src/reconcile.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L148) |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd` | `number` | - | [packages/openai/src/reconcile.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L168) |
| <a id="property-coverage"></a> `coverage` | [`StatementCoverage`](/api/@rulvar/openai/interfaces/StatementCoverage.md) | - | [packages/openai/src/reconcile.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L145) |
| <a id="property-divergent"></a> `divergent` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | The lines beyond tolerance, largest |delta| first: the named divergences. | [packages/openai/src/reconcile.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L150) |
| <a id="property-mode"></a> `mode` | `"requests"` \| `"categories"` | - | [packages/openai/src/reconcile.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L144) |
| <a id="property-tokenmismatches"></a> `tokenMismatches` | `number` | Token disagreements between the export and our recorded usage (requests mode). Under the default tokenComparison 'verdict' any mismatch makes the verdict 'divergence'; under 'informational' the count and sample still report, advisory only (RV903). | [packages/openai/src/reconcile.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L157) |
| <a id="property-tokenmismatchsample"></a> `tokenMismatchSample` | \{ `field`: `string`; `ours`: `number`; `responseId`: `string`; `statement`: `number`; \}[] | - | [packages/openai/src/reconcile.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L158) |
| <a id="property-totals"></a> `totals` | \{ `deltaUsd?`: `number`; `ourUsd`: `number`; `statementUsd?`: `number`; \} | - | [packages/openai/src/reconcile.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L146) |
| `totals.deltaUsd?` | `number` | - | [packages/openai/src/reconcile.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L146) |
| `totals.ourUsd` | `number` | - | [packages/openai/src/reconcile.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L146) |
| `totals.statementUsd?` | `number` | - | [packages/openai/src/reconcile.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L146) |
| <a id="property-unpricedmodels"></a> `unpricedModels` | `string`[] | Models the rate card does not cover: declared, excluded from divergence. | [packages/openai/src/reconcile.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L165) |
| <a id="property-usageunknownrows"></a> `usageUnknownRows` | `number` | Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. | [packages/openai/src/reconcile.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L167) |
| <a id="property-verdict"></a> `verdict` | `"match"` \| `"divergence"` \| `"partial-coverage"` \| `"no-overlap"` | - | [packages/openai/src/reconcile.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L169) |
