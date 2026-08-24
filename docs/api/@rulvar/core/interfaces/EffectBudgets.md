[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectBudgets

# Interface: EffectBudgets

Defined in: [packages/core/src/effects/types.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L56)

Recovery budgets recorded ON the intent (RFC section 3.1, item 2):
every non-terminal state is bounded, and every exhaustion path lands
in `quarantined`. `reconcileBy` is the overall deadline; crossing it
in any non-terminal state quarantines with the state recorded.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts` | `number` | Dispatch attempts the intent may open, total. | [packages/core/src/effects/types.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L58) |
| <a id="property-authorizationwaitms"></a> `authorizationWaitMs?` | `number` | How long a compensation may wait for its own authorization, in milliseconds (RFC section 3.1, items 1 and 8); absent on effects that are not compensations. | [packages/core/src/effects/types.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L68) |
| <a id="property-lookups"></a> `lookups` | `number` | Provider lookups, bounded separately from dispatch attempts. | [packages/core/src/effects/types.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L60) |
| <a id="property-receiptwaitms"></a> `receiptWaitMs` | `number` | How long `awaiting-receipt` may wait, in milliseconds. | [packages/core/src/effects/types.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L62) |
| <a id="property-reconcileby"></a> `reconcileBy` | `string` | ISO instant: the overall reconcile deadline of the intent. | [packages/core/src/effects/types.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L70) |
