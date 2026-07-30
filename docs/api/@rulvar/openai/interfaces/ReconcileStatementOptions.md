[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / ReconcileStatementOptions

# Interface: ReconcileStatementOptions

Defined in: [packages/openai/src/reconcile.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L68)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd?` | `number` | Per-component divergence threshold in USD. The default 0.005 absorbs the dashboard's 3-decimal rounding (at most 0.0005 per figure) with an order of margin, while any real rate-card divergence on a run worth reconciling sits orders above it. | [packages/openai/src/reconcile.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L77) |
| <a id="property-modelof"></a> `modelOf?` | (`servedBy`) => `string` | Provider-side model name of a served ref; default strips the adapter prefix. | [packages/openai/src/reconcile.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L84) |
| <a id="property-pricingof"></a> `pricingOf` | (`servedBy`) => [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined` | Our rate card, the same resolution the engine prices with. | [packages/openai/src/reconcile.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L70) |
| <a id="property-totaltoleranceusd"></a> `totalToleranceUsd?` | `number` | Totals threshold for a per-request export that carries row dollars but no per-component split; default 0.01. | [packages/openai/src/reconcile.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/reconcile.ts#L82) |
