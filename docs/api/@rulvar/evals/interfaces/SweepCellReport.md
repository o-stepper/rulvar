[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SweepCellReport

# Interface: SweepCellReport

Defined in: [packages/evals/src/sweeps.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L96)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-casenames"></a> `caseNames` | `string`[] | - | [packages/evals/src/sweeps.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L110) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/evals/src/sweeps.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L98) |
| <a id="property-envelopeexhausted"></a> `envelopeExhausted?` | `true` | The aggregate envelope refused a TARGET run of this cell before it started; everything measured up to that point stays reported and the cell emits no claim. | [packages/evals/src/sweeps.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L131) |
| <a id="property-exhaustedruns"></a> `exhaustedRuns?` | `number` | Count of case results whose TARGET run settled 'exhausted' (its per-run ceiling, not the envelope). A budget-starved measurement must not become a model belief, so any exhausted target suppresses the cell's claim even when the degraded passRate crosses a threshold: the alternative is committing a false weakness that blames the model for the ceiling. | [packages/evals/src/sweeps.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L119) |
| <a id="property-incompletereason"></a> `incompleteReason?` | `"judge-exhausted"` \| `"judge-refused"` \| `"envelope-exhausted"` | Why the cell is incomplete, when it is. | [packages/evals/src/sweeps.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L133) |
| <a id="property-judgeincompleteruns"></a> `judgeIncompleteRuns?` | `number` | Count of result rows whose grading stopped on a judge budget event (per-run judge ceiling or envelope refusal of a judge run). The paid target evidence stays on those rows; the cell emits no claim. | [packages/evals/src/sweeps.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L125) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/sweeps.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L97) |
| <a id="property-n"></a> `n` | `number` | Result rows actually measured (completed count). | [packages/evals/src/sweeps.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L102) |
| <a id="property-passrate"></a> `passRate` | `number` | - | [packages/evals/src/sweeps.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L100) |
| <a id="property-plannedn"></a> `plannedN` | `number` | Cases this cell was asked to measure (v1.17.0 review P1-5). A cell with n < plannedN is incomplete: what ran stays reported, and the cell emits no claim. | [packages/evals/src/sweeps.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L108) |
| <a id="property-refusedrunlabel"></a> `refusedRunLabel?` | `string` | The refused run's label, when the envelope refused one. | [packages/evals/src/sweeps.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L135) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/sweeps.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L99) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/sweeps.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L109) |
