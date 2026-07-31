[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / ComponentDelta

# Interface: ComponentDelta

Defined in: [packages/openai/src/reconcile.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L111)

One (model, component) line of the reconciliation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-component"></a> `component` | [`BillingComponent`](/api/@rulvar/openai/type-aliases/BillingComponent.md) | - | [packages/openai/src/reconcile.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L113) |
| <a id="property-deltausd"></a> `deltaUsd?` | `number` | - | [packages/openai/src/reconcile.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L120) |
| <a id="property-divergent"></a> `divergent` | `boolean` | - | [packages/openai/src/reconcile.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L125) |
| <a id="property-effectiveusdpermtok"></a> `effectiveUsdPerMTok?` | `number` | ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. | [packages/openai/src/reconcile.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L124) |
| <a id="property-impliedusdpermtok"></a> `impliedUsdPerMTok?` | `number` | statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. | [packages/openai/src/reconcile.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L122) |
| <a id="property-model"></a> `model` | `string` | - | [packages/openai/src/reconcile.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L112) |
| <a id="property-ourtokens"></a> `ourTokens` | `number` | Our token base for the component, from the invoice rows' usage. | [packages/openai/src/reconcile.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L115) |
| <a id="property-ourusd"></a> `ourUsd` | `number` | Our dollars, from the shared price decomposition (priceComponentsOf). | [packages/openai/src/reconcile.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L117) |
| <a id="property-statementusd"></a> `statementUsd?` | `number` | The statement's dollars; absent when the export does not carry this line. | [packages/openai/src/reconcile.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L119) |
