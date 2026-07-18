[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunEvalCaseOptions

# Interface: RunEvalCaseOptions

Defined in: [packages/evals/src/case.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L118)

@rulvar/evals: quality measurement strictly on the public APIs (L6).
EvalCase with golden, rubric, and LLM-judge graders; judge calls run
through the engine (journaled, budgeted, VCR-recordable), so eval CI is
deterministic; config-matrix comparison reports pass-rate, cost, and
latency per cell. Matrix sweeps feeding ModelKnowledge, the eval-committer
identity, and canary fingerprints are the M11 round-3 extensions.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling for the target run. | [packages/evals/src/case.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L122) |
| <a id="property-envelope"></a> `envelope?` | [`SpendEnvelope`](/api/@rulvar/evals/classes/SpendEnvelope.md) | Aggregate debit-only envelope (v1.16.2 review P1-2): every target and judge run authorizes its ceiling here BEFORE starting, and an envelope requires the matching per-run ceiling to be set. A refusal throws SweepBudgetError before any provider work. | [packages/evals/src/case.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L131) |
| <a id="property-judgebudgetusd"></a> `judgeBudgetUsd?` | `number` | Run ceiling for each judge run. | [packages/evals/src/case.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L124) |
| <a id="property-name"></a> `name?` | `string` | Display-name override; defaults to the workflow name. | [packages/evals/src/case.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L120) |
