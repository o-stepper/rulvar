[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorBudgetSpec

# Interface: OrchestratorBudgetSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L70)

Budget contract: https://docs.rulvar.com/guide/budgets; the cap
machinery (reserves, freeze) completes in M7 (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-atcap"></a> `atCap?` | `"finish-with-partial"` \| `"fail-run"` | - | [packages/core/src/orchestrator/orchestrate.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L83) |
| <a id="property-capfraction"></a> `capFraction?` | `number` | default 0.2; effectiveCap = min of the given bounds | [packages/core/src/orchestrator/orchestrate.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L80) |
| <a id="property-capusd"></a> `capUsd?` | `number` | Absolute bound in USD. It never REPLACES the fraction bound: effectiveCap = min(capUsd, (capFraction ?? 0.2) * ceiling), so an explicit capUsd larger than the default fraction of the run ceiling is still cut to that fraction (and a warn log says so). Pass capFraction: 1.0 to make capUsd the sole bound. | [packages/core/src/orchestrator/orchestrate.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L78) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L81) |
| <a id="property-finalizeturns"></a> `finalizeTurns?` | `number` | - | [packages/core/src/orchestrator/orchestrate.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L82) |
