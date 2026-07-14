[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WakeBudgetBlock

# Interface: WakeBudgetBlock

Defined in: [packages/core/src/orchestrator/wake.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L90)

Passive budget visibility in every digest (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L95) |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L94) |
| <a id="property-orchestratorshare"></a> `orchestratorShare` | `number` | spent / max(runSpent, epsilon 0.01): the H-OrchShare input. | [packages/core/src/orchestrator/wake.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L97) |
| <a id="property-orchestratorspentusd"></a> `orchestratorSpentUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L93) |
| <a id="property-runceilingusd"></a> `runCeilingUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L92) |
| <a id="property-runspentusd"></a> `runSpentUsd` | `number` | - | [packages/core/src/orchestrator/wake.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L91) |
| <a id="property-softwarning"></a> `softWarning` | `boolean` | True at >= 0.8 x (cap - reserve); fixed in v1 (Appendix A). | [packages/core/src/orchestrator/wake.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L99) |
