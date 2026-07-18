[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SweepCellReport

# Interface: SweepCellReport

Defined in: [packages/evals/src/sweeps.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L89)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-casenames"></a> `caseNames` | `string`[] | - | [packages/evals/src/sweeps.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L103) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | [packages/evals/src/sweeps.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L91) |
| <a id="property-envelopeexhausted"></a> `envelopeExhausted?` | `true` | The aggregate envelope refused a TARGET run of this cell before it started; everything measured up to that point stays reported and the cell emits no claim. | [packages/evals/src/sweeps.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L124) |
| <a id="property-exhaustedruns"></a> `exhaustedRuns?` | `number` | Count of case results whose TARGET run settled 'exhausted' (its per-run ceiling, not the envelope). A budget-starved measurement must not become a model belief, so any exhausted target suppresses the cell's claim even when the degraded passRate crosses a threshold: the alternative is committing a false weakness that blames the model for the ceiling. | [packages/evals/src/sweeps.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L112) |
| <a id="property-incompletereason"></a> `incompleteReason?` | `"judge-exhausted"` \| `"judge-refused"` \| `"envelope-exhausted"` | Why the cell is incomplete, when it is. | [packages/evals/src/sweeps.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L126) |
| <a id="property-judgeincompleteruns"></a> `judgeIncompleteRuns?` | `number` | Count of result rows whose grading stopped on a judge budget event (per-run judge ceiling or envelope refusal of a judge run). The paid target evidence stays on those rows; the cell emits no claim. | [packages/evals/src/sweeps.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L118) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/sweeps.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L90) |
| <a id="property-n"></a> `n` | `number` | Result rows actually measured (completed count). | [packages/evals/src/sweeps.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L95) |
| <a id="property-passrate"></a> `passRate` | `number` | - | [packages/evals/src/sweeps.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L93) |
| <a id="property-plannedn"></a> `plannedN` | `number` | Cases this cell was asked to measure (v1.17.0 review P1-5). A cell with n < plannedN is incomplete: what ran stays reported, and the cell emits no claim. | [packages/evals/src/sweeps.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L101) |
| <a id="property-refusedrunlabel"></a> `refusedRunLabel?` | `string` | The refused run's label, when the envelope refused one. | [packages/evals/src/sweeps.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L128) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | [packages/evals/src/sweeps.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L92) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/sweeps.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L102) |
