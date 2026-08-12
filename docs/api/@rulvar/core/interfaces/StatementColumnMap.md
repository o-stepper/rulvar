[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / StatementColumnMap

# Interface: StatementColumnMap

Defined in: [packages/core/src/engine/reconcile-statement.ts:814](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L814)

Column mapping for [statementFromRows](/api/@rulvar/core/functions/statementFromRows.md): each field names the
KEY in the caller's raw rows that carries the value. Provider export
formats change without notice and differ per tenant surface (CSV
headers, JSON field names, locale-shaped numbers), so this module
deliberately ships NO per-provider schema knowledge: the caller
states the mapping in one place and the normalizer applies one
fail-closed validation to whatever the export actually contained,
naming the row and the column of anything that cannot be evidence.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cachedinputtokens"></a> `cachedInputTokens?` | `string` | - | [packages/core/src/engine/reconcile-statement.ts:825](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L825) |
| <a id="property-cachewritetokens"></a> `cacheWriteTokens?` | `string` | - | [packages/core/src/engine/reconcile-statement.ts:826](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L826) |
| <a id="property-component"></a> `component?` | `string` | Key of the billing component name; required for `kind: 'categories'`. | [packages/core/src/engine/reconcile-statement.ts:822](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L822) |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/core/type-aliases/BillingComponent.md), `string`\&gt;\&gt; | Keys of a per-component dollar split, one column per component. | [packages/core/src/engine/reconcile-statement.ts:829](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L829) |
| <a id="property-inputtokens"></a> `inputTokens?` | `string` | Keys of the provider-reported token counts. | [packages/core/src/engine/reconcile-statement.ts:824](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L824) |
| <a id="property-model"></a> `model?` | `string` | Key of the provider-side model name. | [packages/core/src/engine/reconcile-statement.ts:818](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L818) |
| <a id="property-outputtokens"></a> `outputTokens?` | `string` | - | [packages/core/src/engine/reconcile-statement.ts:827](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L827) |
| <a id="property-responseid"></a> `responseId?` | `string` | Key of the provider response id; required for `kind: 'requests'`. | [packages/core/src/engine/reconcile-statement.ts:816](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L816) |
| <a id="property-usd"></a> `usd?` | `string` | Key of the row's billed dollars; for `kind: 'categories'` required. | [packages/core/src/engine/reconcile-statement.ts:820](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L820) |
