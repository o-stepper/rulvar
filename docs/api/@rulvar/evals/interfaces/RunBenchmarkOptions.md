[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunBenchmarkOptions

# Interface: RunBenchmarkOptions

Defined in: [packages/evals/src/benchmark.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L83)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Run ceiling for each target run. | [packages/evals/src/benchmark.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L85) |
| <a id="property-envelope"></a> `envelope?` | [`SpendEnvelope`](/api/@rulvar/evals/classes/SpendEnvelope.md) | Aggregate debit-only envelope: every target and judge run authorizes its ceiling here BEFORE starting, exactly like the eval runners. A target-run refusal throws SweepBudgetError; a judge-run refusal rejects that run from scoring as 'judge:refused'. | [packages/evals/src/benchmark.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L94) |
| <a id="property-judgebudgetusd"></a> `judgeBudgetUsd?` | `number` | Run ceiling for each judge run a grader performs. | [packages/evals/src/benchmark.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L87) |
| <a id="property-labels"></a> `labels?` | `Record`\&lt;`string`, `string`\&gt; | Host-supplied fingerprint labels: the commit, the pricing snapshot id, the corpus hash, the series name (cold/warm). The kit never shells out or guesses; identity the host does not supply is not recorded. | [packages/evals/src/benchmark.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L101) |
| <a id="property-metrics"></a> `metrics?` | `Record`\&lt;`string`, [`BenchmarkMetricExtractor`](/api/@rulvar/evals/type-aliases/BenchmarkMetricExtractor.md)\&gt; | Named per-run metric extractors; each scored series gets percentiles. | [packages/evals/src/benchmark.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L103) |
