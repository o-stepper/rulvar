[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalCaseResult

# Interface: EvalCaseResult

Defined in: [packages/evals/src/case.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L80)

The measured result of one EvalCase.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd` | `number` | Target run cost plus all judge run costs (CostReport.totalUsd sums). | [packages/evals/src/case.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L89) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | - | [packages/evals/src/case.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L99) |
| <a id="property-judgecostusd"></a> `judgeCostUsd` | `number` | The judge-run share of costUsd. | [packages/evals/src/case.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L91) |
| <a id="property-latencyms"></a> `latencyMs` | `number` | run:start to run:end of the target run, from event timestamps; no separate measurement channel exists (docs/09, section 7.2). | [packages/evals/src/case.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L96) |
| <a id="property-name"></a> `name` | `string` | Workflow name, disambiguated by the suite runner on duplicates. | [packages/evals/src/case.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L82) |
| <a id="property-passed"></a> `passed` | `boolean` | status 'ok' AND every grader passed. | [packages/evals/src/case.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L86) |
| <a id="property-status"></a> `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | The target run's settle status. | [packages/evals/src/case.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L84) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | The target run's normalized usage. | [packages/evals/src/case.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L98) |
| <a id="property-verdicts"></a> `verdicts` | [`GraderVerdict`](/api/@rulvar/evals/interfaces/GraderVerdict.md)[] | - | [packages/evals/src/case.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L87) |
