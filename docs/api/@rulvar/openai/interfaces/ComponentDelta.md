[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / ComponentDelta

# Interface: ComponentDelta

Defined in: [packages/openai/src/reconcile.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L88)

One (model, component) line of the reconciliation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-component"></a> `component` | [`BillingComponent`](/api/@rulvar/openai/type-aliases/BillingComponent.md) | - | [packages/openai/src/reconcile.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L90) |
| <a id="property-deltausd"></a> `deltaUsd?` | `number` | - | [packages/openai/src/reconcile.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L97) |
| <a id="property-divergent"></a> `divergent` | `boolean` | - | [packages/openai/src/reconcile.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L102) |
| <a id="property-effectiveusdpermtok"></a> `effectiveUsdPerMTok?` | `number` | ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. | [packages/openai/src/reconcile.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L101) |
| <a id="property-impliedusdpermtok"></a> `impliedUsdPerMTok?` | `number` | statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. | [packages/openai/src/reconcile.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L99) |
| <a id="property-model"></a> `model` | `string` | - | [packages/openai/src/reconcile.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L89) |
| <a id="property-ourtokens"></a> `ourTokens` | `number` | Our token base for the component, from the invoice rows' usage. | [packages/openai/src/reconcile.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L92) |
| <a id="property-ourusd"></a> `ourUsd` | `number` | Our dollars, from the shared price decomposition (priceComponentsOf). | [packages/openai/src/reconcile.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L94) |
| <a id="property-statementusd"></a> `statementUsd?` | `number` | The statement's dollars; absent when the export does not carry this line. | [packages/openai/src/reconcile.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L96) |
