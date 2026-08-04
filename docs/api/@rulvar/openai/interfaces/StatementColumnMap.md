[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementColumnMap

# Interface: StatementColumnMap

Defined in: `packages/core/dist/index.d.ts`

Column mapping for [statementFromRows](/api/@rulvar/openai/functions/statementFromRows.md): each field names the
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
| <a id="property-cachedinputtokens"></a> `cachedInputTokens?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-cachewritetokens"></a> `cacheWriteTokens?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-component"></a> `component?` | `string` | Key of the billing component name; required for `kind: 'categories'`. | `packages/core/dist/index.d.ts` |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/openai/type-aliases/BillingComponent.md), `string`\&gt;\&gt; | Keys of a per-component dollar split, one column per component. | `packages/core/dist/index.d.ts` |
| <a id="property-inputtokens"></a> `inputTokens?` | `string` | Keys of the provider-reported token counts. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | `string` | Key of the provider-side model name. | `packages/core/dist/index.d.ts` |
| <a id="property-outputtokens"></a> `outputTokens?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-responseid"></a> `responseId?` | `string` | Key of the provider response id; required for `kind: 'requests'`. | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd?` | `string` | Key of the row's billed dollars; for `kind: 'categories'` required. | `packages/core/dist/index.d.ts` |
