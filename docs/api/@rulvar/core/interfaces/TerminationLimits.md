[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationLimits

# Interface: TerminationLimits

Defined in: [packages/core/src/journal/termination.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L30)

The frozen limits vector written into termination.init.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | The finalize reserve carved out of the cap; 0 in pre-v1.8 journals. | [packages/core/src/journal/termination.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L51) |
| <a id="property-kmax"></a> `kMax` | `number` | Maximum declared ladder length per the profile-registry snapshot. | [packages/core/src/journal/termination.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L40) |
| <a id="property-maxdepth"></a> `maxDepth` | `number` | D0, default 1, ceiling 4; static per-branch limit. | [packages/core/src/journal/termination.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L38) |
| <a id="property-maxescalationsperlogicaltask"></a> `maxEscalationsPerLogicalTask` | `number` | E0, default 2, per lineage; the old name is rejected (XF-10). | [packages/core/src/journal/termination.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L36) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun` | `number` | V0, default 32; absolute and non-replenishable. | [packages/core/src/journal/termination.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L32) |
| <a id="property-maxtotalspawns"></a> `maxTotalSpawns` | `number` | S0, default 128; debited on every admitted spawn of any origin. | [packages/core/src/journal/termination.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L34) |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd` | `number` | The resolved orchestrator cap in absolute USD (DEF-7; XF-09), frozen with the counters. Journals recorded before v1.8 store 0 ("not yet resolved"); for them the orchestrator_budget_reserve decision is the authority and is recovered on resume. | [packages/core/src/journal/termination.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L49) |
| <a id="property-runbudgetusdceiling"></a> `runBudgetUsdCeiling` | `number` | B0; immutable after start, no API including HITL can top up. | [packages/core/src/journal/termination.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L42) |
