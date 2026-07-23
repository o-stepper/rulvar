[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runEvalSuite

# Function: runEvalSuite()

```ts
function runEvalSuite(
   engine, 
   cases, 
options?): Promise<EvalSuiteResult>;
```

Defined in: [packages/evals/src/case.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/case.ts#L317)

Runs cases sequentially (deterministic journal and cassette order) and
aggregates. Duplicate workflow names get '#&lt;ordinal&gt;' suffixes so every
result row and judge journal is unambiguous.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `cases` | [`EvalCase`](/api/@rulvar/evals/interfaces/EvalCase.md)[] |
| `options` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) |

## Returns

`Promise`\&lt;[`EvalSuiteResult`](/api/@rulvar/evals/interfaces/EvalSuiteResult.md)\&gt;
