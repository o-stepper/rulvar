[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BudgetReserve

# Interface: BudgetReserve

Defined in: [packages/core/src/orchestrator/admission.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L56)

Layer-1 reservation embedded in the carrying decision entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childceilingusd"></a> `childCeilingUsd?` | `number` | The child sub-account ceiling; absent when the parent is uncapped. | [packages/core/src/orchestrator/admission.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L59) |
| <a id="property-clampedby"></a> `clampedBy?` | `"explicit-budget"` \| `"fraction-ceiling"` | Set when the derived reserve was clamped DOWN to the child's ceiling: 'explicit-budget' by a declared budgetUsd, 'fraction-ceiling' by the childBudgetFraction allowance an ORIGIN WITH a materialized allowance account enforces (ctx.workflow). The spawn-tool path never carries 'fraction-ceiling': its dispatch enforces no fraction account, and journaling that clamp is exactly the parity rerun's 0.50-versus-0.70 lie (RV2004). | [packages/core/src/orchestrator/admission.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L76) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | [packages/core/src/orchestrator/admission.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L57) |
| <a id="property-source"></a> `source?` | `"estCost"` \| `"default"` | The reserve derivation (RV2004): where reserveUsd came from, so a journal reader never reverse-engineers the arithmetic. 'estCost' is the declared estimate (spawn opts or the agentType profile), 'default' the engine flat reserve. | [packages/core/src/orchestrator/admission.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L66) |
