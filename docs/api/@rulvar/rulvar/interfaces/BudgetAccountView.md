[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BudgetAccountView

# Interface: BudgetAccountView

Defined in: `packages/core/dist/index.d.ts`

Read-only projection of one account.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-committedreserveusd"></a> `committedReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-convergencereserveusd"></a> `convergenceReserveUsd` | `number` | The repair round's verdict hold (RV3701); zero when none is committed. | `packages/core/dist/index.d.ts` |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-parentscope"></a> `parentScope?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-spentusd"></a> `spentUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | The synthesis payload hold (cycle 76); zero when none is committed. | `packages/core/dist/index.d.ts` |
