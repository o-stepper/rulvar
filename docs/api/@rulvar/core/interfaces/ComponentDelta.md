[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ComponentDelta

# Interface: ComponentDelta

Defined in: [packages/core/src/engine/reconcile-statement.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L114)

One (model, component) line of the reconciliation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-component"></a> `component` | [`BillingComponent`](/api/@rulvar/core/type-aliases/BillingComponent.md) | - | [packages/core/src/engine/reconcile-statement.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L116) |
| <a id="property-deltausd"></a> `deltaUsd?` | `number` | - | [packages/core/src/engine/reconcile-statement.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L123) |
| <a id="property-divergent"></a> `divergent` | `boolean` | - | [packages/core/src/engine/reconcile-statement.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L128) |
| <a id="property-effectiveusdpermtok"></a> `effectiveUsdPerMTok?` | `number` | ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. | [packages/core/src/engine/reconcile-statement.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L127) |
| <a id="property-impliedusdpermtok"></a> `impliedUsdPerMTok?` | `number` | statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. | [packages/core/src/engine/reconcile-statement.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L125) |
| <a id="property-model"></a> `model` | `string` | - | [packages/core/src/engine/reconcile-statement.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L115) |
| <a id="property-ourtokens"></a> `ourTokens` | `number` | Our token base for the component, from the invoice rows' usage. | [packages/core/src/engine/reconcile-statement.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L118) |
| <a id="property-ourusd"></a> `ourUsd` | `number` | Our dollars, from the shared price decomposition (priceComponentsOf). | [packages/core/src/engine/reconcile-statement.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L120) |
| <a id="property-statementusd"></a> `statementUsd?` | `number` | The statement's dollars; absent when the export does not carry this line. | [packages/core/src/engine/reconcile-statement.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L122) |
