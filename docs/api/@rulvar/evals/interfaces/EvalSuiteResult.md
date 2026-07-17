[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalSuiteResult

# Interface: EvalSuiteResult

Defined in: [packages/evals/src/case.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L235)

Aggregate view of a suite run.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-meanlatencyms"></a> `meanLatencyMs` | `number` | Arithmetic mean over cases; 0 for an empty suite. | [packages/evals/src/case.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L241) |
| <a id="property-passrate"></a> `passRate` | `number` | Fraction of cases with passed true; 0 for an empty suite. | [packages/evals/src/case.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L238) |
| <a id="property-results"></a> `results` | [`EvalCaseResult`](/api/@rulvar/evals/interfaces/EvalCaseResult.md)[] | - | [packages/evals/src/case.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L236) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | - | [packages/evals/src/case.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L239) |
