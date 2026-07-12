[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalSuiteResult

# Interface: EvalSuiteResult

Defined in: [packages/evals/src/case.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L219)

Aggregate view of a suite run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-meanlatencyms"></a> `meanLatencyMs` | `number` | Arithmetic mean over cases; 0 for an empty suite. | [packages/evals/src/case.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L225) |
| <a id="property-passrate"></a> `passRate` | `number` | Fraction of cases with passed true; 0 for an empty suite. | [packages/evals/src/case.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L222) |
| <a id="property-results"></a> `results` | [`EvalCaseResult`](/api/@rulvar/evals/interfaces/EvalCaseResult.md)[] | - | [packages/evals/src/case.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L220) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/case.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L223) |
