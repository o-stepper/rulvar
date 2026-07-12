[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalCase

# Interface: EvalCase

Defined in: [packages/evals/src/case.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L30)

One quality-measurement case (docs/09, section 7.1). The shape is the
documented interface verbatim; display names derive from the workflow
name (the suite runner disambiguates duplicates by ordinal).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | [packages/evals/src/case.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L32) |
| <a id="property-graders"></a> `graders` | [`Grader`](/api/@rulvar/evals/interfaces/Grader.md)[] | [packages/evals/src/case.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L33) |
| <a id="property-workflow"></a> `workflow` | \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`unknown`, `unknown`\&gt; \| [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) | [packages/evals/src/case.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L31) |
