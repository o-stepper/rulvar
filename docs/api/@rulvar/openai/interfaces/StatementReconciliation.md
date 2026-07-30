[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementReconciliation

# Interface: StatementReconciliation

Defined in: [packages/openai/src/reconcile.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L120)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-components"></a> `components` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | Every (model, component) line, models sorted, components in canonical order. | [packages/openai/src/reconcile.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L125) |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd` | `number` | - | [packages/openai/src/reconcile.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L140) |
| <a id="property-coverage"></a> `coverage` | [`StatementCoverage`](/api/@rulvar/openai/interfaces/StatementCoverage.md) | - | [packages/openai/src/reconcile.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L122) |
| <a id="property-divergent"></a> `divergent` | [`ComponentDelta`](/api/@rulvar/openai/interfaces/ComponentDelta.md)[] | The lines beyond tolerance, largest |delta| first: the named divergences. | [packages/openai/src/reconcile.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L127) |
| <a id="property-mode"></a> `mode` | `"requests"` \| `"categories"` | - | [packages/openai/src/reconcile.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L121) |
| <a id="property-tokenmismatches"></a> `tokenMismatches` | `number` | Sample of token disagreements between the export and our recorded usage (requests mode). | [packages/openai/src/reconcile.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L129) |
| <a id="property-tokenmismatchsample"></a> `tokenMismatchSample` | \{ `field`: `string`; `ours`: `number`; `responseId`: `string`; `statement`: `number`; \}[] | - | [packages/openai/src/reconcile.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L130) |
| <a id="property-totals"></a> `totals` | \{ `deltaUsd?`: `number`; `ourUsd`: `number`; `statementUsd?`: `number`; \} | - | [packages/openai/src/reconcile.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L123) |
| `totals.deltaUsd?` | `number` | - | [packages/openai/src/reconcile.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L123) |
| `totals.ourUsd` | `number` | - | [packages/openai/src/reconcile.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L123) |
| `totals.statementUsd?` | `number` | - | [packages/openai/src/reconcile.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L123) |
| <a id="property-unpricedmodels"></a> `unpricedModels` | `string`[] | Models the rate card does not cover: declared, excluded from divergence. | [packages/openai/src/reconcile.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L137) |
| <a id="property-usageunknownrows"></a> `usageUnknownRows` | `number` | Rows whose usage the ledger never saw (usageUnknown): counted apart, never folded. | [packages/openai/src/reconcile.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L139) |
| <a id="property-verdict"></a> `verdict` | `"match"` \| `"divergence"` \| `"partial-coverage"` \| `"no-overlap"` | - | [packages/openai/src/reconcile.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L141) |
