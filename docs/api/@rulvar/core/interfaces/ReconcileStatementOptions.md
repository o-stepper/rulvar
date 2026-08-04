[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ReconcileStatementOptions

# Interface: ReconcileStatementOptions

Defined in: [packages/core/src/engine/reconcile-statement.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L80)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-componenttoleranceusd"></a> `componentToleranceUsd?` | `number` | Per-component divergence threshold in USD. The default 0.005 absorbs the dashboard's 3-decimal rounding (at most 0.0005 per figure) with an order of margin, while any real rate-card divergence on a run worth reconciling sits orders above it. | [packages/core/src/engine/reconcile-statement.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L89) |
| <a id="property-modelof"></a> `modelOf?` | (`servedBy`) => `string` | Provider-side model name of a served ref; default strips the adapter prefix. | [packages/core/src/engine/reconcile-statement.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L96) |
| <a id="property-pricingof"></a> `pricingOf` | (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined` | Our rate card, the same resolution the engine prices with. | [packages/core/src/engine/reconcile-statement.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L82) |
| <a id="property-tokencomparison"></a> `tokenComparison?` | `"verdict"` \| `"informational"` | How provider-reported token counts weigh on the verdict (RV903). 'verdict' (default): any token disagreement between the export and our recorded usage is a divergence, because our counts ARE the provider's own wire-reported numbers, so an export that disagrees with them describes a different request than the wire served, and dollars derived from either cannot be trusted to mean the same thing. 'informational' preserves the pre-v1.126 dollar-only verdict for exports whose token semantics legitimately differ from the wire's (a different cache accounting, rounded aggregates): mismatches are still counted and sampled, but only dollar deltas decide. | [packages/core/src/engine/reconcile-statement.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L110) |
| <a id="property-totaltoleranceusd"></a> `totalToleranceUsd?` | `number` | Totals threshold for a per-request export that carries row dollars but no per-component split; default 0.01. | [packages/core/src/engine/reconcile-statement.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/reconcile-statement.ts#L94) |
