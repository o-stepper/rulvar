[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalCaseResult

# Interface: EvalCaseResult

Defined in: [packages/evals/src/case.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L82)

The measured result of one EvalCase.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `number` | Target run cost plus all judge run costs (CostReport.totalUsd sums). | [packages/evals/src/case.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L91) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | - | [packages/evals/src/case.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L101) |
| <a id="property-incomplete"></a> `incomplete?` | \{ `detail`: `string`; `reason`: `"judge-exhausted"` \| `"judge-refused"`; \} | Present when grading stopped for a BUDGET reason (v1.17.0 review P1-5): the judge run hit its own per-run ceiling ('judge-exhausted') or the aggregate envelope refused a judge run before it started ('judge-refused'). The paid target evidence and its cost stay on this row, but the case can never count as passed and its cell emits no claim. Unexpected grader errors still throw: a grader that cannot grade for non-budget reasons is a defect of the suite, not a budget event. | [packages/evals/src/case.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L112) |
| `incomplete.detail` | `string` | - | [packages/evals/src/case.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L114) |
| `incomplete.reason` | `"judge-exhausted"` \| `"judge-refused"` | - | [packages/evals/src/case.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L113) |
| <a id="property-judgecostusd"></a> `judgeCostUsd` | `number` | The judge-run share of costUsd. | [packages/evals/src/case.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L93) |
| <a id="property-latencyms"></a> `latencyMs` | `number` | run:start to run:end of the target run, from event timestamps; no separate measurement channel exists. | [packages/evals/src/case.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L98) |
| <a id="property-name"></a> `name` | `string` | Workflow name, disambiguated by the suite runner on duplicates. | [packages/evals/src/case.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L84) |
| <a id="property-passed"></a> `passed` | `boolean` | status 'ok' AND every grader passed. | [packages/evals/src/case.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L88) |
| <a id="property-status"></a> `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | The target run's settle status. | [packages/evals/src/case.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L86) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | The target run's normalized usage. | [packages/evals/src/case.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L100) |
| <a id="property-verdicts"></a> `verdicts` | [`GraderVerdict`](/api/@rulvar/evals/interfaces/GraderVerdict.md)[] | - | [packages/evals/src/case.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L89) |
