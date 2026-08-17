[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetAccountView

# Interface: BudgetAccountView

Defined in: [packages/core/src/engine/budget.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L149)

Read-only projection of one account.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `number` | - | [packages/core/src/engine/budget.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L151) |
| <a id="property-committedreserveusd"></a> `committedReserveUsd` | `number` | - | [packages/core/src/engine/budget.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L153) |
| <a id="property-convergencereserveusd"></a> `convergenceReserveUsd` | `number` | The repair round's verdict hold (RV3701); zero when none is committed. | [packages/core/src/engine/budget.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L158) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | - | [packages/core/src/engine/budget.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L154) |
| <a id="property-parentscope"></a> `parentScope?` | `string` | - | [packages/core/src/engine/budget.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L161) |
| <a id="property-repairreserveusd"></a> `repairReserveUsd` | `number` | The repair round's mechanical leg (RV3802); zero when none is committed. | [packages/core/src/engine/budget.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L160) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/budget.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L150) |
| <a id="property-spentusd"></a> `spentUsd` | `number` | - | [packages/core/src/engine/budget.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L152) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | The synthesis payload hold (cycle 76); zero when none is committed. | [packages/core/src/engine/budget.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L156) |
