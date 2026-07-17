[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SweepCellReport

# Interface: SweepCellReport

Defined in: [packages/evals/src/sweeps.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L86)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-casenames"></a> `caseNames` | `string`[] | - | [packages/evals/src/sweeps.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L93) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/evals/src/sweeps.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L88) |
| <a id="property-envelopeexhausted"></a> `envelopeExhausted?` | `true` | The aggregate envelope refused a run of this cell before it started; stats cover nothing reliable and the cell emits no claim. | [packages/evals/src/sweeps.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L107) |
| <a id="property-exhaustedruns"></a> `exhaustedRuns?` | `number` | Count of case results whose TARGET run settled 'exhausted' (its per-run ceiling, not the envelope). A budget-starved measurement must not become a model belief, so any exhausted target suppresses the cell's claim even when the degraded passRate crosses a threshold: the alternative is committing a false weakness that blames the model for the ceiling. | [packages/evals/src/sweeps.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L102) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/sweeps.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L87) |
| <a id="property-n"></a> `n` | `number` | - | [packages/evals/src/sweeps.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L91) |
| <a id="property-passrate"></a> `passRate` | `number` | - | [packages/evals/src/sweeps.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L90) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/sweeps.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L89) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/sweeps.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L92) |
