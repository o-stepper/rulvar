[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / StatementRequestRow

# Interface: StatementRequestRow

Defined in: [packages/core/src/engine/reconcile-statement.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L54)

One normalized per-request row of a usage/billing export. `usd` is
the row's billed dollars where the export carries amounts;
`componentsUsd` its per-component split where it carries one; `usage`
the provider-reported token counts where it carries those. A row must
carry at least one of the three, and every row needs the provider's
response id, the join key.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componentsusd"></a> `componentsUsd?` | `Partial`\&lt;`Record`\&lt;[`BillingComponent`](/api/@rulvar/core/type-aliases/BillingComponent.md), `number`\&gt;\&gt; | - | [packages/core/src/engine/reconcile-statement.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L59) |
| <a id="property-model"></a> `model?` | `string` | Provider-side model name (without the adapter prefix); optional. | [packages/core/src/engine/reconcile-statement.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L57) |
| <a id="property-responseid"></a> `responseId` | `string` | - | [packages/core/src/engine/reconcile-statement.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L55) |
| <a id="property-usage"></a> `usage?` | \{ `cachedInputTokens?`: `number`; `cacheWriteTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; \} | - | [packages/core/src/engine/reconcile-statement.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L60) |
| `usage.cachedInputTokens?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L62) |
| `usage.cacheWriteTokens?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L63) |
| `usage.inputTokens?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L61) |
| `usage.outputTokens?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L64) |
| <a id="property-usd"></a> `usd?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L58) |
