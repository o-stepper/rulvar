[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorBudgetSpec

# Interface: OrchestratorBudgetSpec

Defined in: [packages/core/src/orchestrator/orchestrate.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L104)

Budget contract: https://docs.rulvar.com/guide/budgets; the cap
machinery (reserves, freeze) completes in M7 (DEF-7).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-atcap"></a> `atCap?` | `"finish-with-partial"` \| `"fail-run"` | The policy at the cap, validated as exactly one of the two literals even at a plain JS/JSON boundary. 'finish-with-partial' (default) runs the reserved finalizer and returns its partial result with run outcome 'ok'. 'fail-run' skips the finalizer entirely: the run fails with outcome 'error' carrying FailRunError (code 'fail_run', data.source 'orchestrator_budget_cap', data.capDecisionRef); resume rolls the same failure forward from the journaled cap decision without another model call. | [packages/core/src/orchestrator/orchestrate.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L158) |
| <a id="property-capfraction"></a> `capFraction?` | `number` | A fraction in (0, 1], default 0.2; effectiveCap = min of the given bounds. Zero does not lift the cap (it would make every turn unpayable): anything outside (0, 1] is a ConfigError before any journal entry or dispatch. | [packages/core/src/orchestrator/orchestrate.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L121) |
| <a id="property-capusd"></a> `capUsd?` | `number` | Absolute bound in USD: a finite number >= 0, validated before any journal entry or dispatch (a malformed value is a ConfigError). It never REPLACES the fraction bound: effectiveCap = min(capUsd, (capFraction ?? 0.2) * ceiling), so an explicit capUsd larger than the default fraction of the run ceiling is still cut to that fraction (and a warn log says so). Pass capFraction: 1.0 to make capUsd the sole bound. | [packages/core/src/orchestrator/orchestrate.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L114) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `number` | A finite number >= 0, validated before any journal entry or dispatch. The reserve is SUBTRACTED from the soft boundary, so a negative value would widen the cap instead of reserving. | [packages/core/src/orchestrator/orchestrate.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L127) |
| <a id="property-finalizeturns"></a> `finalizeTurns?` | `number` | A positive integer, validated before any journal entry or dispatch: the turn limit of the reserved final wake. | [packages/core/src/orchestrator/orchestrate.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L147) |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd?` | `number` | The synthesis payload reserve (the sixth comparison experiment, cycle 76): absolute USD held out of the orchestrator sub account while the coordination loop runs, released to the synthesis invocation just before it dispatches. Without it a pricey coordination can leave the synthesis turns a remainder the budget clamp shrinks below the contract's minimal accepting payload: the finish is then cut at the output allowance before any tool call, the invocation dies at maxTurns, and a validator-bound run fails closed (the rematch run 1 lost an entire paid run exactly there). Requires the `synthesis` option (single mode); must stay below the effective cap. Declaring it changes budget arithmetic only; absent keeps every account byte identical. | [packages/core/src/orchestrator/orchestrate.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L142) |
