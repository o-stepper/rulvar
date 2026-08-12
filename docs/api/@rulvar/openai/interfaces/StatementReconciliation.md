[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementReconciliation

# Interface: StatementReconciliation

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-components"></a> `components` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | Every (model, component) line, models sorted, components in canonical order. | `packages/core/dist/index.d.ts` |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-coverage"></a> `coverage` | [`StatementCoverage`](/api/@rulvar/openai/interfaces/StatementCoverage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-divergent"></a> `divergent` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | The lines beyond tolerance, largest |delta| first: the named divergences. | `packages/core/dist/index.d.ts` |
| <a id="property-dollarcoverage"></a> `dollarCoverage` | `"complete"` \| `"partial"` \| `"none"` | How much of the MATCHED statement claims money (RV3306): 'complete' when every matched export row (requests mode) or every component line (categories mode) carries a dollar claim, a row total or a component split; 'partial' when some do; 'none' when the statement matched on identity and usage alone, or matched nothing. Kept apart from row coverage on purpose: coverage says the records line up, this says whether the provider actually stated dollars over them. | `packages/core/dist/index.d.ts` |
| <a id="property-mode"></a> `mode` | `"requests"` \| `"categories"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-monetarysettleable"></a> `monetarySettleable` | `boolean` | The MONETARY settlement predicate (RV3306): `settleable` AND complete dollar coverage. `settleable` answers "do the records agree"; this answers "may money close against this statement". The 2026-08-12 audit named the difference on this exact module: a usage-only request export settled 'match' without one dollar of provider evidence, and a finance pipeline gating on `settleable` alone would have closed money against it. | `packages/core/dist/index.d.ts` |
| <a id="property-settleable"></a> `settleable` | `boolean` | The settlement-grade composite, first class (RV1006): true exactly when the verdict is 'match' AND coverage is complete AND no row's usage is unknown AND no model went unpriced. A 'match' alone is not enough: an export can cover every KNOWN row to the cent while a usage-unknown attempt still holds unattributed money, and a safe consumer must not assemble this predicate by hand. The last two conditions overlap today's verdict semantics deliberately: the predicate states the full contract so it cannot drift apart from a future verdict refinement. Note what it does NOT require: a dollar claim. A usage-only export that matches on identity and tokens reads `settleable: true`; gate MONETARY closure on `monetarySettleable` below. | `packages/core/dist/index.d.ts` |
| <a id="property-tokenmismatches"></a> `tokenMismatches` | `number` | Token disagreements between the export and our recorded usage (requests mode). Under the default tokenComparison 'verdict' any mismatch makes the verdict 'divergence'; under 'informational' the count and sample still report, advisory only (RV903). | `packages/core/dist/index.d.ts` |
| <a id="property-tokenmismatchsample"></a> `tokenMismatchSample` | \{ `field`: `string`; `ours`: `number`; `responseId`: `string`; `statement`: `number`; \}[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-totals"></a> `totals` | \{ `deltaUsd?`: `number`; `ourUsd`: `number`; `statementUsd?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `totals.deltaUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `totals.ourUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `totals.statementUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-unpricedmodels"></a> `unpricedModels` | `string`[] | Models the rate card does not cover: declared, excluded from divergence. | `packages/core/dist/index.d.ts` |
| <a id="property-usageunknownrows"></a> `usageUnknownRows` | `number` | Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. | `packages/core/dist/index.d.ts` |
| <a id="property-verdict"></a> `verdict` | `"match"` \| `"divergence"` \| `"partial-coverage"` \| `"no-overlap"` | - | `packages/core/dist/index.d.ts` |
