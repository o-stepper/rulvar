[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / runBenchmark

# Function: runBenchmark()

```ts
function runBenchmark(
   engine, 
   spec, 
options?): Promise<BenchmarkReport>;
```

Defined in: [packages/evals/src/benchmark.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L325)

Runs the spec's repeats sequentially and reports the verified series.
Throws only for spec defects (invalid repeats, a throwing grader or
extractor); everything a run does wrong lands in its record, and a
target-run envelope refusal ends the series monotonically with the
completed repeats preserved (report.refusal).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) |
| `spec` | [`BenchmarkSpec`](/api/@rulvar/evals/interfaces/BenchmarkSpec.md) |
| `options` | [`RunBenchmarkOptions`](/api/@rulvar/evals/interfaces/RunBenchmarkOptions.md) |

## Returns

`Promise`\&lt;[`BenchmarkReport`](/api/@rulvar/evals/interfaces/BenchmarkReport.md)\&gt;
