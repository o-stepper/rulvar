[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorBudgetSpec

# Interface: OrchestratorBudgetSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L92)

Budget contract: https://docs.rulvar.com/guide/budgets; the cap
machinery (reserves, freeze) completes in M7 (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-atcap"></a> `atCap?` | `"finish-with-partial"` \| `"fail-run"` | The policy at the cap, validated as exactly one of the two literals even at a plain JS/JSON boundary. 'finish-with-partial' (default) runs the reserved finalizer and returns its partial result with run outcome 'ok'. 'fail-run' skips the finalizer entirely: the run fails with outcome 'error' carrying FailRunError (code 'fail_run', data.source 'orchestrator_budget_cap', data.capDecisionRef); resume rolls the same failure forward from the journaled cap decision without another model call. | [packages/core/src/orchestrator/orchestrate.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L131) |
| <a id="property-capfraction"></a> `capFraction?` | `number` | A fraction in (0, 1], default 0.2; effectiveCap = min of the given bounds. Zero does not lift the cap (it would make every turn unpayable): anything outside (0, 1] is a ConfigError before any journal entry or dispatch. | [packages/core/src/orchestrator/orchestrate.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L109) |
| <a id="property-capusd"></a> `capUsd?` | `number` | Absolute bound in USD: a finite number >= 0, validated before any journal entry or dispatch (a malformed value is a ConfigError). It never REPLACES the fraction bound: effectiveCap = min(capUsd, (capFraction ?? 0.2) * ceiling), so an explicit capUsd larger than the default fraction of the run ceiling is still cut to that fraction (and a warn log says so). Pass capFraction: 1.0 to make capUsd the sole bound. | [packages/core/src/orchestrator/orchestrate.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L102) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `number` | A finite number >= 0, validated before any journal entry or dispatch. The reserve is SUBTRACTED from the soft boundary, so a negative value would widen the cap instead of reserving. | [packages/core/src/orchestrator/orchestrate.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L115) |
| <a id="property-finalizeturns"></a> `finalizeTurns?` | `number` | A positive integer, validated before any journal entry or dispatch: the turn limit of the reserved final wake. | [packages/core/src/orchestrator/orchestrate.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L120) |
