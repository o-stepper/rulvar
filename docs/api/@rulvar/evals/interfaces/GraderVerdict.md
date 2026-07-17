[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / GraderVerdict

# Interface: GraderVerdict

Defined in: [packages/evals/src/case.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L39)

One grader's outcome for one case.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-details"></a> `details?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | Family-specific evidence: diffs, per-criterion verdicts, judge output. | [packages/evals/src/case.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L46) |
| <a id="property-grader"></a> `grader` | `string` | The grader's display name. | [packages/evals/src/case.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L41) |
| <a id="property-passed"></a> `passed` | `boolean` | - | [packages/evals/src/case.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L42) |
| <a id="property-score"></a> `score?` | `number` | 0..1 where the family defines a fraction (rubric criteria met). | [packages/evals/src/case.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L44) |
