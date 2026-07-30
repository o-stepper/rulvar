[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementRequestRow

# Interface: StatementRequestRow

Defined in: [packages/openai/src/reconcile.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L42)

One normalized per-request row of a usage/billing export. `usd` is
the row's billed dollars where the export carries amounts;
`componentsUsd` its per-component split where it carries one; `usage`
the provider-reported token counts where it carries those. A row must
carry at least one of the three, and every row needs the provider's
response id, the join key.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/openai/type-aliases/BillingComponent.md), `number`\&gt;\&gt; | - | [packages/openai/src/reconcile.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L47) |
| <a id="property-model"></a> `model?` | `string` | Provider-side model name (without the adapter prefix); optional. | [packages/openai/src/reconcile.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L45) |
| <a id="property-responseid"></a> `responseId` | `string` | - | [packages/openai/src/reconcile.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L43) |
| <a id="property-usage"></a> `usage?` | \{ `cachedInputTokens?`: `number`; `cacheWriteTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; \} | - | [packages/openai/src/reconcile.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L48) |
| `usage.cachedInputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L50) |
| `usage.cacheWriteTokens?` | `number` | - | [packages/openai/src/reconcile.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L51) |
| `usage.inputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L49) |
| `usage.outputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L52) |
| <a id="property-usd"></a> `usd?` | `number` | - | [packages/openai/src/reconcile.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L46) |
