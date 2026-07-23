[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkMetricExtractor

# Type Alias: BenchmarkMetricExtractor

```ts
type BenchmarkMetricExtractor = (events, outcome) => number;
```

Defined in: [packages/evals/src/benchmark.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L78)

A per-run metric extractor over the run's full event stream.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | readonly [`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)[] |
| `outcome` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt; |

## Returns

`number`
