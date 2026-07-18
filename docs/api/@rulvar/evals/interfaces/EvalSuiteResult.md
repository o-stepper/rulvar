[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalSuiteResult

# Interface: EvalSuiteResult

Defined in: [packages/evals/src/case.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L283)

Aggregate view of a suite run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-completedn"></a> `completedN` | `number` | Result rows actually produced (equals results.length). | [packages/evals/src/case.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L293) |
| <a id="property-meanlatencyms"></a> `meanLatencyMs` | `number` | Arithmetic mean over result rows; 0 for an empty suite. | [packages/evals/src/case.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L289) |
| <a id="property-passrate"></a> `passRate` | `number` | Fraction of result rows with passed true; 0 for an empty suite. | [packages/evals/src/case.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L286) |
| <a id="property-plannedn"></a> `plannedN` | `number` | Cases the caller asked for. | [packages/evals/src/case.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L291) |
| <a id="property-refusal"></a> `refusal?` | \{ `atCase`: `string`; `detail`: `string`; `runLabel`: `string`; \} | Present when the aggregate envelope refused a TARGET run before it started (v1.17.0 review P1-5). The suite stops there and returns everything already measured instead of throwing: completed rows, their costs, and their names survive. Judge refusals never appear here; they normalize into the owning row's `incomplete` marker. | [packages/evals/src/case.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L301) |
| `refusal.atCase` | `string` | - | [packages/evals/src/case.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L301) |
| `refusal.detail` | `string` | - | [packages/evals/src/case.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L301) |
| `refusal.runLabel` | `string` | - | [packages/evals/src/case.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L301) |
| <a id="property-results"></a> `results` | [`EvalCaseResult`](/api/@rulvar/evals/interfaces/EvalCaseResult.md)[] | - | [packages/evals/src/case.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L284) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/case.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L287) |
