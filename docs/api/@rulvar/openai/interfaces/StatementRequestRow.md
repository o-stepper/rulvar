[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / StatementRequestRow

# Interface: StatementRequestRow

Defined in: [packages/openai/src/reconcile.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L51)

One normalized per-request row of a usage/billing export. `usd` is
the row's billed dollars where the export carries amounts;
`componentsUsd` its per-component split where it carries one; `usage`
the provider-reported token counts where it carries those. A row must
carry at least one of the three, and every row needs the provider's
response id, the join key.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/openai/type-aliases/BillingComponent.md), `number`\&gt;\&gt; | - | [packages/openai/src/reconcile.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L56) |
| <a id="property-model"></a> `model?` | `string` | Provider-side model name (without the adapter prefix); optional. | [packages/openai/src/reconcile.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L54) |
| <a id="property-responseid"></a> `responseId` | `string` | - | [packages/openai/src/reconcile.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L52) |
| <a id="property-usage"></a> `usage?` | \{ `cachedInputTokens?`: `number`; `cacheWriteTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; \} | - | [packages/openai/src/reconcile.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L57) |
| `usage.cachedInputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L59) |
| `usage.cacheWriteTokens?` | `number` | - | [packages/openai/src/reconcile.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L60) |
| `usage.inputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L58) |
| `usage.outputTokens?` | `number` | - | [packages/openai/src/reconcile.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L61) |
| <a id="property-usd"></a> `usd?` | `number` | - | [packages/openai/src/reconcile.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L55) |
