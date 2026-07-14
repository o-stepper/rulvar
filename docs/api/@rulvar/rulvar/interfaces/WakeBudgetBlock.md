[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WakeBudgetBlock

# Interface: WakeBudgetBlock

Defined in: `packages/core/dist/index.d.ts`

Passive budget visibility in every digest (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-orchestratorshare"></a> `orchestratorShare` | `number` | spent / max(runSpent, epsilon 0.01): the H-OrchShare input. | `packages/core/dist/index.d.ts` |
| <a id="property-orchestratorspentusd"></a> `orchestratorSpentUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runceilingusd"></a> `runCeilingUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runspentusd"></a> `runSpentUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-softwarning"></a> `softWarning` | `boolean` | True at >= 0.8 x (cap - reserve); fixed in v1 (Appendix A). | `packages/core/dist/index.d.ts` |
