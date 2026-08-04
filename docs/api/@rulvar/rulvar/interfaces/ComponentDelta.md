[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ComponentDelta

# Interface: ComponentDelta

Defined in: `packages/core/dist/index.d.ts`

One (model, component) line of the reconciliation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-component"></a> `component` | [`BillingComponent`](/api/@rulvar/rulvar/type-aliases/BillingComponent.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-deltausd"></a> `deltaUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-divergent"></a> `divergent` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-effectiveusdpermtok"></a> `effectiveUsdPerMTok?` | `number` | ourUsd over ourTokens, per MTok: our effective rate over the same base, tier mix included. | `packages/core/dist/index.d.ts` |
| <a id="property-impliedusdpermtok"></a> `impliedUsdPerMTok?` | `number` | statementUsd over ourTokens, per MTok: the rate the provider ACTUALLY applied. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-ourtokens"></a> `ourTokens` | `number` | Our token base for the component, from the invoice rows' usage. | `packages/core/dist/index.d.ts` |
| <a id="property-ourusd"></a> `ourUsd` | `number` | Our dollars, from the shared price decomposition (priceComponentsOf). | `packages/core/dist/index.d.ts` |
| <a id="property-statementusd"></a> `statementUsd?` | `number` | The statement's dollars; absent when the export does not carry this line. | `packages/core/dist/index.d.ts` |
