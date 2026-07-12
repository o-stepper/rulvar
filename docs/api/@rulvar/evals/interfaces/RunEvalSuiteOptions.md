[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunEvalSuiteOptions

# Interface: RunEvalSuiteOptions

Defined in: [packages/evals/src/case.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L228)

@rulvar/evals: quality measurement strictly on the public APIs (L6).
EvalCase with golden, rubric, and LLM-judge graders; judge calls run
through the engine (journaled, budgeted, VCR-recordable), so eval CI is
deterministic; config-matrix comparison reports pass-rate, cost, and
latency per cell (docs/09, section "@rulvar/evals"; docs/11, section
"Eval CI"). Matrix sweeps feeding ModelKnowledge, the eval-committer
identity, and canary fingerprints are the M11 round-3 extensions.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | [packages/evals/src/case.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L229) |
| <a id="property-judgebudgetusd"></a> `judgeBudgetUsd?` | `number` | [packages/evals/src/case.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L230) |
