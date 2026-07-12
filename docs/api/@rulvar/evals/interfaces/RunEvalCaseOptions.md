[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunEvalCaseOptions

# Interface: RunEvalCaseOptions

Defined in: [packages/evals/src/case.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L102)

@rulvar/evals: quality measurement strictly on the public APIs (L6).
EvalCase with golden, rubric, and LLM-judge graders; judge calls run
through the engine (journaled, budgeted, VCR-recordable), so eval CI is
deterministic; config-matrix comparison reports pass-rate, cost, and
latency per cell. Matrix sweeps feeding ModelKnowledge, the eval-committer
identity, and canary fingerprints are the M11 round-3 extensions.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling for the target run. | [packages/evals/src/case.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L106) |
| <a id="property-judgebudgetusd"></a> `judgeBudgetUsd?` | `number` | Run ceiling for each judge run. | [packages/evals/src/case.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L108) |
| <a id="property-name"></a> `name?` | `string` | Display-name override; defaults to the workflow name. | [packages/evals/src/case.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L104) |
