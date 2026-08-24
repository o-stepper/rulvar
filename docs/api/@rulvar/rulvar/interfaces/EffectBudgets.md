[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectBudgets

# Interface: EffectBudgets

Defined in: `packages/core/dist/index.d.ts`

Recovery budgets recorded ON the intent (RFC section 3.1, item 2):
every non-terminal state is bounded, and every exhaustion path lands
in `quarantined`. `reconcileBy` is the overall deadline; crossing it
in any non-terminal state quarantines with the state recorded.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts` | `number` | Dispatch attempts the intent may open, total. | `packages/core/dist/index.d.ts` |
| <a id="property-authorizationwaitms"></a> `authorizationWaitMs?` | `number` | How long a compensation may wait for its own authorization, in milliseconds (RFC section 3.1, items 1 and 8); absent on effects that are not compensations. | `packages/core/dist/index.d.ts` |
| <a id="property-lookups"></a> `lookups` | `number` | Provider lookups, bounded separately from dispatch attempts. | `packages/core/dist/index.d.ts` |
| <a id="property-receiptwaitms"></a> `receiptWaitMs` | `number` | How long `awaiting-receipt` may wait, in milliseconds. | `packages/core/dist/index.d.ts` |
| <a id="property-reconcileby"></a> `reconcileBy` | `string` | ISO instant: the overall reconcile deadline of the intent. | `packages/core/dist/index.d.ts` |
