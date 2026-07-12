[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / JudgeSpec

# Interface: JudgeSpec

Defined in: [packages/evals/src/case.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L54)

A judge invocation specification. The judge runs through the engine as
an ordinary journaled, budgeted invocation; model selection is subject
to the router quality floors (docs/04, section "Role quality floors"),
and @rulvar/evals ships NO default judge model: weak defaults for
judging are forbidden, so the model is always explicit.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-model"></a> `model` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | [packages/evals/src/case.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L55) |
| <a id="property-prompt"></a> `prompt` | `string` | [packages/evals/src/case.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L56) |
| <a id="property-schema"></a> `schema` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) | [packages/evals/src/case.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L57) |
