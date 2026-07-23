[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkSpec

# Interface: BenchmarkSpec

Defined in: [packages/evals/src/benchmark.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L58)

One benchmark: a workflow measured over a series of repeats.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | - | [packages/evals/src/benchmark.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L61) |
| <a id="property-graders"></a> `graders?` | [`Grader`](/api/@rulvar/evals/interfaces/Grader.md)[] | Per-run graders over the settled outcome, the same contract the eval runners use (golden, rubric, and LLM-judge graders compose unchanged). A failing grader rejects the run from scoring; a throwing grader is a defect of the spec and propagates. | [packages/evals/src/benchmark.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L74) |
| <a id="property-name"></a> `name` | `string` | - | [packages/evals/src/benchmark.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L59) |
| <a id="property-repeats"></a> `repeats` | `number` | Scored repeats to attempt; a positive integer. The regression protocol this kit serves calls for at least 5 before a series is citable; the kit does not enforce that floor, it reports what ran. | [packages/evals/src/benchmark.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L67) |
| <a id="property-workflow"></a> `workflow` | \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`unknown`, `unknown`\&gt; \| [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) | - | [packages/evals/src/benchmark.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L60) |
