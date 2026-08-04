[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / StatementReconciliation

# Interface: StatementReconciliation

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-components"></a> `components` | [`ComponentDelta`](/api/@rulvar/rulvar/interfaces/ComponentDelta.md)[] | Every (model, component) line, models sorted, components in canonical order. | `packages/core/dist/index.d.ts` |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-coverage"></a> `coverage` | [`StatementCoverage`](/api/@rulvar/rulvar/interfaces/StatementCoverage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-divergent"></a> `divergent` | [`ComponentDelta`](/api/@rulvar/rulvar/interfaces/ComponentDelta.md)[] | The lines beyond tolerance, largest |delta| first: the named divergences. | `packages/core/dist/index.d.ts` |
| <a id="property-mode"></a> `mode` | `"requests"` \| `"categories"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-settleable"></a> `settleable` | `boolean` | The settlement-grade composite, first class (RV1006): true exactly when the verdict is 'match' AND coverage is complete AND no row's usage is unknown AND no model went unpriced. A 'match' alone is not enough: an export can cover every KNOWN row to the cent while a usage-unknown attempt still holds unattributed money, and a safe consumer must not assemble this predicate by hand. The last two conditions overlap today's verdict semantics deliberately: the predicate states the full contract so it cannot drift apart from a future verdict refinement. | `packages/core/dist/index.d.ts` |
| <a id="property-tokenmismatches"></a> `tokenMismatches` | `number` | Token disagreements between the export and our recorded usage (requests mode). Under the default tokenComparison 'verdict' any mismatch makes the verdict 'divergence'; under 'informational' the count and sample still report, advisory only (RV903). | `packages/core/dist/index.d.ts` |
| <a id="property-tokenmismatchsample"></a> `tokenMismatchSample` | \{ `field`: `string`; `ours`: `number`; `responseId`: `string`; `statement`: `number`; \}[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-totals"></a> `totals` | \{ `deltaUsd?`: `number`; `ourUsd`: `number`; `statementUsd?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `totals.deltaUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `totals.ourUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `totals.statementUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-unpricedmodels"></a> `unpricedModels` | `string`[] | Models the rate card does not cover: declared, excluded from divergence. | `packages/core/dist/index.d.ts` |
| <a id="property-usageunknownrows"></a> `usageUnknownRows` | `number` | Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. | `packages/core/dist/index.d.ts` |
| <a id="property-verdict"></a> `verdict` | `"match"` \| `"divergence"` \| `"partial-coverage"` \| `"no-overlap"` | - | `packages/core/dist/index.d.ts` |
