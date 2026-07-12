[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runEvalMatrix

# Function: runEvalMatrix()

```ts
function runEvalMatrix(
   cells, 
   cases, 
options?): Promise<EvalMatrixReport>;
```

Defined in: [packages/evals/src/matrix.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/matrix.ts#L41)

Runs the same case list against every cell's engine, sequentially and
in declaration order (deterministic cassette consumption), and reports
per-cell aggregates for side-by-side comparison.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cells` | [`MatrixCell`](/api/@rulvar/evals/interfaces/MatrixCell.md)[] |
| `cases` | [`EvalCase`](/api/@rulvar/evals/interfaces/EvalCase.md)[] |
| `options` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) |

## Returns

`Promise`\&lt;[`EvalMatrixReport`](/api/@rulvar/evals/interfaces/EvalMatrixReport.md)\&gt;
