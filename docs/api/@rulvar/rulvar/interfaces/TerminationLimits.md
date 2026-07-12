[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminationLimits

# Interface: TerminationLimits

Defined in: `packages/core/dist/index.d.ts`

The frozen limits vector written into termination.init.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd` | `number` | From the orchestrator budget (DEF-7; XF-09). | `packages/core/dist/index.d.ts` |
| <a id="property-kmax"></a> `kMax` | `number` | Maximum declared ladder length per the profile-registry snapshot. | `packages/core/dist/index.d.ts` |
| <a id="property-maxdepth"></a> `maxDepth` | `number` | D0, default 1, ceiling 4; static per-branch limit. | `packages/core/dist/index.d.ts` |
| <a id="property-maxescalationsperlogicaltask"></a> `maxEscalationsPerLogicalTask` | `number` | E0, default 2, per lineage; the old name is rejected (XF-10). | `packages/core/dist/index.d.ts` |
| <a id="property-maxrevisionsperrun"></a> `maxRevisionsPerRun` | `number` | V0, default 32; absolute and non-replenishable. | `packages/core/dist/index.d.ts` |
| <a id="property-maxtotalspawns"></a> `maxTotalSpawns` | `number` | S0, default 128; debited on every admitted spawn of any origin. | `packages/core/dist/index.d.ts` |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd` | `number` | From the orchestrator budget (DEF-7; XF-09). | `packages/core/dist/index.d.ts` |
| <a id="property-runbudgetusdceiling"></a> `runBudgetUsdCeiling` | `number` | B0; immutable after start, no API including HITL can top up. | `packages/core/dist/index.d.ts` |
