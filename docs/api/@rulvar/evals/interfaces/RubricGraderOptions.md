[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RubricGraderOptions

# Interface: RubricGraderOptions

Defined in: [packages/evals/src/graders/rubric.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/rubric.ts#L15)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name?` | `string` | - | [packages/evals/src/graders/rubric.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/rubric.ts#L16) |
| <a id="property-passthreshold"></a> `passThreshold?` | `number` | Minimum fraction of criteria that must pass; default 1 (all). The fraction is also reported as the verdict score. Must be a finite fraction in [0, 1]: anything else throws a ConfigError at construction, because an out of range threshold silently passes or fails every verdict (v1.28.0 review P2). | [packages/evals/src/graders/rubric.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/graders/rubric.ts#L24) |
