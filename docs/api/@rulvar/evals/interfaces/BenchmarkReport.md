[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / BenchmarkReport

# Interface: BenchmarkReport

Defined in: [packages/evals/src/benchmark.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L180)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-costusd"></a> `costUsd?` | [`BenchmarkPercentiles`](/api/@rulvar/evals/interfaces/BenchmarkPercentiles.md) | - | [packages/evals/src/benchmark.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L189) |
| <a id="property-fingerprint"></a> `fingerprint` | [`BenchmarkFingerprint`](/api/@rulvar/evals/interfaces/BenchmarkFingerprint.md) | - | [packages/evals/src/benchmark.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L195) |
| <a id="property-judgecostusd"></a> `judgeCostUsd` | `number` | - | [packages/evals/src/benchmark.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L194) |
| <a id="property-metrics"></a> `metrics` | `Record`\&lt;`string`, [`BenchmarkPercentiles`](/api/@rulvar/evals/interfaces/BenchmarkPercentiles.md)\&gt; | Percentiles per named extractor, over scored runs. | [packages/evals/src/benchmark.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L191) |
| <a id="property-name"></a> `name` | `string` | - | [packages/evals/src/benchmark.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L181) |
| <a id="property-repeats"></a> `repeats` | `number` | Repeats attempted (equals runs.length). | [packages/evals/src/benchmark.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L183) |
| <a id="property-runs"></a> `runs` | [`BenchmarkRunRecord`](/api/@rulvar/evals/interfaces/BenchmarkRunRecord.md)[] | - | [packages/evals/src/benchmark.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L186) |
| <a id="property-scored"></a> `scored` | `number` | Runs that entered the percentile series. | [packages/evals/src/benchmark.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L185) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Every target and judge run, scored or rejected (honest spend). | [packages/evals/src/benchmark.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L193) |
| <a id="property-wallms"></a> `wallMs?` | [`BenchmarkPercentiles`](/api/@rulvar/evals/interfaces/BenchmarkPercentiles.md) | Absent when no run scored: the kit never fabricates a series. | [packages/evals/src/benchmark.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/benchmark.ts#L188) |
