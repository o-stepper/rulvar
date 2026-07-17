[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunEvalSuiteOptions

# Interface: RunEvalSuiteOptions

Defined in: [packages/evals/src/case.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L244)

@rulvar/evals: quality measurement strictly on the public APIs (L6).
EvalCase with golden, rubric, and LLM-judge graders; judge calls run
through the engine (journaled, budgeted, VCR-recordable), so eval CI is
deterministic; config-matrix comparison reports pass-rate, cost, and
latency per cell. Matrix sweeps feeding ModelKnowledge, the eval-committer
identity, and canary fingerprints are the M11 round-3 extensions.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | - | [packages/evals/src/case.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L245) |
| <a id="property-envelope"></a> `envelope?` | [`SpendEnvelope`](/api/@rulvar/evals/classes/SpendEnvelope.md) | See RunEvalCaseOptions.envelope; shared across every case of the suite. | [packages/evals/src/case.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L248) |
| <a id="property-judgebudgetusd"></a> `judgeBudgetUsd?` | `number` | - | [packages/evals/src/case.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L246) |
