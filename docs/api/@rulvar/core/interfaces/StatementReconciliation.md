[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / StatementReconciliation

# Interface: StatementReconciliation

Defined in: [packages/core/src/engine/reconcile-statement.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L146)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-components"></a> `components` | [`ComponentDelta`](/api/@rulvar/core/interfaces/ComponentDelta.md)[] | Every (model, component) line, models sorted, components in canonical order. | [packages/core/src/engine/reconcile-statement.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L151) |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L171) |
| <a id="property-coverage"></a> `coverage` | [`StatementCoverage`](/api/@rulvar/core/interfaces/StatementCoverage.md) | - | [packages/core/src/engine/reconcile-statement.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L148) |
| <a id="property-divergent"></a> `divergent` | [`ComponentDelta`](/api/@rulvar/core/interfaces/ComponentDelta.md)[] | The lines beyond tolerance, largest |delta| first: the named divergences. | [packages/core/src/engine/reconcile-statement.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L153) |
| <a id="property-mode"></a> `mode` | `"requests"` \| `"categories"` | - | [packages/core/src/engine/reconcile-statement.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L147) |
| <a id="property-settleable"></a> `settleable` | `boolean` | The settlement-grade composite, first class (RV1006): true exactly when the verdict is 'match' AND coverage is complete AND no row's usage is unknown AND no model went unpriced. A 'match' alone is not enough: an export can cover every KNOWN row to the cent while a usage-unknown attempt still holds unattributed money, and a safe consumer must not assemble this predicate by hand. The last two conditions overlap today's verdict semantics deliberately: the predicate states the full contract so it cannot drift apart from a future verdict refinement. | [packages/core/src/engine/reconcile-statement.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L184) |
| <a id="property-tokenmismatches"></a> `tokenMismatches` | `number` | Token disagreements between the export and our recorded usage (requests mode). Under the default tokenComparison 'verdict' any mismatch makes the verdict 'divergence'; under 'informational' the count and sample still report, advisory only (RV903). | [packages/core/src/engine/reconcile-statement.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L160) |
| <a id="property-tokenmismatchsample"></a> `tokenMismatchSample` | \{ `field`: `string`; `ours`: `number`; `responseId`: `string`; `statement`: `number`; \}[] | - | [packages/core/src/engine/reconcile-statement.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L161) |
| <a id="property-totals"></a> `totals` | \{ `deltaUsd?`: `number`; `ourUsd`: `number`; `statementUsd?`: `number`; \} | - | [packages/core/src/engine/reconcile-statement.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L149) |
| `totals.deltaUsd?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L149) |
| `totals.ourUsd` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L149) |
| `totals.statementUsd?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L149) |
| <a id="property-unpricedmodels"></a> `unpricedModels` | `string`[] | Models the rate card does not cover: declared, excluded from divergence. | [packages/core/src/engine/reconcile-statement.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L168) |
| <a id="property-usageunknownrows"></a> `usageUnknownRows` | `number` | Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. | [packages/core/src/engine/reconcile-statement.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L170) |
| <a id="property-verdict"></a> `verdict` | `"match"` \| `"divergence"` \| `"partial-coverage"` \| `"no-overlap"` | - | [packages/core/src/engine/reconcile-statement.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L172) |
