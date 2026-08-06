[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BudgetReserve

# Interface: BudgetReserve

Defined in: `packages/core/dist/index.d.ts`

Layer-1 reservation embedded in the carrying decision entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childceilingusd"></a> `childCeilingUsd?` | `number` | The child sub-account ceiling; absent when the parent is uncapped. | `packages/core/dist/index.d.ts` |
| <a id="property-clampedby"></a> `clampedBy?` | `"explicit-budget"` \| `"fraction-ceiling"` | Set when the derived reserve was clamped DOWN to the child's ceiling: 'explicit-budget' by a declared budgetUsd, 'fraction-ceiling' by the childBudgetFraction allowance an ORIGIN WITH a materialized allowance account enforces (ctx.workflow). The spawn-tool path never carries 'fraction-ceiling': its dispatch enforces no fraction account, and journaling that clamp is exactly the parity rerun's 0.50-versus-0.70 lie (RV2004). | `packages/core/dist/index.d.ts` |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-source"></a> `source?` | `"estCost"` \| `"default"` | The reserve derivation (RV2004): where reserveUsd came from, so a journal reader never reverse-engineers the arithmetic. 'estCost' is the declared estimate (spawn opts or the agentType profile), 'default' the engine flat reserve. | `packages/core/dist/index.d.ts` |
