[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationLimits

# Interface: TerminationLimits

Defined in: [packages/core/src/journal/termination.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L30)

The frozen limits vector written into termination.init (docs/07, 11.2).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | From the orchestrator budget (DEF-7; XF-09). | [packages/core/src/journal/termination.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L46) |
| <a id="property-kmax"></a> `kMax` | `number` | Maximum declared ladder length per the profile-registry snapshot. | [packages/core/src/journal/termination.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L40) |
| <a id="property-maxdepth"></a> `maxDepth` | `number` | D0, default 1, ceiling 4; static per-branch limit. | [packages/core/src/journal/termination.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L38) |
| <a id="property-maxescalationsperlogicaltask"></a> `maxEscalationsPerLogicalTask` | `number` | E0, default 2, per lineage; the old name is rejected (XF-10). | [packages/core/src/journal/termination.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L36) |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun` | `number` | V0, default 32; absolute and non-replenishable. | [packages/core/src/journal/termination.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L32) |
| <a id="property-maxtotalspawns"></a> `maxTotalSpawns` | `number` | S0, default 128; debited on every admitted spawn of any origin. | [packages/core/src/journal/termination.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L34) |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd` | `number` | From the orchestrator budget (DEF-7; XF-09). | [packages/core/src/journal/termination.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L44) |
| <a id="property-runbudgetusdceiling"></a> `runBudgetUsdCeiling` | `number` | B0; immutable after start, no API including HITL can top up. | [packages/core/src/journal/termination.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L42) |
