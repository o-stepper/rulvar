[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runEvalCase

# Function: runEvalCase()

```ts
function runEvalCase(
   engine, 
   evalCase, 
options?): Promise<EvalCaseResult>;
```

Defined in: [packages/evals/src/case.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L162)

Runs one EvalCase on the given engine: the target workflow as its own
run, pure graders host-side over the outcome, judge graders through the
engine via GraderContext.judge. Grader thrown errors are not absorbed:
a grader that cannot grade is a defect of the suite, not a failed case.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `evalCase` | [`EvalCase`](/api/@rulvar/evals/interfaces/EvalCase.md) |
| `options` | [`RunEvalCaseOptions`](/api/@rulvar/evals/interfaces/RunEvalCaseOptions.md) |

## Returns

`Promise`\&lt;[`EvalCaseResult`](/api/@rulvar/evals/interfaces/EvalCaseResult.md)\&gt;
