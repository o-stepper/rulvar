[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorBudgetSpec

# Interface: OrchestratorBudgetSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L69)

Budget contract: https://docs.rulvar.com/guide/budgets; the cap
machinery (reserves, freeze) completes in M7 (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-atcap"></a> `atCap?` | `"finish-with-partial"` \| `"fail-run"` | - | [packages/core/src/orchestrator/orchestrate.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L75) |
| <a id="property-capfraction"></a> `capFraction?` | `number` | default 0.2; effectiveCap = min of the given bounds | [packages/core/src/orchestrator/orchestrate.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L72) |
| <a id="property-capusd"></a> `capUsd?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L70) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L73) |
| <a id="property-finalizeturns"></a> `finalizeTurns?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L74) |
