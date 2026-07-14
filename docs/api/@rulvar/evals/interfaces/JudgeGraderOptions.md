[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / JudgeGraderOptions

# Interface: JudgeGraderOptions

Defined in: [packages/evals/src/graders/judge.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L26)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-instruction"></a> `instruction` | `string` | What to judge: the criteria prose embedded into the judge prompt. | [packages/evals/src/graders/judge.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L30) |
| <a id="property-model"></a> `model` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Judge model; required, never defaulted (role quality floors). | [packages/evals/src/graders/judge.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L28) |
| <a id="property-name"></a> `name?` | `string` | - | [packages/evals/src/graders/judge.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L31) |
| <a id="property-schema"></a> `schema?` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) | Custom verdict schema; requires toVerdict. The default schema is JUDGE_VERDICT_SCHEMA with its boolean `passed`. | [packages/evals/src/graders/judge.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L36) |
| <a id="property-toverdict"></a> `toVerdict?` | (`output`) => \{ `passed`: `boolean`; `score?`: `number`; \} | Maps the judge's structured output onto a pass/score pair. | [packages/evals/src/graders/judge.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/judge.ts#L38) |
