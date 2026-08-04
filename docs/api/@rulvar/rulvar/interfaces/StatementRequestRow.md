[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / StatementRequestRow

# Interface: StatementRequestRow

Defined in: `packages/core/dist/index.d.ts`

One normalized per-request row of a usage/billing export. `usd` is
the row's billed dollars where the export carries amounts;
`componentsUsd` its per-component split where it carries one; `usage`
the provider-reported token counts where it carries those. A row must
carry at least one of the three, and every row needs the provider's
response id, the join key.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/rulvar/type-aliases/BillingComponent.md), `number`\&gt;\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | `string` | Provider-side model name (without the adapter prefix); optional. | `packages/core/dist/index.d.ts` |
| <a id="property-responseid"></a> `responseId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage?` | \{ `cachedInputTokens?`: `number`; `cacheWriteTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `usage.cachedInputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| `usage.cacheWriteTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| `usage.inputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| `usage.outputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd?` | `number` | - | `packages/core/dist/index.d.ts` |
